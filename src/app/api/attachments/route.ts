import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ATTACHMENTS_DIR = path.join(process.cwd(), "attachments");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/markdown", "text/csv",
  "application/json",
  "application/zip",
]);

/** Ensure attachments directory exists */
function ensureAttachmentsDir(): void {
  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
}

/** POST /api/attachments - Upload a file */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' is not allowed` },
        { status: 400 }
      );
    }

    ensureAttachmentsDir();

    // Generate a unique filename to avoid collisions
    const ext = path.extname(file.name) || "";
    const hash = crypto.randomBytes(8).toString("hex");
    const safeName = file.name
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    const filename = `${safeName}-${hash}${ext}`;
    const filePath = path.join(ATTACHMENTS_DIR, filename);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Return the markdown-compatible URL
    const url = `/api/attachments/${filename}`;

    return NextResponse.json(
      {
        data: {
          url,
          filename,
          size: file.size,
          type: file.type,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

/** GET /api/attachments - List all attachments */
export async function GET() {
  try {
    ensureAttachmentsDir();
    const files = fs.readdirSync(ATTACHMENTS_DIR);
    const attachments = files.map((filename) => {
      const filePath = path.join(ATTACHMENTS_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        url: `/api/attachments/${filename}`,
        size: stats.size,
        created: stats.birthtime.toISOString(),
      };
    });

    return NextResponse.json({ data: attachments });
  } catch (error) {
    console.error("Failed to list attachments:", error);
    return NextResponse.json(
      { error: "Failed to list attachments" },
      { status: 500 }
    );
  }
}
