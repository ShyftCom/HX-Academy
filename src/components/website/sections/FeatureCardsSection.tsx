import * as Icons from "lucide-react";
import { Trophy } from "lucide-react";
import { lf } from "./localeField";

export function FeatureCardsSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const subheading = lf(content, "subheading", locale);
  const cards: any[] = Array.isArray(content.cards) ? content.cards : [];
  if (cards.length === 0) return null;

  return (
    <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {(heading || subheading) && (
          <div className="mx-auto mb-14 max-w-2xl text-center">
            {heading && <h2 className="font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{heading}</h2>}
            {subheading && <p className="mt-4 text-lg text-fsa-text-muted">{subheading}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => {
            const Icon = (c.icon && (Icons as any)[c.icon]) || Trophy;
            return (
              <div key={i} className="rounded-fsa-md border border-fsa-border bg-white p-7 shadow-fsa-card transition-transform hover:-translate-y-1">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-fsa-sm bg-fsa-sky/15">
                  <Icon className="h-6 w-6 text-fsa-navy-900" />
                </div>
                <h3 className="font-fsa-display text-xl font-bold text-fsa-navy-900">{lf(c, "title", locale)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fsa-text-muted">{lf(c, "body", locale)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
