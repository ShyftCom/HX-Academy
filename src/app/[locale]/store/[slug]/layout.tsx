import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";

/**
 * Metadata-only layout for a product page.
 *
 * The page itself is a client component that fetches the product over the API,
 * so the product's name can only reach <head> from a server component. This
 * layout does the one indexed lookup it needs.
 *
 * Product.name / Product.description are single-column in the schema — there
 * is no nameFr / nameAr — so the same value is served to both locales. That is
 * a known gap; see the migration notes.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "meta.store" });

  let name: string | null = null;
  let description: string | null = null;
  try {
    const product = await db.product.findFirst({ where: { slug }, select: { name: true, description: true } });
    name = product?.name ?? null;
    description = product?.description ?? null;
  } catch {
    // DB unavailable — fall back to the generic store metadata rather than 500.
  }

  return pageMetadata({
    locale,
    path: `/store/${slug}`,
    title: name || t("title"),
    description: description || t("description"),
  });
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
