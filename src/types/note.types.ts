/** Frontmatter metadata parsed from YAML header of a markdown file */
export interface NoteFrontmatter {
  title: string;
  tags: string[];
  created: string;
  updated: string;
  [key: string]: unknown;
}

/** A complete note with content and metadata */
export interface Note {
  slug: string;
  frontmatter: NoteFrontmatter;
  content: string;
}

/** Summary of a note for list views (without full content) */
export interface NoteSummary {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  excerpt: string;
}

/** Backlink result — a note that references the current note */
export interface BacklinkResult {
  slug: string;
  title: string;
}

/** Search result */
export interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  matchType: "title" | "content" | "tag";
}

/** Item in the trash */
export interface TrashItem {
  trashName: string;
  originalSlug: string;
  title: string;
  trashedAt: string;
}

/** A node in the hierarchical tag tree */
export interface TagNode {
  segment: string;
  fullTag: string;
  count: number;
  totalCount: number;
  children: Map<string, TagNode>;
}

/** Node in the file tree (file or folder) */
export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
  title?: string;
  excerpt?: string;
  created?: string;
  updated?: string;
  tags?: string[];
}
