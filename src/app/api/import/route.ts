import { NextResponse } from "next/server";
import path from "path";
import matter from "gray-matter";
import JSZip from "jszip";
import {
  writeNote,
  getUniqueSlug,
  slugify,
  ensureNotesDir,
} from "@/lib/filesystem/notes";
import type { NoteFrontmatter } from "@/types/note.types";

const NOTES_DIR = path.join(process.cwd(), "notes");
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface QueuedEntry {
  name: string;
  getContent: () => Promise<string>;
}

/** Validate that the entry path is safe (no directory traversal) */
function isSafePath(entryName: string): boolean {
  if (entryName.includes("..")) return false;
  if (entryName.startsWith("/")) return false;
  const resolved = path.resolve(NOTES_DIR, entryName);
  return resolved.startsWith(NOTES_DIR + path.sep) || resolved === NOTES_DIR;
}

/** Derive a slug from an import path (strip .md, slugify each segment) */
function pathToSlug(entryName: string): string {
  return entryName
    .replace(/\.md$/i, "")
    .split("/")
    .map((part) => slugify(part) || "untitled")
    .join("/");
}

/** POST /api/import — import .md files or a .zip containing .md files */
export async function POST(request: Request) {
  try {
    ensureNotesDir();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const queue: QueuedEntry[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 100MB limit`);
        continue;
      }

      if (file.name.endsWith(".zip")) {
        try {
          const buffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);
          zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            if (!relativePath.endsWith(".md")) return;
            if (!isSafePath(relativePath)) {
              errors.push(`${relativePath}: unsafe path, skipped`);
              return;
            }
            queue.push({
              name: relativePath,
              getContent: () => zipEntry.async("text"),
            });
          });
        } catch {
          errors.push(`${file.name}: failed to parse ZIP`);
        }
      } else if (file.name.endsWith(".md")) {
        const name = file.name;
        queue.push({ name, getContent: () => file.text() });
      } else {
        errors.push(`${file.name}: unsupported format (use .md or .zip)`);
      }
    }

    let imported = 0;

    for (const entry of queue) {
      try {
        const content = await entry.getContent();
        const parsed = matter(content);

        const data = parsed.data as Record<string, unknown>;
        const now = new Date().toISOString();

        const frontmatter: NoteFrontmatter = {
          title: (data.title as string) || path.basename(entry.name, ".md"),
          tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
          created: (data.created as string) || now,
          updated: now,
          ...data,
        };

        const baseSlug = pathToSlug(entry.name);
        const slug = getUniqueSlug(baseSlug);
        writeNote(slug, parsed.content, frontmatter);
        imported++;
      } catch {
        errors.push(`${entry.name}: failed to import`);
      }
    }

    return NextResponse.json({ data: { imported, errors } });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
