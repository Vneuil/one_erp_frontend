import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-brand-primary text-white shadow-sm hover:bg-[#8518ba] active:scale-[0.98] shadow-purple-500/20",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-border bg-white text-foreground hover:bg-brand-tint hover:text-brand-indigo hover:border-brand-indigo/30",
        secondary:
          "bg-brand-tint text-brand-dark hover:bg-brand-tint/80 font-medium",
        ghost:
          "text-foreground hover:bg-brand-tint hover:text-brand-primary",
        link:
          "text-brand-blue underline-offset-4 hover:underline p-0 h-auto font-medium",
        gradient:
          "bg-gradient-to-r from-brand-primary to-brand-indigo text-white shadow-md shadow-purple-500/25 hover:opacity-95 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
