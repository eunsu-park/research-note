"use client";

import { useMemo } from "react";
import { StatsBar } from "./StatsBar";
import { CalendarView } from "./CalendarView";
import { RecentNotes } from "./RecentNotes";
import type { FileTreeNode } from "@/types/note.types";

interface Props {
  tree: FileTreeNode[];
  onSelectNote: (slug: string) => void;
  onNewNote: () => void;
  onDailyNote: () => void;
}

function flattenNotes(nodes: FileTreeNode[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      result.push(...flattenNotes(node.children ?? []));
    } else if (node.path.endsWith(".md") || !node.name.includes(".")) {
      // Include markdown notes (slugs have no extension) but skip images etc.
      if (!node.name.match(/\.(png|jpg|jpeg|gif|webp|svg|pdf)$/i)) {
        result.push(node);
      }
    }
  }
  return result;
}

export function HomeView({ tree, onSelectNote, onNewNote, onDailyNote }: Props) {
  const notes = useMemo(() => flattenNotes(tree), [tree]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold">Home</h2>
          <p className="text-sm text-muted-foreground mt-1">Your knowledge base at a glance</p>
        </div>

        <StatsBar notes={notes} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <CalendarView notes={notes} onSelectNote={onSelectNote} />
          <RecentNotes
            notes={notes}
            onSelectNote={onSelectNote}
            onNewNote={onNewNote}
            onDailyNote={onDailyNote}
          />
        </div>
      </div>
    </div>
  );
}
