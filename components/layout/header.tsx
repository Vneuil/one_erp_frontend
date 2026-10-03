"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  BellOff,
  Building2,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumbs } from "@/components/layout/breadcrumb";
import { useRouter } from "next/navigation";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAppStore } from "@/stores/app-store";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslation } from "@/lib/i18n/translations";
import { tenantsApi, TenantItem } from "@/lib/api/tenants";
import { hropsApi, NotificationItem } from "@/lib/api/hrops";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

const toHeaderNotification = (n: NotificationItem): HeaderNotification => ({
  id: n.id,
  title: n.title,
  message: n.body,
  time: n.createdAt ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(n.createdAt)) : "",
  read: Boolean(n.readAt),
  link: n.link,
});

const NOTIFICATION_POLL_MS = 60_000;

export function Header() {
  const router = useRouter();
  const { toggleMobileOpen } = useSidebarStore();
  const { currentCompany, currentUser, setToken, setCommandMenuOpen, logout } = useAppStore();
  const { t, isIndonesian } = useTranslation();

  const [tenantsList, setTenantsList] = React.useState<TenantItem[]>([]);
  const [activeTenantId, setActiveTenantId] = React.useState<string | null>(null);
  const [switching, setSwitching] = React.useState(false);

  const [notifications, setNotifications] = React.useState<HeaderNotification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = React.useCallback(() => {
    hropsApi
      .notifications()
      .then((res) => setNotifications((res.data.items || []).map(toHeaderNotification)))
      .catch(() => {
        // The bell just stays as it was; a failed poll is not worth interrupting the user.
      });
  }, []);

  React.useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    hropsApi.markAllRead().catch(loadNotifications);
  };

  const handleMarkAsRead = (n: HeaderNotification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      hropsApi.markRead(n.id).catch(loadNotifications);
    }
    if (n.link) router.push(n.link);
  };

  const readActiveTenantId = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("one_erp_token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setActiveTenantId(payload.tenantId || null);
    } catch {
      // ignore malformed token
    }
  }, []);

  React.useEffect(() => {
    tenantsApi
      .list()
      .then((res) => {
        if (res.success && res.data) setTenantsList(res.data);
      })
      .catch(() => {
        // Silently ignore - dropdown just shows only the current tenant.
      });
    readActiveTenantId();
  }, [readActiveTenantId]);

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  const handleSwitchTenant = async (tenant: TenantItem) => {
    if (tenant.id === activeTenantId || switching) return;
    setSwitching(true);
    try {
      const res = await tenantsApi.switch(tenant.id);
      if (res.success && res.data) {
        setToken(res.data.accessToken);
        // Full reload so every page's data refetches scoped to the new tenant
        // instead of showing stale cached state.
        window.location.href = window.location.pathname;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to switch tenant";
      alert(message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-border px-4 lg:px-6 flex items-center justify-between shadow-xs">
      {/* Left side: Mobile burger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-foreground"
          onClick={toggleMobileOpen}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Breadcrumbs />
      </div>

      {/* Right side: Quick Search, Language Switcher, Company Switcher, Notification, User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Global search bar button */}
        <button
          onClick={() => setCommandMenuOpen(true)}
          className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer w-48 md:w-60"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 text-left truncate">{t.header.quickSearch}</span>
          <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-border font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Bilingual Language Switcher */}
        <div>
          <LanguageSwitcher variant="dropdown" />
        </div>

        {/* Tenant Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-0 sm:gap-2 px-2 sm:px-3 border-border hover:bg-brand-tint hover:border-brand-indigo/30"
            >
              <Building2 className="h-3.5 w-3.5 text-brand-primary" />
              <span className="font-semibold text-xs max-w-[110px] truncate hidden md:inline-block">
                {tenantsList.find((tn) => tn.id === activeTenantId)?.name || currentCompany.name}
              </span>
              <span className="font-semibold text-xs md:hidden hidden sm:inline">
                {tenantsList.find((tn) => tn.id === activeTenantId)?.code || currentCompany.code}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Tenant Aktif</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tenantsList.length === 0 && (
              <div className="px-2 py-3 text-[11px] text-muted-foreground text-center">
                {currentCompany.name}
              </div>
            )}
            {tenantsList.map((tn) => (
              <DropdownMenuItem
                key={tn.id}
                onClick={() => handleSwitchTenant(tn)}
                disabled={switching}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="font-medium truncate">
                  {tn.name}
                  {tn.id === activeTenantId && (
                    <span className="ml-1.5 text-[10px] text-brand-primary font-semibold">•</span>
                  )}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                  {tn.code}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/tenants" className="text-xs text-brand-primary font-medium">
                Kelola Tenant
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Popover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={isIndonesian ? "Notifikasi" : "Notifications"}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">
                {isIndonesian ? "Notifikasi" : "Notifications"}
              </span>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-brand-primary hover:underline cursor-pointer"
                >
                  {isIndonesian ? "Tandai dibaca" : "Mark all read"}
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <BellOff className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/50" />
                  <p>{isIndonesian ? "Tidak ada notifikasi baru" : "No new notifications"}</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleMarkAsRead(n)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-2.5 rounded-lg text-left cursor-pointer",
                      !n.read && "bg-brand-tint/40 font-medium"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-foreground">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/activity-log" className="w-full text-center text-xs text-brand-primary font-semibold py-1.5 cursor-pointer block">
                {isIndonesian ? "Lihat Log Aktivitas →" : "View Activity Log →"}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-muted transition-colors cursor-pointer outline-none">
              <Avatar className="h-8 w-8 ring-2 ring-brand-primary/20">
                <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden xl:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">{currentUser.name}</span>
                <span className="text-[11px] text-muted-foreground truncate">{currentUser.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="text-xs cursor-pointer flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t.header.myProfile}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/company" className="text-xs cursor-pointer flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t.header.companySettings}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 flex items-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t.auth.signOut}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
