"use client";

import { AppShell } from "@/components/layout/AppShell";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";

export default function CalendarPage() {
  return (
    <AppShell>
      <CalendarGrid />
    </AppShell>
  );
}
