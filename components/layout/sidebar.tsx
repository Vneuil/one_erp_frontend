"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationAccess } from "@/providers/navigation-access";
import { translatedNavTitle } from "@/lib/i18n/navigation";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAppStore } from "@/stores/app-store";
import { useTranslation } from "@/lib/i18n/translations";


export function Sidebar() {
  const pathname = usePathname();
  const { navigation: navigationConfig } = useNavigationAccess();
  const { isCollapsed, toggleCollapse, isMobileOpen, setMobileOpen, setCollapsed } = useSidebarStore();
  const { currentCompany } = useAppStore();
  const { t, isIndonesian } = useTranslation();

  const getTranslatedTitle = React.useCallback((title: string) => translatedNavTitle(title, t, isIndonesian), [t, isIndonesian]);

  // Keep track of expanded parent menus
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    // Auto-open groups where a child is active
    const initial: Record<string, boolean> = {};
    for (const group of navigationConfig) {
      for (const item of group.items) {
        if (item.items?.some((sub) => pathname.startsWith(sub.href))) {
          initial[item.title] = true;
        }
      }
    }
    return initial;
  });

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of navigationConfig) for (const item of group.items) {
        if (item.items?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"))) next[item.title] = true;
      }
      return next;
    });
  }, [pathname, navigationConfig]);

  const toggleGroup = (title: string) => {
    if (isCollapsed) { setCollapsed(false); setOpenGroups((prev) => ({ ...prev, [title]: true })); return; }
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Menu filter (searches item + submenu titles, translated and raw)
  const [filterQuery, setFilterQuery] = React.useState("");
  const normalizedQuery = filterQuery.trim().toLowerCase();

  const matchesQuery = React.useCallback(
    (title: string) => {
      if (!normalizedQuery) return true;
      const translated = getTranslatedTitle(title).toLowerCase();
      return translated.includes(normalizedQuery) || title.toLowerCase().includes(normalizedQuery);
    },
    [normalizedQuery, getTranslatedTitle]
  );

  const filteredNavigationConfig = React.useMemo(() => {
    if (!normalizedQuery) return navigationConfig;

    return navigationConfig
      .map((navGroup) => {
        const items = navGroup.items
          .map((item) => {
            if (!item.items || item.items.length === 0) {
              return matchesQuery(item.title) ? item : null;
            }
            const subItems = item.items.filter((sub) => matchesQuery(sub.title));
            if (matchesQuery(item.title)) return item;
            if (subItems.length > 0) return { ...item, items: subItems };
            return null;
          })
          .filter((item): item is (typeof navGroup.items)[number] => item !== null);

        return { ...navGroup, items };
      })
      .filter((navGroup) => navGroup.items.length > 0);
  }, [normalizedQuery, matchesQuery, navigationConfig]);

  // While filtering, auto-expand every group with matching children so
  // results are visible without the user having to click each one open.
  React.useEffect(() => {
    if (!normalizedQuery) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const navGroup of filteredNavigationConfig) {
        for (const item of navGroup.items) {
          if (item.items && item.items.length > 0) next[item.title] = true;
        }
      }
      return next;
    });
  }, [normalizedQuery, filteredNavigationConfig]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-white border-r border-border transition-all duration-300 flex flex-col shadow-xs",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className={cn("min-h-16 flex items-center border-b border-border transition-all", isCollapsed ? "justify-center relative px-2" : "justify-between px-4")}>
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden" title="ONE ERP">
            <Image
              src="/logo.png"
              alt="ONE ERP Logo"
              width={36}
              height={36}
              priority
              className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-md shadow-purple-500/20"
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
                  ONE <span className="text-xs px-1.5 py-0.5 rounded-md bg-brand-tint text-brand-indigo font-bold">ERP</span>
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                  {currentCompany.name}
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-brand-tint transition-all cursor-pointer",
              isCollapsed && "absolute -right-3 top-4 z-30 bg-white border border-border shadow-xs hover:shadow-sm"
            )}
            aria-label={isCollapsed ? (isIndonesian ? "Perluas menu" : "Expand sidebar") : (isIndonesian ? "Perkecil menu" : "Collapse sidebar")}
            title={isCollapsed ? (isIndonesian ? "Perluas menu" : "Expand sidebar") : (isIndonesian ? "Perkecil menu" : "Collapse sidebar")}
          >
            {isCollapsed ? <ChevronsRight className="h-4 w-4 text-brand-primary" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Menu filter */}
        {!isCollapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t.common.search}
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-slate-50 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 transition-all"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {normalizedQuery && filteredNavigationConfig.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t.common.search === "Cari..." ? "Menu tidak ditemukan" : "No menu found"}
            </div>
          )}
          {filteredNavigationConfig.map((navGroup, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                  {getTranslatedTitle(navGroup.group)}
                </div>
              )}

              {navGroup.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = Boolean(item.items && item.items.length > 0);
                const isItemActive = item.href
                  ? pathname === item.href
                  : item.items?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"));
                const isOpen = openGroups[item.title];

                if (!hasChildren && item.href) {
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        isItemActive
                          ? "bg-brand-tint text-brand-primary font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={getTranslatedTitle(item.title)}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isItemActive ? "text-brand-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!isCollapsed && (
                        <span className="flex-1 truncate">{getTranslatedTitle(item.title)}</span>
                      )}
                    </Link>
                  );
                }

                return (
                  <div key={item.title} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.title)}
                      aria-expanded={!isCollapsed && !!isOpen}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group cursor-pointer text-left",
                        isItemActive
                          ? "text-brand-indigo font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={getTranslatedTitle(item.title)}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isItemActive ? "text-brand-indigo" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{getTranslatedTitle(item.title)}</span>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </>
                      )}
                    </button>

                    {/* Submenu items */}
                    {!isCollapsed && isOpen && hasChildren && (
                      <div className="ml-4 pl-4 border-l border-border/80 space-y-1 pt-1 pb-1">
                        {item.items?.map((sub) => {
                          const isSubActive =
                            pathname === sub.href || pathname.startsWith(sub.href + "/");
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                isSubActive
                                  ? "bg-brand-tint text-brand-primary font-semibold"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                            >
                              <span className="truncate">{getTranslatedTitle(sub.title)}</span>
                              {sub.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-brand-primary text-white font-bold">
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </aside>
    </>
  );
}
