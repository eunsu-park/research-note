import type { FileTreeNode, TagNode } from "@/types/note.types";

/** Collect all tags from all file nodes in the tree (recursive) */
function collectTags(nodes: FileTreeNode[]): { tag: string; slug: string }[] {
  const result: { tag: string; slug: string }[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      result.push(...collectTags(node.children ?? []));
    } else {
      for (const tag of node.tags ?? []) {
        result.push({ tag, slug: node.path });
      }
    }
  }
  return result;
}

/** Build a hierarchical tag tree from a flat FileTreeNode array.
 *  Tags like "ai/llm" produce nested nodes: ai → llm.
 *  Returns a sorted array of root-level TagNodes.
 */
export function buildTagTree(nodes: FileTreeNode[]): TagNode[] {
  const entries = collectTags(nodes);
  const rootMap = new Map<string, TagNode>();

  for (const { tag } of entries) {
    const segments = tag.split("/");
    let currentMap = rootMap;
    let fullPath = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      fullPath = fullPath ? `${fullPath}/${segment}` : segment;
      const isLeaf = i === segments.length - 1;

      if (!currentMap.has(segment)) {
        currentMap.set(segment, {
          segment,
          fullTag: fullPath,
          count: 0,
          totalCount: 0,
          children: new Map(),
        });
      }

      const node = currentMap.get(segment)!;
      if (isLeaf) node.count++;
      currentMap = node.children;
    }
  }

  // Compute totalCount bottom-up and convert to sorted arrays
  function computeTotal(map: Map<string, TagNode>): TagNode[] {
    return [...map.values()]
      .sort((a, b) => a.segment.localeCompare(b.segment))
      .map((node) => {
        const children = computeTotal(node.children);
        const childTotal = children.reduce((sum, c) => sum + c.totalCount, 0);
        return { ...node, totalCount: node.count + childTotal, children: node.children };
      });
  }

  return computeTotal(rootMap);
}

/** Filter a FileTreeNode tree to only include files whose tags match the given tag.
 *  Matching: exact match OR the note has a tag that starts with `tag + "/"`.
 *  Folders are kept only if they have matching descendants.
 */
export function filterTreeByTag(nodes: FileTreeNode[], tag: string): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      const filtered = filterTreeByTag(node.children ?? [], tag);
      if (filtered.length > 0) {
        result.push({ ...node, children: filtered });
      }
    } else {
      const matches = (node.tags ?? []).some(
        (t) => t === tag || t.startsWith(`${tag}/`)
      );
      if (matches) result.push(node);
    }
  }
  return result;
}
