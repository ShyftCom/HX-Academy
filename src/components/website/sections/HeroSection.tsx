import { getTranslations } from "next-intl/server";
import { Hero } from "../Hero";
import { lf } from "./localeField";
import { localeHref } from "../localeHref";
import { mobileVariant } from "../mobileVariant";

export async function HeroSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const heading = lf(content, "heading", locale);
  if (!content.imageUrl && !content.videoUrl) return null;

  return (
    <Hero
      desktopImageUrl={content.imageUrl ?? ""}
      mobileImageUrl={content.mobileImageUrl ?? mobileVariant(content.imageUrl)}
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
      primaryCta={content.ctaUrl ? { label: lf(content, "ctaLabel", locale) || t("learnMore"), href: localeHref(content.ctaUrl, locale) } : undefined}
      secondaryCta={content.secondaryCtaUrl ? { label: lf(content, "secondaryCtaLabel", locale) || t("learnMore"), href: content.secondaryCtaUrl, variant: "outline" } : undefined}
    />
  );
}
