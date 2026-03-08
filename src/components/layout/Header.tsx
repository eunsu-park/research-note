"use client";

import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Network,
  Search,
  CalendarDays,
  StickyNote,
  Calendar,
  Settings,
} from "lucide-react";

interface HeaderProps {
  onNewNote: () => void;
  onCommandPalette: () => void;
}

export function Header({ onNewNote, onCommandPalette }: HeaderProps) {
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useNoteStore();

  return (
    <header className="h-12 border-b flex items-center justify-between px-3 bg-background shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          Research Notes
        </button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={async () => {
            const res = await fetch("/api/daily", { method: "POST" });
            const { data } = await res.json();
            if (data?.slug) {
              router.push(`/notes/${data.slug}`);
            }
          }}
          title="Today's Note"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/stickies")}
          title="Sticky Notes"
        >
          <StickyNote className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/calendar")}
          title="Calendar"
        >
          <Calendar className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCommandPalette}
          title="Search (Cmd+K)"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNewNote}
          title="New Note"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/graph")}
          title="Knowledge Graph"
        >
          <Network className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/settings")}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
}
