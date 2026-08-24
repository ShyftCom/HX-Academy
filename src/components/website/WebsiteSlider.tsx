"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface Slide {
  id: string; imageUrl: string; title: string | null; titleFr: string | null; titleAr: string | null;
  subtitle: string | null; subtitleFr: string | null; subtitleAr: string | null;
  ctaLabel: string | null; ctaUrl: string | null;
}

function getLabel(slide: Slide, locale: string, field: "title" | "subtitle"): string | null {
  if (field === "title") {
    if (locale === "ar" && slide.titleAr) return slide.titleAr;
    if (locale === "fr" && slide.titleFr) return slide.titleFr;
    if (locale === "ar" && slide.titleFr) return slide.titleFr;
    return slide.title;
  }
  if (locale === "ar" && slide.subtitleAr) return slide.subtitleAr;
  if (locale === "fr" && slide.subtitleFr) return slide.subtitleFr;
  if (locale === "ar" && slide.subtitleFr) return slide.subtitleFr;
  return slide.subtitle;
}

export function WebsiteSlider({ locale, stationId }: { locale: string; stationId?: string }) {
  const t = useTranslations("a11y");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const url = stationId ? `/api/website/slides?station_id=${stationId}` : "/api/website/slides";
    fetch(url).then((r) => r.json()).then((data) => { if (Array.isArray(data) && data.length > 0) setSlides(data); }).catch(() => {});
  }, [stationId]);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [slides.length, isHovered, next]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const title = getLabel(slide, locale, "title");
  const subtitle = getLabel(slide, locale, "subtitle");

  return (
    <div
      className="relative w-full overflow-hidden bg-fsa-navy-900"
      style={{ aspectRatio: "16/6", minHeight: "280px", maxHeight: "560px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          <img src={s.imageUrl} alt={s.title ?? ""} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Text overlay */}
      {(title || subtitle || slide.ctaLabel) && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-12">
          <div className="max-w-2xl me-auto text-start">
            {title && (
              <h2 className="font-fsa-display text-2xl md:text-4xl font-bold uppercase mb-2 text-white drop-shadow-md" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }} dir="auto">{title}
              </h2>
            )}
            {subtitle && (
              <p className="text-white/90 text-sm md:text-lg mb-4 drop-shadow" dir="auto">{subtitle}
              </p>
            )}
            {slide.ctaLabel && slide.ctaUrl && (
              <Link
                href={slide.ctaUrl}
                className="inline-flex items-center px-5 py-2.5 bg-fsa-sky text-white font-semibold text-sm rounded-fsa-pill hover:brightness-95 transition-all shadow-lg"
              >
                {slide.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Arrows — only if multiple slides */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute start-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label={t("previousSlide")}
          >
            <ChevronLeft className="ob-flip-rtl w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute end-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label={t("nextSlide")}
          >
            <ChevronRight className="ob-flip-rtl w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
                aria-label={t("goToSlide", { n: i + 1 })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
