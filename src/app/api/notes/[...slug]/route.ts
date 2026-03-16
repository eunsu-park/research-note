import { NextResponse } from "next/server";
import { readNote, writeNote, moveToTrash } from "@/lib/filesystem/notes";

type Params = { params: Promise<{ slug: string[] }> };

/** GET /api/notes/[...slug] - Read a single note */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const noteSlug = slug.join("/");
  try {
    const note = readNote(noteSlug);
    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: note });
  } catch (error) {
    console.error("Failed to read note:", error);
    return NextResponse.json(
      { error: "Failed to read note" },
      { status: 500 }
    );
  }
}

/** PUT /api/notes/[...slug] - Update a note */
export async function PUT(request: Request, { params }: Params) {
  const { slug } = await params;
  const noteSlug = slug.join("/");
  try {
    const existing = readNote(noteSlug);
    if (!existing) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const content = body.content ?? existing.content;
    const frontmatter = { ...existing.frontmatter, ...body.frontmatter };

    writeNote(noteSlug, content, frontmatter);
    return NextResponse.json({ data: { slug: noteSlug } });
  } catch (error) {
    console.error("Failed to update note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

/** DELETE /api/notes/[...slug] - Move note to trash */
export async function DELETE(_request: Request, { params }: Params) {
  const { slug } = await params;
  const noteSlug = slug.join("/");
  try {
    const moved = moveToTrash(noteSlug);
    if (!moved) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { slug: noteSlug } });
  } catch (error) {
    console.error("Failed to move note to trash:", error);
    return NextResponse.json(
      { error: "Failed to move note to trash" },
      { status: 500 }
    );
  }
}
