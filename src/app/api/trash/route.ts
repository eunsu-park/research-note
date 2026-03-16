import { NextResponse } from "next/server";
import { listTrash, permanentDeleteFromTrash, emptyTrash } from "@/lib/filesystem/notes";

// GET /api/trash — list trash items
export async function GET() {
  try {
    const items = listTrash();
    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list trash" },
      { status: 500 }
    );
  }
}

// DELETE /api/trash?name=trashName — delete single item
// DELETE /api/trash?all=true — empty trash
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.get("all") === "true") {
      const count = emptyTrash();
      return NextResponse.json({ data: { count } });
    }

    const name = searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const ok = permanentDeleteFromTrash(name);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: { deleted: name } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
