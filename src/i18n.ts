import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Two translation stores exist in this repo, and the back-office was reading
// the wrong one.
//
//  - messages/{eng,fr,ar}.json          — one flat bundle. Feeds next-intl on
//                                          the public [locale] site, and the
//                                          back-office "common" namespace.
//  - public/locales/{en,fr,ar}/<ns>.json — per-namespace bundles. Already the
//                                          richer, purpose-built set for the
//                                          back-office (auth, calendar, leads,
//                                          players, settings, dashboard), and
//                                          already fully translated in all
//                                          three languages.
//
// Only the first was ever registered here, under a single "common" namespace.
// That is why the sidebar rendered a literal "nav.dashboard" and the login page
// rendered "login.email_label": those keys live in public/locales, which the
// client never loaded, while pages calling useTranslation("auth" | "calendar" |
// "leads") asked for namespaces that did not exist at all.
//
// Both stores are now wired up. public/locales owns its namespaces; the flat
// messages bundle backs "common"; and fallbackNS lets any namespace fall
// through to common, so a key added to either store resolves from anywhere.
import engFlat from "../messages/eng.json";
import frFlat from "../messages/fr.json";
import arFlat from "../messages/ar.json";

import enCommon from "../public/locales/en/common.json";
import frCommon from "../public/locales/fr/common.json";
import arCommon from "../public/locales/ar/common.json";

import enAuth from "../public/locales/en/auth.json";
import frAuth from "../public/locales/fr/auth.json";
import arAuth from "../public/locales/ar/auth.json";

import enCalendar from "../public/locales/en/calendar.json";
import frCalendar from "../public/locales/fr/calendar.json";
import arCalendar from "../public/locales/ar/calendar.json";

import enLeads from "../public/locales/en/leads.json";
import frLeads from "../public/locales/fr/leads.json";
import arLeads from "../public/locales/ar/leads.json";

import enDashboard from "../public/locales/en/dashboard.json";
import frDashboard from "../public/locales/fr/dashboard.json";
import arDashboard from "../public/locales/ar/dashboard.json";

import enPlayers from "../public/locales/en/players.json";
import frPlayers from "../public/locales/fr/players.json";
import arPlayers from "../public/locales/ar/players.json";

import enSettings from "../public/locales/en/settings.json";

import enSubscriptions from "../public/locales/en/subscriptions.json";
import frSubscriptions from "../public/locales/fr/subscriptions.json";
import arSubscriptions from "../public/locales/ar/subscriptions.json";

import enPayments from "../public/locales/en/payments.json";
import frPayments from "../public/locales/fr/payments.json";
import arPayments from "../public/locales/ar/payments.json";

import enOrders from "../public/locales/en/orders.json";
import frOrders from "../public/locales/fr/orders.json";
import arOrders from "../public/locales/ar/orders.json";

import enTickets from "../public/locales/en/tickets.json";
import frTickets from "../public/locales/fr/tickets.json";
import arTickets from "../public/locales/ar/tickets.json";

import enStations from "../public/locales/en/stations.json";
import frStations from "../public/locales/fr/stations.json";
import arStations from "../public/locales/ar/stations.json";

import enFinance from "../public/locales/en/finance.json";
import frFinance from "../public/locales/fr/finance.json";
import arFinance from "../public/locales/ar/finance.json";

import enHrm from "../public/locales/en/hrm.json";
import frHrm from "../public/locales/fr/hrm.json";
import arHrm from "../public/locales/ar/hrm.json";

import enStore from "../public/locales/en/store.json";
import frStore from "../public/locales/fr/store.json";
import arStore from "../public/locales/ar/store.json";

import enWebsite from "../public/locales/en/website.json";
import frWebsite from "../public/locales/fr/website.json";
import arWebsite from "../public/locales/ar/website.json";

import enSurveys from "../public/locales/en/surveys.json";
import frSurveys from "../public/locales/fr/surveys.json";
import arSurveys from "../public/locales/ar/surveys.json";

import enAdmin from "../public/locales/en/admin.json";
import frAdmin from "../public/locales/fr/admin.json";
import arAdmin from "../public/locales/ar/admin.json";

import enAffiliates from "../public/locales/en/affiliates.json";
import frAffiliates from "../public/locales/fr/affiliates.json";
import arAffiliates from "../public/locales/ar/affiliates.json";

import enSummercamp from "../public/locales/en/summercamp.json";
import frSummercamp from "../public/locales/fr/summercamp.json";
import arSummercamp from "../public/locales/ar/summercamp.json";
import frSettings from "../public/locales/fr/settings.json";
import arSettings from "../public/locales/ar/settings.json";

/** Namespaces the client may call `useTranslation()` with. */
export const NAMESPACES = [
  "common", "auth", "calendar", "leads", "dashboard", "players", "settings",
  "subscriptions", "payments", "orders", "tickets", "stations",
  "finance", "hrm", "store", "website", "surveys",
  "admin", "affiliates", "summercamp",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

type Json = Record<string, unknown>;

/** Deep merge; `override` wins on conflict. Neither input is mutated. */
function merge(base: Json, override: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const existing = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) &&
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? merge(existing as Json, v as Json)
        : v;
  }
  return out;
}

function resourcesFor(flat: Json, ns: Record<Namespace, Json>) {
  return {
    // public/locales/common wins over the flat bundle where both define a key:
    // it is the back-office-specific copy (e.g. nav.leads = "Leads CRM"),
    // whereas the flat bundle's nav.* entries target the public site.
    common: merge(flat, ns.common),
    auth: ns.auth,
    calendar: ns.calendar,
    leads: ns.leads,
    dashboard: ns.dashboard,
    players: ns.players,
    settings: ns.settings,
    subscriptions: ns.subscriptions,
    payments: ns.payments,
    orders: ns.orders,
    tickets: ns.tickets,
    stations: ns.stations,
    finance: ns.finance,
    hrm: ns.hrm,
    store: ns.store,
    website: ns.website,
    surveys: ns.surveys,
    admin: ns.admin,
    affiliates: ns.affiliates,
    summercamp: ns.summercamp,
  };
}

function getInitialLang(): string {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem("shyftcom_lang");
  if (stored === "eng" || stored === "en") return "en";
  if (stored === "fr" || stored === "ar") return stored;
  return "fr";
}

/**
 * Last-resort label for a key that exists in no store.
 *
 * i18next returns the key itself on a miss, which is how a literal
 * "nav.dashboard" reached production. Every key the app calls now resolves,
 * but a future page shipping a `t()` call ahead of its translation would
 * regress the same way. This turns that worst case into a readable label:
 *
 *   "nav.file_manager"   -> "File manager"
 *   "booking.slots.none" -> "None"
 *
 * A safety net, not a substitute for translating. `npm run check:i18n` fails
 * the build on any statically-resolvable miss so this rarely fires.
 */
function humanizeKey(key: string): string {
  const leaf = key.split(".").pop() ?? key;
  const words = leaf.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: getInitialLang(),
    fallbackLng: "fr",
    supportedLngs: ["en", "fr", "ar"],
    defaultNS: "common",
    ns: [...NAMESPACES],
    // A key missing from its own namespace falls through to common before the
    // missing-key handler runs — so t("misc.academy_name") works from any page.
    fallbackNS: "common",
    resources: {
      en: resourcesFor(engFlat as Json, {
        common: enCommon as Json, auth: enAuth as Json, calendar: enCalendar as Json,
        leads: enLeads as Json, dashboard: enDashboard as Json,
        players: enPlayers as Json, settings: enSettings as Json,
        subscriptions: enSubscriptions as Json,
        payments: enPayments as Json,
        orders: enOrders as Json,
        tickets: enTickets as Json,
        stations: enStations as Json,
        finance: enFinance as Json,
        hrm: enHrm as Json,
        store: enStore as Json,
        website: enWebsite as Json,
        surveys: enSurveys as Json,
        admin: enAdmin as Json,
        affiliates: enAffiliates as Json,
        summercamp: enSummercamp as Json,
      }),
      fr: resourcesFor(frFlat as Json, {
        common: frCommon as Json, auth: frAuth as Json, calendar: frCalendar as Json,
        leads: frLeads as Json, dashboard: frDashboard as Json,
        players: frPlayers as Json, settings: frSettings as Json,
        subscriptions: frSubscriptions as Json,
        payments: frPayments as Json,
        orders: frOrders as Json,
        tickets: frTickets as Json,
        stations: frStations as Json,
        finance: frFinance as Json,
        hrm: frHrm as Json,
        store: frStore as Json,
        website: frWebsite as Json,
        surveys: frSurveys as Json,
        admin: frAdmin as Json,
        affiliates: frAffiliates as Json,
        summercamp: frSummercamp as Json,
      }),
      ar: resourcesFor(arFlat as Json, {
        common: arCommon as Json, auth: arAuth as Json, calendar: arCalendar as Json,
        leads: arLeads as Json, dashboard: arDashboard as Json,
        players: arPlayers as Json, settings: arSettings as Json,
        subscriptions: arSubscriptions as Json,
        payments: arPayments as Json,
        orders: arOrders as Json,
        tickets: arTickets as Json,
        stations: arStations as Json,
        finance: arFinance as Json,
        hrm: arHrm as Json,
        store: arStore as Json,
        website: arWebsite as Json,
        surveys: arSurveys as Json,
        admin: arAdmin as Json,
        affiliates: arAffiliates as Json,
        summercamp: arSummercamp as Json,
      }),
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    parseMissingKeyHandler: humanizeKey,
    returnEmptyString: false,
  });
}

export default i18n;
