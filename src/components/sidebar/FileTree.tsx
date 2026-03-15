"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  ImageIcon,
  Plus,
  FolderPlus,
  Trash2,
  Upload,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { FileTreeNode } from "@/types/note.types";

interface FileTreeProps {
  tree: FileTreeNode[];
  selectedSlug: string | null;
  onSelectNote: (slug: string) => void;
  onCreateNote: (folder?: string) => void;
  onCreateFolder: (parentFolder?: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onDeleteFile?: (filePath: string, isNote: boolean) => void;
  onRename?: (oldPath: string, newName: string) => void;
  onUploadToFolder?: (folderPath: string) => void;
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  selectedSlug: string | null;
  renamingPath: string | null;
  renameValue: string;
  onRenameStart: (path: string, currentName: string) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onSelectNote: (slug: string) => void;
  onCreateNote: (folder?: string) => void;
  onCreateFolder: (parentFolder?: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onDeleteFile?: (filePath: string, isNote: boolean) => void;
  onUploadToFolder?: (folderPath: string) => void;
}

async function uploadFileToFolder(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json();

  if (!res.ok) {
    toast.error(json.error || "Upload failed");
    return false;
  }

  toast.success(`Uploaded ${json.data.fileName}`);
  return true;
}

function InlineRenameInput({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Select just the name part (not extension) on mount
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const dotIdx = input.value.lastIndexOf(".");
    input.setSelectionRange(0, dotIdx > 0 ? dotIdx : input.value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 text-xs px-1"
        onBlur={onSubmit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
    </form>
  );
}

function TreeNode({
  node,
  depth,
  selectedSlug,
  renamingPath,
  renameValue,
  onRenameStart,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteFolder,
  onDeleteFile,
  onUploadToFolder,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const isRenaming = renamingPath === node.path;

  if (node.type === "folder") {
    return (
      <div>
        <div
          className={`note-item flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer group ${
            dragOver ? "bg-primary/10 ring-1 ring-primary/30" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);

            const files = Array.from(e.dataTransfer.files).filter((f) =>
              f.type.startsWith("image/")
            );
            if (files.length === 0) return;

            setExpanded(true);
            let uploaded = false;
            for (const file of files) {
              const ok = await uploadFileToFolder(file, node.path);
              if (ok) uploaded = true;
            }
            if (uploaded) onUploadToFolder?.(node.path);
          }}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          {expanded ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}

          {isRenaming ? (
            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <InlineRenameInput
                value={renameValue}
                onChange={onRenameChange}
                onSubmit={onRenameSubmit}
                onCancel={onRenameCancel}
              />
            </div>
          ) : (
            <span className="text-sm truncate flex-1">{node.name}</span>
          )}

          {/* Folder actions */}
          {!isRenaming && (
            <div className="note-action flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameStart(node.path, node.name);
                }}
                title="Rename folder"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateNote(node.path);
                }}
                title="New note in folder"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFolder(node.path);
                }}
                title="New subfolder"
              >
                <FolderPlus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
                  input.multiple = true;
                  input.onchange = async () => {
                    const files = Array.from(input.files || []);
                    if (files.length === 0) return;
                    let uploaded = false;
                    for (const f of files) {
                      const ok = await uploadFileToFolder(f, node.path);
                      if (ok) uploaded = true;
                    }
                    if (uploaded) onUploadToFolder?.(node.path);
                  };
                  input.click();
                }}
                title="Upload image to folder"
              >
                <Upload className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(node.path);
                }}
                title="Delete folder"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedSlug={selectedSlug}
                renamingPath={renamingPath}
                renameValue={renameValue}
                onRenameStart={onRenameStart}
                onRenameChange={onRenameChange}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                onSelectNote={onSelectNote}
                onCreateNote={onCreateNote}
                onCreateFolder={onCreateFolder}
                onDeleteFolder={onDeleteFolder}
                onDeleteFile={onDeleteFile}
                onUploadToFolder={onUploadToFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(node.name);
  const isNote = node.name.endsWith(".md") || !node.name.includes(".");

  return (
    <div
      onClick={() => isNote && onSelectNote(node.path)}
      className={`note-item w-full text-left flex items-center gap-1.5 py-1.5 px-2 text-sm hover:bg-muted/50 transition-colors ${
        isNote ? "cursor-pointer" : "cursor-default"
      } ${selectedSlug === node.path ? "bg-muted" : ""}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {isImage ? (
        <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}

      {isRenaming ? (
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <InlineRenameInput
            value={renameValue}
            onChange={onRenameChange}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
          />
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate">{node.title || node.name}</div>
          </div>
          <div className="note-action flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameStart(node.path, isNote ? (node.title || node.name) : node.name);
              }}
              className="shrink-0 p-0.5 rounded hover:bg-accent-foreground/10 text-muted-foreground"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile?.(node.path, isNote);
              }}
              className="shrink-0 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function FileTree({
  tree,
  selectedSlug,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteFolder,
  onDeleteFile,
  onRename,
  onUploadToFolder,
}: FileTreeProps) {
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleRenameStart = (itemPath: string, currentName: string) => {
    setRenamingPath(itemPath);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && renamingPath) {
      onRename?.(renamingPath, trimmed);
    }
    setRenamingPath(null);
  };

  const handleRenameCancel = () => {
    setRenamingPath(null);
  };

  if (tree.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No notes yet. Create one!
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedSlug={selectedSlug}
          renamingPath={renamingPath}
          renameValue={renameValue}
          onRenameStart={handleRenameStart}
          onRenameChange={setRenameValue}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={handleRenameCancel}
          onSelectNote={onSelectNote}
          onCreateNote={onCreateNote}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          onDeleteFile={onDeleteFile}
          onUploadToFolder={onUploadToFolder}
        />
      ))}
    </div>
  );
}
