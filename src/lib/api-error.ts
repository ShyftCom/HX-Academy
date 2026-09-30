import type { TFunction } from "i18next";

/**
 * An API failure carrying the route's machine-readable `code`. The route's
 * English `error` string is kept as the message for logs, but is never shown:
 * the UI translates `code` instead, so the toast follows the admin's language.
 */
export class ApiError extends Error {
  constructor(public code: string | undefined, message: string) {
    super(message);
  }
}

/** Parses a fetch Response, throwing an ApiError when it is not 2xx. */
export async function readJsonOrThrow<T = unknown>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.code, json.error ?? `HTTP ${res.status}`);
  return json as T;
}

/**
 * The translated message for a failed request: `common:errors.api.<code>` when
 * that code has a translation, otherwise the caller's translated fallback.
 */
export function apiErrorMessage(error: unknown, t: TFunction, fallback: string): string {
  const code = error instanceof ApiError ? error.code : undefined;
  return code ? t(`common:errors.api.${code}`, { defaultValue: fallback }) : fallback;
}
