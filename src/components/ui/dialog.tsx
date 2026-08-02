"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Level 2 elevation — glassmorphism: translucent elevated surface, 12px
 * backdrop blur, hairline border. Radix handles focus trapping, Escape,
 * scroll lock and focus restoration on close.
 *
 * On phones the dialog becomes a bottom sheet: full width, anchored to the
 * bottom edge, rounded on top only. A centred modal on a 375px viewport
 * leaves the primary action under the thumb-unreachable middle of the screen.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
  }
>(({ className, children, size = "md", onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  // Radix restores focus to the element its FocusScope recorded on mount.
  // Most pages here open dialogs from a plain <Button onClick={() => setOpen(true)}>
  // rather than a <DialogTrigger>, and the re-render that opens the dialog can
  // swap that button's DOM node — leaving the recorded element detached, so
  // focus falls back to <body> and a keyboard user is dumped at the top of the
  // page. Recording the opener here and restoring it explicitly fixes every
  // call site without touching them.
  const opener = React.useRef<HTMLElement | null>(null);

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onOpenAutoFocus={(e) => {
        // Fires before focus moves into the dialog, so activeElement is still
        // whatever the user was on.
        opener.current = document.activeElement as HTMLElement | null;
        onOpenAutoFocus?.(e);
      }}
      onCloseAutoFocus={(e) => {
        onCloseAutoFocus?.(e);
        if (e.defaultPrevented) return;
        const el = opener.current;
        // Only if it's still in the document — a detached node cannot take focus.
        if (el?.isConnected && typeof el.focus === "function") {
          e.preventDefault();
          el.focus();
        }
      }}
      className={cn(
        "ob-glass fixed z-50 focus:outline-none",
        "shadow-[0_16px_48px_rgba(0,0,0,0.5)]",
        // Mobile: bottom sheet.
        "inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[var(--ob-radius-feature)] rounded-b-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        // >=640px: centred modal.
        "sm:inset-x-auto sm:bottom-auto sm:start-1/2 sm:top-1/2 sm:max-h-[85vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--ob-radius-feature)]",
        "sm:rtl:translate-x-1/2",
        "sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-top-[48%]",
        "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        size === "sm" && "sm:w-full sm:max-w-sm",
        size === "md" && "sm:w-full sm:max-w-md",
        size === "lg" && "sm:w-full sm:max-w-lg",
        size === "xl" && "sm:w-full sm:max-w-xl",
        size === "2xl" && "sm:w-full sm:max-w-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          "absolute end-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-[var(--ob-radius-control)]",
          "text-[var(--ob-text-muted)] transition-colors hover:bg-[var(--ob-surface-high)] hover:text-[var(--ob-text)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ob-primary)]"
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border-b border-[var(--ob-line)] px-6 py-5 pe-12", className)} {...props} />
);

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-5", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Stacks on mobile so neither action is squeezed below a usable width.
      "flex flex-col-reverse gap-2 border-t border-[var(--ob-line)] px-6 py-4 sm:flex-row sm:justify-end sm:gap-3",
      className
    )}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold tracking-[-0.01em] text-[var(--ob-text)]", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("mt-1 text-[13px] text-[var(--ob-text-muted)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription,
};
