"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Tag, AlignLeft } from "lucide-react";
import type { SearchResult } from "@/types/note.types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectNote: (slug: string) => void;
}

export function SearchModal({ open, onClose, onSelectNote }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const { data } = await res.json();
        setResults(data || []);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [query]);

  const handleSelect = useCallback(
    (slug: string) => {
      onSelectNote(slug);
      onClose();
    },
    [onSelectNote, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (results[activeIndex]) handleSelect(results[activeIndex].slug);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, activeIndex, handleSelect, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-background border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <span className="text-xs text-muted-foreground">Searching…</span>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <li key={r.slug}>
                <button
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-muted/60 transition-colors ${
                    i === activeIndex ? "bg-muted/60" : ""
                  }`}
                  onClick={() => handleSelect(r.slug)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {r.matchType === "title" ? (
                    <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  ) : r.matchType === "tag" ? (
                    <Tag className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <AlignLeft className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.excerpt}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {!loading && query.trim() && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results for &quot;{query}&quot;
          </div>
        )}

        {/* Hint */}
        {!query && (
          <div className="px-4 py-3 text-xs text-muted-foreground flex gap-4">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
