import { NextResponse } from "next/server";
import { readNote } from "@/lib/filesystem/notes";
import { renderMarkdown } from "@/lib/markdown/render";
import matter from "gray-matter";

/** GET /api/export?slug=xxx&format=html|md|raw */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const format = searchParams.get("format") || "md";

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    const note = readNote(slug);
    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    switch (format) {
      case "md": {
        // Return the raw markdown file with frontmatter
        return new NextResponse(note.rawContent, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${slug}.md"`,
          },
        });
      }

      case "html": {
        const bodyHtml = await renderMarkdown(note.content);
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.frontmatter.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
    .tags { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .tag { background: #f0f0f0; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'SFMono-Regular', Consolas, monospace; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #555; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="meta">
    <h1>${escapeHtml(note.frontmatter.title)}</h1>
    <div>Created: ${note.frontmatter.created} | Updated: ${note.frontmatter.updated}</div>
    ${note.frontmatter.tags.length > 0 ? `<div class="tags">${note.frontmatter.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
  </div>
  ${bodyHtml}
</body>
</html>`;

        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${slug}.html"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Failed to export note:", error);
    return NextResponse.json(
      { error: "Failed to export note" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
