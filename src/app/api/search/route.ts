import { NextResponse } from "next/server";
import { searchNotes } from "@/lib/filesystem/notes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 1) {
    return NextResponse.json({ data: [] });
  }

  try {
    const results = searchNotes(query);
    return NextResponse.json({ data: results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
