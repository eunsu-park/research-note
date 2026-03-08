"use client";

import { useMemo } from "react";
import { List } from "lucide-react";
import { slugifyHeading } from "@/lib/links/parser";

interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

/** Extract headings from markdown content, skipping code blocks */
function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`~\[\]]/g, "").trim();
      const id = slugifyHeading(text);
      headings.push({ level, text, id });
    }
  }

  return headings;
}

export function TableOfContents({
  content,
  className = "",
}: TableOfContentsProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (headings.length === 0) {
    return null;
  }

  const minLevel = Math.min(...headings.map((h) => h.level));

  const scrollToHeading = (heading: TocItem) => {
    const el = document.getElementById(heading.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Fallback: match by text content
    const container = document.getElementById("markdown-preview-content");
    if (!container) return;

    const headingElements = container.querySelectorAll(
      "h1, h2, h3, h4, h5, h6"
    );

    for (const headingEl of headingElements) {
      if (headingEl.textContent?.trim() === heading.text) {
        headingEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  };

  return (
    <div className={`border-b ${className}`}>
      <div className="px-3 py-2">
        <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <List className="h-3 w-3" />
          Table of Contents
        </h3>
        <nav className="max-h-48 overflow-y-auto space-y-0.5">
          {headings.map((heading, i) => (
            <button
              key={`${heading.id}-${i}`}
              onClick={() => scrollToHeading(heading)}
              className="block w-full text-left text-xs hover:text-primary transition-colors truncate"
              style={{
                paddingLeft: `${(heading.level - minLevel) * 12 + 4}px`,
              }}
            >
              <span className="text-muted-foreground hover:text-foreground">
                {heading.text}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
