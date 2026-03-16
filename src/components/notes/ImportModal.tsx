"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

export function ImportModal({ open, onClose, onImported }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(
      (f) => f.name.endsWith(".md") || f.name.endsWith(".zip")
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleImport = async () => {
    if (!files.length) return;
    setImporting(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const { data, error } = await res.json();
      if (error) throw new Error(error);

      const { imported, errors } = data as { imported: number; errors: string[] };
      onImported(imported);
      toast.success(`Imported ${imported} note${imported !== 1 ? "s" : ""}`);
      if (errors.length) errors.forEach((e: string) => toast.error(e));
      setFiles([]);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setFiles([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-background border rounded-xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Import Notes</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">
            Accepts .md files and .zip archives
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".md,.zip"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        {/* File list */}
        {files.length > 0 && (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {files.map((f) => (
              <li
                key={f.name}
                className="flex items-center gap-2 text-sm px-2 py-1 rounded-md bg-muted"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{f.name}</span>
                <button
                  onClick={() => removeFile(f.name)}
                  className="shrink-0 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!files.length || importing}>
            {importing
              ? "Importing..."
              : `Import${files.length ? ` (${files.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
