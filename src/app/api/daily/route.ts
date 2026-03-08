import { NextResponse } from "next/server";
import {
  readNote,
  writeNote,
  getNotePath,
  ensureNotesDir,
} from "@/lib/filesystem/notes";
import { syncNote } from "@/lib/db/sync";
import type { NoteFrontmatter } from "@/types/note.types";
import fs from "fs";

/** Format a date as YYYY-MM-DD */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Format a date for display in the note title */
function formatTitle(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Generate daily note slug from a date */
function dailySlug(date: Date): string {
  return `daily-${formatDate(date)}`;
}

/** Default content template for daily notes */
function dailyTemplate(date: Date): string {
  const dateStr = formatDate(date);
  return `## Journal

Write your thoughts for ${dateStr} here.

## Tasks

- [ ]

## Notes

`;
}

/** POST /api/daily - Create or get today's daily note */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateStr = (body as { date?: string }).date;
    const date = dateStr ? new Date(dateStr) : new Date();
    const slug = dailySlug(date);

    // If the note already exists, just return its slug
    const existing = readNote(slug);
    if (existing) {
      return NextResponse.json({ data: { slug, exists: true } });
    }

    // Create a new daily note
    const title = formatTitle(date);
    const content = dailyTemplate(date);
    const now = new Date().toISOString();
    const frontmatter: NoteFrontmatter = {
      title,
      tags: ["daily"],
      created: now,
      updated: now,
    };

    ensureNotesDir();
    writeNote(slug, content, frontmatter);

    const note = { slug, frontmatter, content, rawContent: "" };
    syncNote(note);

    return NextResponse.json(
      { data: { slug, exists: false } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create daily note:", error);
    return NextResponse.json(
      { error: "Failed to create daily note" },
      { status: 500 }
    );
  }
}

/** GET /api/daily - Get today's daily note slug (or null) */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();
    const slug = dailySlug(date);

    const filePath = getNotePath(slug);
    const exists = fs.existsSync(filePath);

    return NextResponse.json({ data: { slug, exists } });
  } catch (error) {
    console.error("Failed to check daily note:", error);
    return NextResponse.json(
      { error: "Failed to check daily note" },
      { status: 500 }
    );
  }
}
