import { NextResponse } from "next/server";
import { listFileTree, createNote } from "@/lib/filesystem/notes";

/** GET /api/notes - List file tree */
export async function GET() {
  try {
    const tree = listFileTree();
    return NextResponse.json({ data: tree });
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
    const { title, folder } = (await request.json()) as {
      title: string;
      folder?: string;
    };
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    const slug = createNote(title.trim(), folder);
    return NextResponse.json({ data: { slug } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
