"use client";

import { useEffect, useState, useCallback } from "react";
import { useStickyStore, STICKY_COLORS } from "@/stores/stickyStore";
import { StickyCard } from "./StickyCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface StickyBoardProps {
  groupSlug?: string;
}

export function StickyBoard({ groupSlug = "" }: StickyBoardProps) {
  const { stickies, loading, fetchStickies, createSticky, updateSticky } =
    useStickyStore();
  const [draggedId, setDraggedId] = useState<number | null>(null);

  useEffect(() => {
    fetchStickies(groupSlug);
  }, [fetchStickies, groupSlug]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, id: number) => {
      setDraggedId(id);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: number) => {
      e.preventDefault();
      if (draggedId === null || draggedId === targetId) return;

      const draggedIndex = stickies.findIndex((s) => s.id === draggedId);
      const targetIndex = stickies.findIndex((s) => s.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Reorder: give the dragged item the target's sort_order
      const targetOrder = stickies[targetIndex].sort_order;
      updateSticky(draggedId, { sort_order: targetOrder });

      // Shift others
      const direction = draggedIndex < targetIndex ? 1 : -1;
      for (
        let i = targetIndex;
        direction > 0 ? i > draggedIndex : i < draggedIndex;
        i -= direction
      ) {
        const s = stickies[i];
        updateSticky(s.id, {
          sort_order: stickies[i - direction].sort_order,
        });
      }

      setDraggedId(null);
      // Refetch to get correct order
      setTimeout(() => fetchStickies(groupSlug), 300);
    },
    [draggedId, stickies, updateSticky, fetchStickies]
  );

  if (loading && stickies.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">Sticky Notes</h1>
          <p className="text-sm text-muted-foreground">
            {stickies.length} notes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {STICKY_COLORS.slice(0, 4).map((c) => (
            <Button
              key={c.name}
              variant="outline"
              size="icon"
              className={`h-7 w-7 ${c.bg} ${c.border}`}
              onClick={() => createSticky(groupSlug, c.name)}
              title={`New ${c.name} note`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => createSticky(groupSlug)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {stickies.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">No sticky notes yet</p>
              <Button onClick={() => createSticky(groupSlug)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first sticky note
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {stickies.map((sticky) => (
              <div
                key={sticky.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, sticky.id)}
              >
                <StickyCard
                  sticky={sticky}
                  onDragStart={handleDragStart}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
