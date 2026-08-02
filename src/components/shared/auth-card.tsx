"use client";

import { useTranslation } from "react-i18next";

/**
 * Shared chrome for the sign-in / forgot-password / reset-password cards.
 *
 * Keeps the mark, the heading rhythm and the glass treatment identical across
 * all three, so moving between them doesn't feel like moving between products.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="ob-glass rounded-[var(--ob-radius-feature)] shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
      <div className="px-7 pt-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--ob-radius-container)] bg-[var(--ob-primary)] text-[13px] font-bold tracking-tight text-white shadow-[0_0_0_4px_var(--ob-primary-glow)]">
          FSA
        </div>
        <p className="ob-mono mb-2.5 uppercase text-[var(--ob-text-muted)]">
          {t("misc.academy_name")}
        </p>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--ob-text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ob-text-muted)]">
            {description}
          </p>
        )}
      </div>

      <div className="px-7 pb-7 pt-6">{children}</div>

      {footer && (
        <div className="border-t border-[var(--ob-line)] px-7 py-4 text-center">{footer}</div>
      )}
    </div>
  );
}
