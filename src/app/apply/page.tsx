import { redirect } from "next/navigation";
import { preferredLocale } from "@/lib/preferred-locale";

/**
 * The application form now lives at /[locale]/apply so it can be translated.
 * This page stays behind as a redirect: /apply is stored in the Settings row
 * `website_booking_url`, is seeded into CTA links, and is the URL printed on
 * anything already in circulation. Breaking it would break the site's main
 * conversion path.
 */
export default async function LegacyApplyRedirect() {
  redirect(`/${await preferredLocale()}/apply`);
}
