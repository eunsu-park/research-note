import { NextResponse } from "next/server";
import { renderMarkdown } from "@/lib/markdown/render";

/** POST /api/render - Render markdown to HTML (for client-side preview) */
export async function POST(request: Request) {
  try {
    const { content } = (await request.json()) as { content: string };
    const html = await renderMarkdown(content || "");
    return NextResponse.json({ data: { html } });
  } catch (error) {
    console.error("Failed to render markdown:", error);
    return NextResponse.json(
      { error: "Failed to render markdown" },
      { status: 500 }
    );
  }
}
