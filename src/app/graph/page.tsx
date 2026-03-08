"use client";

import { useEffect } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { AppShell } from "@/components/layout/AppShell";
import { KnowledgeGraph } from "@/components/graph/KnowledgeGraph";

export default function GraphPage() {
  const { graphData, fetchGraphData } = useNoteStore();

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b shrink-0">
          <h1 className="text-lg font-semibold">Knowledge Graph</h1>
          <p className="text-xs text-muted-foreground">
            Visualize connections between your notes. Click a node to
            open the note.
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          {graphData && graphData.nodes.length > 0 ? (
            <KnowledgeGraph data={graphData} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">
                {graphData
                  ? "No notes with links yet. Use [[wiki-links]] to connect notes."
                  : "Loading graph..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
