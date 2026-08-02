"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: "destructive" | "default";
}

/**
 * The one confirmation dialog. Never use window.confirm() — it can't be
 * themed, can't be translated, and is suppressible by the browser.
 *
 * Radix handles focus trapping, Escape, scroll lock and focus restoration.
 * Cancel is the default focus target, so an accidental Enter dismisses rather
 * than destroys.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  loading,
  variant = "destructive",
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");
  const destructive = variant === "destructive";
  const Icon = destructive ? AlertTriangle : Info;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3.5">
            <span
              className={
                destructive
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ob-radius-container)] border border-[rgba(255,180,171,0.3)] bg-[var(--ob-error-soft)]"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ob-radius-container)] border border-[rgba(0,112,243,0.3)] bg-[var(--ob-primary-soft)]"
              }
              aria-hidden="true"
            >
              <Icon
                className={
                  destructive
                    ? "h-5 w-5 text-[var(--ob-error)]"
                    : "h-5 w-5 text-[var(--ob-primary-light)]"
                }
              />
            </span>
            <div className="min-w-0 flex-1 text-start">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="mt-1.5">{description}</AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelLabel ?? t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Radix closes the dialog on Action click by default; the caller
              // owns closing so a failed request can keep it open with an error.
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel ?? t("common.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
