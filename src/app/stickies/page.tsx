"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { StickyNote, Plus } from "lucide-react";

export default function StickiesPage() {
  const router = useRouter();
  const { notes, fetchNotes } = useNoteStore();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const stickyNotes = notes.filter((n) => n.noteType === "sticky");

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold">Sticky Notes</h1>
            <p className="text-sm text-muted-foreground">
              {stickyNotes.length} boards
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "n",
                metaKey: true,
                shiftKey: true,
              });
              window.dispatchEvent(event);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Board
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {stickyNotes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  No sticky note boards yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Create a new note and select &quot;Sticky Notes&quot; type
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stickyNotes.map((note) => (
                <button
                  key={note.slug}
                  onClick={() => router.push(`/notes/${note.slug}`)}
                  className="text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-sm truncate">
                      {note.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {note.excerpt || "Empty board"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    {new Date(note.updated).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
