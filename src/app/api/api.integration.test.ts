/**
 * Integration tests for the note CRUD flow.
 * Tests the full path: filesystem → DB sync → search → graph,
 * exercising the same functions the API routes call.
 *
 * Uses an in-memory DB but the real filesystem (with test-prefixed slugs + cleanup).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import Database from "better-sqlite3";
import type { NoteFrontmatter } from "@/types/note.types";

// --- Test DB setup ---
let testDb: Database.Database;

vi.mock("@/lib/db/schema", () => ({
  getDb: () => testDb,
  closeDb: () => testDb?.close(),
}));

function initTestDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      folder TEXT NOT NULL DEFAULT '',
      note_type TEXT NOT NULL DEFAULT 'note',
      file_mtime REAL DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS links (
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      PRIMARY KEY (source, target)
    );
    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target);
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      slug, title, content, tags,
      content='notes', content_rowid='rowid'
    );
    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, slug, title, content, tags)
      VALUES (new.rowid, new.slug, new.title, new.content, new.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, slug, title, content, tags)
      VALUES ('delete', old.rowid, old.slug, old.title, old.content, old.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, slug, title, content, tags)
      VALUES ('delete', old.rowid, old.slug, old.title, old.content, old.tags);
      INSERT INTO notes_fts(rowid, slug, title, content, tags)
      VALUES (new.rowid, new.slug, new.title, new.content, new.tags);
    END;
  `);
}

// Import after mocks
import {
  writeNote,
  readNote,
  deleteNoteFile,
  getNotePath,
} from "@/lib/filesystem/notes";
import {
  syncNote,
  removeNoteFromDb,
  getBacklinks,
  getForwardLinks,
  getAllTags,
  getGraphData,
} from "@/lib/db/sync";
import { searchNotes, searchByTag } from "@/lib/search/index";

// Use unique prefix to avoid conflicts with real notes
const TEST_PREFIX = `__inttest_${Date.now()}_`;
const createdFiles: string[] = [];

function testSlug(name: string): string {
  return `${TEST_PREFIX}${name}`;
}

function createNote(
  name: string,
  content: string,
  tags: string[] = []
): string {
  const slug = testSlug(name);
  const now = new Date().toISOString();
  const frontmatter: NoteFrontmatter = {
    title: name,
    tags,
    created: now,
    updated: now,
  };
  writeNote(slug, content, frontmatter);
  createdFiles.push(getNotePath(slug));
  const note = readNote(slug);
  if (note) syncNote(note);
  return slug;
}

beforeEach(() => {
  testDb = new Database(":memory:");
  initTestDb(testDb);
});

afterEach(() => {
  testDb.close();
  // Clean up test files from filesystem
  for (const f of createdFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
  createdFiles.length = 0;
});

describe("Note CRUD integration", () => {
  it("creates a note, reads it from DB, and finds it via search", () => {
    const slug = createNote(
      "quantum-computing",
      "Introduction to quantum bits and entanglement",
      ["physics", "computing"]
    );

    // Verify in filesystem
    expect(readNote(slug)).not.toBeNull();

    // Verify in DB
    const dbRow = testDb
      .prepare("SELECT title FROM notes WHERE slug = ?")
      .get(slug) as { title: string };
    expect(dbRow.title).toBe("quantum-computing");

    // Verify via search
    const results = searchNotes("quantum");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].slug).toBe(slug);
  });

  it("updates a note and reflects changes in search", () => {
    const slug = createNote("original-title", "Original content");

    // Update
    const note = readNote(slug)!;
    writeNote(slug, "Updated content about machine learning", {
      ...note.frontmatter,
      updated: new Date().toISOString(),
    });
    const updatedNote = readNote(slug)!;
    syncNote(updatedNote);

    // Search for new content
    const results = searchNotes("machine learning");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].slug).toBe(slug);
  });

  it("deletes a note and removes it from DB and search", () => {
    const slug = createNote("to-delete", "Content to be deleted", ["temp"]);

    // Delete
    deleteNoteFile(slug);
    removeNoteFromDb(slug);

    // Verify removed from filesystem
    expect(readNote(slug)).toBeNull();

    // Verify removed from DB
    const dbRow = testDb
      .prepare("SELECT slug FROM notes WHERE slug = ?")
      .get(slug);
    expect(dbRow).toBeUndefined();

    // Verify removed from search
    const results = searchNotes("deleted");
    expect(results).toEqual([]);

    // Remove from cleanup list since already deleted
    const idx = createdFiles.findIndex(f => f.includes(slug));
    if (idx >= 0) createdFiles.splice(idx, 1);
  });
});

describe("Wiki-links integration", () => {
  // Wiki-link parsing strips underscores (slugifyLinkTarget uses [^a-z0-9\s-]),
  // so we test bidirectional links and graph in sync.test.ts where slugs are simple.
  // Here we verify the link extraction → DB insert → query path with simple slugs.

  it("stores and queries forward links and backlinks", () => {
    // Directly insert notes with links to verify the DB query path
    const slugA = testSlug("link-src");
    const slugB = testSlug("link-tgt");

    // Insert notes manually into DB
    const now = new Date().toISOString();
    testDb.prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(slugA, "Source", "[]", "content", "content", now, now);
    testDb.prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(slugB, "Target", "[]", "content", "content", now, now);
    testDb.prepare("INSERT INTO links (source, target) VALUES (?, ?)").run(slugA, slugB);

    const forward = getForwardLinks(slugA);
    expect(forward).toHaveLength(1);
    expect(forward[0].slug).toBe(slugB);

    const back = getBacklinks(slugB);
    expect(back).toHaveLength(1);
    expect(back[0].slug).toBe(slugA);
  });

  it("builds graph data from DB", () => {
    const slugA = testSlug("graph-a");
    const slugB = testSlug("graph-b");
    const now = new Date().toISOString();

    testDb.prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(slugA, "A", "[]", "", "", now, now);
    testDb.prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(slugB, "B", "[]", "", "", now, now);
    testDb.prepare("INSERT INTO links (source, target) VALUES (?, ?)").run(slugA, slugB);

    const graph = getGraphData();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].source).toBe(slugA);
    expect(graph.edges[0].target).toBe(slugB);
  });
});

describe("Tag system integration", () => {
  it("aggregates tags across notes", () => {
    createNote("tag-a", "Content", ["rust", "wasm"]);
    createNote("tag-b", "Content", ["rust", "python"]);
    createNote("tag-c", "Content", ["python"]);

    const tags = getAllTags();
    const rustTag = tags.find((t) => t.tag === "rust");
    const pythonTag = tags.find((t) => t.tag === "python");
    expect(rustTag!.count).toBe(2);
    expect(pythonTag!.count).toBe(2);
  });

  it("searches by tag", () => {
    createNote("rust-guide", "Content about Rust", ["rust"]);
    createNote("python-guide", "Content about Python", ["python"]);

    const results = searchByTag("rust");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("rust-guide");
  });
});
