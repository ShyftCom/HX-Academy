/**
 * SlickPay (SATIM) API client.
 *
 * Docs: https://developers.slick-pay.com
 *
 * We use the **Invoices** product, not Transfers or Aggregation:
 *   - Transfers move money between SlickPay wallets — not a customer checkout.
 *   - Aggregation splits one payment across several contact UUIDs, which a
 *     single subscription plan never needs, and it has no return-url parameter.
 *   - Invoices take an `amount`, a return `url`, and a `webhook_url`, and hand
 *     back a SATIM hosted payment page. That is exactly a card checkout.
 *
 * Flow (see src/app/api/payments/slickpay/*):
 *   createInvoice() -> redirect player to `url` -> SATIM takes the card
 *   -> player returns to our `url`, and/or SlickPay calls our `webhook_url`
 *   -> we call getInvoice() and only trust `payment_status === "paid"`.
 *
 * The docs are explicit that the return page must re-verify server-side, and
 * the webhook payload has no documented shape or signing scheme, so neither is
 * treated as proof of payment on its own. getInvoice() is the only authority.
 */
import { getSettings } from "@/lib/settings";

/**
 * Base URLs, per the endpoint pages in the docs.
 *
 * The Quick Integration page shows a third host (api.slick-pay.com) for the
 * status check while every endpoint page shows prodapi for both create and
 * read. We follow the endpoint pages and use one host per mode, so an invoice
 * is always read back from the host that issued it.
 */
const BASE_URL = {
  sandbox: "https://devapi.slick-pay.com/api/v2",
  production: "https://prodapi.slick-pay.com/api/v2",
} as const;

export type SlickPayMode = keyof typeof BASE_URL;

export interface SlickPayConfig {
  enabled: boolean;
  mode: SlickPayMode;
  publicKey: string;
  /** Optional: which of the merchant's bank accounts receives the money. */
  accountUuid: string;
  /** Shared secret echoed back on the webhook so we can drop obvious forgeries. */
  webhookSecret: string;
}

export const SLICKPAY_SETTING_KEYS = [
  "slickpay_enabled",
  "slickpay_mode",
  "slickpay_public_key",
  "slickpay_account_uuid",
  "slickpay_webhook_secret",
] as const;

/**
 * Resolve the gateway config from the Settings table, falling back to env.
 *
 * The database is the primary store so a Super Admin can rotate keys or flip
 * sandbox/production from the dashboard without a redeploy. Env vars remain
 * useful for local development and for seeding a fresh environment.
 */
export async function getSlickPayConfig(): Promise<SlickPayConfig> {
  const s = await getSettings([...SLICKPAY_SETTING_KEYS]);
  const mode = (s.slickpay_mode || process.env.SLICKPAY_MODE || "sandbox") as string;
  return {
    enabled: (s.slickpay_enabled ?? "") === "true",
    mode: mode === "production" ? "production" : "sandbox",
    publicKey: s.slickpay_public_key || process.env.SLICKPAY_PUBLIC_KEY || "",
    accountUuid: s.slickpay_account_uuid || process.env.SLICKPAY_ACCOUNT_UUID || "",
    webhookSecret: s.slickpay_webhook_secret || process.env.SLICKPAY_WEBHOOK_SECRET || "",
  };
}

/** Config is usable only once it is switched on *and* has a key to send. */
export function isSlickPayUsable(config: SlickPayConfig): boolean {
  return config.enabled && config.publicKey.trim().length > 0;
}

export class SlickPayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "SlickPayError";
  }
}

/** Longest error text kept from a non-JSON body — enough to diagnose, not a whole HTML page. */
const MAX_BODY_MESSAGE = 200;

/**
 * The best human-readable reason available from an error response.
 *
 * Written as a function returning `string` rather than inline, because the
 * `&&`/`||` chain this replaces could not be typed: narrowing `unknown`
 * through `&&` leaves `{}` in the union, so the result was `{} | string` and
 * SlickPayError wants `string`.
 *
 * Two behaviours differ from that chain, both deliberate:
 *
 *  - A JSON body carrying `message: null` used to produce the literal text
 *    "null", because String(null) is truthy and so the `||` fallback never
 *    ran. Same for undefined ("undefined") and objects ("[object Object]").
 *    Only a non-empty *string* message is trusted now.
 *
 *  - A non-JSON body was discarded entirely. request() falls back to
 *    `body = text` when JSON.parse throws, but the chain then failed its
 *    `typeof body === "object"` test and reported only the status code —
 *    throwing away an HTML or plain-text error page that may be the sole
 *    diagnostic. SATIM sits in front of this gateway, so a 502 with an HTML
 *    body is entirely plausible.
 *
 * The status is not lost when body text is used: SlickPayError carries it as
 * its own property.
 */
function errorMessageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const message = (body as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (typeof body === "string" && body.trim()) {
    return body.trim().slice(0, MAX_BODY_MESSAGE);
  }
  return fallback;
}

async function request<T>(
  config: SlickPayConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const url = `${BASE_URL[config.mode]}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.publicKey}`,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      // The gateway sits behind SATIM; a hung request must not hold a
      // serverless invocation open until the platform kills it.
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (cause) {
    throw new SlickPayError(
      `Could not reach SlickPay (${config.mode}): ${(cause as Error).message}`,
      0,
      null,
    );
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new SlickPayError(
      errorMessageFrom(body, `SlickPay returned ${res.status}`),
      res.status,
      body,
    );
  }

  return body as T;
}

export interface CreateInvoiceInput {
  /** Total to charge, in DZD. SlickPay rejects anything at or below 100. */
  amount: number;
  /** Where SlickPay sends the player once SATIM is done. */
  returnUrl: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookMetaData?: Record<string, unknown>;
  firstname: string;
  lastname: string;
  phone?: string;
  email?: string;
  address?: string;
  items?: Array<{ name: string; price: number; quantity: number }>;
  /** Free-text reference shown on the SlickPay invoice slip. */
  note?: string;
}

export interface CreateInvoiceResult {
  /** SlickPay invoice id — store this, it is how we read the status back. */
  id: string;
  /** SATIM hosted payment page to redirect the player to. */
  url: string;
  raw: unknown;
}

/**
 * Pull the invoice id and payment URL out of a create response.
 *
 * The docs disagree with themselves: the Create Invoice page shows `id` and
 * `url` at the top level, while Quick Integration reads `response.data.url`.
 * Rather than bet on one, accept either shape.
 */
function readCreateResult(body: unknown): { id?: string; url?: string } {
  const root = (body ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;
  const id = root.id ?? data.id;
  const url = root.url ?? data.url;
  return {
    id: id === undefined || id === null ? undefined : String(id),
    url: typeof url === "string" ? url : undefined,
  };
}

export async function createInvoice(
  config: SlickPayConfig,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const payload: Record<string, unknown> = {
    amount: input.amount,
    url: input.returnUrl,
    firstname: input.firstname,
    lastname: input.lastname,
  };

  if (config.accountUuid) payload.account = config.accountUuid;
  if (input.phone) payload.phone = input.phone;
  if (input.email) payload.email = input.email;
  if (input.address) payload.address = input.address;
  if (input.note) payload.note = input.note;
  if (input.items?.length) payload.items = input.items;
  if (input.webhookUrl) payload.webhook_url = input.webhookUrl;
  if (input.webhookSecret) payload.webhook_signature = input.webhookSecret;
  if (input.webhookMetaData) payload.webhook_meta_data = input.webhookMetaData;

  const body = await request<unknown>(config, "/users/invoices", {
    method: "POST",
    body: payload,
  });

  const { id, url } = readCreateResult(body);
  if (!id || !url) {
    throw new SlickPayError(
      "SlickPay accepted the invoice but returned no payment URL",
      200,
      body,
    );
  }

  return { id, url, raw: body };
}

export interface InvoiceStatus {
  /** True only when SlickPay reports the invoice as actually paid. */
  paid: boolean;
  /** Raw `payment_status` string, kept verbatim for the audit trail. */
  paymentStatus: string;
  completed: boolean;
  raw: unknown;
}

/**
 * Read an invoice back from SlickPay. This is the single source of truth for
 * whether a player actually paid — never the return redirect, never the
 * webhook body.
 */
export async function getInvoice(
  config: SlickPayConfig,
  invoiceId: string,
): Promise<InvoiceStatus> {
  const body = await request<unknown>(
    config,
    `/users/invoices/${encodeURIComponent(invoiceId)}`,
    { method: "GET" },
  );

  const root = (body ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;
  const paymentStatus = String(data.payment_status ?? root.payment_status ?? "unknown");
  const completed = root.completed === 1 || root.completed === true;

  return {
    paid: paymentStatus.toLowerCase() === "paid",
    paymentStatus,
    completed,
    raw: body,
  };
}

/**
 * Cheap credentials check for the "Test connection" button in Settings.
 *
 * Listing invoices is a harmless GET that still exercises the bearer token, so
 * an admin can confirm a key before any player is sent to a payment page.
 */
export async function testConnection(
  config: SlickPayConfig,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  try {
    await request<unknown>(config, "/users/invoices", { method: "GET" });
    return { ok: true };
  } catch (error) {
    if (error instanceof SlickPayError) {
      return { ok: false, error: error.message, status: error.status };
    }
    return { ok: false, error: (error as Error).message, status: 0 };
  }
}
