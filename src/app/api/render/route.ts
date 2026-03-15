import { NextResponse } from "next/server";
import { renderMarkdown } from "@/lib/markdown/render";

/** POST /api/render - Render markdown to HTML (for client-side preview) */
export async function POST(request: Request) {
  try {
    const { content, slug } = (await request.json()) as {
      content: string;
      slug?: string;
    };
    const html = await renderMarkdown(content || "", slug);
    return NextResponse.json({ data: { html } });
  } catch (error) {
    console.error("Failed to render markdown:", error);
    const message = error instanceof Error ? error.message : "Failed to render markdown";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
