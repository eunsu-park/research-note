"use client";

import { useState } from "react";
import { Tag, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTagTree } from "@/lib/tagTree";
import type { FileTreeNode, TagNode } from "@/types/note.types";

interface Props {
  tree: FileTreeNode[];
  selectedTag: string | null;
  onSelectTag: (tag: string) => void;
}

interface TagTreeNodeProps {
  node: TagNode;
  depth: number;
  selectedTag: string | null;
  onSelectTag: (tag: string) => void;
}

function TagTreeNode({ node, depth, selectedTag, onSelectTag }: TagTreeNodeProps) {
  const children = [...node.children.values()];
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(false);

  const isSelected = selectedTag === node.fullTag;
  const isAncestorOfSelected =
    selectedTag !== null && selectedTag.startsWith(`${node.fullTag}/`);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer text-xs group",
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted text-foreground",
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onSelectTag(node.fullTag)}
      >
        {hasChildren ? (
          <button
            className="shrink-0 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          >
            {expanded || isAncestorOfSelected
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
            }
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="flex-1 truncate">{node.segment}</span>
        <span className={cn(
          "shrink-0 text-[10px] tabular-nums",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}>
          {node.totalCount}
        </span>
      </div>

      {(expanded || isAncestorOfSelected) && hasChildren && (
        <div>
          {children
            .sort((a, b) => a.segment.localeCompare(b.segment))
            .map((child) => (
              <TagTreeNode
                key={child.fullTag}
                node={child}
                depth={depth + 1}
                selectedTag={selectedTag}
                onSelectTag={onSelectTag}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function TagPanel({ tree, selectedTag, onSelectTag }: Props) {
  const [expanded, setExpanded] = useState(false);
  const tagTree = buildTagTree(tree);

  if (tagTree.length === 0) return null;

  return (
    <div className="border-t shrink-0">
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-muted transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-medium text-muted-foreground flex items-center gap-1.5">
          <Tag className="h-3 w-3" />
          Tags
          {selectedTag && (
            <span className="text-primary font-normal truncate max-w-[80px]">
              · {selectedTag}
            </span>
          )}
        </span>
        {expanded
          ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto pb-1">
          {tagTree.map((node) => (
            <TagTreeNode
              key={node.fullTag}
              node={node}
              depth={0}
              selectedTag={selectedTag}
              onSelectTag={onSelectTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
