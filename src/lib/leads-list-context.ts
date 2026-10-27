/**
 * Remembers where the user was in the Leads list (its query string and scroll
 * offset) so a lead's detail page can link back to that exact page, filters and
 * scroll position. The query string itself is the source of truth for the list;
 * sessionStorage only carries it across to the detail page, per browser tab.
 */

export const LEADS_LIST_PATH = "/dashboard/leads";
const KEY = "hx:leads-list-context";

type ListContext = { query: string; scrollTop: number };

function read(): ListContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ListContext) : null;
  } catch {
    return null;
  }
}

function write(ctx: ListContext) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    // Storage blocked (private mode etc.) — the Back link falls back to the default list.
  }
}

export function saveLeadsListQuery(query: string) {
  const prev = read();
  // A different list view starts at the top; the same one keeps its offset.
  write({ query, scrollTop: prev?.query === query ? prev.scrollTop : 0 });
}

export function saveLeadsListScroll(query: string, scrollTop: number) {
  write({ query, scrollTop });
}

/** Scroll offset saved for this exact list query, if any. */
export function savedLeadsListScroll(query: string): number {
  const ctx = read();
  return ctx && ctx.query === query ? ctx.scrollTop : 0;
}

/** The list URL to return to; the default list when there is no saved context. */
export function leadsListHref(): string {
  const ctx = read();
  return ctx?.query ? `${LEADS_LIST_PATH}?${ctx.query}` : LEADS_LIST_PATH;
}
