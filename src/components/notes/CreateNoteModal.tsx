"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NOTE_TEMPLATES, type NoteTemplate } from "@/lib/noteTemplates";
import { X } from "lucide-react";

interface CreateNoteModalProps {
  open: boolean;
  folder?: string;
  onClose: () => void;
  onConfirm: (title: string, templateContent: string) => void;
}

export function CreateNoteModal({ open, folder, onClose, onConfirm }: CreateNoteModalProps) {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<NoteTemplate>(NOTE_TEMPLATES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setSelected(NOTE_TEMPLATES[0]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onConfirm(t, selected.content);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-background border rounded-xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            New Note{folder ? ` in ${folder}` : ""}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="h-8 text-sm"
            />
          </div>

          {/* Template selection */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Template</label>
            <div className="grid grid-cols-2 gap-2">
              {NOTE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selected.id === t.id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[11px] mt-0.5 opacity-70">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
