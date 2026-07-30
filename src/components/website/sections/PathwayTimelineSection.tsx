import { db } from "@/lib/db";
import { PathwayTimeline } from "../PathwayTimeline";
import { lf } from "./localeField";

export async function PathwayTimelineSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const levels = await db.pathwayLevel.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  if (levels.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-14 text-center font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">{heading}</h2>}
        <PathwayTimeline levels={levels} locale={locale} />
      </div>
    </section>
  );
}
