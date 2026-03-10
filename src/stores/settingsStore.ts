"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppSettings {
  // Editor
  editorFontSize: number;
  showLineNumbers: boolean;
  lineWrapping: boolean;

  // Auto-save
  autoSaveDelay: number;

  // UI
  defaultSidebarTab: "files" | "tags" | "search";
  editorViewMode: "split" | "editor" | "preview";
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
  defaultSidebarTab: "files",
  editorViewMode: "split",
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSetting: (key, value) => set({ [key]: value }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "research-notes-settings",
    }
  )
);
