import { db } from "@/lib/db";
import { FaqAccordion } from "../FaqAccordion";
import { lf } from "./localeField";

export async function FaqAccordionSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);

  const faqs = await db.faq.findMany({
    where: {
      isPublished: true,
      ...(content.category ? { category: content.category } : {}),
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    take: content.limit ?? undefined,
  });

  if (faqs.length === 0) return null;

  return <FaqAccordion items={faqs} locale={locale} heading={heading || undefined} />;
}
