import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "research-notes.db");

let db: Database.Database | null = null;

/** Get or create the SQLite database connection */
export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  return db;
}

/** Initialize database schema */
function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL,
      updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      PRIMARY KEY (source, target)
    );

    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target);

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      slug,
      title,
      content,
      tags,
      content='notes',
      content_rowid='rowid'
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

  // Sticky notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sticky_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'yellow',
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created TEXT NOT NULL,
      updated TEXT NOT NULL
    );
  `);

  // Migrations: add columns that may not exist yet
  runMigrations(db);
}

/** Run schema migrations for new columns */
function runMigrations(db: Database.Database): void {
  // Check if pinned column exists
  const columns = db
    .prepare("PRAGMA table_info(notes)")
    .all() as Array<{ name: string }>;
  const hasColumn = (name: string) => columns.some((c) => c.name === name);

  if (!hasColumn("pinned")) {
    db.exec("ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");
  }

  if (!hasColumn("folder")) {
    db.exec("ALTER TABLE notes ADD COLUMN folder TEXT NOT NULL DEFAULT ''");
  }

  if (!hasColumn("note_type")) {
    db.exec("ALTER TABLE notes ADD COLUMN note_type TEXT NOT NULL DEFAULT 'note'");
  }

  if (!hasColumn("file_mtime")) {
    db.exec("ALTER TABLE notes ADD COLUMN file_mtime REAL DEFAULT NULL");
  }

  // Sticky notes: add group_slug column
  const stickyColumns = db
    .prepare("PRAGMA table_info(sticky_notes)")
    .all() as Array<{ name: string }>;
  const hasStickyColumn = (name: string) =>
    stickyColumns.some((c) => c.name === name);

  if (!hasStickyColumn("group_slug")) {
    db.exec("ALTER TABLE sticky_notes ADD COLUMN group_slug TEXT NOT NULL DEFAULT ''");
  }
}

/** Close the database connection */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
