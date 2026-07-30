import { db } from "@/lib/db";

/**
 * Lightweight, dependency-free spam guard for public forms (contact, squad
 * registration, newsletter). No external CAPTCHA/reCAPTCHA is configured in
 * this environment, so this is the baseline: a honeypot field bots tend to
 * fill in, plus a DB-backed submission-frequency check per phone/email —
 * generalizes the duplicate-phone check already used by
 * POST /api/public/summer-camp into something reusable across forms.
 */

export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function isRateLimited(opts: {
  leadType: string;
  identifier: string | null | undefined;
  windowMinutes?: number;
  max?: number;
}): Promise<boolean> {
  const { leadType, identifier, windowMinutes = 60, max = 3 } = opts;
  if (!identifier) return false;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const count = await db.lead.count({
    where: {
      leadType,
      createdAt: { gte: since },
      OR: [{ phone: identifier }, { email: identifier }],
    },
  });
  return count >= max;
}
