import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";

/**
 * Metadata-only layout for a transactional step.
 *
 * Marked noindex deliberately: a cart, a checkout form and a one-off order
 * receipt are per-visitor states, not content. They still carry hreflang so
 * the two locales stay linked for anyone who does land on them.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store" });
  return pageMetadata({ locale, path: "/store/cart", title: t("cart"), noindex: true });
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
