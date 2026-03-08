"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import type { NoteSummary } from "@/types/note.types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {}

export function CalendarGrid({}: CalendarGridProps) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [dateMap, setDateMap] = useState<Record<string, NoteSummary[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/notes/by-date?year=${year}&month=${month}`);
    const { data } = await res.json();
    setDateMap(data || {});
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: number; dateStr: string } | null> = [];

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      days.push(null);
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: d, dateStr });
    }

    return days;
  }, [year, month]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(todayStr);
  };

  const selectedNotes = selectedDate ? dateMap[selectedDate] || [] : [];

  const handleCreateDaily = async () => {
    const res = await fetch("/api/daily", { method: "POST" });
    const { data } = await res.json();
    if (data?.slug) {
      router.push(`/notes/${data.slug}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Calendar</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-7" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Calendar + Detail split */}
      <div className="flex-1 overflow-auto p-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="min-h-[80px]" />;
            }

            const isToday = day.dateStr === todayStr;
            const isSelected = day.dateStr === selectedDate;
            const notes = dateMap[day.dateStr] || [];
            const noteCount = notes.length;

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`min-h-[80px] p-1.5 text-left rounded-md border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }`}
                  >
                    {day.date}
                  </span>
                  {noteCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {noteCount}
                    </span>
                  )}
                </div>

                {/* Note dots */}
                <div className="mt-1 space-y-0.5">
                  {notes.slice(0, 3).map((note) => (
                    <div
                      key={note.slug}
                      className="text-[10px] truncate text-muted-foreground leading-tight"
                    >
                      {note.title}
                    </div>
                  ))}
                  {noteCount > 3 && (
                    <div className="text-[10px] text-muted-foreground/60">
                      +{noteCount - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected date detail */}
        {selectedDate && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "default",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCreateDaily}
              >
                <Plus className="h-3 w-3 mr-1" />
                Daily Note
              </Button>
            </div>

            {selectedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes on this date.
              </p>
            ) : (
              <div className="space-y-1">
                {selectedNotes.map((note) => (
                  <button
                    key={note.slug}
                    onClick={() => router.push(`/notes/${note.slug}`)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {note.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {note.excerpt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
