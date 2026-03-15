import { NextResponse } from "next/server";
import {
  writeNote,
  slugify,
  getUniqueSlug,
  ensureNotesDir,
} from "@/lib/filesystem/notes";
import { syncNote } from "@/lib/db/sync";
import { clipUrl } from "@/lib/clip/html-to-markdown";
import type { NoteFrontmatter } from "@/types/note.types";

/** POST /api/clip - Clip a web page and save as a note */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url?.trim()) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    const result = await clipUrl(url);
    const baseSlug = slugify(result.title);
    const finalSlug = getUniqueSlug(baseSlug);

    const now = new Date().toISOString();
    const frontmatter: NoteFrontmatter = {
      title: result.title,
      tags: ["clipped", result.siteName],
      created: now,
      updated: now,
    };

    ensureNotesDir();
    writeNote(finalSlug, result.content, frontmatter);

    const note = {
      slug: finalSlug,
      frontmatter,
      content: result.content,
      rawContent: "",
    };
    syncNote(note);

    return NextResponse.json(
      { data: { slug: finalSlug, title: result.title } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to clip URL:", error);
    const message =
      error instanceof Error ? error.message : "Failed to clip URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
