import { db } from "@/lib/db";
import { lf } from "./localeField";

export async function LogoCloudSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const sponsors = await db.websiteSponsor.findMany({
    where: { isActive: true, stationId: null },
    orderBy: { position: "asc" },
  });
  if (sponsors.length === 0) return null;

  return (
    <section className="border-t border-fsa-border bg-white py-10">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-fsa-text-muted">{heading}</p>}
        <div className="flex flex-wrap items-center justify-center gap-10">
          {sponsors.map((s) =>
            s.websiteUrl ? (
              <a key={s.id} href={s.websiteUrl} target="_blank" rel="noopener noreferrer" title={s.name}>
                <img src={s.logoUrl} alt={s.name} className="h-10 object-contain opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0" />
              </a>
            ) : (
              <img key={s.id} src={s.logoUrl} alt={s.name} title={s.name} className="h-10 object-contain opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0" />
            )
          )}
        </div>
      </div>
    </section>
  );
}
