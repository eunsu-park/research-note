import { NextResponse } from "next/server";
import {
  renderMarp,
  buildMarpDocument,
  buildMarpPresentation,
} from "@/lib/marp/render";

/** POST /api/render-marp - Render Marp markdown to HTML document */
export async function POST(request: Request) {
  try {
    const { content, mode, dark } = (await request.json()) as {
      content: string;
      mode?: "preview" | "presentation";
      dark?: boolean;
    };

    const result = renderMarp(content || "");
    const document =
      mode === "presentation"
        ? buildMarpPresentation(result)
        : buildMarpDocument(result, { dark });

    return NextResponse.json({
      data: { document, slideCount: result.slideCount },
    });
  } catch (error) {
    console.error("Failed to render Marp:", error);
    return NextResponse.json(
      { error: "Failed to render Marp content" },
      { status: 500 }
    );
  }
}
