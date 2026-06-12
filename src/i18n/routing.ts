import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "eng", "ar"],
  defaultLocale: "fr",
});

export type Locale = (typeof routing.locales)[number];
