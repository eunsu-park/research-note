"use client";

import { useState, useEffect } from "react";
import { Link2 } from "lucide-react";
import type { BacklinkResult } from "@/types/note.types";

interface BacklinksPanelProps {
  slug: string;
  onSelectNote: (slug: string) => void;
}

export function BacklinksPanel({ slug, onSelectNote }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/backlinks?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(({ data }) => setBacklinks(data || []))
      .catch(() => setBacklinks([]));
  }, [slug]);

  if (backlinks.length === 0) return null;

  return (
    <div className="shrink-0 border-t px-6 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
        <Link2 className="h-3.5 w-3.5" />
        Backlinks ({backlinks.length})
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {backlinks.map((b) => (
          <li key={b.slug}>
            <button
              onClick={() => onSelectNote(b.slug)}
              className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              {b.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
