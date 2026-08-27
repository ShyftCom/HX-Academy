import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

/**
 * The locale to send an unprefixed visitor to.
 *
 * Reads the same NEXT_LOCALE cookie next-intl writes, so a returning visitor
 * who chose Arabic and then hits a legacy unprefixed URL (/apply, /summer-camp,
 * or a bookmark of "/") lands on Arabic rather than being reset to French.
 */
export async function preferredLocale(): Promise<string> {
  const value = (await cookies()).get("NEXT_LOCALE")?.value;
  return value && (routing.locales as readonly string[]).includes(value)
    ? value
    : routing.defaultLocale;
}
