import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#FEE2E2] text-[#701C1C] dark:bg-[#A02020]/20 dark:text-[#ffaaaa]",
        secondary:   "bg-[#F0F0F0] text-[#374151] dark:bg-[#2a2a2a] dark:text-[#D0D0D0]",
        destructive: "bg-[#FEE2E2] text-[#701C1C] dark:bg-[#A02020]/30 dark:text-[#ffaaaa]",
        success:     "bg-[#FEF2F2] text-[#A02020] dark:bg-[#A02020]/20 dark:text-[#ffaaaa]",
        warning:     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        outline:     "border border-[#D0D0D0] text-[#374151] dark:border-[#2a2a2a] dark:text-[#D0D0D0]",
        orange:      "bg-[#FEF2F2] text-[#903030] dark:bg-[#A02020]/20 dark:text-[#ffaaaa]",
        purple:      "bg-[#FEF2F2] text-[#701C1C] dark:bg-[#A02020]/20 dark:text-[#ffaaaa]",
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
