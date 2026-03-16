import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const NOTES_DIR = path.join(process.cwd(), "notes");

function walkDir(dir: string, zip: JSZip, baseDir: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip hidden files and directories (.trash, .DS_Store, etc.)
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      walkDir(fullPath, zip, baseDir);
    } else if (entry.name.endsWith(".md")) {
      const content = fs.readFileSync(fullPath);
      zip.file(relativePath, content);
    }
  }
}

/** GET /api/export — download all notes as a ZIP archive */
export async function GET() {
  try {
    const zip = new JSZip();
    walkDir(NOTES_DIR, zip, NOTES_DIR);

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const date = new Date().toISOString().split("T")[0];

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="notes-${date}.zip"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
