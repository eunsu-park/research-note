import type { NoteLink } from "@/types/note.types";

/**
 * Regex to match [[wiki-link]] syntax with optional section and display text.
 * Supported forms:
 *   [[target]]
 *   [[target|display]]
 *   [[target#heading]]
 *   [[target#heading|display]]
 */
const WIKI_LINK_REGEX =
  /\[\[([^\]#|]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** Convert a link target to a slug */
function slugifyLinkTarget(target: string): string {
  return target
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Convert heading text to an anchor ID (matching rehype-slug / github-slugger) */
export function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Extract all wiki-links from markdown content (deduplicated at note level) */
export function extractLinks(slug: string, content: string): NoteLink[] {
  const links: NoteLink[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset regex state for reuse
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    const target = slugifyLinkTarget(match[1].trim());
    const section = match[2] ? slugifyHeading(match[2].trim()) : undefined;
    if (target && target !== slug && !seen.has(target)) {
      seen.add(target);
      links.push({ source: slug, target, section });
    }
  }

  return links;
}

/** Replace wiki-links in content with markdown links for rendering */
export function renderWikiLinks(content: string): string {
  // Reset regex state for reuse
  WIKI_LINK_REGEX.lastIndex = 0;

  return content.replace(
    WIKI_LINK_REGEX,
    (_match, target: string, section: string | undefined, display: string | undefined) => {
      const noteSlug = slugifyLinkTarget(target.trim());
      const anchor = section ? slugifyHeading(section.trim()) : "";
      const href = anchor ? `/notes/${noteSlug}#${anchor}` : `/notes/${noteSlug}`;

      // Display text priority: explicit > "target#section" > "target"
      const text =
        display?.trim() ||
        (section ? `${target.trim()}#${section.trim()}` : target.trim());

      return `[${text}](${href})`;
    }
  );
}
