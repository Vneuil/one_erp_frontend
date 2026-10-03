"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  variant?: "pill" | "dropdown" | "minimal";
  className?: string;
}

export function LanguageSwitcher({
  variant = "pill",
  className,
}: LanguageSwitcherProps) {
  const { language, setLanguage, toggleLanguage } = useTranslation();

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-lg p-0.5 bg-slate-100/90 border border-border text-xs font-semibold select-none",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setLanguage("id")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer",
            language === "id"
              ? "bg-white text-brand-dark shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>🇮🇩</span>
          <span>ID</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer",
            language === "en"
              ? "bg-white text-brand-dark shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>🇬🇧</span>
          <span>EN</span>
        </button>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-white text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer",
          className
        )}
        title={language === "id" ? "Beralih ke Bahasa Inggris" : "Switch to Indonesian"}
      >
        <span>{language === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer outline-none",
            className
          )}
        >
          <Globe className="h-3.5 w-3.5 text-brand-primary" />
          <span>{language === "id" ? "🇮🇩 Indonesia" : "🇬🇧 English"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 text-xs">
        <DropdownMenuItem
          onClick={() => setLanguage("id")}
          className={cn(
            "cursor-pointer flex items-center justify-between",
            language === "id" && "font-bold text-brand-primary bg-brand-tint/60"
          )}
        >
          <span className="flex items-center gap-2">
            <span>🇮🇩</span> Bahasa Indonesia
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={cn(
            "cursor-pointer flex items-center justify-between",
            language === "en" && "font-bold text-brand-primary bg-brand-tint/60"
          )}
        >
          <span className="flex items-center gap-2">
            <span>🇬🇧</span> English
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
