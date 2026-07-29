import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";
import { SectionRenderer, type RenderableSection } from "./sections/SectionRenderer";

/**
 * Renders a slug-driven page's sections with the breadcrumb correctly
 * placed directly under the hero (not after the whole page) — a leading
 * `type: "hero"` section renders first, then the breadcrumb, then everything else.
 */
export function SlugPageBody({
  sections,
  locale,
  breadcrumbLabel,
  breadcrumbTrail = [],
}: {
  sections: RenderableSection[];
  locale: string;
  breadcrumbLabel: string;
  breadcrumbTrail?: BreadcrumbItem[];
}) {
  const [firstSection, ...restSections] = sections;
  const hasHero = firstSection?.type === "hero" && firstSection.isEnabled;

  return (
    <>
      {hasHero && <SectionRenderer sections={[firstSection]} locale={locale} />}
      <Breadcrumb locale={locale} items={[...breadcrumbTrail, { label: breadcrumbLabel }]} />
      <SectionRenderer sections={hasHero ? restSections : sections} locale={locale} />
    </>
  );
}
