/**
 * Browser side of the TikTok / Google Ads / Snapchat connectors.
 *
 * Each provider has its own adapter: an init that installs the provider's
 * official base code (ported from the published snippet so the tracking ID is
 * passed as an argument, never spliced into script text), a page-view call and
 * a lead call. Every adapter call is wrapped so one provider failing — blocked
 * by an ad blocker, SDK throwing — cannot affect the others or the page.
 *
 * Meta is not handled here. The global Meta Pixel has its own component and
 * fires its own Lead event; this module never touches `fbq`.
 */
import type { AdProvider, PublicAdConfig } from "@/lib/ad-tracking/config";

/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params, prefer-spread -- ported vendor snippets */

type AdWindow = Window & {
  ttq?: any;
  TiktokAnalyticsObject?: string;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  snaptr?: any;
  __hxAdInit?: Partial<Record<AdProvider, string>>;
  __hxAdTracking?: { diagnostics: () => Diagnostics };
};

const win = () => window as AdWindow;

// ---------------------------------------------------------------- consent ---

/**
 * The site has no consent banner today. This is the single gate every load and
 * every event goes through, so a CMP can be wired in here alone: it should set
 * the `hx_ad_consent` cookie to `granted`/`denied`. Until then, ads load unless
 * the visitor has denied (cookie) or sends Global Privacy Control.
 */
export function hasAdConsent(): boolean {
  try {
    if ((navigator as any).globalPrivacyControl === true) return false;
    if (/(?:^|;\s*)hx_ad_consent=denied(?:;|$)/.test(document.cookie)) return false;
  } catch {
    // ignore — treat as no signal
  }
  return true;
}

// ------------------------------------------------------------ diagnostics ---

type ScriptStatus = "loading" | "loaded" | "failed" | "blocked_by_consent";
export interface ProviderDiagnostics {
  trackingId: string;
  initializedAt?: string;
  scriptStatus?: ScriptStatus;
  lastEvent?: { name: string; at: string; eventId?: string; error?: string };
}
export type Diagnostics = Partial<Record<AdProvider, ProviderDiagnostics>>;

const DIAG_KEY = "hx_ad_diag";

function readDiag(): Diagnostics {
  try {
    return JSON.parse(localStorage.getItem(DIAG_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function recordDiag(provider: AdProvider, patch: Partial<ProviderDiagnostics>) {
  try {
    const all = readDiag();
    all[provider] = { ...(all[provider] ?? { trackingId: "" }), ...patch };
    localStorage.setItem(DIAG_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable (private mode) — diagnostics are best-effort
  }
}

/** Device-local record of what *this browser* initialised and dispatched. */
export function readAdDiagnostics(): Diagnostics {
  return readDiag();
}

// ---------------------------------------------------------- deduplication ---

const SENT_KEY = "hx_ad_leads_sent";
const SENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const sentThisPage = new Set<string>();

function alreadySent(provider: AdProvider, leadId: string): boolean {
  const key = `${provider}:${leadId}`;
  if (sentThisPage.has(key)) return true;
  try {
    const map = JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}") as Record<string, number>;
    return key in map;
  } catch {
    return false;
  }
}

function markSent(provider: AdProvider, leadId: string) {
  const key = `${provider}:${leadId}`;
  sentThisPage.add(key);
  try {
    const now = Date.now();
    const map = JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}") as Record<string, number>;
    map[key] = now;
    // Keep the map small: drop expired keys, cap at the 100 newest.
    const kept = Object.entries(map)
      .filter(([, t]) => now - t < SENT_TTL_MS)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);
    localStorage.setItem(SENT_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // in-memory set still prevents repeats on this page
  }
}

// ---------------------------------------------------------------- helpers ---

function injectScript(src: string, provider: AdProvider) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.onload = () => recordDiag(provider, { scriptStatus: "loaded" });
  s.onerror = () => recordDiag(provider, { scriptStatus: "failed" });
  recordDiag(provider, { scriptStatus: "loading" });
  const first = document.getElementsByTagName("script")[0];
  if (first?.parentNode) first.parentNode.insertBefore(s, first);
  else document.head.appendChild(s);
}

function safely(provider: AdProvider, eventName: string, fn: () => void, eventId?: string) {
  try {
    fn();
    recordDiag(provider, { lastEvent: { name: eventName, at: new Date().toISOString(), eventId } });
  } catch (e) {
    recordDiag(provider, { lastEvent: { name: eventName, at: new Date().toISOString(), eventId, error: String(e) } });
  }
}

// ---------------------------------------------------------------- adapters ---

/** TikTok Pixel base code (official snippet, ported). */
function initTikTok(pixelId: string) {
  const w = win();
  if (!w.ttq) {
    const t = "ttq";
    w.TiktokAnalyticsObject = t;
    const ttq: any = ((w as any)[t] = (w as any)[t] || []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    ttq.setAndDefer = function (obj: any, m: string) {
      obj[m] = function () {
        obj.push([m].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id: string) {
      const e = ttq._i[id] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (id: string, opts?: Record<string, unknown>) {
      const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[id] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[id] = opts || {};
      injectScript(`${r}?sdkid=${encodeURIComponent(id)}&lib=${t}`, "tiktok");
    };
  }
  w.ttq.load(pixelId);
}

/** Google tag (gtag.js) for Google Ads. Reuses an existing gtag if present. */
function initGoogleAds(tagId: string, pageViews: boolean) {
  const w = win();
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    // gtag must push the `arguments` object itself, as the official snippet does.
    w.gtag = function () {
      w.dataLayer!.push(arguments);
    };
    // Consent Mode v2 defaults. We only get here once hasAdConsent() passed,
    // so the defaults are "granted"; a CMP would issue gtag('consent','update').
    w.gtag("consent", "default", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "denied",
    });
    w.gtag("js", new Date());
  }
  w.gtag("config", tagId, pageViews ? {} : { send_page_view: false });
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`, "google_ads");
}

/** Snap Pixel base code (official snippet, ported). */
function initSnapchat(pixelId: string) {
  const w = win();
  if (!w.snaptr) {
    const a: any = (w.snaptr = function () {
      if (a.handleRequest) a.handleRequest.apply(a, arguments);
      else a.queue.push(arguments);
    });
    a.queue = [];
    injectScript("https://sc-static.net/scevent.min.js", "snapchat");
  }
  w.snaptr("init", pixelId, {});
}

// ------------------------------------------------------------- public API ---

let active: PublicAdConfig = {};

/** The config new events are checked against — updated if settings change mid-session. */
export function setActiveAdConfig(config: PublicAdConfig) {
  active = config;
}

/** Install each enabled provider once per page lifetime. */
export function initAdProviders(config: PublicAdConfig) {
  const w = win();
  w.__hxAdInit = w.__hxAdInit || {};
  w.__hxAdTracking = { diagnostics: readDiag };
  const consent = hasAdConsent();

  const run = (provider: AdProvider, trackingId: string, init: () => void) => {
    if (!consent) {
      recordDiag(provider, { trackingId, scriptStatus: "blocked_by_consent" });
      return;
    }
    if (w.__hxAdInit![provider]) return;
    w.__hxAdInit![provider] = trackingId;
    recordDiag(provider, { trackingId, initializedAt: new Date().toISOString() });
    try {
      init();
    } catch (e) {
      recordDiag(provider, { lastEvent: { name: "init", at: new Date().toISOString(), error: String(e) } });
    }
  };

  if (config.tiktok) {
    const c = config.tiktok;
    run("tiktok", c.pixelId, () => {
      initTikTok(c.pixelId);
      if (c.pageViews) safely("tiktok", "page", () => win().ttq.page());
    });
  }
  if (config.google_ads) {
    const c = config.google_ads;
    // The config call itself sends the first page_view when pageViews is on.
    run("google_ads", c.tagId, () => initGoogleAds(c.tagId, c.pageViews));
  }
  if (config.snapchat) {
    const c = config.snapchat;
    run("snapchat", c.pixelId, () => {
      initSnapchat(c.pixelId);
      if (c.pageViews) safely("snapchat", "PAGE_VIEW", () => win().snaptr("track", "PAGE_VIEW"));
    });
  }
}

const ready = (p: AdProvider) => hasAdConsent() && !!win().__hxAdInit?.[p];

/** Page view after a client-side navigation (the first view is sent by init). */
export function trackAdPageView() {
  const { tiktok, google_ads, snapchat } = active;
  if (tiktok?.pageViews && ready("tiktok")) safely("tiktok", "page", () => win().ttq.page());
  if (google_ads?.pageViews && ready("google_ads")) {
    safely("google_ads", "page_view", () =>
      win().gtag!("event", "page_view", { send_to: google_ads.tagId, page_location: location.href, page_path: location.pathname }),
    );
  }
  if (snapchat?.pageViews && ready("snapchat")) safely("snapchat", "PAGE_VIEW", () => win().snaptr("track", "PAGE_VIEW"));
}

/**
 * One confirmed lead → at most one conversion per enabled provider. The lead's
 * database id is the dedup key locally and is also passed to each platform's
 * own dedup field (TikTok event_id, Google transaction_id, Snap client_dedup_id),
 * so even a replay that slipped past local storage is collapsed server-side.
 */
export function trackAdLead(leadId: string) {
  const { tiktok, google_ads, snapchat } = active;
  const eventId = `lead_${leadId}`;

  if (tiktok?.leads && ready("tiktok") && !alreadySent("tiktok", leadId)) {
    markSent("tiktok", leadId);
    safely("tiktok", tiktok.leadEvent, () =>
      win().ttq.track(tiktok.leadEvent, { content_name: "academy_application" }, { event_id: eventId }),
    eventId);
  }
  if (google_ads?.leads && google_ads.conversionLabel && ready("google_ads") && !alreadySent("google_ads", leadId)) {
    markSent("google_ads", leadId);
    safely("google_ads", "conversion", () =>
      win().gtag!("event", "conversion", {
        send_to: `${google_ads.tagId}/${google_ads.conversionLabel}`,
        transaction_id: eventId,
      }),
    eventId);
  }
  if (snapchat?.leads && ready("snapchat") && !alreadySent("snapchat", leadId)) {
    markSent("snapchat", leadId);
    safely("snapchat", "SIGN_UP", () =>
      win().snaptr("track", "SIGN_UP", { client_dedup_id: eventId, sign_up_method: "academy_application" }),
    eventId);
  }
}
