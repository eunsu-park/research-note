"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SortBy = "updated" | "title" | "created";
export type SortOrder = "asc" | "desc";

export interface AppSettings {
  editorFontSize: number;
  showLineNumbers: boolean;
  lineWrapping: boolean;
  autoSaveDelay: number;
  editorViewMode: "split" | "editor" | "preview";
  sortBy: SortBy;
  sortOrder: SortOrder;
}

interface SettingsStore extends AppSettings {
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  editorFontSize: 14,
  showLineNumbers: true,
  lineWrapping: true,
  autoSaveDelay: 1000,
  editorViewMode: "split",
  sortBy: "updated",
  sortOrder: "desc",
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSetting: (key, value) => set({ [key]: value }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "research-notes-lite-settings",
    }
  )
);
