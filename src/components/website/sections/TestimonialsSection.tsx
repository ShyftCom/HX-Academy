import { Quote } from "lucide-react";
import { lf } from "./localeField";

export function TestimonialsSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const items: any[] = Array.isArray(content.items) ? content.items : [];
  if (items.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-12 text-center font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl" dir="auto">{heading}</h2>}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <figure key={i} className="rounded-fsa-md border border-fsa-border bg-fsa-pale-bg p-7">
              <Quote className="h-6 w-6 text-fsa-sky" aria-hidden="true" />
              <blockquote className="mt-4 text-base leading-relaxed text-fsa-text">&ldquo;{lf(t, "quote", locale)}&rdquo;</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {t.avatarUrl ? (
                  <img src={t.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fsa-navy-900 text-sm font-bold text-white">
                    {(t.author ?? "?").slice(0, 1)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-fsa-navy-900">{t.author}</div>
                  <div className="text-xs text-fsa-text-muted">{lf(t, "role", locale)}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
