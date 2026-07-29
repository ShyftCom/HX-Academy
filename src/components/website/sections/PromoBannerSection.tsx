import { lf } from "./localeField";
import { FsaButton } from "../buttons/FsaButton";

const BG_MAP: Record<string, string> = {
  sky: "bg-gradient-to-br from-fsa-sky to-fsa-heading-blue text-fsa-navy-900",
  navy: "bg-gradient-to-br from-fsa-navy-900 to-fsa-navy-800 text-white",
};

export function PromoBannerSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const body = lf(content, "body", locale);
  const ctaLabel = lf(content, "ctaLabel", locale);
  if (!heading && !body) return null;
  const isNavyBg = content.bgColor === "navy" || !!content.imageUrl;
  const bgClass = content.imageUrl ? "" : BG_MAP[content.bgColor as string] ?? BG_MAP.sky;

  return (
    <section className="bg-white px-[var(--fsa-container-pad)] py-10">
      <div
        className={`mx-auto overflow-hidden rounded-fsa-lg px-8 py-14 text-center sm:px-16 ${bgClass}`}
        style={{
          maxWidth: "var(--fsa-container-max)",
          backgroundImage: content.imageUrl ? `linear-gradient(rgba(0,31,73,0.65), rgba(0,31,73,0.65)), url(${content.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: content.imageUrl ? "#fff" : undefined,
        }}
      >
        {heading && <h2 className="font-fsa-display text-3xl font-bold uppercase tracking-tight sm:text-5xl">{heading}</h2>}
        {body && <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{body}</p>}
        {content.ctaUrl && ctaLabel && (
          <div className="mt-8 flex justify-center">
            <FsaButton href={content.ctaUrl} variant={isNavyBg ? "sky" : "navy"} size="lg">
              {ctaLabel}
            </FsaButton>
          </div>
        )}
      </div>
    </section>
  );
}
