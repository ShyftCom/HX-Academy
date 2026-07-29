import type { SectionType } from "./sectionTypes";

export type FieldDef =
  | { key: string; kind: "text" | "textarea" | "url" | "image" | "number"; label: string; multilocale?: boolean; help?: string }
  | { key: string; kind: "select"; label: string; options: { value: string; label: string }[] }
  | { key: string; kind: "list"; label: string; itemFields: FieldDef[]; itemLabel: string };

// Editable-field schema per section type, for the admin's generic
// content-editor form (src/app/(back-office)/dashboard/website/pages/[id]/page.tsx).
// Data-driven types (isDataDriven in sectionTypes.ts) only need light config
// fields here (heading/limit/category) since their real content comes live
// from the database, not from this JSON blob.
export const SECTION_FIELD_SCHEMAS: Partial<Record<SectionType, FieldDef[]>> = {
  hero: [
    { key: "imageUrl", kind: "image", label: "Desktop image" },
    { key: "mobileImageUrl", kind: "image", label: "Mobile image (optional)" },
    { key: "videoUrl", kind: "url", label: "Background video URL (optional, overrides image)" },
    { key: "eyebrow", kind: "text", label: "Eyebrow", multilocale: true },
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "subheading", kind: "textarea", label: "Subheading", multilocale: true },
    { key: "ctaLabel", kind: "text", label: "Primary button label", multilocale: true },
    { key: "ctaUrl", kind: "url", label: "Primary button URL" },
    { key: "secondaryCtaLabel", kind: "text", label: "Secondary button label", multilocale: true },
    { key: "secondaryCtaUrl", kind: "url", label: "Secondary button URL" },
    { key: "align", kind: "select", label: "Text alignment", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
    { key: "verticalPosition", kind: "select", label: "Text vertical position", options: [{ value: "top", label: "Top" }, { value: "center", label: "Center" }, { value: "bottom", label: "Bottom" }] },
    { key: "overlayOpacity", kind: "number", label: "Dark overlay opacity (0-1)" },
  ],
  richtext: [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "html", kind: "textarea", label: "Body (HTML)", multilocale: true, help: "Basic HTML tags: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <a>" },
  ],
  "split-content": [
    { key: "imageUrl", kind: "image", label: "Image" },
    { key: "imagePosition", kind: "select", label: "Image position", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
    { key: "eyebrow", kind: "text", label: "Eyebrow", multilocale: true },
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "body", kind: "textarea", label: "Body text", multilocale: true },
    { key: "bulletPoints", kind: "list", label: "Bullet points", itemLabel: "Point", itemFields: [{ key: "text", kind: "text", label: "Text", multilocale: true }] },
    { key: "ctaLabel", kind: "text", label: "Button label", multilocale: true },
    { key: "ctaUrl", kind: "url", label: "Button URL" },
  ],
  "feature-cards": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "subheading", kind: "textarea", label: "Subheading", multilocale: true },
    {
      key: "cards", kind: "list", label: "Cards", itemLabel: "Card",
      itemFields: [
        { key: "icon", kind: "text", label: "Icon name (lucide-react, e.g. Trophy, Shield, Users)" },
        { key: "title", kind: "text", label: "Title", multilocale: true },
        { key: "body", kind: "textarea", label: "Description", multilocale: true },
      ],
    },
  ],
  "promo-banner": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "body", kind: "textarea", label: "Body", multilocale: true },
    { key: "ctaLabel", kind: "text", label: "Button label", multilocale: true },
    { key: "ctaUrl", kind: "url", label: "Button URL" },
    { key: "bgColor", kind: "select", label: "Background", options: [{ value: "sky", label: "Sky blue" }, { value: "navy", label: "Navy" }] },
    { key: "imageUrl", kind: "image", label: "Background image (optional, overrides color)" },
  ],
  stats: [
    {
      key: "items", kind: "list", label: "Stats", itemLabel: "Stat",
      itemFields: [
        { key: "value", kind: "text", label: "Value (e.g. 200)" },
        { key: "suffix", kind: "text", label: "Suffix (e.g. +, %)" },
        { key: "label", kind: "text", label: "Label", multilocale: true },
      ],
    },
  ],
  testimonials: [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    {
      key: "items", kind: "list", label: "Testimonials", itemLabel: "Testimonial",
      itemFields: [
        { key: "quote", kind: "textarea", label: "Quote", multilocale: true },
        { key: "author", kind: "text", label: "Author name" },
        { key: "role", kind: "text", label: "Author role", multilocale: true },
        { key: "avatarUrl", kind: "image", label: "Avatar (optional)" },
      ],
    },
  ],
  "logo-cloud": [{ key: "heading", kind: "text", label: "Heading", multilocale: true }],
  gallery: [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    {
      key: "images", kind: "list", label: "Images", itemLabel: "Image",
      itemFields: [{ key: "url", kind: "image", label: "Image" }, { key: "caption", kind: "text", label: "Caption", multilocale: true }],
    },
  ],
  video: [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "videoUrl", kind: "url", label: "Video URL (YouTube or direct link)" },
  ],
  "cta-banner": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "body", kind: "textarea", label: "Body", multilocale: true },
    { key: "ctaLabel", kind: "text", label: "Button label", multilocale: true },
    { key: "ctaUrl", kind: "url", label: "Button URL" },
    { key: "style", kind: "select", label: "Style", options: [{ value: "navy", label: "Navy" }, { value: "sky", label: "Sky blue" }, { value: "white", label: "White" }] },
  ],
  "pricing-cards": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "subheading", kind: "textarea", label: "Subheading", multilocale: true },
  ],
  "faq-accordion": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "category", kind: "text", label: "Filter by FAQ category (optional, blank = all)" },
  ],
  "programme-grid": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "limit", kind: "number", label: "Max programmes to show" },
  ],
  "venue-grid": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "limit", kind: "number", label: "Max venues to show" },
  ],
  "pathway-timeline": [{ key: "heading", kind: "text", label: "Heading", multilocale: true }],
  "news-grid": [
    { key: "heading", kind: "text", label: "Heading", multilocale: true },
    { key: "limit", kind: "number", label: "Max articles to show" },
  ],
};
