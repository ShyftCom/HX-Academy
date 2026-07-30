import { Hero } from "../Hero";
import { lf } from "./localeField";

export function HeroSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  if (!content.imageUrl && !content.videoUrl) return null;

  return (
    <Hero
      desktopImageUrl={content.imageUrl ?? ""}
      mobileImageUrl={content.mobileImageUrl}
      videoUrl={content.videoUrl}
      focalPoint={content.focalPoint}
      overlayColor={content.overlayColor}
      overlayOpacity={content.overlayOpacity}
      eyebrow={lf(content, "eyebrow", locale) || undefined}
      title={heading}
      subtitle={lf(content, "subheading", locale) || undefined}
      align={content.align}
      verticalPosition={content.verticalPosition}
      minHeight={content.minHeight}
      primaryCta={content.ctaUrl ? { label: lf(content, "ctaLabel", locale) || "Learn more", href: content.ctaUrl } : undefined}
      secondaryCta={content.secondaryCtaUrl ? { label: lf(content, "secondaryCtaLabel", locale) || "Learn more", href: content.secondaryCtaUrl, variant: "outline" } : undefined}
    />
  );
}
