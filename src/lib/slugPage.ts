import { db } from "@/lib/db";

/** Shared fetch for slug-driven Showcase Website pages (Who We Are,
 *  Methodology, Pathway, and any future freeform page created via
 *  Super Admin → Showcase Website → Pages). Homepage has its own inline
 *  version of this in src/app/[locale]/page.tsx with a bespoke fallback. */
export async function getPublishedPage(slug: string) {
  try {
    return await db.landingPage.findUnique({
      where: { slug },
      include: { sections: { where: { isEnabled: true }, orderBy: { order: "asc" } } },
    });
  } catch {
    return null;
  }
}
