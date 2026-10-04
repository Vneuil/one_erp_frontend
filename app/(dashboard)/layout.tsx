"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandMenu } from "@/components/layout/command-menu";
import { NavigationAccessProvider } from "@/providers/navigation-access";
import { QueryProvider } from "@/providers/query-provider";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // This whole route group has no server-side auth check (it's all
  // client-rendered), so without this guard any dashboard URL - including
  // ones linked directly from the public landing page - rendered fully
  // logged-in-looking UI (with the store's hardcoded default identity) to
  // anyone, authenticated or not. Real API calls would still 401 without a
  // token, but the UI itself never redirected to /login.
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    hydrateFromStorage();
    setAuthChecked(true);
  }, [hydrateFromStorage]);

  React.useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authChecked, isAuthenticated, router]);

  // Render nothing until the auth check has run and passed, so an
  // unauthenticated visitor never sees a flash of dashboard UI or the
  // default placeholder identity before being redirected.
  if (!authChecked || !isAuthenticated) {
    return null;
  }

  return (
    <QueryProvider>
      <NavigationAccessProvider>
      <div className="min-h-screen bg-[#fafafc] text-foreground flex">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Global Quick Command Palette (Cmd + K) */}
        <CommandMenu />

        {/* Main Content Area */}
        <div
          data-app-content
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-all duration-300",
            isCollapsed ? "lg:pl-20" : "lg:pl-64"
          )}
        >
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </NavigationAccessProvider>
    </QueryProvider>
  );
}
