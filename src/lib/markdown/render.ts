import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import path from "path";

function isRelativePath(src: string): boolean {
  if (!src) return false;
  if (/^https?:\/\//.test(src)) return false;
  if (src.startsWith("/")) return false;
  if (src.startsWith("data:")) return false;
  return true;
}

/** Create a rehype plugin that rewrites relative image/video paths to /api/files/... */
function createRehypeRewriteLocalPaths(noteFolder: string) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img" || node.tagName === "video" || node.tagName === "source") {
        const src = node.properties?.src as string | undefined;
        if (src && isRelativePath(src)) {
          const resolved = path.posix.normalize(
            noteFolder ? `${noteFolder}/${src}` : src
          );
          node.properties!.src = `/api/files/${resolved}`;
        }
      }
    });
  };
}

/** Render markdown content to HTML string */
export async function renderMarkdown(
  content: string,
  slug?: string
): Promise<string> {
  // Determine the folder containing the note (for relative path resolution)
  const noteFolder = slug?.includes("/")
    ? slug.substring(0, slug.lastIndexOf("/"))
    : "";

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(createRehypeRewriteLocalPaths(noteFolder))
    .use(rehypeStringify)
    .process(content);

  return String(result);
}
