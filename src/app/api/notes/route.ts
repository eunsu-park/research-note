import { NextResponse } from "next/server";
import {
  readAllNotes,
  writeNote,
  slugify,
  ensureNotesDir,
  generateExcerpt,
  getNotePath,
} from "@/lib/filesystem/notes";
import { syncAllNotes, syncNote } from "@/lib/db/sync";
import { getDb } from "@/lib/db/schema";
import {
  getTemplate,
  applyTemplateVariables,
} from "@/lib/templates/index";
import type { NoteSummary, NoteFrontmatter } from "@/types/note.types";
import fs from "fs";

/** GET /api/notes - List all notes */
export async function GET() {
  try {
    // Sync from disk on every read to ensure consistency
    syncAllNotes();

    const db = getDb();
    const rows = db
      .prepare(
        "SELECT slug, title, tags, excerpt, created, updated, pinned, folder, note_type FROM notes ORDER BY updated DESC"
      )
      .all() as Array<{
      slug: string;
      title: string;
      tags: string;
      excerpt: string;
      created: string;
      updated: string;
      pinned: number;
      folder: string;
      note_type: string;
    }>;

    const notes: NoteSummary[] = rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      tags: JSON.parse(row.tags),
      excerpt: row.excerpt,
      created: row.created,
      updated: row.updated,
      pinned: row.pinned === 1,
      folder: row.folder || undefined,
      noteType: row.note_type || "note",
    }));

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error("Failed to list notes:", error);
    return NextResponse.json(
      { error: "Failed to list notes" },
      { status: 500 }
    );
  }
}

/** POST /api/notes - Create a new note */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, templateId, noteType } = body as {
      title: string;
      templateId?: string;
      noteType?: "note" | "sticky" | "presentation";
    };

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const slug = slugify(title);
    const filePath = getNotePath(slug);

    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "A note with this title already exists" },
        { status: 409 }
      );
    }

    // Get template content if specified
    let content = "";
    if (noteType === "presentation") {
      content = `---\nmarp: true\ntheme: default\npaginate: true\n---\n\n# ${title}\n\n---\n\n## Slide 2\n\n`;
    } else if (templateId) {
      const template = getTemplate(templateId);
      if (template) {
        content = applyTemplateVariables(template.content, { title });
      }
    }

    const now = new Date().toISOString();
    const frontmatter: NoteFrontmatter = {
      title,
      tags: [],
      created: now,
      updated: now,
      ...(noteType && noteType !== "note" ? { noteType } : {}),
    };

    ensureNotesDir();
    writeNote(slug, content, frontmatter);

    // Sync to DB
    const note = { slug, frontmatter, content, rawContent: "" };
    syncNote(note);

    return NextResponse.json({ data: { slug } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
