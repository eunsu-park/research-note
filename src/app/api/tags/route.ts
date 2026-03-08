import { NextResponse } from "next/server";
import { getAllTags, syncAllNotes } from "@/lib/db/sync";

/** GET /api/tags - Get all tags with counts */
export async function GET() {
  try {
    syncAllNotes();
    const tags = getAllTags();
    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("Failed to get tags:", error);
    return NextResponse.json(
      { error: "Failed to get tags" },
      { status: 500 }
    );
  }
}
