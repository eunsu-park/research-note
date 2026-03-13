"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  ArrowUpDown,
  Pin,
  ArrowUp,
  ArrowDown,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  StickyNote,
  Presentation,
  Trash2,
} from "lucide-react";
import type { NoteSummary, SortBy } from "@/types/note.types";

interface FileListProps {
  currentSlug?: string;
}

interface FolderNode {
  name: string;
  notes: NoteSummary[];
}

export function FileList({ currentSlug }: FileListProps) {
  const router = useRouter();
  const {
    notes,
    loading,
    fetchNotes,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    togglePin,
    moveToFolder,
  } = useNoteStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([""])
  );
  const [customFolders, setCustomFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Group notes by folder
  const folderTree = useMemo(() => {
    const folders = new Map<string, NoteSummary[]>();

    // Always have a root folder
    folders.set("", []);

    for (const note of notes) {
      const folder = note.folder || "";
      if (!folders.has(folder)) {
        folders.set(folder, []);
      }
      folders.get(folder)!.push(note);
    }

    // Include custom (empty) folders
    for (const cf of customFolders) {
      if (!folders.has(cf)) {
        folders.set(cf, []);
      }
    }

    // Sort folder names (root first, then alphabetical)
    const sortedFolders: FolderNode[] = [];
    const rootNotes = folders.get("") || [];
    folders.delete("");

    // Add named folders first
    const folderNames = Array.from(folders.keys()).sort();
    for (const name of folderNames) {
      sortedFolders.push({ name, notes: folders.get(name)! });
    }

    return { rootNotes, folders: sortedFolders };
  }, [notes, customFolders]);

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, slug: string) => {
      e.dataTransfer.setData("text/plain", slug);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, folder: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder(folder);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, folder: string) => {
      e.preventDefault();
      setDragOverFolder(null);
      const slug = e.dataTransfer.getData("text/plain");
      if (slug) {
        moveToFolder(slug, folder);
      }
    },
    [moveToFolder]
  );

  const handleCreateFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;
    setCustomFolders((prev) => new Set(prev).add(name));
    setExpandedFolders((prev) => new Set(prev).add(name));
    setNewFolderName("");
    setShowNewFolder(false);
  }, [newFolderName]);

  const handleDeleteFolder = useCallback(
    (folderName: string) => {
      setCustomFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderName);
        return next;
      });
    },
    []
  );

  const renderNote = useCallback(
    (note: NoteSummary) => (
      <div
        key={note.slug}
        draggable
        onDragStart={(e) => handleDragStart(e, note.slug)}
        className={`group relative w-full text-left px-3 py-2 rounded-md text-sm flex items-start gap-2 hover:bg-accent transition-colors cursor-pointer ${
          currentSlug === note.slug
            ? "bg-accent text-accent-foreground"
            : ""
        }`}
        onClick={() => router.push(`/notes/${note.slug}`)}
      >
        {note.pinned ? (
          <Pin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        ) : note.noteType === "sticky" ? (
          <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
        ) : note.noteType === "presentation" ? (
          <Presentation className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        ) : (
          <FileText className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{note.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {note.excerpt}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.slug);
          }}
          className={`shrink-0 mt-0.5 p-0.5 rounded hover:bg-accent-foreground/10 ${
            note.pinned
              ? "text-primary"
              : "text-muted-foreground opacity-0 group-hover:opacity-100"
          } transition-opacity`}
          title={note.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="h-3 w-3" />
        </button>
      </div>
    ),
    [currentSlug, handleDragStart, router, togglePin]
  );

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No notes yet. Create your first note!
      </div>
    );
  }

  const hasFolders = folderTree.folders.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Sort controls */}
      <div className="px-2 py-1.5 flex items-center justify-between border-b">
        <span className="text-xs text-muted-foreground">
          {notes.length} notes
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="New folder"
            onClick={() => setShowNewFolder(true)}
          >
            <FolderPlus className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Sort by"
              >
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortBy)}
              >
                <DropdownMenuRadioItem value="updated">
                  Modified date
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created">
                  Created date
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">
                  Title
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
              >
                <DropdownMenuRadioItem value="desc">
                  Descending
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="asc">
                  Ascending
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
            title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
          >
            {sortOrder === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="px-2 py-1.5 border-b">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateFolder();
            }}
            className="flex gap-1"
          >
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="h-6 text-xs"
              autoFocus
              onBlur={() => {
                if (!newFolderName.trim()) setShowNewFolder(false);
              }}
            />
          </form>
        </div>
      )}

      {/* Notes list with folders */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Named folders */}
          {folderTree.folders.map((folder) => {
            const isExpanded = expandedFolders.has(folder.name);
            const isDragOver = dragOverFolder === folder.name;

            return (
              <div key={folder.name} className="mb-1">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer transition-colors ${
                    isDragOver
                      ? "bg-primary/10 ring-1 ring-primary"
                      : ""
                  }`}
                  onClick={() => toggleFolder(folder.name)}
                  onDragOver={(e) => handleDragOver(e, folder.name)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.name)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-3.5 w-3.5" />
                  ) : (
                    <Folder className="h-3.5 w-3.5" />
                  )}
                  <span>{folder.name}</span>
                  <span className="ml-auto text-xs opacity-60">
                    {folder.notes.length}
                  </span>
                  {folder.notes.length === 0 && customFolders.has(folder.name) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.name);
                      }}
                      className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete empty folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="ml-3 border-l pl-1">
                    {folder.notes.map(renderNote)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root (unfiled) notes */}
          <div
            className={`${
              dragOverFolder === "" && hasFolders
                ? "bg-primary/5 rounded-md"
                : ""
            }`}
            onDragOver={
              hasFolders ? (e) => handleDragOver(e, "") : undefined
            }
            onDragLeave={hasFolders ? handleDragLeave : undefined}
            onDrop={hasFolders ? (e) => handleDrop(e, "") : undefined}
          >
            {hasFolders && folderTree.rootNotes.length > 0 && (
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Unfiled
              </div>
            )}
            {folderTree.rootNotes.map(renderNote)}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
