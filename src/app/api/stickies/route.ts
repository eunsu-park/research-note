import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";

export interface StickyNote {
  id: number;
  title: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  sort_order: number;
  group_slug: string;
  created: string;
  updated: string;
}

/** GET /api/stickies?group=slug - List sticky notes for a group */
export async function GET(request: NextRequest) {
  try {
    const groupSlug = request.nextUrl.searchParams.get("group") || "";

    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM sticky_notes WHERE group_slug = ? ORDER BY sort_order ASC, created DESC"
      )
      .all(groupSlug) as StickyNote[];

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Failed to list sticky notes:", error);
    return NextResponse.json(
      { error: "Failed to list sticky notes" },
      { status: 500 }
    );
  }
}

/** POST /api/stickies - Create a new sticky note */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, color, group_slug } = body as {
      title?: string;
      content?: string;
      color?: string;
      group_slug?: string;
    };

    const db = getDb();
    const now = new Date().toISOString();
    const slug = group_slug || "";

    const maxOrder = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM sticky_notes WHERE group_slug = ?"
      )
      .get(slug) as { max_order: number };

    const result = db
      .prepare(
        "INSERT INTO sticky_notes (title, content, color, sort_order, group_slug, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        title || "",
        content || "",
        color || "yellow",
        maxOrder.max_order + 1,
        slug,
        now,
        now
      );

    const sticky = db
      .prepare("SELECT * FROM sticky_notes WHERE id = ?")
      .get(result.lastInsertRowid) as StickyNote;

    return NextResponse.json({ data: sticky }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sticky note:", error);
    return NextResponse.json(
      { error: "Failed to create sticky note" },
      { status: 500 }
    );
  }
}
