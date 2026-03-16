"use client";

import { FileText, Tag, Clock } from "lucide-react";
import type { FileTreeNode } from "@/types/note.types";

interface Props {
  notes: FileTreeNode[];
}

export function StatsBar({ notes }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const totalNotes = notes.length;
  const uniqueTags = new Set(notes.flatMap((n) => n.tags ?? [])).size;
  const modifiedToday = notes.filter((n) => n.updated?.startsWith(today)).length;

  const stats = [
    { icon: FileText, label: "Notes", value: totalNotes },
    { icon: Tag, label: "Tags", value: uniqueTags },
    { icon: Clock, label: "Modified today", value: modifiedToday },
  ];

  return (
    <div className="flex gap-4 px-1">
      {stats.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 flex-1"
        >
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
