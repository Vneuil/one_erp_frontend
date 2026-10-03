import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-primary text-white shadow-xs",
        secondary:
          "border-transparent bg-brand-tint text-brand-dark",
        outline:
          "text-foreground border-border",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 border-emerald-200/60",
        warning:
          "border-transparent bg-amber-50 text-amber-700 border-amber-200/60",
        destructive:
          "border-transparent bg-rose-50 text-rose-700 border-rose-200/60",
        info:
          "border-transparent bg-blue-50 text-brand-blue border-blue-200/60",
        purple:
          "border-transparent bg-purple-50 text-brand-indigo border-purple-200/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
