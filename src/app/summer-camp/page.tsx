import { redirect } from "next/navigation";
import { preferredLocale } from "@/lib/preferred-locale";

/**
 * Superseded by /[locale]/summer-camp. This route was an unprefixed duplicate
 * of the same landing page — it could never be translated, because it has no
 * locale to render in. Kept as a redirect so old links resolve.
 */
export default async function LegacySummerCampRedirect() {
  redirect(`/${await preferredLocale()}/summer-camp`);
}
