// Central registry of every LandingSection.type value. Used by both the
// public SectionRenderer (type -> component) and the admin "add section"
// picker (type -> label/icon/default content). Keeping this list here means
// adding a new section type never requires touching more than two files
// (this registry + the new renderer component).

export type SectionType =
  | "hero"
  | "richtext"
  | "split-content"
  | "feature-cards"
  | "promo-banner"
  | "programme-grid"
  | "venue-grid"
  | "squad-grid"
  | "coach-grid"
  | "schedule-table"
  | "faq-accordion"
  | "stats"
  | "testimonials"
  | "logo-cloud"
  | "gallery"
  | "video"
  | "cta-banner"
  | "pricing-cards"
  | "contact-form"
  | "registration-form"
  | "map"
  | "pathway-timeline"
  | "news-grid";

export interface SectionTypeMeta {
  label: string;
  description: string;
  defaultContent: Record<string, unknown>;
  /** Sections backed by their own live data model rather than admin-arranged JSON. */
  isDataDriven?: boolean;
}

export const SECTION_TYPES: Record<SectionType, SectionTypeMeta> = {
  hero: {
    label: "Hero",
    description: "Full-width image/video banner with heading and CTA",
    defaultContent: { heading: "Your heading here", subheading: "", ctaLabel: "", ctaUrl: "", overlayOpacity: 0.45 },
  },
  richtext: {
    label: "Rich text",
    description: "A heading plus a block of formatted text",
    defaultContent: { heading: "", html: "<p>Write something…</p>" },
  },
  "split-content": {
    label: "Split content",
    description: "Image on one side, text and CTA on the other",
    defaultContent: { imagePosition: "right", eyebrow: "", heading: "", body: "", bulletPoints: [], ctaLabel: "", ctaUrl: "" },
  },
  "feature-cards": {
    label: "Feature cards",
    description: "A grid of icon + title + description cards",
    defaultContent: { heading: "", cards: [] },
  },
  "promo-banner": {
    label: "Promo banner",
    description: "Rounded, colored callout banner with a CTA",
    defaultContent: { heading: "", body: "", ctaLabel: "", ctaUrl: "", bgColor: "sky" },
  },
  "programme-grid": {
    label: "Programme grid",
    description: "Live grid of published programmes",
    defaultContent: { heading: "Our Programmes", limit: 6 },
    isDataDriven: true,
  },
  "venue-grid": {
    label: "Venue grid",
    description: "Live grid of published venues",
    defaultContent: { heading: "Our Venues", limit: 6 },
    isDataDriven: true,
  },
  "squad-grid": {
    label: "Development squad grid",
    description: "Live grid of development squad age groups",
    defaultContent: { heading: "Development Squads" },
    isDataDriven: true,
  },
  "coach-grid": {
    label: "Coach grid",
    description: "Live grid of coach profiles",
    defaultContent: { heading: "Meet the Coaches", limit: 8 },
    isDataDriven: true,
  },
  "schedule-table": {
    label: "Schedule table",
    description: "Age-group schedule table for a programme",
    defaultContent: { programmeId: "" },
    isDataDriven: true,
  },
  "faq-accordion": {
    label: "FAQ accordion",
    description: "Expandable question/answer list",
    defaultContent: { heading: "Frequently Asked Questions", category: "" },
    isDataDriven: true,
  },
  stats: {
    label: "Stats",
    description: "A row of big numbers with labels",
    defaultContent: { items: [] },
  },
  testimonials: {
    label: "Testimonials",
    description: "Quotes from parents, players or partners",
    defaultContent: { heading: "", items: [] },
  },
  "logo-cloud": {
    label: "Logo cloud",
    description: "Scrolling row of sponsor/partner logos",
    defaultContent: { heading: "Sponsors & Partners", source: "sponsors" },
    isDataDriven: true,
  },
  gallery: {
    label: "Gallery",
    description: "Grid of photos with optional captions",
    defaultContent: { heading: "", images: [] },
  },
  video: {
    label: "Video",
    description: "Embedded or hosted video with a heading",
    defaultContent: { heading: "", videoUrl: "" },
  },
  "cta-banner": {
    label: "CTA banner",
    description: "Full-width closing call to action",
    defaultContent: { heading: "", body: "", ctaLabel: "", ctaUrl: "", style: "navy" },
  },
  "pricing-cards": {
    label: "Pricing cards",
    description: "Live grid of subscription plans",
    defaultContent: { heading: "Plans & Pricing", source: "subscription_plans" },
    isDataDriven: true,
  },
  "contact-form": {
    label: "Contact form",
    description: "The public contact form",
    defaultContent: { heading: "Get in Touch", showMap: false },
    isDataDriven: true,
  },
  "registration-form": {
    label: "Registration form",
    description: "Development squad / programme registration form",
    defaultContent: { heading: "Register Your Interest" },
    isDataDriven: true,
  },
  map: {
    label: "Map",
    description: "Embedded map of one or more venues",
    defaultContent: { embedUrl: "" },
  },
  "pathway-timeline": {
    label: "Pathway timeline",
    description: "Live visual timeline of pathway levels",
    defaultContent: { heading: "Our Pathway" },
    isDataDriven: true,
  },
  "news-grid": {
    label: "News grid",
    description: "Live grid of published news articles",
    defaultContent: { heading: "Latest News", limit: 3 },
    isDataDriven: true,
  },
};

export const SECTION_TYPE_KEYS = Object.keys(SECTION_TYPES) as SectionType[];
