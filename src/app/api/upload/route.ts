import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const NOTES_DIR = path.join(process.cwd(), "notes");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

/** POST /api/upload - Upload a file to the note's directory */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const slug = formData.get("slug") as string | null;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}. Allowed: png, jpg, gif, webp, svg` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Determine target directory: explicit folder > note's folder > root
    let targetDir = NOTES_DIR;
    if (folder) {
      if (folder.includes("..")) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      targetDir = path.join(NOTES_DIR, folder);
    } else if (slug && slug.includes("/")) {
      const noteFolder = slug.substring(0, slug.lastIndexOf("/"));
      if (noteFolder.includes("..")) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      targetDir = path.join(NOTES_DIR, noteFolder);
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Sanitize filename: keep extension, replace unsafe chars
    const ext = path.extname(file.name) || ".png";
    const baseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 100);

    // Generate unique filename
    let fileName = `${baseName}${ext}`;
    let filePath = path.join(targetDir, fileName);
    let counter = 1;
    while (fs.existsSync(filePath)) {
      fileName = `${baseName}-${counter}${ext}`;
      filePath = path.join(targetDir, fileName);
      counter++;
    }

    // Verify resolved path is still inside NOTES_DIR
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(NOTES_DIR + path.sep) && resolved !== NOTES_DIR) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Return the relative path for markdown insertion
    return NextResponse.json({
      data: {
        fileName,
        relativePath: `./${fileName}`,
        markdown: `![${baseName}](./${fileName})`,
      },
    });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
