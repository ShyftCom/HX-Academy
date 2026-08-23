import { redirect } from "next/navigation";
import { preferredLocale } from "@/lib/preferred-locale";

/**
 * "/" carries no locale. The proxy normally redirects it before this renders;
 * this is the fallback for the cases it does not cover (a direct hit that
 * bypasses the matcher). Honours the stored preference rather than always
 * sending the visitor to French.
 */
export default async function RootPage() {
  redirect(`/${await preferredLocale()}`);
}
