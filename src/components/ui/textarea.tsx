import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, hint, id, required, ...props }, ref) => {
    const reactId = React.useId();
    const textareaId = id ?? `textarea-${reactId}`;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-[13px] font-medium text-[var(--ob-text-secondary)]"
          >
            {label}
            {required && (
              <span className="ms-1 text-[var(--ob-error)]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "flex min-h-[88px] w-full rounded-[var(--ob-radius-control)] border px-3 py-2 text-sm",
            "border-[var(--ob-line-strong)] bg-[var(--ob-surface)] text-[var(--ob-text)]",
            "transition-[border-color,box-shadow] duration-150",
            "placeholder:text-[var(--ob-text-muted)]",
            "focus-visible:border-[var(--ob-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ob-primary-glow)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-[var(--ob-error)] focus-visible:border-[var(--ob-error)] focus-visible:shadow-[0_0_0_3px_rgba(255,180,171,0.2)]",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-[var(--ob-error)]">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="mt-1.5 text-xs text-[var(--ob-text-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
