"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IS_MAC =
  typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const MOD = IS_MAC ? "\u2318" : "Ctrl";
const SHIFT = IS_MAC ? "\u21E7" : "Shift";

interface Shortcut {
  keys: string;
  description: string;
}

const SECTIONS: Array<{ title: string; shortcuts: Shortcut[] }> = [
  {
    title: "General",
    shortcuts: [
      { keys: `${MOD}+K`, description: "Open command palette / search" },
      { keys: `${MOD}+${SHIFT}+N`, description: "Create new note" },
      { keys: "?", description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Editor - Inline Formatting",
    shortcuts: [
      { keys: `${MOD}+B`, description: "Bold" },
      { keys: `${MOD}+I`, description: "Italic" },
      { keys: `${MOD}+${SHIFT}+S`, description: "Strikethrough" },
      { keys: `${MOD}+${SHIFT}+K`, description: "Inline code" },
      { keys: `${MOD}+${SHIFT}+H`, description: "Highlight" },
    ],
  },
  {
    title: "Editor - Block Formatting",
    shortcuts: [
      { keys: `${MOD}+${SHIFT}+C`, description: "Code block" },
      { keys: `${MOD}+${SHIFT}+M`, description: "Math block" },
      { keys: `${MOD}+${SHIFT}+Q`, description: "Blockquote" },
      { keys: `${MOD}+${SHIFT}+X`, description: "Task list" },
      { keys: `${MOD}+${SHIFT}+8`, description: "Bullet list" },
      { keys: `${MOD}+${SHIFT}+9`, description: "Numbered list" },
      { keys: `${MOD}+${SHIFT}+D`, description: "Mermaid diagram" },
      { keys: `${MOD}+${SHIFT}+R`, description: "Horizontal rule" },
    ],
  },
  {
    title: "Editor - Insert",
    shortcuts: [
      { keys: `${MOD}+${SHIFT}+L`, description: "Insert link" },
      { keys: `${MOD}+${SHIFT}+I`, description: "Insert image" },
      { keys: `${MOD}+${SHIFT}+W`, description: "Insert wiki-link" },
      { keys: `${MOD}+${SHIFT}+T`, description: "Insert table" },
    ],
  },
  {
    title: "Editor - General",
    shortcuts: [
      { keys: `${MOD}+Z`, description: "Undo" },
      { keys: `${MOD}+${SHIFT}+Z`, description: "Redo" },
      { keys: `${MOD}+F`, description: "Find in note" },
      { keys: `${MOD}+H`, description: "Find and replace" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border bg-muted text-xs font-mono">
      {children}
    </kbd>
  );
}

export function KeyboardShortcuts({
  open,
  onOpenChange,
}: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-0.5">
                      {shortcut.keys.split("+").map((key, i) => (
                        <Kbd key={i}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
