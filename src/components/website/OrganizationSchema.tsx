import { getSettings } from "@/lib/settings";

/** Sitewide Organization/SportsActivityLocation JSON-LD, mounted once in the
 *  locale layout so every public page carries it. */
export async function OrganizationSchema({ locale }: { locale: string }) {
  let s: Record<string, string> = {};
  try {
    s = await getSettings(["academy_name", "academy_email", "academy_phone", "academy_address", "academy_logo", "logo_website_light"]);
  } catch {
    // DB unavailable — render the schema with defaults rather than crashing the page.
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://footballskillsacademy.com";
  const name = s.academy_name || "Football Skills Academy";
  const logo = s.logo_website_light || s.academy_logo || undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name,
    url: `${base}/${locale}`,
    ...(logo ? { logo, image: logo } : {}),
    ...(s.academy_email ? { email: s.academy_email } : {}),
    ...(s.academy_phone ? { telephone: s.academy_phone } : {}),
    ...(s.academy_address ? { address: { "@type": "PostalAddress", streetAddress: s.academy_address } } : {}),
    sport: "Football",
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
