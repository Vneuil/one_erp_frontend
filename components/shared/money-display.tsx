import * as React from "react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  highlight?: boolean;
}

export function MoneyDisplay({
  amount,
  currency = "IDR",
  className,
  highlight = false,
}: MoneyDisplayProps) {
  const formatted = formatCurrency(amount, currency);

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        highlight ? "text-brand-primary" : "text-foreground",
        className
      )}
    >
      {formatted}
    </span>
  );
}
