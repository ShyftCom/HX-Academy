import { lf } from "./localeField";
import { FsaButton } from "../buttons/FsaButton";
import { localeHref } from "../localeHref";

const STYLE_MAP: Record<string, { section: string; heading: string; body: string; button: "sky" | "navy" | "white" }> = {
  navy: { section: "bg-fsa-navy-900", heading: "text-white", body: "text-white/80", button: "sky" },
  sky: { section: "bg-fsa-sky", heading: "text-fsa-navy-900", body: "text-fsa-navy-900/80", button: "navy" },
  white: { section: "bg-white", heading: "text-fsa-navy-900", body: "text-fsa-text-muted", button: "navy" },
};

export function CtaBannerSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const body = lf(content, "body", locale);
  const ctaLabel = lf(content, "ctaLabel", locale);
  if (!heading && !body) return null;
  const s = STYLE_MAP[content.style as string] ?? STYLE_MAP.navy;

  return (
    <section className={`${s.section} py-[var(--fsa-section-y)]`}>
      <div className="mx-auto max-w-2xl px-[var(--fsa-container-pad)] text-center">
        {heading && <h2 className={`font-fsa-display text-3xl font-bold uppercase tracking-tight sm:text-4xl ${s.heading}`}>{heading}</h2>}
        {body && <p className={`mt-4 text-lg ${s.body}`}>{body}</p>}
        {content.ctaUrl && ctaLabel && (
          <div className="mt-8 flex justify-center">
            <FsaButton href={localeHref(content.ctaUrl, locale)} variant={s.button} size="lg">
              {ctaLabel}
            </FsaButton>
          </div>
        )}
      </div>
    </section>
  );
}
