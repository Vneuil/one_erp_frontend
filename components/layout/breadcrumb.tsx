"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") {
    return (
      <div className="flex items-center text-xs font-medium text-muted-foreground min-w-0">
        <Home className="h-3.5 w-3.5 mr-1.5 text-brand-primary shrink-0" />
        <span className="text-foreground font-semibold truncate">Dashboard</span>
      </div>
    );
  }

  const formatTitle = (seg: string) => {
    return seg
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <nav className="flex items-center text-xs font-medium text-muted-foreground min-w-0">
      <Link
        href="/dashboard"
        className="hidden sm:flex items-center hover:text-brand-primary transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5 mr-1.5" />
        <span>Home</span>
      </Link>
      <Link
        href="/dashboard"
        className="sm:hidden flex items-center hover:text-brand-primary transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const url = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        return (
          <React.Fragment key={url}>
            <ChevronRight
              className={`h-3.5 w-3.5 mx-1.5 text-muted-foreground/60 shrink-0 ${
                isLast ? "" : "hidden sm:inline-block"
              }`}
            />
            {isLast ? (
              <span className="text-foreground font-semibold truncate">
                {formatTitle(segment)}
              </span>
            ) : (
              // Intermediate segments (e.g. "sales" in /sales/deliveries) are
              // category names, not real pages of their own - most modules
              // have no index route at their bare path, so this must never
              // be a Link (Next.js would prefetch/navigate to a 404).
              <span className="hidden sm:inline text-muted-foreground shrink-0">
                {formatTitle(segment)}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
