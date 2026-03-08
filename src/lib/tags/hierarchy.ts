/** A node in the hierarchical tag tree */
export interface TagTreeNode {
  /** Segment name (e.g., "quantum" for "physics/quantum") */
  name: string;
  /** Full path from root (e.g., "physics/quantum") */
  fullPath: string;
  /** Direct count: notes tagged with exactly this tag */
  count: number;
  /** Aggregate count: notes tagged with this tag or any descendant */
  totalCount: number;
  /** Child tags */
  children: TagTreeNode[];
}

/** Build a tree from flat tag-count pairs */
export function buildTagTree(
  tags: Array<{ tag: string; count: number }>
): TagTreeNode[] {
  const root: TagTreeNode[] = [];
  const nodeMap = new Map<string, TagTreeNode>();

  // Sort to ensure parents come before children
  const sorted = [...tags].sort((a, b) => a.tag.localeCompare(b.tag));

  for (const { tag, count } of sorted) {
    const segments = tag.split("/");
    let currentPath = "";
    let parentChildren = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      let node = nodeMap.get(currentPath);
      if (!node) {
        node = {
          name: segment,
          fullPath: currentPath,
          count: 0,
          totalCount: 0,
          children: [],
        };
        nodeMap.set(currentPath, node);
        parentChildren.push(node);
      }

      // Set count on the leaf (the actual tag)
      if (i === segments.length - 1) {
        node.count = count;
      }

      parentChildren = node.children;
    }
  }

  // Compute totalCount bottom-up
  function computeTotals(nodes: TagTreeNode[]): number {
    let sum = 0;
    for (const node of nodes) {
      const childrenTotal = computeTotals(node.children);
      node.totalCount = node.count + childrenTotal;
      sum += node.totalCount;
    }
    return sum;
  }
  computeTotals(root);

  return root;
}

/**
 * Check if a tag matches a hierarchical filter.
 * "physics" matches "physics", "physics/quantum", "physics/quantum/entanglement"
 * but NOT "astrophysics" (must be exact segment match)
 */
export function tagMatchesFilter(tag: string, filter: string): boolean {
  return tag === filter || tag.startsWith(filter + "/");
}
