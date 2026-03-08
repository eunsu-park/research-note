import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import matter from "gray-matter";
import { NOTES_DIR, ensureNotesDir, slugify } from "@/lib/filesystem/notes";
import { syncAllNotes } from "@/lib/db/sync";
import { PassThrough } from "stream";

/** GET /api/bulk - Export all notes as ZIP */
export async function GET() {
  try {
    ensureNotesDir();
    const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md"));

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No notes to export" },
        { status: 404 }
      );
    }

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    for (const file of files) {
      const filePath = path.join(NOTES_DIR, file);
      archive.file(filePath, { name: file });
    }

    await archive.finalize();

    // Collect chunks
    const chunks: Buffer[] = [];
    for await (const chunk of passthrough) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="research-notes-${date}.zip"`,
      },
    });
  } catch (error) {
    console.error("Failed to export notes:", error);
    return NextResponse.json(
      { error: "Failed to export notes" },
      { status: 500 }
    );
  }
}

/** POST /api/bulk - Import markdown files */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    ensureNotesDir();

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const file of files) {
      if (!file.name.endsWith(".md")) {
        skipped++;
        continue;
      }

      try {
        const content = await file.text();
        const { data } = matter(content);

        // Determine slug from frontmatter title or filename
        const title = data.title || file.name.replace(/\.md$/, "");
        let slug = slugify(title);

        // Handle slug collisions
        let targetPath = path.join(NOTES_DIR, `${slug}.md`);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          slug = `${slugify(title)}-${counter}`;
          targetPath = path.join(NOTES_DIR, `${slug}.md`);
          counter++;
        }

        // If the file doesn't have frontmatter, add basic frontmatter
        if (Object.keys(data).length === 0) {
          const now = new Date().toISOString();
          const withFrontmatter = matter.stringify(content, {
            title,
            tags: [],
            created: now,
            updated: now,
          });
          fs.writeFileSync(targetPath, withFrontmatter, "utf-8");
        } else {
          fs.writeFileSync(targetPath, content, "utf-8");
        }

        imported++;
      } catch (err) {
        errors.push(`${file.name}: ${String(err)}`);
      }
    }

    // Sync the database after import
    syncAllNotes();

    return NextResponse.json({
      data: {
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to import notes:", error);
    return NextResponse.json(
      { error: "Failed to import notes" },
      { status: 500 }
    );
  }
}
