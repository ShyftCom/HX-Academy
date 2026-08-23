import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Renamed from middleware.ts: Next deprecated the `middleware` file convention
// in favour of `proxy`. Note the runtime changed with it — `proxy` always runs
// on nodejs and cannot be configured back to edge — so this is not a pure
// rename. next-intl's handler only reads request headers and issues redirects,
// which nodejs serves fine.

/**
 * Request header carrying the active public-site locale up to the root layout.
 *
 * The root layout (src/app/layout.tsx) owns <html>, but it sits *above* the
 * [locale] segment and so cannot read `params.locale` — while `<html lang>` and
 * `<html dir>` have to be correct in the server-rendered HTML, not patched on
 * by script after paint. Passing the locale as a request header via
 * `NextResponse.next({ request: { headers } })` is the documented way to get
 * data from the proxy into a server component.
 *
 * Absent on admin/auth/player routes, which this proxy does not match — those
 * fall back to the French LTR default, exactly as before.
 */
export const LOCALE_HEADER = "x-hx-locale";

const handleI18n = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleI18n(request);

  // A redirect ("/" → "/fr", or locale detection bouncing the visitor) renders
  // no page, so there is nothing for the root layout to read. Pass it through
  // untouched rather than replacing it with a `next()`.
  if (response.status >= 300 && response.status < 400) return response;

  const segment = request.nextUrl.pathname.split("/")[1];
  const locale = (routing.locales as readonly string[]).includes(segment)
    ? segment
    : routing.defaultLocale;

  const requestHeaders = new Headers(request.headers);

  // next-intl propagates its own request headers (which is how `requestLocale`
  // reaches getRequestConfig) through Next's `x-middleware-request-*`
  // convention on the response. Building a fresh NextResponse.next() below
  // would discard them, leaving requestLocale undefined and every
  // getMessages() call silently falling back to the default locale — French
  // strings on the Arabic page. Re-apply them onto our own request headers so
  // both next-intl's and ours survive.
  const MIDDLEWARE_REQUEST_PREFIX = "x-middleware-request-";
  response.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith(MIDDLEWARE_REQUEST_PREFIX)) {
      requestHeaders.set(key.slice(MIDDLEWARE_REQUEST_PREFIX.length), value);
    }
  });

  requestHeaders.set(LOCALE_HEADER, locale);

  const withLocale = NextResponse.next({ request: { headers: requestHeaders } });

  // Carry over what next-intl decided on the response side. Only these two:
  // copying the whole header set would drag along Next's internal
  // x-middleware-* directives and clobber the bookkeeping on the response we
  // just built.
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) withLocale.headers.set("set-cookie", setCookie);
  const link = response.headers.get("link");
  if (link) withLocale.headers.set("link", link);

  return withLocale;
}

export const config = {
  // Kept in step with routing.locales. The "eng" branch is gone with English;
  // a stale /eng/... URL now falls through to the 404 handler rather than
  // being rewritten to a locale that no longer has messages.
  matcher: [
    "/",
    "/(fr|ar)/:path*",
  ],
};
