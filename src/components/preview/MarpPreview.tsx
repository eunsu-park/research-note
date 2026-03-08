"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface MarpPreviewProps {
  content: string;
  className?: string;
  mode?: "preview" | "presentation";
  onSlideChange?: (current: number, total: number) => void;
}

export function MarpPreview({
  content,
  className = "",
  mode = "preview",
  onSlideChange,
}: MarpPreviewProps) {
  const [srcdoc, setSrcdoc] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const renderContent = useDebouncedCallback(async (md: string) => {
    try {
      const res = await fetch("/api/render-marp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: md, mode, dark: isDark }),
      });
      const { data } = await res.json();
      setSrcdoc(data?.document || "");
    } catch {
      setSrcdoc("<p>Failed to render Marp preview</p>");
    }
  }, 300);

  useEffect(() => {
    renderContent(content);
  }, [content, renderContent, mode]);

  // Send theme changes to iframe via postMessage (instant, no re-render)
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "marp-theme-change", dark: isDark },
      "*"
    );
  }, [isDark]);

  // Listen for slide navigation messages from iframe
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data?.type === "marp-slide-change") {
        onSlideChange?.(e.data.current, e.data.total);
      }
    },
    [onSlideChange]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <div className={`h-full min-h-0 overflow-hidden ${className}`}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Marp presentation preview"
      />
    </div>
  );
}
