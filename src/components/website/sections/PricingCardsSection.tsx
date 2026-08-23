import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { lf } from "./localeField";
import { localeHref } from "../localeHref";
import { formatNumber } from "@/lib/public-format";

export async function PricingCardsSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const t = await getTranslations({ locale, namespace: "pricing" });
  const heading = lf(content, "heading", locale);
  const subheading = lf(content, "subheading", locale);

  const [plans, currencySymbol] = await Promise.all([
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    getSetting("currency_symbol", "DA"),
  ]);

  if (plans.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {(heading || subheading) && (
          <div className="mx-auto mb-14 max-w-2xl text-center">
            {heading && <h2 className="font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl" dir="auto">{heading}</h2>}
            {subheading && <p className="mt-4 text-lg text-fsa-text-muted" dir="auto">{subheading}</p>}
          </div>
        )}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-fsa-md border bg-white p-7 ${i === 0 ? "border-2 border-fsa-sky shadow-[0_12px_32px_rgba(67,199,237,0.25)]" : "border-fsa-border"}`}
            >
              {i === 0 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-fsa-pill bg-fsa-sky px-3 py-1 text-xs font-bold text-fsa-navy-900">
                  {t("popular")}
                </span>
              )}
              <h3 className="font-fsa-display text-xl font-bold text-fsa-navy-900">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="font-fsa-display text-3xl font-extrabold text-fsa-navy-900">
                  {currencySymbol} {formatNumber(plan.price, locale)}
                </span>
                <span className="ms-1 text-sm text-fsa-text-muted">
                  / {plan.duration} {plan.durationType}
                </span>
              </div>
              {plan.description && <p className="mt-2 text-sm text-fsa-text-muted">{plan.description}</p>}
              <Link
                href={localeHref("/apply", locale)}
                className={`mt-auto block rounded-fsa-pill py-3 text-center font-semibold transition-colors ${
                  i === 0 ? "bg-fsa-navy-900 text-white hover:bg-fsa-navy-800" : "border-2 border-fsa-navy-900/20 text-fsa-navy-900 hover:bg-fsa-pale-bg"
                }`}
              >
                {t("applyNow")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
