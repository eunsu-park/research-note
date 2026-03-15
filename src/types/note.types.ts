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
}
