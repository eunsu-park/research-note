"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "@/stores/noteStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, SlidersHorizontal, X } from "lucide-react";
import DOMPurify from "dompurify";
import { useDebouncedCallback } from "@/hooks/useDebounce";

const NOTE_TYPES = [
  { label: "All", value: "" },
  { label: "Note", value: "note" },
  { label: "Presentation", value: "presentation" },
  { label: "Sticky", value: "sticky" },
];

export function SearchPanel() {
  const router = useRouter();
  const {
    searchQuery,
    searchResults,
    searchLoading,
    searchFilters,
    tags,
    search,
    setSearchFilters,
    fetchTags,
  } = useNoteStore();
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const debouncedSearch = useDebouncedCallback((query: string) => {
    search(query);
  }, 300);

  const hasActiveFilters = Object.values(searchFilters).some((v) => v);

  const clearFilters = () => {
    setSearchFilters({ tag: "", noteType: "", dateFrom: "", dateTo: "" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            className="pl-8 pr-8"
            defaultValue={searchQuery}
            onChange={(e) => debouncedSearch(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className={`absolute right-0.5 top-0.5 h-7 w-7 ${hasActiveFilters ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
            title="Filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="space-y-2 p-2 rounded-md border bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Filters
              </span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3 mr-0.5" />
                  Clear
                </Button>
              )}
            </div>

            {/* Note type */}
            <div>
              <span className="text-xs text-muted-foreground">Type</span>
              <div className="flex gap-1 mt-1 flex-wrap">
                {NOTE_TYPES.map((t) => (
                  <Button
                    key={t.value}
                    variant={
                      searchFilters.noteType === t.value ? "default" : "outline"
                    }
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSearchFilters({ noteType: t.value })}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tag filter */}
            {tags.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Tag</span>
                <div className="flex gap-1 mt-1 flex-wrap max-h-20 overflow-y-auto">
                  {searchFilters.tag && (
                    <Badge
                      variant="default"
                      className="cursor-pointer text-xs"
                      onClick={() => setSearchFilters({ tag: "" })}
                    >
                      {searchFilters.tag}
                      <X className="h-2.5 w-2.5 ml-0.5" />
                    </Badge>
                  )}
                  {tags
                    .filter((t) => t.tag !== searchFilters.tag)
                    .slice(0, 15)
                    .map((t) => {
                      const segments = t.tag.split("/");
                      const displayName = segments[segments.length - 1];
                      return (
                        <Badge
                          key={t.tag}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => setSearchFilters({ tag: t.tag })}
                          title={t.tag}
                        >
                          {displayName}
                        </Badge>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-xs text-muted-foreground">From</span>
                <Input
                  type="date"
                  className="h-7 text-xs mt-0.5"
                  value={searchFilters.dateFrom}
                  onChange={(e) =>
                    setSearchFilters({ dateFrom: e.target.value })
                  }
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">To</span>
                <Input
                  type="date"
                  className="h-7 text-xs mt-0.5"
                  value={searchFilters.dateTo}
                  onChange={(e) =>
                    setSearchFilters({ dateTo: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {searchLoading && (
            <div className="text-sm text-muted-foreground p-2">
              Searching...
            </div>
          )}

          {!searchLoading &&
            (searchQuery || hasActiveFilters) &&
            searchResults.length === 0 && (
              <div className="text-sm text-muted-foreground p-2">
                No results found
              </div>
            )}

          {searchResults.map((result) => (
            <button
              key={result.slug}
              onClick={() => router.push(`/notes/${result.slug}`)}
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="font-medium truncate">{result.title}</span>
              </div>
              {result.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {result.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div
                className="text-xs text-muted-foreground mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(result.snippet),
                }}
              />
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
