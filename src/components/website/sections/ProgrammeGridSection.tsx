import { db } from "@/lib/db";
import { ProgrammeCard } from "../cards/ProgrammeCard";
import { lf } from "./localeField";

export async function ProgrammeGridSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);

  const programmes = await db.programme.findMany({
    where: { isPubliclyListed: true, ...(content.categoryId ? { categoryId: content.categoryId } : {}) },
    include: { category: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    take: content.limit ?? 6,
  });

  if (programmes.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl" dir="auto">{heading}</h2>}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((p) => (
            <ProgrammeCard key={p.id} programme={p} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
