import Image from "next/image";
import { Check } from "lucide-react";
import { lf } from "./localeField";
import { FsaButton } from "../buttons/FsaButton";

export function SplitContentSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const body = lf(content, "body", locale);
  const eyebrow = lf(content, "eyebrow", locale);
  const ctaLabel = lf(content, "ctaLabel", locale);
  const imageRight = (content.imagePosition ?? "right") === "right";
  const bullets: any[] = Array.isArray(content.bulletPoints) ? content.bulletPoints : [];

  if (!heading && !body && !content.imageUrl) return null;

  const textBlock = (
    <div className="flex flex-col justify-center">
      {eyebrow && <span className="mb-3 text-sm font-bold uppercase tracking-widest text-fsa-heading-blue">{eyebrow}</span>}
      {heading && <h2 className="font-fsa-display text-3xl font-bold uppercase leading-tight tracking-tight text-fsa-navy-900 sm:text-4xl">{heading}</h2>}
      {body && <p className="mt-5 text-lg leading-relaxed text-fsa-text-muted">{body}</p>}
      {bullets.length > 0 && (
        <ul className="mt-6 space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fsa-sky/20 text-fsa-navy-900">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-fsa-text">{lf(b, "text", locale)}</span>
            </li>
          ))}
        </ul>
      )}
      {content.ctaUrl && ctaLabel && (
        <div className="mt-8">
          <FsaButton href={content.ctaUrl} variant="navy">
            {ctaLabel}
          </FsaButton>
        </div>
      )}
    </div>
  );

  const imageBlock = content.imageUrl ? (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-fsa-lg bg-fsa-pale-bg">
      <Image src={content.imageUrl} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
    </div>
  ) : (
    <div />
  );

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div
        className={`mx-auto grid items-center gap-10 px-[var(--fsa-container-pad)] lg:grid-cols-2 lg:gap-16 ${imageRight ? "" : "lg:[&>*:first-child]:order-2"}`}
        style={{ maxWidth: "var(--fsa-container-max)" }}
      >
        {textBlock}
        {imageBlock}
      </div>
    </section>
  );
}
