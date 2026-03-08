import { NextResponse } from "next/server";
import { getBacklinks } from "@/lib/db/sync";

type RouteParams = { params: Promise<{ slug: string }> };

/** GET /api/notes/[slug]/backlinks - Get backlinks for a note */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const backlinks = getBacklinks(slug);
    return NextResponse.json({ data: backlinks });
  } catch (error) {
    console.error("Failed to get backlinks:", error);
    return NextResponse.json(
      { error: "Failed to get backlinks" },
      { status: 500 }
    );
  }
}
