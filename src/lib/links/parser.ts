import type { NoteLink } from "@/types/note.types";

/** Regex to match [[wiki-link]] syntax, optionally with display text [[target|display]] */
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Extract all wiki-links from markdown content */
export function extractLinks(slug: string, content: string): NoteLink[] {
  const links: NoteLink[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    const target = slugifyLinkTarget(match[1].trim());
    if (target && target !== slug && !seen.has(target)) {
      seen.add(target);
      links.push({ source: slug, target });
    }
  }

  return links;
}

/** Convert a link target to a slug */
function slugifyLinkTarget(target: string): string {
  return target
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Replace wiki-links in content with markdown links for rendering */
export function renderWikiLinks(content: string): string {
  return content.replace(WIKI_LINK_REGEX, (_match, target, display) => {
    const slug = slugifyLinkTarget(target.trim());
    const text = display?.trim() || target.trim();
    return `[${text}](/notes/${slug})`;
  });
}
