import { notFound, redirect, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";

// Applies the redirects managed in Dashboard → Website → Redirects.
//
// This lives in a catch-all rather than in middleware on purpose. Middleware
// runs on every single request, so honouring redirects there would mean a
// database round-trip per page view for a table that is almost always empty.
// Next.js resolves static segments before a catch-all, so this component is
// only ever reached by a path that would otherwise have 404'd — which is
// exactly the set of paths a redirect can apply to. The lookup is a single
// indexed query on a unique column, and only on a would-be-404.
export const dynamic = "force-dynamic";

function stripLocale(path: string): string {
  for (const l of routing.locales) {
    if (path === `/${l}`) return "/";
    if (path.startsWith(`/${l}/`)) return path.slice(l.length + 1);
  }
  return path;
}

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  const requested = `/${slug.join("/")}`;

  // Authors may enter the path either with or without the locale prefix, so
  // accept both spellings rather than silently not matching.
  const candidates = Array.from(new Set([requested, `/${locale}${requested}`]));

  let match: { toPath: string; statusCode: number } | null = null;
  try {
    const rows = await db.redirect.findMany({
      where: { fromPath: { in: candidates }, isActive: true },
    });
    match = rows[0] ?? null;
  } catch {
    // A redirect lookup must never turn a 404 into a 500.
    match = null;
  }

  if (match) {
    let target = match.toPath;

    // Keep the visitor in the locale they were browsing when the target is a
    // site-relative path that does not already name one.
    if (target.startsWith("/") && stripLocale(target) === target) {
      target = `/${locale}${target === "/" ? "" : target}`;
    }

    // Guard against a rule that points at itself — without this, a row like
    // /x -> /x would bounce the browser until it gave up.
    const sameAsRequest = candidates.includes(target) || target === `/${locale}${requested}`;
    if (!sameAsRequest) {
      // next/navigation exposes 307 (redirect) and 308 (permanentRedirect).
      // 301/308 both mean "permanent", 302/307 both mean "temporary"; the
      // difference within each pair is only whether the method may change,
      // which does not arise for GET page navigation.
      if (match.statusCode === 301 || match.statusCode === 308) permanentRedirect(target);
      redirect(target);
    }
  }

  notFound();
}
