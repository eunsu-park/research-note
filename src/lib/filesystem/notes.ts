import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Note, NoteFrontmatter } from "@/types/note.types";

const NOTES_DIR = path.join(process.cwd(), "notes");
const TRASH_DIR = path.join(process.cwd(), ".trash");

/** Ensure the notes directory exists */
export function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

/** Generate a slug from a title */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Get the file path for a note slug */
export function getNotePath(slug: string): string {
  return path.join(NOTES_DIR, `${slug}.md`);
}

/** Create default frontmatter for a new note */
function defaultFrontmatter(title: string): NoteFrontmatter {
  const now = new Date().toISOString();
  return {
    title,
    tags: [],
    created: now,
    updated: now,
  };
}

/** Generate an excerpt from note content */
function generateExcerpt(content: string, maxLength = 200): string {
  const plain = content.replace(/[#*`\[\]()>_~-]/g, "").trim();
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).trimEnd() + "...";
}

/** Read a single note from disk */
export function readNote(slug: string): Note | null {
  const filePath = getNotePath(slug);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const frontmatter: NoteFrontmatter = {
    title: data.title || slug,
    tags: Array.isArray(data.tags) ? data.tags : [],
    created: data.created || fs.statSync(filePath).birthtime.toISOString(),
    updated: data.updated || fs.statSync(filePath).mtime.toISOString(),
    ...data,
  };

  return { slug, frontmatter, content, rawContent: raw };
}

/** Write a note to disk */
export function writeNote(
  slug: string,
  content: string,
  frontmatter: NoteFrontmatter
): void {
  ensureNotesDir();
  const filePath = getNotePath(slug);
  const fm = { ...frontmatter, updated: new Date().toISOString() };
  const raw = matter.stringify({ content } as unknown as string, fm);
  fs.writeFileSync(filePath, raw, "utf-8");
}

/** Delete a note by moving it to trash */
export function deleteNoteFile(slug: string): boolean {
  const filePath = getNotePath(slug);
  if (!fs.existsSync(filePath)) return false;

  if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const trashPath = path.join(TRASH_DIR, `${slug}_${timestamp}.md`);
  fs.renameSync(filePath, trashPath);
  return true;
}

/** List trashed notes */
export function listTrashedNotes(): Array<{ slug: string; filename: string; deletedAt: string }> {
  if (!fs.existsSync(TRASH_DIR)) return [];

  return fs
    .readdirSync(TRASH_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const match = filename.match(/^(.+)_(\d+)\.md$/);
      if (!match) return null;
      return {
        slug: match[1],
        filename,
        deletedAt: new Date(Number(match[2])).toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/** Restore a note from trash */
export function restoreNoteFromTrash(filename: string): boolean {
  const trashPath = path.join(TRASH_DIR, filename);
  if (!fs.existsSync(trashPath)) return false;

  const match = filename.match(/^(.+)_\d+\.md$/);
  if (!match) return false;

  const slug = match[1];
  const notePath = getNotePath(slug);

  // If a note with same slug exists, add suffix
  let targetPath = notePath;
  let targetSlug = slug;
  let counter = 1;
  while (fs.existsSync(targetPath)) {
    targetSlug = `${slug}-${counter}`;
    targetPath = getNotePath(targetSlug);
    counter++;
  }

  ensureNotesDir();
  fs.renameSync(trashPath, targetPath);
  return true;
}

/** Permanently delete a trashed note */
export function permanentlyDeleteTrash(filename: string): boolean {
  const trashPath = path.join(TRASH_DIR, filename);
  if (!fs.existsSync(trashPath)) return false;
  fs.unlinkSync(trashPath);
  return true;
}

/** Empty the entire trash */
export function emptyTrash(): number {
  if (!fs.existsSync(TRASH_DIR)) return 0;
  const files = fs.readdirSync(TRASH_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    fs.unlinkSync(path.join(TRASH_DIR, file));
  }
  return files.length;
}

/** List all note slugs from disk */
export function listNoteSlugs(): string[] {
  ensureNotesDir();
  return fs
    .readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

/** Read all notes from disk */
export function readAllNotes(): Note[] {
  const slugs = listNoteSlugs();
  const notes: Note[] = [];
  for (const slug of slugs) {
    const note = readNote(slug);
    if (note) notes.push(note);
  }
  return notes;
}

/** Rename a note (change slug) */
export function renameNote(oldSlug: string, newSlug: string): boolean {
  const oldPath = getNotePath(oldSlug);
  const newPath = getNotePath(newSlug);
  if (!fs.existsSync(oldPath) || fs.existsSync(newPath)) return false;
  fs.renameSync(oldPath, newPath);
  return true;
}

export { generateExcerpt, NOTES_DIR };
