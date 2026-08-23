import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";

/**
 * Metadata-only layout.
 *
 * The page beside it is a client component, and a client component cannot
 * export generateMetadata — so without this file the route inherited the root
 * layout's metadata and shipped no canonical and no hreflang alternates at
 * all, which is exactly the pairing a search engine needs in order to treat
 * /fr and /ar as translations of one another rather than competing pages.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.reviews" });
  return pageMetadata({ locale, path: "/reviews", title: t("title"), description: t("description") });
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
