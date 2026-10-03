"use client";

import * as React from "react";
import {
  ShoppingBag,
  FileText,
  Store,
  PenTool,
  Globe,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderSourceType = "manual" | "quotation" | "pos" | "marketplace";
export type MarketplacePlatform = "shopee" | "tiktok" | "tokopedia" | "lazada" | "blibli";

export interface ChannelBadgeProps {
  source: OrderSourceType;
  platform?: MarketplacePlatform;
  storeName?: string;
  externalId?: string;
  className?: string;
  showIconOnly?: boolean;
}

export function ChannelBadge({
  source,
  platform,
  storeName,
  externalId,
  className,
  showIconOnly = false,
}: ChannelBadgeProps) {
  // Config per channel
  let label = "Manual";
  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
  let iconColor = "text-slate-600";
  let Icon: LucideIcon = PenTool;

  if (source === "quotation") {
    label = "Quotation";
    badgeStyle = "bg-purple-50 text-brand-indigo border-purple-200";
    iconColor = "text-brand-indigo";
    Icon = FileText;
  } else if (source === "pos") {
    label = "POS Store";
    badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
    iconColor = "text-blue-600";
    Icon = Store;
  } else if (source === "marketplace") {
    Icon = ShoppingBag;
    switch (platform) {
      case "shopee":
        label = "Shopee";
        badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
        iconColor = "text-orange-600";
        break;
      case "tiktok":
        label = "TikTok Shop";
        badgeStyle = "bg-zinc-900 text-white border-zinc-800";
        iconColor = "text-pink-400";
        break;
      case "tokopedia":
        label = "Tokopedia";
        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
        iconColor = "text-emerald-600";
        break;
      case "lazada":
        label = "Lazada";
        badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
        iconColor = "text-indigo-600";
        break;
      case "blibli":
        label = "Blibli";
        badgeStyle = "bg-sky-50 text-sky-700 border-sky-200";
        iconColor = "text-sky-600";
        break;
      default:
        label = "Marketplace";
        badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
        iconColor = "text-amber-600";
        Icon = Globe;
        break;
    }
  }

  if (showIconOnly) {
    return (
      <span
        title={label}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold shadow-2xs",
          badgeStyle,
          className
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold tracking-tight shadow-2xs",
          badgeStyle
        )}
      >
        <Icon className={cn("h-3 w-3", iconColor)} />
        <span>{label}</span>
      </span>

      {storeName && (
        <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[120px]">
          {storeName}
        </span>
      )}

      {externalId && (
        <span className="text-[10px] font-mono text-muted-foreground/80 bg-slate-100 px-1 py-0.5 rounded">
          #{externalId}
        </span>
      )}
    </div>
  );
}
