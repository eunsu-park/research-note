"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import { AppShell } from "@/components/layout/AppShell";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { MarpPreview } from "@/components/preview/MarpPreview";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { TableOfContents } from "@/components/preview/TableOfContents";
import { FrontmatterEditor } from "@/components/editor/FrontmatterEditor";
import { VersionHistory } from "@/components/editor/VersionHistory";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Link,
  Save,
  CheckCircle,
  Download,
  Play,
  PanelLeft,
  Columns2,
  Eye,
} from "lucide-react";
import { StickyBoard } from "@/components/stickies/StickyBoard";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

export default function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const {
    currentNote,
    backlinks,
    fetchNote,
    updateNote,
    deleteNote,
  } = useNoteStore();
  const { autoSaveDelay, editorViewMode, updateSetting } = useSettingsStore();
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle"
  );
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    fetchNote(slug);
  }, [slug, fetchNote]);

  // Scroll to heading anchor when URL contains a hash fragment
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const scrollToAnchor = () => {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };

    // Try immediately, then retry after preview renders
    if (!scrollToAnchor()) {
      const timer = setTimeout(scrollToAnchor, 500);
      return () => clearTimeout(timer);
    }
  }, [slug]);

  useEffect(() => {
    if (currentNote?.content !== undefined) {
      setContent(currentNote.content);
    }
  }, [currentNote?.content]);

  const debouncedSave = useDebouncedCallback(
    async (newContent: string) => {
      try {
        setSaveStatus("saving");
        await updateNote(slug, newContent);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
        toast.error("Failed to save note");
      }
    },
    autoSaveDelay
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      debouncedSave(newContent);
    },
    [debouncedSave]
  );

  const handleExportMarp = async (format: string) => {
    try {
      const res = await fetch(`/api/export-marp?slug=${slug}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm("Are you sure you want to delete this note?")
    )
      return;
    try {
      await deleteNote(slug);
      toast.success("Note moved to trash");
      router.push("/");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  if (!currentNote) {
    return (
      <AppShell currentSlug={slug}>
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </AppShell>
    );
  }

  const isSticky = currentNote.frontmatter.noteType === "sticky";
  const isPresentation = currentNote.frontmatter.noteType === "presentation";
  const isMarkdown = !isSticky && !isPresentation;

  return (
    <AppShell currentSlug={slug}>
      <div className="h-full flex flex-col">
        {/* Note header with frontmatter editor */}
        <div className="shrink-0">
          <FrontmatterEditor
            slug={slug}
            frontmatter={currentNote.frontmatter}
            onUpdate={() => fetchNote(slug)}
          />
          {/* Action bar */}
          <div className="flex items-center justify-end px-4 py-1 border-b gap-2">
            {!isSticky && saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3" />
                Saving...
              </span>
            )}
            {!isSticky && saveStatus === "saved" && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Saved
              </span>
            )}

            {/* Present button for presentations */}
            {isPresentation && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1"
                onClick={() => setPresentationMode(true)}
              >
                <Play className="h-3.5 w-3.5" />
                <span className="text-xs">Present</span>
              </Button>
            )}

            {/* View mode toggle */}
            {!isSticky && (
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
            )}

            {/* Export dropdown */}
            {!isSticky && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Export"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(`/api/export?slug=${slug}&format=md`)
                    }
                  >
                    Export as Markdown
                  </DropdownMenuItem>
                  {isPresentation ? (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(
                            `/api/export-marp?slug=${slug}&format=html`
                          )
                        }
                      >
                        Export as HTML
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportMarp("pdf")}
                      >
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportMarp("pptx")}
                      >
                        Export as PPTX
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(`/api/export?slug=${slug}&format=html`)
                      }
                    >
                      Export as HTML
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isMarkdown && <VersionHistory slug={slug} />}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={handleDelete}
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        {isSticky ? (
          <div className="flex-1 overflow-hidden">
            <StickyBoard groupSlug={slug} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {editorViewMode === "editor" ? (
              <MarkdownEditor
                content={content}
                onChange={handleContentChange}
              />
            ) : editorViewMode === "preview" ? (
              isPresentation ? (
                <MarpPreview content={content} />
              ) : (
                <div className="h-full flex flex-col overflow-hidden">
                  <TableOfContents content={content} />
                  <MarkdownPreview
                    content={content}
                    className="flex-1"
                  />

                  {/* Backlinks section */}
                  {backlinks.length > 0 && (
                    <>
                      <Separator />
                      <div className="p-3 shrink-0">
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Link className="h-3 w-3" />
                          Backlinks ({backlinks.length})
                        </h3>
                        <div className="space-y-1">
                          {backlinks.map((bl) => (
                            <button
                              key={bl.slug}
                              onClick={() =>
                                router.push(`/notes/${bl.slug}`)
                              }
                              className="block text-sm text-primary hover:underline"
                            >
                              {bl.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize={50} minSize={30}>
                  <MarkdownEditor
                    content={content}
                    onChange={handleContentChange}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={20}>
                  {isPresentation ? (
                    <MarpPreview content={content} />
                  ) : (
                    <div className="h-full flex flex-col overflow-hidden">
                      <TableOfContents content={content} />
                      <MarkdownPreview
                        content={content}
                        className="flex-1"
                      />

                      {/* Backlinks section */}
                      {backlinks.length > 0 && (
                        <>
                          <Separator />
                          <div className="p-3 shrink-0">
                            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              Backlinks ({backlinks.length})
                            </h3>
                            <div className="space-y-1">
                              {backlinks.map((bl) => (
                                <button
                                  key={bl.slug}
                                  onClick={() =>
                                    router.push(`/notes/${bl.slug}`)
                                  }
                                  className="block text-sm text-primary hover:underline"
                                >
                                  {bl.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        )}
      </div>

      {/* Presentation mode overlay */}
      {presentationMode && (
        <PresentationMode
          content={content}
          onExit={() => setPresentationMode(false)}
        />
      )}
    </AppShell>
  );
}
