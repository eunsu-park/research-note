"use client";

import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileTreeNode } from "@/types/note.types";

interface Props {
  notes: FileTreeNode[];
  onSelectNote: (slug: string) => void;
  onNewNote: () => void;
  onDailyNote: () => void;
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString();
}

export function RecentNotes({ notes, onSelectNote, onNewNote, onDailyNote }: Props) {
  const recent = [...notes]
    .filter((n) => n.updated)
    .sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""))
    .slice(0, 7);

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <h3 className="text-sm font-medium">Recent Notes</h3>

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-1">
          {recent.map((note) => (
            <li key={note.path}>
              <button
                onClick={() => onSelectNote(note.path)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted text-left gap-2"
              >
                <span className="text-sm truncate">{note.title || note.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {note.updated ? relativeTime(note.updated) : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Quick actions */}
      <div className="border-t pt-3 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">Quick actions</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onNewNote}>
            <Plus className="h-3.5 w-3.5" />
            New Note
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onDailyNote}>
            <CalendarDays className="h-3.5 w-3.5" />
            Daily Note
          </Button>
        </div>
      </div>
    </div>
  );
}
