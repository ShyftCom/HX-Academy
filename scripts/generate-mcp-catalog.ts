#!/usr/bin/env tsx
/**
 * Build src/lib/mcp/api-catalog.json: the map of back-office API routes that
 * Claude reads through the MCP `list_endpoints` / `describe_endpoint` tools.
 *
 * Generated from the route files themselves (exported methods, query params
 * read from searchParams, zod body schemas, leading doc comments) so a new
 * route becomes reachable by Claude on the next build without anyone
 * remembering to register it. Runs in `npm run build`; run it by hand with
 * `npm run mcp:catalog` and commit the result so dev servers have it too.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative, sep } from "path";

const ROOT = join(process.cwd(), "src/app/api");
const OUT = join(process.cwd(), "src/lib/mcp/api-catalog.json");

// Kept in step with BLOCKED_PREFIXES in src/lib/mcp/api-proxy.ts. Public
// routes stay out too: they are the website's own endpoints, not management.
const SKIP = [/^\/api\/auth\//, /^\/api\/oauth\//, /^\/api\/mcp/, /^\/api\/ai-connections/, /^\/api\/cron\//, /^\/api\/register$/, /^\/api\/upload/, /^\/api\/public\//, /^\/api\/payments\/slickpay\/(webhook|return)$/];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return name === "route.ts" ? [full] : [];
  });
}

/** Text of a balanced (...) starting at `open`, which must point at "(". */
function balanced(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

function docBefore(src: string, index: number): string | undefined {
  const before = src.slice(0, index).trimEnd();
  if (!before.endsWith("*/")) return undefined;
  const start = before.lastIndexOf("/**");
  if (start < 0) return undefined;
  return before
    .slice(start + 3, -2)
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

const entries = walk(ROOT)
  .map((file) => {
    const src = readFileSync(file, "utf8");
    const path = "/api/" + relative(ROOT, file).split(sep).slice(0, -1).join("/");
    const methods: Record<string, string | null> = {};
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE)\b/g)) {
      methods[m[1]] = docBefore(src, m.index!) ?? null;
    }
    const query = [...new Set([...src.matchAll(/searchParams\.get\(\s*["'`](\w+)["'`]/g)].map((m) => m[1]))];
    const schemas: string[] = [];
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*z\s*\.\s*object\s*\(/g)) {
      const open = m.index! + m[0].length - 1;
      const body = balanced(src, open).replace(/\s+/g, " ");
      schemas.push(`${m[1]} = z.object${body}`.slice(0, 2000));
    }
    // Most routes read the body ad hoc rather than through zod; the field
    // names they touch are still the best hint of what to send.
    const bodyFields = new Set<string>();
    for (const m of src.matchAll(/const\s*\{([^}]{1,400})\}\s*=\s*(?:await\s+req(?:uest)?\.json\(\)|body|parsed\.data)/g)) {
      for (const f of m[1].split(",")) {
        const name = f.split(/[:=]/)[0].replace("...", "").trim();
        if (/^\w+$/.test(name)) bodyFields.add(name);
      }
    }
    for (const m of src.matchAll(/\bbody\.(\w+)/g)) bodyFields.add(m[1]);
    return { path, methods, query, bodyFields: [...bodyFields], schemas };
  })
  .filter((e) => Object.keys(e.methods).length > 0 && !SKIP.some((r) => r.test(e.path)))
  .sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(OUT, JSON.stringify(entries, null, 1) + "\n");
console.log(`✅ MCP API catalog: ${entries.length} routes → ${relative(process.cwd(), OUT)}`);
