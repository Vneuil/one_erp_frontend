import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type StatusType =
  | "draft"
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "cancelled"
  | "paid"
  | "unpaid"
  | "overdue"
  | "active"
  | "inactive"
  | "in_stock"
  | "low_stock"
  | "out_of_stock";

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const norm = status.toLowerCase().replace(/[\s-]/g, "_");
  const displayLabel = label || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  switch (norm) {
    case "approved":
    case "completed":
    case "paid":
    case "active":
    case "in_stock":
      return <Badge variant="success">{displayLabel}</Badge>;

    case "pending":
    case "processing":
    case "low_stock":
      return <Badge variant="warning">{displayLabel}</Badge>;

    case "cancelled":
    case "overdue":
    case "inactive":
    case "out_of_stock":
      return <Badge variant="destructive">{displayLabel}</Badge>;

    case "draft":
    case "unpaid":
      return <Badge variant="secondary">{displayLabel}</Badge>;

    default:
      return <Badge variant="outline">{displayLabel}</Badge>;
  }
}
