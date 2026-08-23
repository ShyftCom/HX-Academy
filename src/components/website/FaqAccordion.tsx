"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { lf } from "./sections/localeField";

export interface FaqItem {
  id: string;
  question: string;
  questionFr?: string | null;
  questionAr?: string | null;
  answer: string;
  answerFr?: string | null;
  answerAr?: string | null;
}

export interface FaqAccordionProps {
  items: FaqItem[];
  locale: string;
  heading?: string;
  /** Allow more than one panel open at once. Default: only one at a time (matches the reference). */
  multiOpen?: boolean;
}

/** Emits FAQPage JSON-LD for exactly the FAQs actually rendered on this page — never
 *  for hidden/unpublished ones, per Phase 12's "generate valid FAQPage JSON-LD only
 *  for visible FAQs." */
function FaqJsonLd({ items, locale }: { items: FaqItem[]; locale: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: lf(f as unknown as Record<string, unknown>, "question", locale),
      acceptedAnswer: { "@type": "Answer", text: lf(f as unknown as Record<string, unknown>, "answer", locale).replace(/<[^>]+>/g, "") },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

export function FaqAccordion({ items, locale, heading, multiOpen = false }: FaqAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  if (items.length === 0) return null;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = multiOpen ? new Set(prev) : new Set<string>();
      if (prev.has(id) && multiOpen) next.delete(id);
      else if (prev.has(id) && !multiOpen) return new Set();
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <FaqJsonLd items={items} locale={locale} />
      <div className="mx-auto max-w-3xl px-[var(--fsa-container-pad)]">
        {heading && (
          <h2 className="mb-10 text-center font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-heading-blue sm:text-5xl" dir="auto">{heading}</h2>
        )}
        <div className="divide-y divide-fsa-border rounded-fsa-md border border-fsa-border">
          {items.map((f) => {
            const isOpen = openIds.has(f.id);
            const panelId = `faq-panel-${f.id}`;
            const question = lf(f as unknown as Record<string, unknown>, "question", locale);
            const answer = lf(f as unknown as Record<string, unknown>, "answer", locale);
            return (
              <div key={f.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(f.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start transition-colors hover:bg-fsa-pale-bg"
                >
                  <span className="font-semibold text-fsa-navy-900" dir="auto">{question}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fsa-border text-fsa-navy-900">
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[var(--ease-fsa-standard)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="min-h-0">
                    <div className="fsa-richtext px-6 pb-5 text-sm text-fsa-text-muted" dir="auto" dangerouslySetInnerHTML={{ __html: answer }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
