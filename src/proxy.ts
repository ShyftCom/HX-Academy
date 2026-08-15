import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Renamed from middleware.ts: Next deprecated the `middleware` file convention
// in favour of `proxy`. Note the runtime changed with it — `proxy` always runs
// on nodejs and cannot be configured back to edge — so this is not a pure
// rename. next-intl's handler only reads request headers and issues redirects,
// which nodejs serves fine.
//
// The name is `proxy` rather than an anonymous default because the upgrade
// guide asks for it even when the export is a default.
const proxy = createMiddleware(routing);

export default proxy;

export const config = {
  matcher: [
    "/",
    "/(fr|eng|ar)/:path*",
  ],
};
