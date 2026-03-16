"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/types/note.types";

interface Props {
  notes: FileTreeNode[];
  onSelectNote: (slug: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ notes, onSelectNote }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build a map: dateStr (YYYY-MM-DD) -> notes updated or created on that day
  const notesByDate = new Map<string, FileTreeNode[]>();
  for (const note of notes) {
    const dates = new Set<string>();
    if (note.updated) dates.add(note.updated.slice(0, 10));
    if (note.created) dates.add(note.created.slice(0, 10));
    for (const d of dates) {
      const existing = notesByDate.get(d) ?? [];
      notesByDate.set(d, [...existing, note]);
    }
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Calendar grid calculation
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const selectedNotes = selectedDate ? (notesByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-xs text-muted-foreground py-1">{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayNotes = notesByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasNotes = dayNotes.length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-md py-1 text-xs transition-colors",
                hasNotes ? "cursor-pointer hover:bg-muted" : "cursor-default text-muted-foreground",
                isToday && "font-bold",
                isSelected && "bg-muted ring-1 ring-ring",
              )}
            >
              <span>{day}</span>
              {hasNotes && (
                <span className={cn(
                  "mt-0.5 h-1 w-1 rounded-full",
                  isSelected ? "bg-foreground" : "bg-primary"
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Notes for selected date */}
      {selectedDate && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs text-muted-foreground mb-2">{selectedDate}</p>
          {selectedNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes</p>
          ) : (
            selectedNotes.map((note) => (
              <button
                key={note.path}
                onClick={() => onSelectNote(note.path)}
                className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted truncate"
              >
                {note.title || note.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
