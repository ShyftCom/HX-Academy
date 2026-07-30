"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * OBSIDIAN FLUX buttons.
 *
 * 4px radius, never pill-shaped — the rectangular structure is what makes the
 * interface read as technical rather than consumer. Elevation comes from a
 * tonal fill plus a hairline border, not from a shadow.
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--ob-radius-control)] text-sm font-medium",
    "transition-[background-color,border-color,box-shadow,color] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ob-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ob-surface-base)]",
    "disabled:pointer-events-none disabled:opacity-45"
  ),
  {
    variants: {
      variant: {
        // Solid electric blue. The glow on hover is the "energized state" —
        // it replaces a drop shadow, which this system doesn't use.
        default:
          "bg-[var(--ob-primary)] text-white hover:bg-[var(--ob-primary-hover)] hover:shadow-[0_0_0_3px_var(--ob-primary-glow)] active:bg-[var(--ob-primary-active)]",
        // Destructive is deliberately restrained until hover: a table full of
        // bright red delete buttons trains people to ignore the colour.
        destructive:
          "border border-[rgba(255,180,171,0.35)] bg-[var(--ob-error-soft)] text-[var(--ob-error)] hover:bg-[var(--ob-error-strong)] hover:text-white hover:border-[var(--ob-error-strong)]",
        outline:
          "border border-[var(--ob-line-strong)] bg-transparent text-[var(--ob-text)] hover:bg-[var(--ob-surface-high)]",
        secondary:
          "bg-[var(--ob-surface-high)] text-[var(--ob-text)] hover:bg-[var(--ob-surface-highest)]",
        ghost:
          "text-[var(--ob-text-secondary)] hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]",
        link: "text-[var(--ob-primary-light)] underline-offset-4 hover:underline",
        success:
          "border border-[rgba(60,215,255,0.35)] bg-[var(--ob-success-soft)] text-[var(--ob-success)] hover:bg-[rgba(60,215,255,0.2)]",
        warning:
          "border border-[rgba(245,181,68,0.35)] bg-[var(--ob-warning-soft)] text-[var(--ob-warning)] hover:bg-[rgba(245,181,68,0.2)]",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        // Icon-only sizes stay >=36px so they clear the touch-target minimum.
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          // Slot requires exactly one element child — no spinner wrapper allowed.
          children
        ) : (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
