"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const SECTIONS = [
  {
    title: "App",
    shortcuts: [
      { keys: [`${mod}+K`], label: "Search notes" },
      { keys: ["?"], label: "Show this help" },
    ],
  },
  {
    title: "Editor — Inline",
    shortcuts: [
      { keys: [`${mod}+B`], label: "Bold" },
      { keys: [`${mod}+I`], label: "Italic" },
      { keys: [`${mod}+Shift+S`], label: "Strikethrough" },
      { keys: [`${mod}+Shift+K`], label: "Inline code" },
      { keys: [`${mod}+Shift+H`], label: "Highlight" },
    ],
  },
  {
    title: "Editor — Block",
    shortcuts: [
      { keys: [`${mod}+Shift+8`], label: "Bullet list" },
      { keys: [`${mod}+Shift+9`], label: "Ordered list" },
      { keys: [`${mod}+Shift+X`], label: "Task list" },
      { keys: [`${mod}+Shift+Q`], label: "Blockquote" },
      { keys: [`${mod}+Shift+C`], label: "Code block" },
      { keys: [`${mod}+Shift+M`], label: "Block math ($$)" },
      { keys: [`${mod}+Shift+D`], label: "Mermaid diagram" },
      { keys: [`${mod}+Shift+R`], label: "Horizontal rule" },
    ],
  },
  {
    title: "Editor — Insert",
    shortcuts: [
      { keys: [`${mod}+Shift+L`], label: "Link" },
      { keys: [`${mod}+Shift+I`], label: "Image (URL)" },
      { keys: [`${mod}+Shift+T`], label: "Table" },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-background border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh] px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {section.title}
              </div>
              <ul className="space-y-1.5">
                {section.shortcuts.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="flex gap-1 shrink-0">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 text-xs font-mono bg-muted border rounded"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-5 py-2 border-t text-xs text-muted-foreground text-center">
          Press <kbd className="px-1 font-mono bg-muted border rounded">Esc</kbd> or{" "}
          <kbd className="px-1 font-mono bg-muted border rounded">?</kbd> to close
        </div>
      </div>
    </div>
  );
}
