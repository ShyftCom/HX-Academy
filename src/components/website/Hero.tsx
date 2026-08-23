"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useHeaderOverlay } from "./HeaderOverlayContext";
import { FsaButton } from "./buttons/FsaButton";

export interface HeroCta {
  label: string;
  href: string;
  variant?: "sky" | "navy" | "white" | "outline";
}

export interface HeroProps {
  /**
   * Omit for an entity that has no photo yet: the hero then renders a plain
   * brand panel instead of stock imagery. A stock pitch beneath a named venue
   * reads as a photograph *of that venue*, which is a claim we cannot make on
   * the academy's behalf.
   */
  desktopImageUrl?: string;
  mobileImageUrl?: string;
  videoUrl?: string;
  /** CSS object-position value, e.g. "center 30%" — lets admins keep the subject in frame on crop. */
  focalPoint?: string;
  overlayColor?: string;
  /** 0-1 */
  overlayOpacity?: number;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  align?: "left" | "center" | "right";
  /** Vertical position of the text block within the hero. */
  verticalPosition?: "top" | "center" | "bottom";
  minHeight?: string;
  /** Whether the global header should render transparent-over-hero while at the top of this page. */
  enableHeaderOverlay?: boolean;
}

export function Hero({
  desktopImageUrl,
  mobileImageUrl,
  videoUrl,
  focalPoint = "center",
  overlayColor = "#001F49",
  overlayOpacity = 0.45,
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  align = "left",
  verticalPosition = "bottom",
  minHeight = "min(78vh, 720px)",
  enableHeaderOverlay = true,
}: HeroProps) {
  const { registerHero } = useHeaderOverlay();

  useEffect(() => {
    if (!enableHeaderOverlay) return;
    registerHero(true);
    return () => registerHero(false);
  }, [enableHeaderOverlay, registerHero]);

  const alignClass = align === "center" ? "items-center text-center" : align === "right" ? "items-end text-end" : "items-start text-start";
  const vPosClass = verticalPosition === "top" ? "justify-start pt-32" : verticalPosition === "center" ? "justify-center" : "justify-end pb-14";

  return (
    <section className="relative w-full overflow-hidden bg-fsa-navy-900" style={{ minHeight }}>
      {/* Background media */}
      <div className="absolute inset-0">
        {videoUrl ? (
          <video
            className="h-full w-full object-cover"
            style={{ objectPosition: focalPoint }}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            poster={desktopImageUrl}
          />
        ) : desktopImageUrl ? (
          <>
            <Image
              src={desktopImageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className={`object-cover ${mobileImageUrl ? "hidden sm:block" : ""}`}
              style={{ objectPosition: focalPoint }}
            />
            {mobileImageUrl && (
              <Image src={mobileImageUrl} alt="" fill priority sizes="100vw" className="object-cover sm:hidden" style={{ objectPosition: focalPoint }} />
            )}
          </>
        ) : (
          /* No photo: a deliberate brand panel. Reads as "no image yet"
             rather than as a picture of this place. */
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-fsa-navy-900) 0%, var(--color-fsa-navy-800) 55%, color-mix(in srgb, var(--color-fsa-sky) 18%, var(--color-fsa-navy-800)) 100%)",
            }}
          />
        )}
        {/* The overlay and bottom scrim exist to keep white text legible over a
            photograph. Over the brand panel they would only muddy a colour that
            is already dark enough, so skip both when there is no media. */}
        {(videoUrl || desktopImageUrl) && (
          <>
            <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayOpacity }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          </>
        )}
      </div>

      {/* Content */}
      <div
        className={`relative z-10 mx-auto flex h-full min-h-[inherit] flex-col px-[var(--fsa-container-pad)] py-16 ${alignClass} ${vPosClass}`}
        style={{ maxWidth: "var(--fsa-container-max)" }}
      >
        {eyebrow && (
          <span className="mb-4 inline-flex items-center gap-2 rounded-fsa-pill bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm" dir="auto">{eyebrow}
          </span>
        )}
        <h1
          className="max-w-4xl font-fsa-display font-extrabold uppercase leading-[0.95] tracking-tight text-white"
          style={{ fontSize: "clamp(2.75rem, 3rem + 4vw, 6.5rem)" }}
         dir="auto">{title}
        </h1>
        {subtitle && <p className="mt-5 max-w-xl text-lg text-white/85 sm:text-xl" dir="auto">{subtitle}</p>}
        {(primaryCta || secondaryCta) && (
          <div className={`mt-8 flex flex-wrap gap-3 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}>
            {primaryCta && (
              <FsaButton href={primaryCta.href} variant={primaryCta.variant ?? "sky"} size="lg">
                {primaryCta.label}
              </FsaButton>
            )}
            {secondaryCta && (
              <FsaButton href={secondaryCta.href} variant={secondaryCta.variant ?? "outline"} size="lg" icon={false}>
                {secondaryCta.label}
              </FsaButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
