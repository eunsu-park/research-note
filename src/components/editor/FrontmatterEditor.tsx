"use client";

import { useState, useCallback } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Calendar,
  Clock,
} from "lucide-react";
import type { NoteFrontmatter } from "@/types/note.types";

interface FrontmatterEditorProps {
  slug: string;
  frontmatter: NoteFrontmatter;
  onUpdate: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FrontmatterEditor({
  slug,
  frontmatter,
  onUpdate,
}: FrontmatterEditorProps) {
  const { updateNoteFrontmatter } = useNoteStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(frontmatter.title);

  const handleRemoveTag = useCallback(
    async (tagToRemove: string) => {
      const newTags = frontmatter.tags.filter((t) => t !== tagToRemove);
      await updateNoteFrontmatter(slug, { tags: newTags });
      onUpdate();
    },
    [slug, frontmatter.tags, updateNoteFrontmatter, onUpdate]
  );

  const handleAddTag = useCallback(async () => {
    const tag = newTag
      .trim()
      .toLowerCase()
      .replace(/\/+/g, "/")
      .replace(/^\/|\/$/g, "");
    if (!tag || frontmatter.tags.includes(tag)) {
      setNewTag("");
      return;
    }
    const newTags = [...frontmatter.tags, tag];
    await updateNoteFrontmatter(slug, { tags: newTags });
    setNewTag("");
    onUpdate();
  }, [slug, newTag, frontmatter.tags, updateNoteFrontmatter, onUpdate]);

  const handleTitleSave = useCallback(async () => {
    const title = editTitle.trim();
    if (!title || title === frontmatter.title) {
      setIsEditingTitle(false);
      setEditTitle(frontmatter.title);
      return;
    }
    await updateNoteFrontmatter(slug, { title });
    setIsEditingTitle(false);
    onUpdate();
  }, [slug, editTitle, frontmatter.title, updateNoteFrontmatter, onUpdate]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setEditTitle(frontmatter.title);
                }
              }}
              className="h-7 text-lg font-semibold w-64"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-semibold truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
            >
              {frontmatter.title}
            </h1>
          )}

          {/* Inline tag chips */}
          <div className="flex items-center gap-1 flex-wrap">
            {frontmatter.tags.map((tag) => {
              const segments = tag.split("/");
              const isHierarchical = segments.length > 1;
              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs gap-1 group/tag"
                  title={tag}
                >
                  {isHierarchical && (
                    <span className="text-muted-foreground">
                      {segments.slice(0, -1).join("/")}/
                    </span>
                  )}
                  {segments[segments.length - 1]}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-0 group-hover/tag:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              );
            })}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-4 py-3 border-b bg-muted/30 space-y-3">
          {/* Tag editor */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
              Tags
            </span>
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {frontmatter.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTag();
                }}
                className="flex items-center gap-1"
              >
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag (e.g. topic/sub)..."
                  className="h-6 w-36 text-xs"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </form>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
              Created
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(frontmatter.created)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
              Updated
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(frontmatter.updated)}
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
