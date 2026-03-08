"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { Header } from "./Header";
import { NewNoteDialog } from "./NewNoteDialog";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { GripVertical } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

interface AppShellProps {
  children: React.ReactNode;
  currentSlug?: string;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 280;

export function AppShell({ children, currentSlug }: AppShellProps) {
  const { sidebarOpen, setSidebarOpen } = useNoteStore();
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle drag resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      setSidebarWidth(
        Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth))
      );
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setCommandOpen(true);
    }
    if (e.key === "n" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      setNewNoteOpen(true);
    }
    // ? key to show shortcuts (only when not typing in an input/editor)
    if (
      e.key === "?" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement) &&
      !(e.target as HTMLElement)?.closest?.(".cm-editor")
    ) {
      e.preventDefault();
      setShortcutsOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onNewNote={() => setNewNoteOpen(true)}
        onCommandPalette={() => setCommandOpen(true)}
      />

      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <div
              className="shrink-0 overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              <Sidebar currentSlug={currentSlug} />
            </div>

            {/* Resize handle */}
            <div
              className="shrink-0 w-1.5 cursor-col-resize hover:bg-primary/10 active:bg-primary/20 transition-colors flex items-center justify-center group border-r"
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>

      <NewNoteDialog
        open={newNoteOpen}
        onOpenChange={setNewNoteOpen}
      />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNewNote={() => {
          setCommandOpen(false);
          setNewNoteOpen(true);
        }}
      />
      <KeyboardShortcuts
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
