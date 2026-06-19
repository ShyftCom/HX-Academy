"use client";

import { useEffect, useState } from "react";

interface Sponsor {
  id: string; name: string; logoUrl: string; websiteUrl: string | null;
}

export function WebsiteSponsors({ locale, stationId }: { locale: string; stationId?: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    const url = stationId ? `/api/website/sponsors?station_id=${stationId}` : "/api/website/sponsors";
    fetch(url).then((r) => r.json()).then((data) => { if (Array.isArray(data) && data.length > 0) setSponsors(data); }).catch(() => {});
  }, [stationId]);

  if (sponsors.length === 0) return null;

  const isRtl = locale === "ar";

  // Duplicate for seamless infinite scroll
  const items = [...sponsors, ...sponsors];

  return (
    <section className="py-8 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 mb-5">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {locale === "ar" ? "رعاة وشركاء" : locale === "fr" ? "Sponsors & Partenaires" : "Sponsors & Partners"}
        </p>
      </div>

      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none" />

        <div
          className="flex items-center gap-12"
          style={{
            animation: `marquee ${sponsors.length * 4}s linear infinite`,
            width: "max-content",
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          {items.map((sponsor, i) => {
            const logo = (
              <img
                src={sponsor.logoUrl}
                alt={sponsor.name}
                className="h-10 object-contain opacity-50 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0 flex-shrink-0"
              />
            );
            return sponsor.websiteUrl ? (
              <a key={`${sponsor.id}-${i}`} href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" title={sponsor.name}>
                {logo}
              </a>
            ) : (
              <div key={`${sponsor.id}-${i}`} title={sponsor.name}>{logo}</div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
