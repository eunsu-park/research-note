"use client";

import { create } from "zustand";

export interface StickyNote {
  id: number;
  title: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  sort_order: number;
  group_slug: string;
  created: string;
  updated: string;
}

export const STICKY_COLORS = [
  { name: "yellow", bg: "bg-yellow-100 dark:bg-yellow-900/40", border: "border-yellow-300 dark:border-yellow-700" },
  { name: "blue", bg: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-300 dark:border-blue-700" },
  { name: "green", bg: "bg-green-100 dark:bg-green-900/40", border: "border-green-300 dark:border-green-700" },
  { name: "pink", bg: "bg-pink-100 dark:bg-pink-900/40", border: "border-pink-300 dark:border-pink-700" },
  { name: "orange", bg: "bg-orange-100 dark:bg-orange-900/40", border: "border-orange-300 dark:border-orange-700" },
  { name: "purple", bg: "bg-purple-100 dark:bg-purple-900/40", border: "border-purple-300 dark:border-purple-700" },
] as const;

interface StickyStore {
  stickies: StickyNote[];
  loading: boolean;
  currentGroup: string;

  fetchStickies: (groupSlug: string) => Promise<void>;
  createSticky: (groupSlug: string, color?: string) => Promise<StickyNote | null>;
  updateSticky: (id: number, data: Partial<StickyNote>) => Promise<void>;
  deleteSticky: (id: number) => Promise<void>;
}

export const useStickyStore = create<StickyStore>((set, get) => ({
  stickies: [],
  loading: false,
  currentGroup: "",

  fetchStickies: async (groupSlug: string) => {
    set({ loading: true, currentGroup: groupSlug });
    const res = await fetch(`/api/stickies?group=${encodeURIComponent(groupSlug)}`);
    const { data } = await res.json();
    set({ stickies: data || [], loading: false });
  },

  createSticky: async (groupSlug: string, color?: string) => {
    const res = await fetch("/api/stickies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: color || "yellow", group_slug: groupSlug }),
    });
    const { data } = await res.json();
    if (data) {
      await get().fetchStickies(groupSlug);
      return data;
    }
    return null;
  },

  updateSticky: async (id: number, data: Partial<StickyNote>) => {
    await fetch(`/api/stickies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    set((state) => ({
      stickies: state.stickies.map((s) =>
        s.id === id ? { ...s, ...data, updated: new Date().toISOString() } : s
      ),
    }));
  },

  deleteSticky: async (id: number) => {
    await fetch(`/api/stickies/${id}`, { method: "DELETE" });
    set((state) => ({
      stickies: state.stickies.filter((s) => s.id !== id),
    }));
  },
}));
