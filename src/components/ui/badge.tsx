import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chips and tags. Low-saturation tinted fill, full-intensity text — so a badge
 * reads as a label rather than as a button. Squared off (2px) to match the
 * rectangular structure; pills would fight the rest of the system.
 */
const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5",
    "font-mono text-[11px] font-medium uppercase leading-[1.4] tracking-[0.04em]",
    "transition-colors"
  ),
  {
    variants: {
      variant: {
        default: "border-[rgba(0,112,243,0.3)] bg-[var(--ob-primary-soft)] text-[var(--ob-primary-light)]",
        secondary: "border-[var(--ob-line-strong)] bg-[var(--ob-neutral-soft)] text-[var(--ob-text-secondary)]",
        success: "border-[rgba(60,215,255,0.3)] bg-[var(--ob-success-soft)] text-[var(--ob-success)]",
        warning: "border-[rgba(245,181,68,0.3)] bg-[var(--ob-warning-soft)] text-[var(--ob-warning)]",
        destructive: "border-[rgba(255,180,171,0.3)] bg-[var(--ob-error-soft)] text-[var(--ob-error)]",
        outline: "border-[var(--ob-line-strong)] bg-transparent text-[var(--ob-text-secondary)]",
        // Retained so existing call sites keep compiling; both fold into the
        // primary family rather than reintroducing off-palette hues.
        orange: "border-[rgba(245,181,68,0.3)] bg-[var(--ob-warning-soft)] text-[var(--ob-warning)]",
        purple: "border-[rgba(0,112,243,0.3)] bg-[var(--ob-primary-soft)] text-[var(--ob-primary-light)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
