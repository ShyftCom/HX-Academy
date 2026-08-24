"use client";

import * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Reference-inspired "pill button with a circular arrow bubble" CTA, built on the
// same cva/Slot pattern as src/components/ui/button.tsx but with its own fsa-*
// token-based variants — the admin Button's variants are hard-remapped to the red
// brand color by globals.css and aren't reusable for the public site's own ink/crimson
// crest palette. `sky` is the crest crimson, `navy` the crest ink (see tokens.css).
const fsaButtonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-fsa-pill)] font-semibold whitespace-nowrap transition-all duration-200 ease-[var(--ease-fsa-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-fsa-sky)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        sky: "bg-fsa-sky text-white hover:brightness-110",
        navy: "bg-fsa-navy-900 text-white hover:bg-fsa-navy-800",
        white: "bg-white text-fsa-navy-900 hover:bg-white/90",
        // Paired with a white border, so it is only ever used over dark media
        // (hero overlays). Must set text-white explicitly — `text-current` here
        // inherited the dark body colour and rendered the label invisible.
        outline: "border-2 border-white/40 text-white hover:bg-white/10",
        "outline-navy": "border-2 border-fsa-navy-900/25 text-fsa-navy-900 hover:bg-fsa-navy-900/5",
        ghost: "text-current hover:bg-black/5",
      },
      size: {
        default: "h-12 px-6 text-base",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
      },
    },
    defaultVariants: { variant: "sky", size: "default" },
  }
);

const bubbleVariants = cva("inline-flex items-center justify-center rounded-full shrink-0 transition-transform duration-200 group-hover:translate-x-0.5", {
  variants: {
    variant: {
      sky: "bg-white text-fsa-sky",
      navy: "bg-white text-fsa-navy-900",
      white: "bg-fsa-navy-900 text-white",
      outline: "bg-white/15 text-current",
      "outline-navy": "bg-fsa-navy-900/10 text-fsa-navy-900",
      ghost: "bg-black/10 text-current",
    },
    size: {
      default: "w-8 h-8",
      sm: "w-6 h-6",
      lg: "w-9 h-9",
    },
  },
  defaultVariants: { variant: "sky", size: "default" },
});

export interface FsaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fsaButtonVariants> {
  asChild?: boolean;
  href?: string;
  /** Show the circular arrow bubble (default true — the reference's signature CTA shape). */
  icon?: boolean;
  /** Use the up-right "external" arrow instead of the horizontal one. */
  external?: boolean;
  loading?: boolean;
  openInNewTab?: boolean;
}

export const FsaButton = React.forwardRef<HTMLButtonElement, FsaButtonProps>(
  ({ className, variant, size, asChild = false, href, icon = true, external = false, loading, openInNewTab, children, disabled, ...props }, ref) => {
    const content = (
      <>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        {icon && !loading && (
          <span className={cn(bubbleVariants({ variant, size }))}>
            {external ? <ArrowUpRight className="ob-flip-rtl w-4 h-4" /> : <ArrowRight className="ob-flip-rtl w-4 h-4" />}
          </span>
        )}
      </>
    );

    const classes = cn(fsaButtonVariants({ variant, size, className }), "group");

    if (href && !disabled) {
      const isExternal = external || /^https?:\/\//.test(href);
      if (isExternal) {
        return (
          <a href={href} className={classes} target={openInNewTab ?? isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
            {content}
          </a>
        );
      }
      return (
        <Link href={href} className={classes} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noopener noreferrer" : undefined}>
          {content}
        </Link>
      );
    }

    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={classes} disabled={disabled || loading} {...props}>
        {content}
      </Comp>
    );
  }
);
FsaButton.displayName = "FsaButton";
