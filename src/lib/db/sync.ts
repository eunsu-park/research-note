import fs from "fs";
import path from "path";
import { getDb } from "./schema";
import {
  readNote,
  generateExcerpt,
  ensureNotesDir,
  NOTES_DIR,
} from "@/lib/filesystem/notes";
import { extractLinks } from "@/lib/links/parser";
import type { Note, GraphData, GraphNode, GraphEdge } from "@/types/note.types";

/** Sync a single note to the database */
export function syncNote(note: Note): void {
  const db = getDb();
  const { slug, frontmatter, content } = note;
  const excerpt = generateExcerpt(content);
  const tags = JSON.stringify(frontmatter.tags);

  const pinned = frontmatter.pinned ? 1 : 0;
  const folder = (frontmatter.folder as string) || "";
  const noteType = (frontmatter.noteType as string) || "note";

  const upsert = db.prepare(`
    INSERT INTO notes (slug, title, tags, content, excerpt, created, updated, pinned, folder, note_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      tags = excluded.tags,
      content = excluded.content,
      excerpt = excluded.excerpt,
      updated = excluded.updated,
      pinned = excluded.pinned,
      folder = excluded.folder,
      note_type = excluded.note_type
  `);

  upsert.run(
    slug,
    frontmatter.title,
    tags,
    content,
    excerpt,
    frontmatter.created,
    frontmatter.updated,
    pinned,
    folder,
    noteType
  );

  // Update links
  const deleteLinks = db.prepare("DELETE FROM links WHERE source = ?");
  const insertLink = db.prepare(
    "INSERT OR IGNORE INTO links (source, target) VALUES (?, ?)"
  );

  deleteLinks.run(slug);
  const links = extractLinks(slug, content);
  for (const link of links) {
    insertLink.run(link.source, link.target);
  }
}

/** Sync all notes from disk to the database (incremental, mtime-based) */
export function syncAllNotes(): void {
  const db = getDb();
  ensureNotesDir();

  // Scan disk: get slug and mtime for each .md file
  const diskFiles = fs
    .readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      slug: f.replace(/\.md$/, ""),
      mtime: fs.statSync(path.join(NOTES_DIR, f)).mtimeMs,
    }));
  const diskSlugs = new Set(diskFiles.map((f) => f.slug));

  // Get stored mtimes from DB
  const dbRows = db
    .prepare("SELECT slug, file_mtime FROM notes")
    .all() as Array<{ slug: string; file_mtime: number | null }>;
  const dbMtimes = new Map(dbRows.map((r) => [r.slug, r.file_mtime]));

  // Determine what needs updating
  const toDelete = dbRows
    .filter((r) => !diskSlugs.has(r.slug))
    .map((r) => r.slug);
  const toSync = diskFiles.filter(({ slug, mtime }) => {
    const stored = dbMtimes.get(slug);
    return stored === null || stored === undefined || stored !== mtime;
  });

  // Early exit if nothing changed
  if (toDelete.length === 0 && toSync.length === 0) return;

  const transaction = db.transaction(() => {
    const deleteNote = db.prepare("DELETE FROM notes WHERE slug = ?");
    const deleteLinks = db.prepare(
      "DELETE FROM links WHERE source = ? OR target = ?"
    );
    const updateMtime = db.prepare(
      "UPDATE notes SET file_mtime = ? WHERE slug = ?"
    );

    // Remove notes deleted from disk
    for (const slug of toDelete) {
      deleteNote.run(slug);
      deleteLinks.run(slug, slug);
    }

    // Sync only changed/new files
    for (const { slug, mtime } of toSync) {
      const note = readNote(slug);
      if (note) {
        syncNote(note);
        updateMtime.run(mtime, slug);
      }
    }
  });

  transaction();
}

/** Sync a single note by slug (re-read from disk) */
export function syncNoteBySlug(slug: string): void {
  const note = readNote(slug);
  if (note) {
    syncNote(note);
  } else {
    // Note was deleted from disk
    const db = getDb();
    db.prepare("DELETE FROM notes WHERE slug = ?").run(slug);
    db.prepare("DELETE FROM links WHERE source = ? OR target = ?").run(
      slug,
      slug
    );
  }
}

/** Rename a note's slug in the database (notes + links tables, FTS updated via triggers) */
export function renameNoteInDb(oldSlug: string, newSlug: string): void {
  const db = getDb();

  const transaction = db.transaction(() => {
    // Update links table first
    db.prepare("UPDATE links SET source = ? WHERE source = ?").run(
      newSlug,
      oldSlug
    );
    db.prepare("UPDATE links SET target = ? WHERE target = ?").run(
      newSlug,
      oldSlug
    );

    // Update notes table (AFTER UPDATE trigger handles FTS automatically)
    db.prepare("UPDATE notes SET slug = ? WHERE slug = ?").run(
      newSlug,
      oldSlug
    );
  });

  transaction();
}

/** Remove a note from the database */
export function removeNoteFromDb(slug: string): void {
  const db = getDb();
  db.prepare("DELETE FROM notes WHERE slug = ?").run(slug);
  db.prepare("DELETE FROM links WHERE source = ? OR target = ?").run(
    slug,
    slug
  );
}

/** Get backlinks for a note (notes that link to this note) */
export function getBacklinks(
  slug: string
): Array<{ slug: string; title: string }> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT n.slug, n.title
    FROM links l
    JOIN notes n ON l.source = n.slug
    WHERE l.target = ?
    ORDER BY n.title
  `);
  return stmt.all(slug) as Array<{ slug: string; title: string }>;
}

/** Get forward links for a note */
export function getForwardLinks(
  slug: string
): Array<{ slug: string; title: string }> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT n.slug, n.title
    FROM links l
    JOIN notes n ON l.target = n.slug
    WHERE l.source = ?
    ORDER BY n.title
  `);
  return stmt.all(slug) as Array<{ slug: string; title: string }>;
}

/** Get all tags with their counts */
export function getAllTags(): Array<{ tag: string; count: number }> {
  const db = getDb();
  const rows = db.prepare("SELECT tags FROM notes").all() as {
    tags: string;
  }[];

  const tagCounts = new Map<string, number>();
  for (const row of rows) {
    const tags: string[] = JSON.parse(row.tags);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/** Get graph data for knowledge graph visualization */
export function getGraphData(): GraphData {
  const db = getDb();

  const noteRows = db
    .prepare("SELECT slug, title, tags FROM notes")
    .all() as Array<{
    slug: string;
    title: string;
    tags: string;
  }>;

  const linkRows = db
    .prepare("SELECT source, target FROM links")
    .all() as Array<{
    source: string;
    target: string;
  }>;

  // Count links per node
  const linkCounts = new Map<string, number>();
  for (const link of linkRows) {
    linkCounts.set(link.source, (linkCounts.get(link.source) || 0) + 1);
    linkCounts.set(link.target, (linkCounts.get(link.target) || 0) + 1);
  }

  const nodes: GraphNode[] = noteRows.map((row) => ({
    id: row.slug,
    title: row.title,
    tags: JSON.parse(row.tags),
    linkCount: linkCounts.get(row.slug) || 0,
  }));

  // Only include edges where both source and target exist as nodes
  const slugSet = new Set(noteRows.map((r) => r.slug));
  const edges: GraphEdge[] = linkRows.filter(
    (l) => slugSet.has(l.source) && slugSet.has(l.target)
  );

  return { nodes, edges };
}
