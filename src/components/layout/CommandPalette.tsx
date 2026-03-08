"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, Network, Plus, Search } from "lucide-react";
import type { SearchResult } from "@/types/note.types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewNote: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNewNote,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then(({ data }) => setResults(data || []))
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search notes or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Notes">
            {results.map((result) => (
              <CommandItem
                key={result.slug}
                onSelect={() => {
                  router.push(`/notes/${result.slug}`);
                  onOpenChange(false);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                {result.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onNewNote();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push("/graph");
              onOpenChange(false);
            }}
          >
            <Network className="mr-2 h-4 w-4" />
            Knowledge Graph
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
