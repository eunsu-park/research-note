import { getDb } from "@/lib/db/schema";
import type { SearchResult } from "@/types/note.types";

export interface SearchFilters {
  tag?: string;
  noteType?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Build WHERE clause and params for filters */
function buildFilterClause(
  filters: SearchFilters,
  tableAlias = "n"
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.tag) {
    // Hierarchical tag matching: exact tag OR child tags (tag/)
    conditions.push(
      `(${tableAlias}.tags LIKE ? OR ${tableAlias}.tags LIKE ?)`
    );
    params.push(`%"${filters.tag}"%`);
    params.push(`%"${filters.tag}/%`);
  }
  if (filters.noteType) {
    conditions.push(`${tableAlias}.note_type = ?`);
    params.push(filters.noteType);
  }
  if (filters.dateFrom) {
    conditions.push(`${tableAlias}.created >= ?`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`${tableAlias}.created <= ?`);
    params.push(filters.dateTo + "T23:59:59.999Z");
  }

  const clause =
    conditions.length > 0 ? " AND " + conditions.join(" AND ") : "";
  return { clause, params };
}

/** Search notes using SQLite FTS5 with optional filters */
export function searchNotes(
  query: string,
  limit = 20,
  filters: SearchFilters = {}
): SearchResult[] {
  const db = getDb();
  const { clause: filterClause, params: filterParams } =
    buildFilterClause(filters);

  // If no query text, use filter-only search
  if (!query.trim()) {
    if (Object.keys(filters).length === 0) return [];
    return filterOnlySearch(filters, limit);
  }

  const ftsQuery = buildFtsQuery(query);

  try {
    const stmt = db.prepare(`
      SELECT
        n.slug,
        n.title,
        n.tags,
        snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
        rank
      FROM notes_fts
      JOIN notes n ON notes_fts.slug = n.slug
      WHERE notes_fts MATCH ?${filterClause}
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(ftsQuery, ...filterParams, limit) as Array<{
      slug: string;
      title: string;
      tags: string;
      snippet: string;
      rank: number;
    }>;

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      snippet: row.snippet,
      tags: JSON.parse(row.tags),
      score: -row.rank,
    }));
  } catch {
    return fallbackSearch(query, limit, filters);
  }
}

/** Search using only filters (no text query) */
function filterOnlySearch(
  filters: SearchFilters,
  limit: number
): SearchResult[] {
  const db = getDb();
  const { clause: filterClause, params: filterParams } =
    buildFilterClause(filters, "n");

  // Remove leading " AND " for standalone WHERE clause
  const whereClause = filterClause ? "WHERE " + filterClause.slice(5) : "";

  const stmt = db.prepare(`
    SELECT n.slug, n.title, n.tags, substr(n.content, 1, 200) as snippet
    FROM notes n
    ${whereClause}
    ORDER BY n.updated DESC
    LIMIT ?
  `);

  const rows = stmt.all(...filterParams, limit) as Array<{
    slug: string;
    title: string;
    tags: string;
    snippet: string;
  }>;

  return rows.map((row, i) => ({
    slug: row.slug,
    title: row.title,
    snippet: row.snippet || "",
    tags: JSON.parse(row.tags),
    score: rows.length - i,
  }));
}

/** Build a valid FTS5 query string */
function buildFtsQuery(query: string): string {
  // Split into tokens, wrap each in quotes for exact prefix matching
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `"${t}"*`);

  return tokens.join(" ");
}

/** Fallback LIKE-based search when FTS query fails */
function fallbackSearch(
  query: string,
  limit: number,
  filters: SearchFilters = {}
): SearchResult[] {
  const db = getDb();
  const pattern = `%${query}%`;
  const { clause: filterClause, params: filterParams } =
    buildFilterClause(filters, "n");

  const stmt = db.prepare(`
    SELECT n.slug, n.title, n.tags,
      substr(n.content, max(1, instr(lower(n.content), lower(?)) - 50), 150) as snippet
    FROM notes n
    WHERE (n.title LIKE ? OR n.content LIKE ? OR n.tags LIKE ?)${filterClause}
    LIMIT ?
  `);

  const rows = stmt.all(
    query,
    pattern,
    pattern,
    pattern,
    ...filterParams,
    limit
  ) as Array<{
    slug: string;
    title: string;
    tags: string;
    snippet: string;
  }>;

  return rows.map((row, i) => ({
    slug: row.slug,
    title: row.title,
    snippet: row.snippet || "",
    tags: JSON.parse(row.tags),
    score: rows.length - i,
  }));
}

/** Search notes by tag (supports hierarchical matching) */
export function searchByTag(tag: string): SearchResult[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT slug, title, tags, substr(content, 1, 200) as snippet
    FROM notes
    WHERE tags LIKE ? OR tags LIKE ?
    ORDER BY updated DESC
  `);

  const rows = stmt.all(`%"${tag}"%`, `%"${tag}/%`) as Array<{
    slug: string;
    title: string;
    tags: string;
    snippet: string;
  }>;

  return rows.map((row, i) => ({
    slug: row.slug,
    title: row.title,
    snippet: row.snippet,
    tags: JSON.parse(row.tags),
    score: rows.length - i,
  }));
}
