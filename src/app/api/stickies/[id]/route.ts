import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";
import type { StickyNote } from "../route";

/** PUT /api/stickies/[id] - Update a sticky note */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, color, position_x, position_y, sort_order } =
      body as Partial<StickyNote>;

    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM sticky_notes WHERE id = ?")
      .get(Number(id)) as StickyNote | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Sticky note not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE sticky_notes SET
        title = ?, content = ?, color = ?,
        position_x = ?, position_y = ?,
        sort_order = ?, updated = ?
      WHERE id = ?`
    ).run(
      title ?? existing.title,
      content ?? existing.content,
      color ?? existing.color,
      position_x ?? existing.position_x,
      position_y ?? existing.position_y,
      sort_order ?? existing.sort_order,
      now,
      Number(id)
    );

    const updated = db
      .prepare("SELECT * FROM sticky_notes WHERE id = ?")
      .get(Number(id)) as StickyNote;

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Failed to update sticky note:", error);
    return NextResponse.json(
      { error: "Failed to update sticky note" },
      { status: 500 }
    );
  }
}

/** DELETE /api/stickies/[id] - Delete a sticky note */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    db.prepare("DELETE FROM sticky_notes WHERE id = ?").run(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sticky note:", error);
    return NextResponse.json(
      { error: "Failed to delete sticky note" },
      { status: 500 }
    );
  }
}
