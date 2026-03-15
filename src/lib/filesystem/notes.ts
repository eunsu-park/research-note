import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Note, NoteFrontmatter, FileTreeNode } from "@/types/note.types";

const NOTES_DIR = path.join(process.cwd(), "notes");

/** Ensure the notes directory exists */
export function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

/** Validate a slug/path to prevent directory traversal attacks */
function validatePath(slug: string): void {
  const resolved = path.resolve(NOTES_DIR, slug);
  if (!resolved.startsWith(NOTES_DIR + path.sep) && resolved !== NOTES_DIR) {
    throw new Error("Invalid path: directory traversal detected");
  }
  if (slug.includes("..")) {
    throw new Error("Invalid path: '..' not allowed");
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

/** Get the file path for a note slug (supports nested paths like "folder/note") */
function getNotePath(slug: string): string {
  validatePath(slug);
  return path.join(NOTES_DIR, `${slug}.md`);
}

/** Get a unique slug by appending a numeric suffix if the slug already exists */
function getUniqueSlug(baseSlug: string): string {
  if (!fs.existsSync(getNotePath(baseSlug))) return baseSlug;
  let counter = 1;
  while (fs.existsSync(getNotePath(`${baseSlug}-${counter}`))) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
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
    title: data.title || path.basename(slug),
    tags: Array.isArray(data.tags) ? data.tags : [],
    created: data.created || fs.statSync(filePath).birthtime.toISOString(),
    updated: data.updated || fs.statSync(filePath).mtime.toISOString(),
    ...data,
  };

  return { slug, frontmatter, content };
}

/** Write a note to disk */
export function writeNote(
  slug: string,
  content: string,
  frontmatter: NoteFrontmatter
): void {
  ensureNotesDir();
  const filePath = getNotePath(slug);

  // Ensure parent directories exist for nested slugs
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fm = { ...frontmatter, updated: new Date().toISOString() };
  const raw = matter.stringify({ content } as unknown as string, fm);
  fs.writeFileSync(filePath, raw, "utf-8");
}

/** Create a new note and return its slug */
export function createNote(title: string, folder?: string): string {
  const baseName = slugify(title) || "untitled";
  const baseSlug = folder ? `${folder}/${baseName}` : baseName;
  const slug = getUniqueSlug(baseSlug);
  const now = new Date().toISOString();

  const frontmatter: NoteFrontmatter = {
    title,
    tags: [],
    created: now,
    updated: now,
  };

  writeNote(slug, "", frontmatter);
  return slug;
}

/** Delete a note permanently */
export function deleteNote(slug: string): boolean {
  const filePath = getNotePath(slug);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** Create a folder under notes/ */
export function createFolder(folderPath: string): void {
  validatePath(folderPath);
  const fullPath = path.join(NOTES_DIR, folderPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/** Delete a folder (empty only unless force=true) */
export function deleteFolder(
  folderPath: string,
  force = false
): boolean {
  validatePath(folderPath);
  const fullPath = path.join(NOTES_DIR, folderPath);
  if (!fs.existsSync(fullPath)) return false;

  const entries = fs.readdirSync(fullPath);
  if (entries.length > 0 && !force) return false;

  fs.rmSync(fullPath, { recursive: true });
  return true;
}

/** Delete any file (note or non-note) under notes/ */
export function deleteFile(filePath: string): boolean {
  validatePath(filePath);
  const fullPath = path.join(NOTES_DIR, filePath);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory())
    return false;
  fs.unlinkSync(fullPath);
  return true;
}

/** Rename a file or folder. Returns the new relative path (slug for notes). */
export function renameItem(oldRelPath: string, newName: string): string {
  validatePath(oldRelPath);

  // Resolve the actual filesystem path: notes use slugs without .md
  let oldFull = path.join(NOTES_DIR, oldRelPath);
  let isNoteSlug = false;

  if (!fs.existsSync(oldFull)) {
    // Might be a note slug — try with .md
    const withMd = oldFull + ".md";
    if (fs.existsSync(withMd)) {
      oldFull = withMd;
      isNoteSlug = true;
    } else {
      throw new Error("Item not found");
    }
  }

  const parentDir = path.dirname(oldFull);
  const isDir = fs.statSync(oldFull).isDirectory();

  let newFileName: string;

  if (isDir) {
    newFileName = newName;
  } else if (isNoteSlug || oldFull.endsWith(".md")) {
    // Markdown note: update frontmatter title, then rename file
    const slug = isNoteSlug
      ? oldRelPath
      : oldRelPath.replace(/\.md$/, "");
    const note = readNote(slug);
    if (note) {
      writeNote(slug, note.content, { ...note.frontmatter, title: newName });
    }
    newFileName = `${slugify(newName) || "untitled"}.md`;
  } else {
    // Non-markdown file (image, etc.): keep extension
    const ext = path.extname(oldRelPath);
    newFileName = newName.endsWith(ext) ? newName : newName + ext;
  }

  const newFull = path.join(parentDir, newFileName);
  if (newFull !== oldFull) {
    if (fs.existsSync(newFull)) {
      throw new Error("An item with that name already exists");
    }
    fs.renameSync(oldFull, newFull);
  }

  const relPath = path.relative(NOTES_DIR, newFull);
  // Return slug (without .md) for notes, full relative path for others
  return relPath.endsWith(".md") ? relPath.replace(/\.md$/, "") : relPath;
}

/** Recursively build a file tree from the notes directory */
export function listFileTree(dir: string = NOTES_DIR): FileTreeNode[] {
  ensureNotesDir();

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(NOTES_DIR, fullPath);

    if (entry.isDirectory()) {
      // Skip hidden directories
      if (entry.name.startsWith(".")) continue;

      const children = listFileTree(fullPath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "folder",
        children,
      });
    } else if (entry.name.startsWith(".")) {
      // Skip hidden files
      continue;
    } else if (entry.name.endsWith(".md")) {
      const slug = relativePath.replace(/\.md$/, "");
      const note = readNote(slug);

      nodes.push({
        name: entry.name.replace(/\.md$/, ""),
        path: slug,
        type: "file",
        title: note?.frontmatter.title || entry.name.replace(/\.md$/, ""),
        excerpt: note ? generateExcerpt(note.content) : "",
        created: note?.frontmatter.created,
        updated: note?.frontmatter.updated,
      });
    } else {
      // Non-markdown files (images, etc.)
      const stat = fs.statSync(fullPath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "file",
        title: entry.name,
        created: stat.birthtime.toISOString(),
        updated: stat.mtime.toISOString(),
      });
    }
  }

  // Sort: folders first (alphabetically), files unsorted (client sorts)
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    if (a.type === "folder") return a.name.localeCompare(b.name);
    return 0;
  });

  return nodes;
}
