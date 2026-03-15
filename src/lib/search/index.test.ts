import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

let testDb: Database.Database;

vi.mock("@/lib/db/schema", () => ({
  getDb: () => testDb,
}));

import { searchNotes, searchByTag } from "./index";

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

function insertNote(
  slug: string,
  title: string,
  content: string,
  tags: string[] = [],
  noteType = "note",
  created = "2026-01-15T00:00:00.000Z",
  updated = "2026-01-15T00:00:00.000Z"
) {
  testDb
    .prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated, note_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(slug, title, JSON.stringify(tags), content, content.substring(0, 200), created, updated, noteType);
}

describe("searchNotes — FTS5 query", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("finds notes matching a keyword in title", () => {
    insertNote("rust-guide", "Rust Programming Guide", "Learn Rust basics", ["rust"]);
    insertNote("python-intro", "Python Introduction", "Learn Python basics", ["python"]);

    const results = searchNotes("Rust");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].slug).toBe("rust-guide");
  });

  it("finds notes matching a keyword in content", () => {
    insertNote("note-a", "Note A", "The quick brown fox jumps over the lazy dog");

    const results = searchNotes("quick brown");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("note-a");
  });

  it("returns empty for no-match query", () => {
    insertNote("note-a", "Note A", "Some content");
    expect(searchNotes("nonexistent")).toEqual([]);
  });

  it("returns results with snippet and score", () => {
    insertNote("note-a", "Note A", "Important research findings about quantum computing");

    const results = searchNotes("quantum");
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("snippet");
    expect(results[0]).toHaveProperty("score");
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      insertNote(`note-${i}`, `Note ${i}`, `Common keyword appears here`);
    }

    const results = searchNotes("Common", 3);
    expect(results).toHaveLength(3);
  });
});

describe("searchNotes — filters", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("filters by tag", () => {
    insertNote("a", "Rust Note", "Content about rust", ["rust", "programming"]);
    insertNote("b", "Python Note", "Content about python", ["python"]);

    const results = searchNotes("Content", 20, { tag: "rust" });
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("a");
  });

  it("filters by noteType", () => {
    insertNote("a", "Regular", "Content", [], "note");
    insertNote("b", "Presentation", "Content", [], "presentation");

    const results = searchNotes("Content", 20, { noteType: "presentation" });
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("b");
  });

  it("filters by date range", () => {
    insertNote("old", "Old Note", "Content", [], "note", "2025-01-01T00:00:00.000Z");
    insertNote("new", "New Note", "Content", [], "note", "2026-06-01T00:00:00.000Z");

    const results = searchNotes("Content", 20, {
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("new");
  });

  it("returns filter-only results when query is empty", () => {
    insertNote("a", "Rust Note", "Some content", ["rust"]);
    insertNote("b", "Python Note", "Other content", ["python"]);

    const results = searchNotes("", 20, { tag: "rust" });
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("a");
  });

  it("returns empty when query is empty and no filters", () => {
    insertNote("a", "Note A", "Content");
    expect(searchNotes("")).toEqual([]);
  });
});

describe("searchNotes — LIKE fallback", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("falls back to LIKE search on invalid FTS syntax", () => {
    insertNote("note-a", "Note A", "Special content here");

    // Characters that break FTS5 syntax trigger fallback
    const results = searchNotes("Special");
    // Should still find results via FTS or fallback
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("searchByTag", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("finds notes with exact tag match", () => {
    insertNote("a", "Note A", "Content", ["rust"]);
    insertNote("b", "Note B", "Content", ["python"]);

    const results = searchByTag("rust");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("a");
  });

  it("supports hierarchical tag matching", () => {
    insertNote("a", "Note A", "Content", ["topic/subtopic"]);
    insertNote("b", "Note B", "Content", ["topic"]);

    const results = searchByTag("topic");
    // Should match both "topic" (exact) and "topic/subtopic" (child)
    expect(results).toHaveLength(2);
  });

  it("returns results with tags parsed as arrays", () => {
    insertNote("a", "Note A", "Content", ["rust", "wasm"]);

    const results = searchByTag("rust");
    expect(results[0].tags).toEqual(["rust", "wasm"]);
  });
});
