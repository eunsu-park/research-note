"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Network } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { notes, fetchNotes } = useNoteStore();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <AppShell>
      <div className="h-full flex items-center justify-center">
        <div className="max-w-lg text-center space-y-6 p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Research Notes
            </h1>
            <p className="text-muted-foreground">
              Organize your research with linked markdown notes,
              powerful search, and knowledge graph visualization.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "n",
                  metaKey: true,
                  shiftKey: true,
                });
                window.dispatchEvent(event);
              }}
            >
              <Plus className="h-5 w-5" />
              <span>New Note</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push("/graph")}
            >
              <Network className="h-5 w-5" />
              <span>Knowledge Graph</span>
            </Button>
          </div>

          {notes.length > 0 && (
            <div className="text-left space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Recent Notes
              </h2>
              <div className="space-y-1">
                {notes.slice(0, 5).map((note) => (
                  <button
                    key={note.slug}
                    onClick={() =>
                      router.push(`/notes/${note.slug}`)
                    }
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{note.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
