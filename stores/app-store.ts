"use client";

import { create } from "zustand";

export interface CompanyInfo {
  id: string;
  code: string;
  name: string;
  currency: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
}

interface AppState {
  currentCompany: CompanyInfo;
  currentUser: UserInfo;
  token: string | null;
  isAuthenticated: boolean;
  commandMenuOpen: boolean;
  setCompany: (company: CompanyInfo) => void;
  setUser: (user: UserInfo) => void;
  login: (token: string, user: UserInfo, company?: CompanyInfo) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setCommandMenuOpen: (open: boolean) => void;
  toggleCommandMenu: () => void;
  hydrateFromStorage: () => void;
}

const DEFAULT_COMPANY: CompanyInfo = {
  id: "c19387c1-7b16-4bf4-b377-590c35d2ae9d",
  code: "ONE-ID",
  name: "PT Sentosa Mandiri Solusindo",
  currency: "IDR",
};

const DEFAULT_USER: UserInfo = {
  id: "5cbe6e5d-a11f-41a2-a9b6-97f61f49b453",
  name: "Administrator",
  email: "admin@one-erp.com",
  role: "admin",
};

// Token, current company and current user are persisted to localStorage so
// a full page reload (used after switching companies, so every page
// refetches under the new tenant) doesn't fall back to the hardcoded demo
// defaults. The store's initial state always uses the hardcoded defaults
// (matching what the server renders) and is rehydrated from localStorage
// client-side after mount via hydrateFromStorage() - reading localStorage
// directly in create() would make the client's first render diverge from
// the server-rendered HTML and trigger a React hydration error.
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useAppStore = create<AppState>((set) => ({
  currentCompany: DEFAULT_COMPANY,
  currentUser: DEFAULT_USER,
  token: null,
  isAuthenticated: false,
  commandMenuOpen: false,

  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("one_erp_token");
    set({
      token,
      isAuthenticated: !!token,
      currentCompany: readJSON("one_erp_company", DEFAULT_COMPANY),
      currentUser: readJSON("one_erp_user", DEFAULT_USER),
    });
  },

  setCompany: (company) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("one_erp_company", JSON.stringify(company));
    }
    set({ currentCompany: company });
  },
  setUser: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("one_erp_user", JSON.stringify(user));
    }
    set({ currentUser: user });
  },

  login: (token, user, company) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("one_erp_token", token);
      localStorage.setItem("one_erp_user", JSON.stringify(user));
      if (company) {
        localStorage.setItem("one_erp_company", JSON.stringify(company));
      }
    }
    set({
      token,
      currentUser: user,
      isAuthenticated: true,
      ...(company ? { currentCompany: company } : {}),
    });
  },

  setToken: (token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("one_erp_token", token);
    }
    set({ token });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("one_erp_token");
      localStorage.removeItem("one_erp_user");
      localStorage.removeItem("one_erp_company");
    }
    set({
      token: null,
      isAuthenticated: false,
    });
  },

  setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),
  toggleCommandMenu: () => set((state) => ({ commandMenuOpen: !state.commandMenuOpen })),
}));
