import type { Metadata } from "next";
import { ApplyOutcomeScreen } from "@/components/website/ApplyOutcomeScreen";

/**
 * Where a visitor lands after picking an answer the Super Admin marked as
 * disqualifying. The application stops here: no details were collected and no
 * lead was created.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ApplyNotEligiblePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ApplyOutcomeScreen outcome="rejected" locale={locale} />;
}
