import { NextResponse } from "next/server";
import { slugify, renameNote, readNote, writeNote } from "@/lib/filesystem/notes";
import { renameNoteInDb, syncNoteBySlug } from "@/lib/db/sync";
import { updateWikiLinksInAllNotes } from "@/lib/links/updater";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: oldSlug } = await params;
    const body = await request.json();
    const { newTitle } = body;

    if (!newTitle || typeof newTitle !== "string") {
      return NextResponse.json(
        { error: "newTitle is required" },
        { status: 400 }
      );
    }

    const newSlug = slugify(newTitle.trim());
    if (!newSlug) {
      return NextResponse.json(
        { error: "Invalid title (produces empty slug)" },
        { status: 400 }
      );
    }

    // No change needed
    if (newSlug === oldSlug) {
      return NextResponse.json({ data: { slug: oldSlug, changed: false } });
    }

    // Rename file on disk
    const renamed = renameNote(oldSlug, newSlug);
    if (!renamed) {
      return NextResponse.json(
        { error: "Rename failed (note not found or target slug already exists)" },
        { status: 409 }
      );
    }

    // Update slug in database (notes + links + FTS)
    renameNoteInDb(oldSlug, newSlug);

    // Update the renamed note's title in frontmatter
    const note = readNote(newSlug);
    if (note) {
      const updatedFrontmatter = {
        ...note.frontmatter,
        title: newTitle.trim(),
        updated: new Date().toISOString(),
      };
      writeNote(newSlug, note.content, updatedFrontmatter);
      syncNoteBySlug(newSlug);
    }

    // Update wiki-links in all other notes
    const updatedCount = updateWikiLinksInAllNotes(oldSlug, newSlug);

    return NextResponse.json({
      data: {
        slug: newSlug,
        oldSlug,
        changed: true,
        wikiLinksUpdated: updatedCount,
      },
    });
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename note" },
      { status: 500 }
    );
  }
}
