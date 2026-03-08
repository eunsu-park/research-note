import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";
import { syncAllNotes } from "@/lib/db/sync";
import type { NoteSummary } from "@/types/note.types";

/** GET /api/notes/by-date?year=2026&month=3 - Get notes grouped by date for a month */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Valid year and month (1-12) are required" },
        { status: 400 }
      );
    }

    syncAllNotes();

    const db = getDb();
    const monthStr = String(month).padStart(2, "0");
    const startDate = `${year}-${monthStr}-01`;
    // End date: first day of next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = String(nextMonth).padStart(2, "0");
    const endDate = `${nextYear}-${nextMonthStr}-01`;

    const rows = db
      .prepare(
        `SELECT slug, title, tags, excerpt, created, updated, pinned, folder
         FROM notes
         WHERE date(created) >= date(?) AND date(created) < date(?)
            OR date(updated) >= date(?) AND date(updated) < date(?)
         ORDER BY updated DESC`
      )
      .all(startDate, endDate, startDate, endDate) as Array<{
      slug: string;
      title: string;
      tags: string;
      excerpt: string;
      created: string;
      updated: string;
      pinned: number;
      folder: string;
    }>;

    // Group by date
    const dateMap: Record<string, NoteSummary[]> = {};

    for (const row of rows) {
      const note: NoteSummary = {
        slug: row.slug,
        title: row.title,
        tags: JSON.parse(row.tags),
        excerpt: row.excerpt,
        created: row.created,
        updated: row.updated,
        pinned: row.pinned === 1,
        folder: row.folder || undefined,
      };

      // Add to created date
      const createdDate = row.created.slice(0, 10);
      if (createdDate >= startDate && createdDate < endDate) {
        if (!dateMap[createdDate]) dateMap[createdDate] = [];
        dateMap[createdDate].push(note);
      }

      // Add to updated date (if different from created)
      const updatedDate = row.updated.slice(0, 10);
      if (
        updatedDate !== createdDate &&
        updatedDate >= startDate &&
        updatedDate < endDate
      ) {
        if (!dateMap[updatedDate]) dateMap[updatedDate] = [];
        dateMap[updatedDate].push(note);
      }
    }

    return NextResponse.json({ data: dateMap });
  } catch (error) {
    console.error("Failed to get notes by date:", error);
    return NextResponse.json(
      { error: "Failed to get notes by date" },
      { status: 500 }
    );
  }
}
