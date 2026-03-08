import { NextRequest, NextResponse } from "next/server";
import { searchNotes, searchByTag } from "@/lib/search/index";
import type { SearchFilters } from "@/lib/search/index";
import { syncAllNotes } from "@/lib/db/sync";

/** GET /api/search?q=query&tag=tagname&noteType=note&dateFrom=2024-01-01&dateTo=2024-12-31 */
export async function GET(request: NextRequest) {
  try {
    // Ensure DB is synced
    syncAllNotes();

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q") || "";
    const tag = searchParams.get("tag") || "";
    const noteType = searchParams.get("noteType") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    // Legacy tag-only search (used by sidebar tag panel)
    if (tag && !query && !noteType && !dateFrom && !dateTo) {
      const results = searchByTag(tag);
      return NextResponse.json({ data: results });
    }

    // Build filters
    const filters: SearchFilters = {};
    if (tag) filters.tag = tag;
    if (noteType) filters.noteType = noteType;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const hasFilters = Object.keys(filters).length > 0;

    if (query || hasFilters) {
      const results = searchNotes(query, 20, filters);
      return NextResponse.json({ data: results });
    }

    return NextResponse.json({ data: [] });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
