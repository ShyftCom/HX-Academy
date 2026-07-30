import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Featured cards take a very subtle top-left → bottom-right tonal gradient.
   * Reserve it for the one card a page wants read first; using it everywhere
   * flattens the hierarchy it exists to create.
   */
  featured?: boolean;
}

/**
 * Level 1 elevation: a slightly lighter charcoal and a hairline border. No
 * drop shadow — depth in this system comes from tone, not from shadow.
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, featured, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--ob-radius-container)] border border-[var(--ob-line)] text-[var(--ob-text)]",
        featured
          ? "bg-[linear-gradient(135deg,var(--ob-surface-low)_0%,var(--ob-surface-high)_100%)]"
          : "bg-[var(--ob-surface-low)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-[15px] font-semibold tracking-[-0.01em] text-[var(--ob-text)]", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[13px] text-[var(--ob-text-muted)]", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 border-t border-[var(--ob-line)] p-5", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
