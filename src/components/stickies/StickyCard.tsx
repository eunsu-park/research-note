"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, GripVertical } from "lucide-react";
import {
  useStickyStore,
  STICKY_COLORS,
  type StickyNote,
} from "@/stores/stickyStore";

interface StickyCardProps {
  sticky: StickyNote;
  onDragStart?: (e: React.DragEvent, id: number) => void;
}

export function StickyCard({ sticky, onDragStart }: StickyCardProps) {
  const { updateSticky, deleteSticky } = useStickyStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [title, setTitle] = useState(sticky.title);
  const [content, setContent] = useState(sticky.content);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const colorConfig = STICKY_COLORS.find((c) => c.name === sticky.color) || STICKY_COLORS[0];

  // Sync props
  useEffect(() => {
    setTitle(sticky.title);
    setContent(sticky.content);
  }, [sticky.title, sticky.content]);

  const debouncedSave = useCallback(
    (data: Partial<StickyNote>) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateSticky(sticky.id, data);
      }, 500);
    },
    [sticky.id, updateSticky]
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSave({ title: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    debouncedSave({ content: value });
  };

  const handleColorChange = (color: string) => {
    updateSticky(sticky.id, { color });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, sticky.id)}
      className={`group relative rounded-lg border-2 ${colorConfig.bg} ${colorConfig.border} p-3 shadow-sm hover:shadow-md transition-shadow min-h-[140px] flex flex-col`}
    >
      {/* Top bar: drag handle + color dots + delete */}
      <div className="flex items-center justify-between mb-2">
        <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex items-center gap-1">
          {STICKY_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => handleColorChange(c.name)}
              className={`w-3 h-3 rounded-full border opacity-0 group-hover:opacity-100 transition-opacity ${c.bg} ${
                sticky.color === c.name
                  ? "ring-2 ring-offset-1 ring-foreground/30 opacity-100"
                  : ""
              }`}
              title={c.name}
            />
          ))}

          <button
            onClick={() => deleteSticky(sticky.id)}
            className="ml-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      {editingTitle ? (
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={() => setEditingTitle(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditingTitle(false);
          }}
          className="bg-transparent border-none outline-none font-semibold text-sm mb-1 w-full"
          placeholder="Title..."
          autoFocus
        />
      ) : (
        <div
          onClick={() => {
            setEditingTitle(true);
            setTimeout(() => titleRef.current?.focus(), 0);
          }}
          className="font-semibold text-sm mb-1 cursor-text min-h-[20px]"
        >
          {title || (
            <span className="text-muted-foreground/50">Title...</span>
          )}
        </div>
      )}

      {/* Content */}
      {editingContent ? (
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={() => setEditingContent(false)}
          className="bg-transparent border-none outline-none text-xs flex-1 w-full resize-none"
          placeholder="Write something..."
          autoFocus
        />
      ) : (
        <div
          onClick={() => {
            setEditingContent(true);
            setTimeout(() => contentRef.current?.focus(), 0);
          }}
          className="text-xs text-foreground/80 flex-1 cursor-text whitespace-pre-wrap"
        >
          {content || (
            <span className="text-muted-foreground/50">
              Write something...
            </span>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="text-[10px] text-muted-foreground/40 mt-2">
        {new Date(sticky.updated).toLocaleDateString()}
      </div>
    </div>
  );
}
