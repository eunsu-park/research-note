import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Note, NoteFrontmatter, FileTreeNode, SearchResult, TrashItem, BacklinkResult } from "@/types/note.types";

const NOTES_DIR = path.join(process.cwd(), "notes");
const TRASH_DIR = path.join(NOTES_DIR, ".trash");

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
export function getUniqueSlug(baseSlug: string): string {
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

/** Search notes by title, tags, and content */
export function searchNotes(query: string): SearchResult[] {
  ensureNotesDir();
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) walkDir(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".md") || entry.name.startsWith(".")) continue;

      const relativePath = path.relative(NOTES_DIR, fullPath);
      const slug = relativePath.replace(/\.md$/, "");
      const raw = fs.readFileSync(fullPath, "utf-8");
      const { data, content } = matter(raw);
      const title: string = data.title || path.basename(slug);
      const tags: string[] = Array.isArray(data.tags) ? data.tags : [];

      if (title.toLowerCase().includes(q)) {
        results.push({ slug, title, excerpt: generateExcerpt(content), matchType: "title" });
        continue;
      }
      if (tags.some((t) => t.toLowerCase().includes(q))) {
        results.push({ slug, title, excerpt: generateExcerpt(content), matchType: "tag" });
        continue;
      }
      const idx = content.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(content.length, idx + query.length + 60);
        const excerpt = (start > 0 ? "…" : "") + content.slice(start, end).trim() + (end < content.length ? "…" : "");
        results.push({ slug, title, excerpt, matchType: "content" });
      }
    }
  }

  walkDir(NOTES_DIR);
  return results;
}

/** Find all notes that contain a [[wiki-link]] referencing the given slug or its title */
export function findBacklinks(slug: string): BacklinkResult[] {
  ensureNotesDir();

  const targetNote = readNote(slug);
  const targetTitle = targetNote?.frontmatter.title || path.basename(slug);
  const targetName = path.basename(slug);

  // Patterns: [[Title]] or [[slug-name]] or [[folder/slug]]
  const patterns = [targetTitle, targetName, slug].map(
    (t) => new RegExp(`\\[\\[${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`, "i")
  );

  const results: BacklinkResult[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) walkDir(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".md") || entry.name.startsWith(".")) continue;

      const relativePath = path.relative(NOTES_DIR, fullPath);
      const noteSlug = relativePath.replace(/\.md$/, "");
      if (noteSlug === slug) continue; // skip self

      const raw = fs.readFileSync(fullPath, "utf-8");
      const { data, content } = matter(raw);
      const combined = raw; // search full file including frontmatter
      void content;

      if (patterns.some((re) => re.test(combined))) {
        results.push({
          slug: noteSlug,
          title: (data.title as string) || path.basename(noteSlug),
        });
      }
    }
  }

  walkDir(NOTES_DIR);
  return results;
}

/** Move a note to the trash instead of permanently deleting */
export function moveToTrash(slug: string): boolean {
  const filePath = getNotePath(slug);
  if (!fs.existsSync(filePath)) return false;

  if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR, { recursive: true });
  }

  const note = readNote(slug);
  const timestamp = Date.now();
  const trashName = `${slug.replace(/\//g, "---")}---${timestamp}.md`;
  const trashPath = path.join(TRASH_DIR, trashName);

  if (note) {
    const fm = {
      ...note.frontmatter,
      _trashedFrom: slug,
      _trashedAt: new Date().toISOString(),
    };
    const raw = matter.stringify({ content: note.content } as unknown as string, fm);
    fs.writeFileSync(trashPath, raw, "utf-8");
  } else {
    fs.copyFileSync(filePath, trashPath);
  }

  fs.unlinkSync(filePath);
  return true;
}

/** List all items in the trash */
export function listTrash(): TrashItem[] {
  if (!fs.existsSync(TRASH_DIR)) return [];

  const entries = fs.readdirSync(TRASH_DIR, { withFileTypes: true });
  const items: TrashItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const fullPath = path.join(TRASH_DIR, entry.name);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data } = matter(raw);

    items.push({
      trashName: entry.name,
      originalSlug: (data._trashedFrom as string) || entry.name.replace(/\.md$/, ""),
      title: (data.title as string) || entry.name.replace(/\.md$/, ""),
      trashedAt: (data._trashedAt as string) || fs.statSync(fullPath).mtime.toISOString(),
    });
  }

  return items.sort((a, b) => b.trashedAt.localeCompare(a.trashedAt));
}

/** Restore a note from the trash. Returns the restored slug. */
export function restoreFromTrash(trashName: string): string | null {
  const trashPath = path.join(TRASH_DIR, trashName);
  if (!fs.existsSync(trashPath)) return null;

  const raw = fs.readFileSync(trashPath, "utf-8");
  const { data, content } = matter(raw);

  const originalSlug = (data._trashedFrom as string) || trashName.replace(/\.md$/, "");
  // Remove trash-specific fields
  const { _trashedFrom: _tf, _trashedAt: _ta, ...cleanData } = data as Record<string, unknown>;
  void _tf; void _ta;

  const frontmatter: NoteFrontmatter = {
    title: (cleanData.title as string) || originalSlug,
    tags: Array.isArray(cleanData.tags) ? (cleanData.tags as string[]) : [],
    created: (cleanData.created as string) || new Date().toISOString(),
    updated: new Date().toISOString(),
    ...cleanData,
  };

  // Find a unique slug in case the original path is now occupied
  const targetPath = getNotePath(originalSlug);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let restoreSlug = originalSlug;
  if (fs.existsSync(targetPath)) {
    restoreSlug = getUniqueSlug(originalSlug);
  }

  writeNote(restoreSlug, content, frontmatter);
  fs.unlinkSync(trashPath);

  return restoreSlug;
}

/** Permanently delete a single item from the trash */
export function permanentDeleteFromTrash(trashName: string): boolean {
  const trashPath = path.join(TRASH_DIR, trashName);
  if (!fs.existsSync(trashPath)) return false;
  fs.unlinkSync(trashPath);
  return true;
}

/** Empty the entire trash. Returns the number of items deleted. */
export function emptyTrash(): number {
  if (!fs.existsSync(TRASH_DIR)) return 0;
  const entries = fs.readdirSync(TRASH_DIR, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isFile()) {
      fs.unlinkSync(path.join(TRASH_DIR, entry.name));
      count++;
    }
  }
  return count;
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
        tags: note?.frontmatter.tags ?? [],
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
