import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // omit on the current/last item
}

/**
 * Server component. Each page supplies its own trail (Home is added
 * automatically) — this keeps labels human-readable without trying to guess
 * them from dynamic route segments, while still giving every page a single
 * consistent renderer + BreadcrumbList JSON-LD emitter.
 */
export function Breadcrumb({ items, homeLabel = "Home", locale }: { items: BreadcrumbItem[]; homeLabel?: string; locale: string }) {
  const trail: BreadcrumbItem[] = [{ label: homeLabel, href: `/${locale}` }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="border-b border-fsa-border bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div
        className="mx-auto flex items-center gap-1.5 overflow-x-auto whitespace-nowrap px-[var(--fsa-container-pad)] py-3 text-sm"
        style={{ maxWidth: "var(--fsa-container-max)" }}
      >
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fsa-text-muted" aria-hidden="true" />}
              {isLast || !item.href ? (
                <span className="font-medium text-fsa-navy-900" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-fsa-text-muted transition-colors hover:text-fsa-navy-900">
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
