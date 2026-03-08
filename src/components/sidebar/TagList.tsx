"use client";

import { useEffect, useState } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tag, ChevronRight, ChevronDown } from "lucide-react";
import type { TagTreeNode } from "@/lib/tags/hierarchy";

/** Recursive tree node component */
function TagTreeItem({
  node,
  selectedTag,
  onSelect,
  depth = 0,
}: {
  node: TagTreeNode;
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedTag === node.fullPath;
  const isAncestorOfSelected =
    selectedTag?.startsWith(node.fullPath + "/") ?? false;

  return (
    <div>
      <button
        onClick={() => onSelect(isSelected ? null : node.fullPath)}
        className={`w-full text-left py-1.5 rounded-md text-sm flex items-center gap-1.5 hover:bg-accent transition-colors ${
          isSelected ? "bg-accent text-accent-foreground" : ""
        } ${isAncestorOfSelected ? "text-primary" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 12}px`, paddingRight: "12px" }}
      >
        {hasChildren ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 p-0.5 hover:bg-accent/50 rounded"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Tag className="h-3 w-3 shrink-0" />
        <span className="truncate">{node.name}</span>
        <Badge variant="secondary" className="ml-auto text-xs shrink-0">
          {node.totalCount}
        </Badge>
      </button>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TagTreeItem
              key={child.fullPath}
              node={child}
              selectedTag={selectedTag}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagList() {
  const { tags, tagTree, selectedTag, fetchTags, filterByTag } =
    useNoteStore();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Use tree view if hierarchical tags exist, otherwise flat list
  const hasHierarchy = tags.some((t) => t.tag.includes("/"));
  const displayTree = hasHierarchy ? tagTree : null;

  if (tags.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No tags yet. Add tags to your notes via frontmatter.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-0.5">
        {selectedTag && (
          <button
            onClick={() => filterByTag(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filter
          </button>
        )}

        {displayTree
          ? displayTree.map((node) => (
              <TagTreeItem
                key={node.fullPath}
                node={node}
                selectedTag={selectedTag}
                onSelect={(tag) => filterByTag(tag)}
              />
            ))
          : tags.map(({ tag, count }) => (
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
