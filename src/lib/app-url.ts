/**
 * The public origin of this deployment.
 *
 * SlickPay needs absolute URLs it can redirect a browser to and POST a webhook
 * at, so "" or a relative path is not an option here the way it is for an
 * in-app link. The repo already reads four different env vars for the same
 * idea (NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, NEXT_PUBLIC_BASE_URL,
 * NEXT_PUBLIC_SITE_URL); this checks them in order rather than adding a fifth,
 * and falls back to Vercel's own VERCEL_URL on preview deployments.
 */
export function appUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  return candidate.replace(/\/+$/, "");
}
