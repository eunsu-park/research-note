import { NextResponse } from "next/server";
import { findBacklinks } from "@/lib/filesystem/notes";

// GET /api/backlinks?slug=folder/note-name
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    const backlinks = findBacklinks(slug);
    return NextResponse.json({ data: backlinks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
