"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, X, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { TrashItem } from "@/types/note.types";

interface TrashPanelProps {
  open: boolean;
  onClose: () => void;
  onRestored: (slug: string) => void;
}

export function TrashPanel({ open, onClose, onRestored }: TrashPanelProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      const { data } = await res.json();
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTrash();
  }, [open, fetchTrash]);

  const handleRestore = async (item: TrashItem) => {
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.trashName }),
      });
      const { data, error } = await res.json();
      if (!res.ok) { toast.error(error || "Restore failed"); return; }
      toast.success(`Restored "${item.title}"`);
      onRestored(data.slug);
      setItems((prev) => prev.filter((i) => i.trashName !== item.trashName));
    } catch {
      toast.error("Restore failed");
    }
  };

  const handleDelete = async (item: TrashItem) => {
    try {
      const res = await fetch(`/api/trash?name=${encodeURIComponent(item.trashName)}`, {
        method: "DELETE",
      });
      if (!res.ok) { toast.error("Delete failed"); return; }
      setItems((prev) => prev.filter((i) => i.trashName !== item.trashName));
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm(`Permanently delete all ${items.length} items?`)) return;
    try {
      const res = await fetch("/api/trash?all=true", { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to empty trash"); return; }
      toast.success("Trash emptied");
      setItems([]);
    } catch {
      toast.error("Failed to empty trash");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-start"
      onClick={onClose}
    >
      <div
        className="relative w-80 max-h-[60vh] bg-background border rounded-tr-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trash2 className="h-4 w-4" />
            Trash
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground">({items.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive hover:text-destructive"
                onClick={handleEmptyTrash}
              >
                Empty
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Trash className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Trash is empty
            </div>
          ) : (
            <ul className="py-1">
              {items.map((item) => (
                <li
                  key={item.trashName}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.trashedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(item)}
                      className="p-1 rounded hover:bg-accent-foreground/10 text-muted-foreground hover:text-foreground"
                      title="Restore"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      title="Delete permanently"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
