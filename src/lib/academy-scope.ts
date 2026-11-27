import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Academy scoping for the shared database.
 *
 * Football Skills Academy and Futsal Skills Academy live in one database. Every
 * model listed in ACADEMY_SCOPED_MODELS carries an `academyId`, and the query
 * extension below adds it to every read and stamps it on every write — so a
 * route handler written as `db.lead.findMany()` only ever sees the active
 * academy's leads, with no filter of its own to forget.
 *
 * Fail closed: a query on a scoped model with no academy in context throws
 * AcademyContextError rather than running unfiltered. Code that runs outside a
 * staff member's request (public forms, webhooks, cron, scripts) must say
 * which academy it is working for with runWithAcademy().
 *
 * Where the academy comes from, first match wins:
 *   1. runWithAcademy(id, fn) — explicit, for anything without a session
 *   2. the ACADEMY_COOKIE of the current request — the staff member's choice
 *   3. the default academy, when inside a request with no cookie yet
 *
 * The cookie is a preference, not a grant: permissions are resolved per
 * academy (getUserPermissions), so picking an academy you are not a member of
 * yields no permissions there, and every gated route refuses.
 */

/** Models whose rows belong to one academy. Filled module by module (Futsal plan, phase 2). */
export const ACADEMY_SCOPED_MODELS = new Set<Prisma.ModelName>([]);

export const ACADEMY_COOKIE = "hx_academy";

export class AcademyContextError extends Error {
  constructor(model: string) {
    super(`No active academy for a query on ${model}. Wrap the work in runWithAcademy().`);
    this.name = "AcademyContextError";
  }
}

const store = new AsyncLocalStorage<{ academyId: string }>();

/**
 * Runs `fn` with `academyId` as the active academy for every query inside it.
 *
 * Awaits inside the context on purpose: Prisma queries are lazy and only run
 * when awaited, so `runWithAcademy(id, () => db.x.findMany())` returning the
 * bare query would execute it after the context had already ended.
 */
export function runWithAcademy<T>(academyId: string, fn: () => T | Promise<T>): Promise<T> {
  return store.run({ academyId }, async () => await fn());
}

// Academies change a handful of times in the life of the platform; a short
// cache spares a lookup on every scoped query.
const CACHE_MS = 60_000;
let cache: { at: number; bySlug: Map<string, string>; defaultId: string | null } | null = null;

/** Just what the resolver reads, so both the plain and the extended client fit. */
type AcademyReader = { academy: Pick<PrismaClient["academy"], "findMany"> };

async function academyIndex(base: AcademyReader) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const rows = await base.academy.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, isDefault: true } });
  cache = {
    at: Date.now(),
    bySlug: new Map(rows.map((r) => [r.slug, r.id])),
    defaultId: rows.find((r) => r.isDefault)?.id ?? rows[0]?.id ?? null,
  };
  return cache;
}

/** Forget cached academies — after creating, renaming or deactivating one. */
export function clearAcademyCache() {
  cache = null;
}

/**
 * The academy id for this point in the code, or null when there is none:
 * outside any request and outside runWithAcademy.
 */
export async function resolveAcademyId(base: AcademyReader): Promise<string | null> {
  const explicit = store.getStore();
  if (explicit) return explicit.academyId;

  let slug: string | undefined;
  try {
    const { cookies } = await import("next/headers");
    slug = (await cookies()).get(ACADEMY_COOKIE)?.value;
  } catch (error) {
    // Next signals "this render is dynamic" by throwing; that must reach Next.
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    return null; // not inside a request (scripts, build steps)
  }
  const index = await academyIndex(base);
  return (slug && index.bySlug.get(slug)) || index.defaultId;
}

/** The default academy's id, from the same cache. */
export async function defaultAcademyId(base: AcademyReader): Promise<string | null> {
  return (await academyIndex(base)).defaultId;
}

type AnyArgs = Record<string, unknown> & { where?: Record<string, unknown>; data?: unknown; create?: Record<string, unknown>; update?: unknown };

function stamp(data: unknown, academyId: string): unknown {
  if (Array.isArray(data)) return data.map((d) => stamp(d, academyId));
  if (data && typeof data === "object") return { ...(data as object), academyId };
  return data;
}

function withoutAcademy(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const rest = { ...(data as Record<string, unknown>) };
  delete rest.academyId;
  delete rest.academy;
  return rest;
}

/**
 * The query extension. Applies to top-level operations; a nested create of a
 * scoped model inside another model's write is not stamped, so scoped models
 * must be written directly (the phase-2 audit checks for nested writes).
 */
export function academyScopeExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: "academy-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!ACADEMY_SCOPED_MODELS.has(model as Prisma.ModelName)) return query(args);
          const academyId = await resolveAcademyId(base);
          if (!academyId) throw new AcademyContextError(model);
          const a = { ...(args as AnyArgs) };
          switch (operation) {
            case "create":
              a.data = stamp(a.data, academyId);
              break;
            case "createMany":
            case "createManyAndReturn":
              a.data = stamp(a.data, academyId);
              break;
            case "upsert":
              a.where = { ...a.where, academyId };
              a.create = stamp(a.create, academyId) as Record<string, unknown>;
              a.update = withoutAcademy(a.update);
              break;
            case "update":
            case "updateMany":
            case "updateManyAndReturn":
              // A record never moves between academies through an update.
              a.where = { ...a.where, academyId };
              a.data = withoutAcademy(a.data);
              break;
            default:
              // find*, count, aggregate, groupBy, update*, delete*. Prisma
              // accepts extra non-unique fields in a findUnique/update/delete
              // `where`, so a record of the other academy is simply not found.
              a.where = { ...a.where, academyId };
          }
          return query(a as typeof args);
        },
      },
    },
  });
}
