import { NextResponse } from "next/server";
import { readNote, writeNote, deleteNoteFile } from "@/lib/filesystem/notes";
import { syncNoteBySlug, removeNoteFromDb } from "@/lib/db/sync";
import { renderMarkdown } from "@/lib/markdown/render";

type RouteParams = { params: Promise<{ slug: string }> };

/** GET /api/notes/[slug] - Get a single note */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    syncNoteBySlug(slug);
    const note = readNote(slug);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const html = await renderMarkdown(note.content);

    return NextResponse.json({
      data: {
        slug: note.slug,
        frontmatter: note.frontmatter,
        content: note.content,
        html,
      },
    });
  } catch (error) {
    console.error("Failed to get note:", error);
    return NextResponse.json(
      { error: "Failed to get note" },
      { status: 500 }
    );
  }
}

/** PUT /api/notes/[slug] - Update a note */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const note = readNote(slug);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, frontmatter: fmUpdates } = body as {
      content?: string;
      frontmatter?: Record<string, unknown>;
    };

    const updatedContent = content ?? note.content;
    const updatedFrontmatter = {
      ...note.frontmatter,
      ...fmUpdates,
      updated: new Date().toISOString(),
    };

    writeNote(slug, updatedContent, updatedFrontmatter);
    syncNoteBySlug(slug);

    const html = await renderMarkdown(updatedContent);

    return NextResponse.json({
      data: {
        slug,
        frontmatter: updatedFrontmatter,
        content: updatedContent,
        html,
      },
    });
  } catch (error) {
    console.error("Failed to update note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

/** DELETE /api/notes/[slug] - Delete a note */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const deleted = deleteNoteFile(slug);

    if (!deleted) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    removeNoteFromDb(slug);

    return NextResponse.json({ data: { slug } });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
