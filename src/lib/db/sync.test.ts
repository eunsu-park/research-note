import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import type { Note } from "@/types/note.types";

// Mock the schema module to use an in-memory database
let testDb: Database.Database;

vi.mock("@/lib/db/schema", () => ({
  getDb: () => testDb,
}));

// Mock the filesystem module
vi.mock("@/lib/filesystem/notes", () => ({
  readNote: vi.fn(),
  generateExcerpt: (content: string) => content.substring(0, 200),
  ensureNotesDir: vi.fn(),
  NOTES_DIR: "/tmp/test-notes",
}));

import {
  syncNote,
  syncAllNotes,
  removeNoteFromDb,
  renameNoteInDb,
  getBacklinks,
  getForwardLinks,
  getAllTags,
  getGraphData,
} from "./sync";
import { readNote } from "@/lib/filesystem/notes";

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

function makeNote(slug: string, overrides: Partial<Note> = {}): Note {
  return {
    slug,
    frontmatter: {
      title: slug.replace(/-/g, " "),
      tags: ["test"],
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-01T00:00:00.000Z",
      ...overrides.frontmatter,
    },
    content: overrides.content ?? `Content of ${slug}`,
    rawContent: overrides.rawContent ?? "",
  };
}

describe("syncNote", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("inserts a new note into the database", () => {
    const note = makeNote("hello-world");
    syncNote(note);

    const row = testDb.prepare("SELECT * FROM notes WHERE slug = ?").get("hello-world") as {
      slug: string; title: string; tags: string; content: string;
    };
    expect(row).toBeTruthy();
    expect(row.title).toBe("hello world");
    expect(JSON.parse(row.tags)).toEqual(["test"]);
    expect(row.content).toBe("Content of hello-world");
  });

  it("upserts (updates) an existing note", () => {
    syncNote(makeNote("note-a"));
    syncNote(makeNote("note-a", { content: "Updated content" }));

    const row = testDb.prepare("SELECT content FROM notes WHERE slug = ?").get("note-a") as { content: string };
    expect(row.content).toBe("Updated content");
  });

  it("extracts and stores links", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Note B]]" }));

    const links = testDb.prepare("SELECT * FROM links WHERE source = ?").all("note-a") as Array<{ source: string; target: string }>;
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe("note-b");
  });

  it("replaces old links on re-sync", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Note B]]" }));
    syncNote(makeNote("note-a", { content: "Link to [[Note C]]" }));

    const links = testDb.prepare("SELECT target FROM links WHERE source = ?").all("note-a") as Array<{ target: string }>;
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe("note-c");
  });

  it("stores pinned, folder, and note_type fields", () => {
    syncNote(makeNote("note-a", {
      frontmatter: {
        title: "Note A",
        tags: [],
        created: "2026-01-01T00:00:00.000Z",
        updated: "2026-01-01T00:00:00.000Z",
        pinned: true,
        folder: "research",
        noteType: "presentation",
      },
    }));

    const row = testDb.prepare("SELECT pinned, folder, note_type FROM notes WHERE slug = ?").get("note-a") as {
      pinned: number; folder: string; note_type: string;
    };
    expect(row.pinned).toBe(1);
    expect(row.folder).toBe("research");
    expect(row.note_type).toBe("presentation");
  });
});

describe("syncAllNotes (incremental)", () => {
  const MOCK_NOTES_DIR = "/tmp/test-notes";

  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
    // Create the mock notes directory
    const fs = require("fs");
    if (!fs.existsSync(MOCK_NOTES_DIR)) {
      fs.mkdirSync(MOCK_NOTES_DIR, { recursive: true });
    }
    // Clean out any leftover files
    for (const f of fs.readdirSync(MOCK_NOTES_DIR)) {
      fs.unlinkSync(`${MOCK_NOTES_DIR}/${f}`);
    }
  });

  afterEach(() => {
    testDb.close();
    // Clean up files
    const fs = require("fs");
    if (fs.existsSync(MOCK_NOTES_DIR)) {
      for (const f of fs.readdirSync(MOCK_NOTES_DIR)) {
        fs.unlinkSync(`${MOCK_NOTES_DIR}/${f}`);
      }
    }
  });

  it("syncs new files from disk", () => {
    const fs = require("fs");
    fs.writeFileSync(`${MOCK_NOTES_DIR}/note-a.md`, "---\ntitle: Note A\n---\ncontent");
    vi.mocked(readNote).mockReturnValue(makeNote("note-a"));

    syncAllNotes();

    const row = testDb.prepare("SELECT slug FROM notes WHERE slug = ?").get("note-a");
    expect(row).toBeTruthy();
  });

  it("skips unchanged files (same mtime)", () => {
    const fs = require("fs");
    fs.writeFileSync(`${MOCK_NOTES_DIR}/note-a.md`, "content");
    const mtime = fs.statSync(`${MOCK_NOTES_DIR}/note-a.md`).mtimeMs;

    // Insert a note with matching mtime
    testDb.prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated, file_mtime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run("note-a", "Note A", '["test"]', "content", "content", "2026-01-01", "2026-01-01", mtime);

    vi.mocked(readNote).mockClear();

    syncAllNotes();

    // readNote should NOT have been called since mtime matches
    expect(readNote).not.toHaveBeenCalled();
  });

  it("deletes notes removed from disk", () => {
    // Insert an orphan note (file doesn't exist on disk)
    testDb.prepare(
      "INSERT INTO notes (slug, title, tags, content, excerpt, created, updated, file_mtime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run("orphan", "Orphan", "[]", "", "", "2026-01-01", "2026-01-01", 500);

    // No files on disk (directory is empty)
    syncAllNotes();

    const row = testDb.prepare("SELECT slug FROM notes WHERE slug = ?").get("orphan");
    expect(row).toBeUndefined();
  });
});

describe("removeNoteFromDb", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("removes the note and its links", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Note B]]" }));
    syncNote(makeNote("note-b", { content: "Link to [[Note A]]" }));

    removeNoteFromDb("note-a");

    const noteRow = testDb.prepare("SELECT slug FROM notes WHERE slug = ?").get("note-a");
    expect(noteRow).toBeUndefined();

    const linkRows = testDb.prepare("SELECT * FROM links WHERE source = ? OR target = ?").all("note-a", "note-a");
    expect(linkRows).toHaveLength(0);
  });
});

describe("renameNoteInDb", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("renames slug in notes and links tables", () => {
    syncNote(makeNote("old-slug"));
    syncNote(makeNote("other", { content: "Link to [[Old Slug]]" }));

    renameNoteInDb("old-slug", "new-slug");

    const oldRow = testDb.prepare("SELECT slug FROM notes WHERE slug = ?").get("old-slug");
    const newRow = testDb.prepare("SELECT slug FROM notes WHERE slug = ?").get("new-slug");
    expect(oldRow).toBeUndefined();
    expect(newRow).toBeTruthy();

    const link = testDb.prepare("SELECT target FROM links WHERE source = ?").get("other") as { target: string };
    expect(link.target).toBe("new-slug");
  });
});

describe("getBacklinks / getForwardLinks", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("returns backlinks (notes linking to a target)", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Note B]]" }));
    syncNote(makeNote("note-b"));

    const backlinks = getBacklinks("note-b");
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0].slug).toBe("note-a");
  });

  it("returns forward links (notes a note links to)", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Note B]] and [[Note C]]" }));
    syncNote(makeNote("note-b"));
    syncNote(makeNote("note-c"));

    const forwardLinks = getForwardLinks("note-a");
    expect(forwardLinks).toHaveLength(2);
    expect(forwardLinks.map((l) => l.slug).sort()).toEqual(["note-b", "note-c"]);
  });

  it("returns empty array when no links exist", () => {
    syncNote(makeNote("lonely"));
    expect(getBacklinks("lonely")).toEqual([]);
    expect(getForwardLinks("lonely")).toEqual([]);
  });
});

describe("getAllTags", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("returns tags with counts sorted by frequency", () => {
    syncNote(makeNote("a", { frontmatter: { title: "A", tags: ["rust", "wasm"], created: "2026-01-01", updated: "2026-01-01" } }));
    syncNote(makeNote("b", { frontmatter: { title: "B", tags: ["rust", "python"], created: "2026-01-01", updated: "2026-01-01" } }));
    syncNote(makeNote("c", { frontmatter: { title: "C", tags: ["python"], created: "2026-01-01", updated: "2026-01-01" } }));

    const tags = getAllTags();
    expect(tags[0]).toEqual({ tag: "rust", count: 2 });
    expect(tags[1]).toEqual({ tag: "python", count: 2 });
    expect(tags[2]).toEqual({ tag: "wasm", count: 1 });
  });

  it("returns empty array when no notes exist", () => {
    expect(getAllTags()).toEqual([]);
  });
});

describe("getGraphData", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    initTestDb(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("returns nodes and edges", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Note B]]" }));
    syncNote(makeNote("note-b"));

    const graph = getGraphData();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual({ source: "note-a", target: "note-b" });
  });

  it("excludes edges to non-existent nodes", () => {
    syncNote(makeNote("note-a", { content: "Link to [[Ghost Note]]" }));

    const graph = getGraphData();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it("counts links per node", () => {
    syncNote(makeNote("a", { content: "Link to [[B]] and [[C]]" }));
    syncNote(makeNote("b"));
    syncNote(makeNote("c"));

    const graph = getGraphData();
    const nodeA = graph.nodes.find((n) => n.id === "a");
    expect(nodeA!.linkCount).toBe(2);
  });
});
