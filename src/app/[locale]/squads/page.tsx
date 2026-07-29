import type { Metadata } from "next";
import { Trophy, Users, Target, Award } from "lucide-react";
import { db } from "@/lib/db";
import { Hero } from "@/components/website/Hero";
import { Breadcrumb } from "@/components/website/Breadcrumb";
import { FaqAccordion } from "@/components/website/FaqAccordion";
import { SquadRegistrationForm } from "./SquadRegistrationForm";

export const metadata: Metadata = {
  title: "Development Squads | Football Skills Academy",
  description: "Our Development Squads offer the highest level of coaching for players identified through assessment, with a clear pathway to competitive football.",
};

const BENEFITS = [
  { icon: Trophy, title: "Elite coaching", body: "Higher-intensity sessions led by our most experienced coaches." },
  { icon: Users, title: "Small squads", body: "Focused group sizes for individual attention and faster development." },
  { icon: Target, title: "Competitive fixtures", body: "Regular matches and tournaments against other squads." },
  { icon: Award, title: "Clear pathway", body: "A direct route from Development Squads into representative football." },
];

export default async function SquadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const [venues, faqs] = await Promise.all([
    db.station.findMany({ where: { status: "active", isPubliclyListed: true }, select: { id: true, name: true, wilaya: true }, orderBy: { displayOrder: "asc" } }),
    db.faq.findMany({ where: { isPublished: true, category: "squads" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <Hero
        desktopImageUrl="https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=1600&q=80"
        title="Development Squads"
        subtitle="Our highest level of coaching for players identified through assessment, with a clear pathway to competitive football."
        primaryCta={{ label: "Register Interest", href: "#register" }}
        minHeight="65vh"
      />
      <Breadcrumb locale={locale} items={[{ label: "Development Squads" }]} />

      <section className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">Beyond Weekly Training</h2>
            <p className="mt-4 text-lg text-fsa-text-muted">
              Development Squads are for players who have shown the technical ability, attitude and commitment to take the next step. Places are offered
              following an assessment period within our regular programmes.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-fsa-md border border-fsa-border p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-fsa-sky/15">
                  <b.icon className="h-6 w-6 text-fsa-navy-900" />
                </div>
                <h3 className="font-fsa-display text-lg font-bold text-fsa-navy-900">{b.title}</h3>
                <p className="mt-1.5 text-sm text-fsa-text-muted">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {venues.length > 0 && (
        <section className="bg-fsa-pale-bg py-[var(--fsa-section-y)]">
          <div className="mx-auto px-[var(--fsa-container-pad)] text-center" style={{ maxWidth: "var(--fsa-container-max)" }}>
            <h2 className="font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl">Where We Train</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {venues.map((v) => (
                <span key={v.id} className="rounded-fsa-pill border border-fsa-border bg-white px-5 py-2.5 text-sm font-semibold text-fsa-navy-900">
                  {v.name} — {v.wilaya}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="register" className="bg-white py-[var(--fsa-section-y)]">
        <div className="mx-auto max-w-2xl px-[var(--fsa-container-pad)]">
          <SquadRegistrationForm venues={venues} />
        </div>
      </section>

      {faqs.length > 0 && <FaqAccordion items={faqs} locale={locale} heading="Frequently Asked Questions" />}
    </>
  );
}
