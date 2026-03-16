import { NextResponse } from "next/server";
import { restoreFromTrash } from "@/lib/filesystem/notes";

// POST /api/trash/restore — restore item from trash
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const slug = restoreFromTrash(name);
    if (!slug) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: { slug } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to restore" },
      { status: 500 }
    );
  }
}
