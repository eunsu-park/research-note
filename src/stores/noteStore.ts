"use client";

import { create } from "zustand";
import type {
  NoteSummary,
  Note,
  SearchResult,
  GraphData,
  NoteTemplate,
  SortBy,
  SortOrder,
} from "@/types/note.types";

interface NoteStore {
  // Notes list
  notes: NoteSummary[];
  loading: boolean;
  currentNote: Note | null;

  // Sidebar state
  sidebarOpen: boolean;
  sidebarTab: "files" | "tags" | "search";

  // Sort
  sortBy: SortBy;
  sortOrder: SortOrder;

  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  searchFilters: {
    tag: string;
    noteType: string;
    dateFrom: string;
    dateTo: string;
  };

  // Tags
  tags: Array<{ tag: string; count: number }>;
  selectedTag: string | null;

  // Graph
  graphData: GraphData | null;

  // Templates
  templates: NoteTemplate[];

  // Backlinks
  backlinks: Array<{ slug: string; title: string }>;

  // Editor toolbar
  toolbarVisible: boolean;

  // Actions
  fetchNotes: () => Promise<void>;
  fetchNote: (slug: string) => Promise<void>;
  createNote: (
    title: string,
    templateId?: string,
    noteType?: "note" | "sticky" | "presentation"
  ) => Promise<string | null>;
  updateNote: (slug: string, content: string) => Promise<void>;
  updateNoteFrontmatter: (
    slug: string,
    frontmatter: Record<string, unknown>
  ) => Promise<void>;
  deleteNote: (slug: string) => Promise<void>;
  togglePin: (slug: string) => Promise<void>;
  moveToFolder: (slug: string, folder: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  setSearchFilters: (filters: Partial<NoteStore["searchFilters"]>) => void;
  fetchTags: () => Promise<void>;
  filterByTag: (tag: string | null) => Promise<void>;
  fetchGraphData: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchBacklinks: (slug: string) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: "files" | "tags" | "search") => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  setToolbarVisible: (visible: boolean) => void;
}

/** Sort notes array based on sort preferences, with pinned notes always first */
function sortNotes(
  notes: NoteSummary[],
  sortBy: SortBy,
  sortOrder: SortOrder
): NoteSummary[] {
  const sorted = [...notes].sort((a, b) => {
    // Pinned notes always come first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    let cmp = 0;
    switch (sortBy) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "created":
        cmp = new Date(b.created).getTime() - new Date(a.created).getTime();
        break;
      case "updated":
      default:
        cmp = new Date(b.updated).getTime() - new Date(a.updated).getTime();
        break;
    }
    return sortOrder === "asc" ? -cmp : cmp;
  });
  return sorted;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  loading: false,
  currentNote: null,
  sidebarOpen: true,
  sidebarTab: "files",
  sortBy: "updated",
  sortOrder: "desc",
  searchQuery: "",
  searchResults: [],
  searchLoading: false,
  searchFilters: { tag: "", noteType: "", dateFrom: "", dateTo: "" },
  tags: [],
  selectedTag: null,
  graphData: null,
  templates: [],
  backlinks: [],
  toolbarVisible: true,

  fetchNotes: async () => {
    set({ loading: true });
    const res = await fetch("/api/notes");
    const { data } = await res.json();
    const { sortBy, sortOrder } = get();
    set({
      notes: sortNotes(data || [], sortBy, sortOrder),
      loading: false,
    });
  },

  fetchNote: async (slug: string) => {
    const res = await fetch(`/api/notes/${slug}`);
    const { data } = await res.json();
    set({ currentNote: data || null });
    if (data) {
      get().fetchBacklinks(slug);
    }
  },

  createNote: async (title: string, templateId?: string, noteType?: "note" | "sticky" | "presentation") => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, templateId, noteType }),
    });
    const { data } = await res.json();
    if (data?.slug) {
      await get().fetchNotes();
      return data.slug;
    }
    return null;
  },

  updateNote: async (slug: string, content: string) => {
    await fetch(`/api/notes/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  },

  updateNoteFrontmatter: async (
    slug: string,
    frontmatter: Record<string, unknown>
  ) => {
    const res = await fetch(`/api/notes/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frontmatter }),
    });
    const { data } = await res.json();
    if (data) {
      set({ currentNote: data });
    }
  },

  deleteNote: async (slug: string) => {
    await fetch(`/api/notes/${slug}`, { method: "DELETE" });
    set({ currentNote: null });
    await get().fetchNotes();
  },

  togglePin: async (slug: string) => {
    const { notes } = get();
    const note = notes.find((n) => n.slug === slug);
    if (!note) return;

    const newPinned = !note.pinned;
    await fetch(`/api/notes/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frontmatter: { pinned: newPinned } }),
    });
    await get().fetchNotes();
  },

  moveToFolder: async (slug: string, folder: string) => {
    await fetch(`/api/notes/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frontmatter: { folder: folder || undefined } }),
    });
    await get().fetchNotes();
  },

  search: async (query: string) => {
    set({ searchQuery: query, searchLoading: true });
    const { searchFilters } = get();
    const hasFilters = Object.values(searchFilters).some((v) => v);

    if (!query.trim() && !hasFilters) {
      set({ searchResults: [], searchLoading: false });
      return;
    }

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query);
    if (searchFilters.tag) params.set("tag", searchFilters.tag);
    if (searchFilters.noteType) params.set("noteType", searchFilters.noteType);
    if (searchFilters.dateFrom) params.set("dateFrom", searchFilters.dateFrom);
    if (searchFilters.dateTo) params.set("dateTo", searchFilters.dateTo);

    const res = await fetch(`/api/search?${params.toString()}`);
    const { data } = await res.json();
    set({ searchResults: data || [], searchLoading: false });
  },

  setSearchFilters: (filters) => {
    const { searchFilters, searchQuery, search } = get();
    const newFilters = { ...searchFilters, ...filters };
    set({ searchFilters: newFilters });
    // Re-run search with new filters
    search(searchQuery);
  },

  fetchTags: async () => {
    const res = await fetch("/api/tags");
    const { data } = await res.json();
    set({ tags: data || [] });
  },

  filterByTag: async (tag: string | null) => {
    set({ selectedTag: tag, loading: true });
    if (!tag) {
      await get().fetchNotes();
      return;
    }
    const res = await fetch(
      `/api/search?tag=${encodeURIComponent(tag)}`
    );
    const { data } = await res.json();
    const notes: NoteSummary[] = (data || []).map(
      (r: SearchResult) => ({
        slug: r.slug,
        title: r.title,
        tags: r.tags,
        created: "",
        updated: "",
        excerpt: r.snippet,
      })
    );
    set({ notes, loading: false });
  },

  fetchGraphData: async () => {
    const res = await fetch("/api/graph");
    const { data } = await res.json();
    set({ graphData: data || null });
  },

  fetchTemplates: async () => {
    const res = await fetch("/api/templates");
    const { data } = await res.json();
    set({ templates: data || [] });
  },

  fetchBacklinks: async (slug: string) => {
    const res = await fetch(`/api/notes/${slug}/backlinks`);
    const { data } = await res.json();
    set({ backlinks: data || [] });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSortBy: (sortBy) => {
    const { notes, sortOrder } = get();
    set({ sortBy, notes: sortNotes(notes, sortBy, sortOrder) });
  },
  setSortOrder: (sortOrder) => {
    const { notes, sortBy } = get();
    set({ sortOrder, notes: sortNotes(notes, sortBy, sortOrder) });
  },
  setToolbarVisible: (visible) => set({ toolbarVisible: visible }),
}));
