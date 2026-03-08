import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ATTACHMENTS_DIR = path.join(process.cwd(), "attachments");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".zip": "application/zip",
  ".json": "application/json",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

type RouteParams = { params: Promise<{ filename: string }> };

/** GET /api/attachments/[filename] - Serve an attachment file */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { filename } = await params;

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(ATTACHMENTS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve attachment:", error);
    return NextResponse.json(
      { error: "Failed to serve attachment" },
      { status: 500 }
    );
  }
}

/** DELETE /api/attachments/[filename] - Delete an attachment */
export async function DELETE(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);
    const filePath = path.join(ATTACHMENTS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ data: { filename: safeName } });
  } catch (error) {
    console.error("Failed to delete attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
