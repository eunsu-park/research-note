/** Frontmatter metadata parsed from YAML header of a markdown file */
export interface NoteFrontmatter {
  title: string;
  tags: string[];
  created: string;
  updated: string;
  template?: string;
  pinned?: boolean;
  folder?: string;
  noteType?: "note" | "sticky" | "presentation";
  [key: string]: unknown;
}

/** A complete note with content and metadata */
export interface Note {
  slug: string;
  frontmatter: NoteFrontmatter;
  content: string;
  rawContent: string;
}

/** Summary of a note for list views (without full content) */
export interface NoteSummary {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  excerpt: string;
  pinned?: boolean;
  folder?: string;
  noteType?: string;
}

/** Sort options for note list */
export type SortBy = "updated" | "created" | "title";
export type SortOrder = "asc" | "desc";

/** A link between two notes, optionally targeting a specific section */
export interface NoteLink {
  source: string;
  target: string;
  section?: string;
}

/** Node in the knowledge graph */
export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  linkCount: number;
}

/** Edge in the knowledge graph */
export interface GraphEdge {
  source: string;
  target: string;
}

/** Full graph data for visualization */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Search result with highlighted snippet */
export interface SearchResult {
  slug: string;
  title: string;
  snippet: string;
  tags: string[];
  score: number;
}

/** Note template definition */
export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

/** API response wrapper */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
