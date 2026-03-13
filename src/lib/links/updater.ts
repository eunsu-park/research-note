import { listNoteSlugs, readNote, writeNote } from "@/lib/filesystem/notes";
import { syncNote } from "@/lib/db/sync";

/**
 * Update all wiki-links across all notes when a note is renamed.
 * Handles [[old-slug]], [[old-slug#heading]], and [[old-slug|display text]] patterns.
 * Returns the number of notes that were modified.
 */
export function updateWikiLinksInAllNotes(
  oldSlug: string,
  newSlug: string
): number {
  const escaped = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\[\\[${escaped}(#[^\\]|]*)?(\\|[^\\]]*)?\\]\\]`,
    "g"
  );

  const slugs = listNoteSlugs();
  let modifiedCount = 0;

  for (const slug of slugs) {
    // Skip the renamed note itself
    if (slug === newSlug) continue;

    const note = readNote(slug);
    if (!note) continue;

    const updated = note.content.replace(pattern, (_, hash, display) => {
      return `[[${newSlug}${hash || ""}${display || ""}]]`;
    });

    if (updated !== note.content) {
      writeNote(slug, updated, note.frontmatter);
      syncNote({ ...note, content: updated });
      modifiedCount++;
    }
  }

  return modifiedCount;
}
