import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const NOTES_DIR = path.join(process.cwd(), "notes");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
};

/** GET /api/files/[...filepath] - Serve files from notes/ directory */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  const { filepath } = await params;
  const relativePath = filepath.join("/");

  // Security: prevent directory traversal
  if (relativePath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.resolve(NOTES_DIR, relativePath);
  if (!fullPath.startsWith(NOTES_DIR + path.sep) && fullPath !== NOTES_DIR) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const fileBuffer = fs.readFileSync(fullPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
