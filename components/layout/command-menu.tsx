"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigationAccess } from "@/providers/navigation-access";
import { translatedNavTitle } from "@/lib/i18n/navigation";
import { useTranslation } from "@/lib/i18n/translations";
import { useAppStore } from "@/stores/app-store";

export function CommandMenu() {
  const router = useRouter();
  const { navigation: navigationConfig } = useNavigationAccess();
  const { t, isIndonesian } = useTranslation();
  const { commandMenuOpen, setCommandMenuOpen } = useAppStore();
  const [query, setQuery] = React.useState("");

  // Keyboard shortcut Ctrl/Cmd + K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandMenuOpen(!commandMenuOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandMenuOpen, setCommandMenuOpen]);

  // Flatten all navigable items
  const allNavItems = React.useMemo(() => {
    const list: { group: string; title: string; href: string }[] = [];
    for (const group of navigationConfig) {
      for (const item of group.items) {
        if (item.href) {
          list.push({ group: group.group, title: item.title, href: item.href });
        }
        if (item.items) {
          for (const sub of item.items) {
            list.push({
              group: item.title,
              title: sub.title,
              href: sub.href,
            });
          }
        }
      }
    }
    return list.map((item) => ({ ...item, title: translatedNavTitle(item.title, t, isIndonesian), group: translatedNavTitle(item.group, t, isIndonesian) }));
  }, [navigationConfig, t, isIndonesian]);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return allNavItems.slice(0, 8);
    const q = query.toLowerCase();
    return allNavItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [allNavItems, query]);

  const handleSelect = (href: string) => {
    setCommandMenuOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog open={commandMenuOpen} onOpenChange={setCommandMenuOpen}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden border-border shadow-2xl">
        <div className="flex items-center px-4 py-3 border-b border-border bg-white">
          <Search className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isIndonesian ? "Cari menu… (mis. Produk, Pesanan Penjualan)" : "Search menus… (e.g. Products, Sales Orders)"}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="text-[10px] bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching modules or actions found.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Navigation & Modules
              </div>
              {filteredItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground hover:bg-brand-tint hover:text-brand-indigo transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-normal">
                      {item.group} &gt;
                    </span>
                    <span className="font-medium group-hover:font-semibold">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-brand-indigo">
                    <span>{isIndonesian ? "Buka" : "Open"}</span>
                    <CornerDownLeft className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{isIndonesian ? "Pilih menu dengan mouse atau tombol Tab" : "Choose a menu with mouse or Tab"}</span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white px-1.5 py-0.5 rounded border border-border">Ctrl</kbd>+
            <kbd className="bg-white px-1.5 py-0.5 rounded border border-border">K</kbd> {isIndonesian ? "untuk membuka" : "to open"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
