import { NextResponse } from "next/server";
import { getAllTags, syncAllNotes } from "@/lib/db/sync";
import { buildTagTree } from "@/lib/tags/hierarchy";

/** GET /api/tags - Get all tags with counts and tree structure */
export async function GET() {
  try {
    syncAllNotes();
    const tags = getAllTags();
    const tree = buildTagTree(tags);
    return NextResponse.json({ data: { tags, tree } });
  } catch (error) {
    console.error("Failed to get tags:", error);
    return NextResponse.json(
      { error: "Failed to get tags" },
      { status: 500 }
    );
  }
}
