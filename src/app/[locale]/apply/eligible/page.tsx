import type { Metadata } from "next";
import { ApplyOutcomeScreen } from "@/components/website/ApplyOutcomeScreen";

/**
 * Where a completed application lands. The lead exists by the time a visitor
 * sees this; the page only tells them what happens next.
 *
 * Deliberately noindex: it is the tail of a form, has no standalone content,
 * and its text is admin-authored.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ApplyEligiblePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ApplyOutcomeScreen outcome="qualified" locale={locale} />;
}
