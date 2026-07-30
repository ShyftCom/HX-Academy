import { lf } from "./localeField";

export function RichTextSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const html = lf(content, "html", locale);
  if (!heading && !html) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto max-w-3xl px-[var(--fsa-container-pad)]">
        {heading && (
          <h2 className="mb-6 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{heading}</h2>
        )}
        {html && <div className="fsa-richtext text-lg text-fsa-text" dangerouslySetInnerHTML={{ __html: html }} />}
      </div>
    </section>
  );
}
