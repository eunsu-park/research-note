"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, StickyNote, Presentation } from "lucide-react";

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewNoteDialog({ open, onOpenChange }: NewNoteDialogProps) {
  const router = useRouter();
  const { templates, fetchTemplates, createNote } = useNoteStore();
  const [title, setTitle] = useState("");
  const [noteType, setNoteType] = useState<"note" | "sticky" | "presentation">("note");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setTitle("");
      setNoteType("note");
      setSelectedTemplate("");
    }
  }, [open, fetchTemplates]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);

    const slug = await createNote(
      title.trim(),
      noteType === "note" ? selectedTemplate || undefined : undefined,
      noteType
    );

    setCreating(false);
    onOpenChange(false);

    if (slug) {
      router.push(`/notes/${slug}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Note type selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setNoteType("note")}
                className={`flex items-center gap-2 p-3 rounded-md border text-sm transition-colors ${
                  noteType === "note"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Note</div>
                  <div className="text-xs text-muted-foreground">
                    Markdown
                  </div>
                </div>
              </button>
              <button
                onClick={() => setNoteType("sticky")}
                className={`flex items-center gap-2 p-3 rounded-md border text-sm transition-colors ${
                  noteType === "sticky"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <StickyNote className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Sticky</div>
                  <div className="text-xs text-muted-foreground">
                    Card board
                  </div>
                </div>
              </button>
              <button
                onClick={() => setNoteType("presentation")}
                className={`flex items-center gap-2 p-3 rounded-md border text-sm transition-colors ${
                  noteType === "presentation"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Presentation className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Slides</div>
                  <div className="text-xs text-muted-foreground">
                    Marp
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <Input
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
          </div>

          {/* Template selector (only for regular notes) */}
          {noteType === "note" && templates.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      setSelectedTemplate(
                        selectedTemplate === t.id ? "" : t.id
                      )
                    }
                    className={`text-left p-3 rounded-md border text-sm transition-colors ${
                      selectedTemplate === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
          >
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
