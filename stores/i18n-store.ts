"use client";

import { create } from "zustand";

export type Language = "id" | "en";

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("one_erp_lang");
    if (saved === "en" || saved === "id") {
      return saved;
    }
  }
  // Default is Bahasa Indonesia as explicitly requested by user
  return "id";
};

export const useI18nStore = create<I18nState>((set, get) => ({
  language: getInitialLanguage(),
  setLanguage: (lang: Language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("one_erp_lang", lang);
    }
    set({ language: lang });
  },
  toggleLanguage: () => {
    const current = get().language;
    const next: Language = current === "id" ? "en" : "id";
    get().setLanguage(next);
  },
}));
