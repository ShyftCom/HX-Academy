import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  icon?: React.ReactNode;
  /** Supporting copy under the field. Suppressed while an error is showing. */
  hint?: string;
  /** Adds the required marker and wires aria-required. */
  required?: boolean;
}

/**
 * Dark surface, hairline outline, blue focus border with a soft outer glow.
 * The label sits *above* the field and is always rendered — a placeholder is
 * not a label, because it disappears the moment the user starts typing.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, icon, hint, id, required, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? `input-${reactId}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
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

        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-[var(--ob-text-muted)]">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            ref={ref}
            required={required}
            aria-invalid={error ? true : undefined}
            // Points assistive tech at whichever message is currently shown.
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              "flex h-9 w-full rounded-[var(--ob-radius-control)] border px-3 text-sm",
              "border-[var(--ob-line-strong)] bg-[var(--ob-surface)] text-[var(--ob-text)]",
              "transition-[border-color,box-shadow] duration-150",
              "placeholder:text-[var(--ob-text-muted)]",
              "focus-visible:border-[var(--ob-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ob-primary-glow)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--ob-text-secondary)]",
              error &&
                "border-[var(--ob-error)] focus-visible:border-[var(--ob-error)] focus-visible:shadow-[0_0_0_3px_rgba(255,180,171,0.2)]",
              icon && "ps-9",
              className
            )}
            {...props}
          />
        </div>

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
Input.displayName = "Input";

export { Input };
