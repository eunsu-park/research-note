"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  const [html, setHtml] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const renderContent = useDebouncedCallback(async (md: string) => {
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: md }),
      });
      const { data } = await res.json();
      setHtml(data?.html || "");
    } catch {
      setHtml("<p>Failed to render preview</p>");
    }
  }, 300);

  useEffect(() => {
    renderContent(content);
  }, [content, renderContent]);

  // Initialize Mermaid diagrams after HTML is rendered
  useEffect(() => {
    if (!html || !containerRef.current) return;

    const mermaidElements =
      containerRef.current.querySelectorAll("code.language-mermaid");
    if (mermaidElements.length === 0) return;

    import("mermaid").then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains("dark")
          ? "dark"
          : "default",
      });

      mermaidElements.forEach((el, i) => {
        const pre = el.parentElement;
        if (!pre) return;

        const wrapper = document.createElement("div");
        wrapper.className = "mermaid";
        wrapper.textContent = el.textContent || "";

        mermaid.default
          .render(`mermaid-${i}`, el.textContent || "")
          .then(({ svg }) => {
            wrapper.innerHTML = svg;
            pre.replaceWith(wrapper);
          })
          .catch(() => {
            // Leave the code block as-is if rendering fails
          });
      });
    });
  }, [html]);

  return (
    <div className={`h-full min-h-0 overflow-y-auto ${className}`}>
      <div
        id="markdown-preview-content"
        ref={containerRef}
        className="prose prose-sm dark:prose-invert max-w-none p-6"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ADD_TAGS: ["iframe", "ins", "del", "mark"], ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "srcdoc", "sandbox"] }) }}
      />
    </div>
  );
}
