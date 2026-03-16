"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { useSettingsStore } from "@/stores/settingsStore";
import type { SortBy, SortOrder } from "@/stores/settingsStore";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { TableOfContents } from "@/components/preview/TableOfContents";
import { BacklinksPanel } from "@/components/preview/BacklinksPanel";
import { FileTree } from "@/components/sidebar/FileTree";
import { TagPanel } from "@/components/sidebar/TagPanel";
import { HomeView } from "@/components/home/HomeView";
import { SearchModal } from "@/components/search/SearchModal";
import { ImportModal } from "@/components/notes/ImportModal";
import { TrashPanel } from "@/components/trash/TrashPanel";
import { CreateNoteModal } from "@/components/notes/CreateNoteModal";
import { KeyboardShortcutsModal } from "@/components/shortcuts/KeyboardShortcutsModal";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FolderPlus,
  Trash2,
  Sun,
  Moon,
  PanelLeft,
  Columns2,
  Eye,
  Save,
  CheckCircle,
  FileText,
  ArrowUpDown,
  Search,
  CalendarDays,
  Keyboard,
  Download,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { filterTreeByTag } from "@/lib/tagTree";
import type { FileTreeNode } from "@/types/note.types";

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme();
  const { autoSaveDelay, editorViewMode, sortBy, sortOrder, updateSetting } =
    useSettingsStore();

  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showHome, setShowHome] = useState(true);
  const [content, setContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [createModal, setCreateModal] = useState<{ open: boolean; folder?: string }>({
    open: false,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const inInput =
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        (active as HTMLElement)?.isContentEditable ||
        active?.closest(".cm-editor");

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "?" && !inInput) {
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Sort tree files on client (folders stay alphabetically sorted from server)
  const sortedTree = useMemo(() => {
    function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
      return nodes
        .map((node) => {
          if (node.type === "folder" && node.children) {
            return { ...node, children: sortNodes(node.children) };
          }
          return node;
        })
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          if (a.type === "folder") return a.name.localeCompare(b.name);
          let cmp: number;
          if (sortBy === "title") {
            cmp = (a.title || a.name).localeCompare(b.title || b.name);
          } else if (sortBy === "created") {
            cmp = (a.created || "").localeCompare(b.created || "");
          } else {
            cmp = (a.updated || "").localeCompare(b.updated || "");
          }
          return sortOrder === "asc" ? cmp : -cmp;
        });
    }
    return sortNodes(tree);
  }, [tree, sortBy, sortOrder]);

  const displayTree = useMemo(() => {
    if (!selectedTag) return sortedTree;
    return filterTreeByTag(sortedTree, selectedTag);
  }, [sortedTree, selectedTag]);

  // Fetch file tree
  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      const { data } = await res.json();
      setTree(data || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Load note content when selected
  useEffect(() => {
    if (!selectedSlug) return;
    (async () => {
      try {
        const res = await fetch(`/api/notes/${selectedSlug}`);
        const { data } = await res.json();
        if (data) {
          setContent(data.content || "");
          setNoteTitle(data.frontmatter?.title || selectedSlug);
        }
      } catch {
        toast.error("Failed to load note");
      }
    })();
  }, [selectedSlug]);

  // Auto-save
  const saveContent = useDebouncedCallback(
    async (slug: string, newContent: string) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/notes/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
        toast.error("Failed to save");
      }
    },
    autoSaveDelay
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      if (selectedSlug) saveContent(selectedSlug, newContent);
    },
    [selectedSlug, saveContent]
  );

  // Open create-note modal (optionally in a folder)
  const handleCreateNote = (folder?: string) => {
    setCreateModal({ open: true, folder });
  };

  // Confirm note creation with title + template content
  const handleCreateNoteConfirm = async (title: string, templateContent: string) => {
    setCreateModal({ open: false });
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, folder: createModal.folder }),
      });
      const { data } = await res.json();
      if (!data?.slug) throw new Error("No slug returned");

      // Write template content if non-blank
      if (templateContent) {
        await fetch(`/api/notes/${data.slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: templateContent }),
        });
      }

      await fetchTree();
      setSelectedSlug(data.slug);
      setShowHome(false);
    } catch {
      toast.error("Failed to create note");
    }
  };

  // Daily note — create or open today's note
  const handleDailyNote = async () => {
    const today = new Date().toISOString().split("T")[0]; // e.g. 2026-03-15
    const slug = `daily/${today}`;

    // Try to load existing
    const res = await fetch(`/api/notes/${slug}`);
    if (res.ok) {
      setSelectedSlug(slug);
      setShowHome(false);
      return;
    }

    // Create new
    try {
      const createRes = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: today, folder: "daily" }),
      });
      const { data } = await createRes.json();
      if (data?.slug) {
        await fetchTree();
        setSelectedSlug(data.slug);
        setShowHome(false);
      }
    } catch {
      toast.error("Failed to create daily note");
    }
  };

  // Export all notes as a ZIP archive
  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  // Wiki-link click: find note by title or slug name in tree
  const handleWikiLinkClick = useCallback(
    (linkText: string) => {
      const lower = linkText.toLowerCase();

      function findInTree(nodes: FileTreeNode[]): string | null {
        for (const node of nodes) {
          if (node.type === "folder") {
            const found = findInTree(node.children || []);
            if (found) return found;
          } else {
            if (
              node.title?.toLowerCase() === lower ||
              node.name.toLowerCase() === lower ||
              node.path.toLowerCase() === lower
            ) {
              return node.path;
            }
          }
        }
        return null;
      }

      const slug = findInTree(tree);
      if (slug) {
        setSelectedSlug(slug);
        setShowHome(false);
      } else {
        toast.error(`Note "${linkText}" not found`);
      }
    },
    [tree]
  );

  // Create folder
  const handleCreateFolder = async (parentFolder?: string) => {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    const folderPath = parentFolder ? `${parentFolder}/${name.trim()}` : name.trim();
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchTree();
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm(`Delete folder "${folderPath}" and all its contents?`)) return;
    try {
      const res = await fetch(
        `/api/folders?path=${encodeURIComponent(folderPath)}&force=true`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Failed to delete folder");
        return;
      }
      if (selectedSlug?.startsWith(folderPath + "/")) {
        setSelectedSlug(null);
        setContent("");
        setNoteTitle("");
      }
      await fetchTree();
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  // Delete note (from header button)
  const handleDelete = async () => {
    if (!selectedSlug) return;
    if (!confirm("Move this note to trash?")) return;
    await doDeleteFile(selectedSlug, true);
  };

  // Delete a file or note (from sidebar)
  const deleteFileOrNote = async (filePath: string, isNote: boolean) => {
    if (!confirm(`Delete "${filePath}"?`)) return;
    await doDeleteFile(filePath, isNote);
  };

  const doDeleteFile = async (filePath: string, isNote: boolean) => {
    try {
      if (isNote) {
        await fetch(`/api/notes/${filePath}`, { method: "DELETE" });
      } else {
        await fetch(
          `/api/folders?path=${encodeURIComponent(filePath)}&type=file`,
          { method: "DELETE" }
        );
      }
      if (selectedSlug === filePath) {
        setSelectedSlug(null);
        setContent("");
        setNoteTitle("");
      }
      await fetchTree();
      toast.success(isNote ? "Moved to trash" : "Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Rename a file or folder
  const handleRename = async (oldPath: string, newName: string) => {
    try {
      const res = await fetch("/api/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: oldPath, newName }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "Failed to rename");
        return;
      }
      const { data } = await res.json();
      if (selectedSlug === oldPath && data.newPath) {
        setSelectedSlug(data.newPath);
        const noteRes = await fetch(`/api/notes/${data.newPath}`);
        const noteJson = await noteRes.json();
        if (noteJson.data) {
          setNoteTitle(noteJson.data.frontmatter?.title || data.newPath);
        }
      }
      await fetchTree();
      toast.success("Renamed");
    } catch {
      toast.error("Failed to rename");
    }
  };

  if (!mounted) return null;

  const previewPane = (className?: string) => (
    <div className={`flex flex-col overflow-hidden ${className ?? "h-full"}`}>
      <TableOfContents content={content} />
      <MarkdownPreview
        content={content}
        slug={selectedSlug ?? undefined}
        className="flex-1"
        onWikiLinkClick={handleWikiLinkClick}
      />
      {selectedSlug && (
        <BacklinksPanel slug={selectedSlug} onSelectNote={setSelectedSlug} />
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Modals */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectNote={(slug) => { setSelectedSlug(slug); setShowHome(false); setSearchOpen(false); }}
      />
      <TrashPanel
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestored={(slug) => { fetchTree(); setSelectedSlug(slug); setShowHome(false); }}
      />
      <CreateNoteModal
        open={createModal.open}
        folder={createModal.folder}
        onClose={() => setCreateModal({ open: false })}
        onConfirm={handleCreateNoteConfirm}
      />
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchTree()}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <button
          className="text-sm font-semibold hover:opacity-70 transition-opacity"
          onClick={() => { setShowHome(true); setSelectedSlug(null); }}
          title="Go to Home"
        >
          ⌂ Notes
        </button>

        <div className="flex items-center gap-2">
          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Saved
            </span>
          )}

          {/* View mode toggle */}
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 rounded-r-none ${editorViewMode === "editor" ? "bg-muted" : ""}`}
              onClick={() => updateSetting("editorViewMode", "editor")}
              title="Editor only"
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 rounded-none border-x ${editorViewMode === "split" ? "bg-muted" : ""}`}
              onClick={() => updateSetting("editorViewMode", "split")}
              title="Split view"
            >
              <Columns2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 rounded-l-none ${editorViewMode === "preview" ? "bg-muted" : ""}`}
              onClick={() => updateSetting("editorViewMode", "preview")}
              title="Preview only"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSearchOpen(true)}
            title="Search (Cmd+K)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          {/* Keyboard shortcuts */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </Button>

          {/* Delete selected note */}
          {selectedSlug && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={handleDelete}
              title="Move to trash"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={10}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <div className="flex items-center gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Sort">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuRadioGroup
                        value={sortBy}
                        onValueChange={(v) => updateSetting("sortBy", v as SortBy)}
                      >
                        <DropdownMenuRadioItem value="updated">Modified date</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="created">Created date</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={sortOrder}
                        onValueChange={(v) => updateSetting("sortOrder", v as SortOrder)}
                      >
                        <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleDailyNote}
                    title="Today's daily note"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCreateFolder()}
                    title="New folder"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCreateNote()}
                    title="New note"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setTrashOpen(true)}
                    title="Trash"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Export / Import">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuRadioGroup value="">
                        <DropdownMenuRadioItem value="export" onSelect={handleExport}>
                          Export ZIP
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="import" onSelect={() => setImportOpen(true)}>
                          Import...
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {selectedTag && (
                <div className="flex items-center gap-1 px-3 py-1 bg-primary/5 border-b">
                  <Tag className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-xs text-primary flex-1 truncate">{selectedTag}</span>
                  <button onClick={() => setSelectedTag(null)}>
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                <FileTree
                  tree={displayTree}
                  selectedSlug={selectedSlug}
                  onSelectNote={(slug) => { setSelectedSlug(slug); setShowHome(false); }}
                  onCreateNote={handleCreateNote}
                  onCreateFolder={handleCreateFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onDeleteFile={deleteFileOrNote}
                  onRename={handleRename}
                  onUploadToFolder={() => fetchTree()}
                />
              </div>
              <TagPanel
                tree={tree}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor + Preview area */}
          <ResizablePanel defaultSize={80}>
            {showHome ? (
              <HomeView
                tree={tree}
                onSelectNote={(slug) => { setSelectedSlug(slug); setShowHome(false); }}
                onNewNote={() => setCreateModal({ open: true })}
                onDailyNote={handleDailyNote}
              />
            ) : !selectedSlug ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a note or create a new one</p>
                  <p className="text-xs mt-1 opacity-60">Press ? for keyboard shortcuts</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Note title */}
                <div className="px-4 py-2 border-b shrink-0">
                  <h2 className="text-lg font-semibold">{noteTitle}</h2>
                </div>

                {/* Editor / Preview */}
                <div className="flex-1 overflow-hidden">
                  {editorViewMode === "editor" ? (
                    <MarkdownEditor
                      content={content}
                      onChange={handleContentChange}
                      slug={selectedSlug ?? undefined}
                    />
                  ) : editorViewMode === "preview" ? (
                    previewPane()
                  ) : (
                    <ResizablePanelGroup orientation="horizontal">
                      <ResizablePanel defaultSize={50} minSize={30}>
                        <MarkdownEditor
                          content={content}
                          onChange={handleContentChange}
                          slug={selectedSlug ?? undefined}
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={50} minSize={20}>
                        {previewPane()}
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  )}
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
