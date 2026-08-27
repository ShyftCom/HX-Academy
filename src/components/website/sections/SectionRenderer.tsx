import { HeroSection } from "./HeroSection";
import { RichTextSection } from "./RichTextSection";
import { SplitContentSection } from "./SplitContentSection";
import { FeatureCardsSection } from "./FeatureCardsSection";
import { PromoBannerSection } from "./PromoBannerSection";
import { StatsSection } from "./StatsSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { LogoCloudSection } from "./LogoCloudSection";
import { GallerySection } from "./GallerySection";
import { VideoSection } from "./VideoSection";
import { CtaBannerSection } from "./CtaBannerSection";
import { PricingCardsSection } from "./PricingCardsSection";
import { FaqAccordionSection } from "./FaqAccordionSection";
import { ProgrammeGridSection } from "./ProgrammeGridSection";
import { VenueGridSection } from "./VenueGridSection";
import { PathwayTimelineSection } from "./PathwayTimelineSection";
import { NewsGridSection } from "./NewsGridSection";
import type { SectionType } from "./sectionTypes";

export interface RenderableSection {
  id: string;
  type: string;
  content: string; // JSON string, per LandingSection.content
  isEnabled: boolean;
}

function parseContent(raw: string): Record<string, any> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Section types not yet wired to a renderer (their pages are built in later
// milestones — programme-grid/venue-grid go live with the Programmes/Venues
// pages, etc.) intentionally render nothing rather than crash the page, so
// they can be added to a page's section list ahead of their component
// existing without breaking anything.
// Some section components are async server components (they read translations
// via getTranslations), so the return type has to allow a Promise as well.
const IMPLEMENTED: Partial<Record<SectionType, (props: { content: Record<string, any>; locale: string }) => React.ReactNode | Promise<React.ReactNode>>> = {
  hero: HeroSection,
  richtext: RichTextSection,
  "split-content": SplitContentSection,
  "feature-cards": FeatureCardsSection,
  "promo-banner": PromoBannerSection,
  stats: StatsSection,
  testimonials: TestimonialsSection,
  "logo-cloud": LogoCloudSection,
  gallery: GallerySection,
  video: VideoSection,
  "cta-banner": CtaBannerSection,
  "pricing-cards": PricingCardsSection,
  "faq-accordion": FaqAccordionSection,
  "programme-grid": ProgrammeGridSection,
  "venue-grid": VenueGridSection,
  "pathway-timeline": PathwayTimelineSection,
  "news-grid": NewsGridSection,
};

export function SectionRenderer({ sections, locale }: { sections: RenderableSection[]; locale: string }) {
  const enabled = sections.filter((s) => s.isEnabled);

  return (
    <>
      {enabled.map((section) => {
        const Component = IMPLEMENTED[section.type as SectionType];
        if (!Component) return null;
        const content = parseContent(section.content);
        return <Component key={section.id} content={content} locale={locale} />;
      })}
    </>
  );
}
