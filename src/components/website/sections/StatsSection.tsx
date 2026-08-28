import { lf } from "./localeField";

export function StatsSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const items: any[] = Array.isArray(content.items) ? content.items : [];
  if (items.length === 0) return null;

  return (
    <section className="bg-fsa-navy-900 py-14">
      <div
        className="mx-auto grid grid-cols-2 gap-8 px-[var(--fsa-container-pad)] text-center sm:grid-cols-4"
        style={{ maxWidth: "var(--fsa-container-max)" }}
      >
        {items.map((s, i) => (
          <div key={i}>
            <div className="font-fsa-display text-4xl font-extrabold text-fsa-heading-blue sm:text-5xl">
              {s.value}
              {s.suffix ?? ""}
            </div>
            <div className="mt-1.5 text-sm font-medium text-white/75">{lf(s, "label", locale)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
