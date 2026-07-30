"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { error?: string; label?: string }
>(({ className, children, error, label, ...props }, ref) => {
  const trigger = (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-[var(--ob-radius-control)] border px-3 text-sm",
        // Pages hardcode widths sized for English ("w-36"). French and Arabic
        // labels are routinely 40% longer, which wrapped the text onto a second
        // line and pushed the control to double height. Ellipsize instead:
        // a clipped label is recoverable, a broken row rhythm is not.
        "whitespace-nowrap [&>span]:overflow-hidden [&>span]:text-ellipsis",
        "border-[var(--ob-line-strong)] bg-[var(--ob-surface)] text-[var(--ob-text)]",
        "transition-[border-color,box-shadow] duration-150",
        "focus:border-[var(--ob-primary)] focus:outline-none focus:shadow-[0_0_0_3px_var(--ob-primary-glow)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-[var(--ob-error)] focus:border-[var(--ob-error)] focus:shadow-[0_0_0_3px_rgba(255,180,171,0.2)]",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ob-text-muted)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );

  // Only wrap when there is something to stack above or below the control.
  // The wrapper is `w-full`, so wrapping unconditionally made *it* the flex
  // item in a toolbar — the caller's width (`className="w-36"`) landed on the
  // inner trigger and had no effect, and every filter select blew out to full
  // width and wrapped onto its own line. Unwrapped, the trigger is the flex
  // item and still defaults to w-full everywhere else.
  if (!label && !error) return trigger;

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--ob-text-secondary)]">
          {label}
        </label>
      )}
      {trigger}
      {error && <p role="alert" className="mt-1.5 text-xs text-[var(--ob-error)]">{error}</p>}
    </div>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "ob-glass relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-[var(--ob-radius-container)] text-[var(--ob-text)] shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport className={cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-[var(--ob-radius-control)] py-1.5 ps-8 pe-2 text-sm outline-none transition-colors focus:bg-[var(--ob-primary-soft)] focus:text-[var(--ob-primary-light)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 ps-8 pe-2 text-xs font-semibold text-[var(--ob-text-muted)]", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-[var(--ob-line)]", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator };
