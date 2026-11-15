import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 sm:pb-6 border-b border-border mb-6",
        className
      )}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground break-words">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">{children}</div>
      )}
    </div>
  );
}
