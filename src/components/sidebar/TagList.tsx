"use client";

import { useEffect } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

export function TagList() {
  const { tags, selectedTag, fetchTags, filterByTag } = useNoteStore();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  if (tags.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No tags yet. Add tags to your notes via frontmatter.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {selectedTag && (
          <button
            onClick={() => filterByTag(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filter
          </button>
        )}
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() =>
              filterByTag(selectedTag === tag ? null : tag)
            }
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-accent transition-colors ${
              selectedTag === tag
                ? "bg-accent text-accent-foreground"
                : ""
            }`}
          >
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tag}</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {count}
            </Badge>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
