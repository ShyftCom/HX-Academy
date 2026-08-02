#!/usr/bin/env node
/**
 * Translation guard.
 *
 * Two independent checks:
 *
 *   1. PARITY  — every key present in any locale exists in all of them.
 *   2. USAGE   — every key the source calls via t("…") exists in every locale.
 *
 * Check 2 is the important one. The platform once shipped a sidebar reading
 * literally "nav.dashboard" and "misc.academy_name", and an entire login page
 * of raw keys, because the code called keys that were never added to
 * messages/*.json. Parity alone cannot catch that: the key was missing from
 * *all three* locales, so they agreed with each other perfectly.
 *
 * The previous version of this script pointed at public/locales/<lang>/<ns>.json
 * — a layout this repo has never used — so every file was "missing", every
 * check was skipped with a warning, and it always exited 0.
 *
 *   node scripts/check-translations.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MESSAGES_DIR = path.join(ROOT, "messages");
const LOCALES_DIR = path.join(ROOT, "public", "locales");
const SRC_DIR = path.join(ROOT, "src");

/** messages/<file>.json — the flat bundle. */
const FLAT_LOCALES = { fr: "fr", en: "eng", ar: "ar" };
/** public/locales/<lang>/<ns>.json — per-namespace bundles. */
const LANGS = ["fr", "en", "ar"];

/**
 * Namespaces registered in src/i18n.ts. `emails` is server-only (read from
 * disk by src/lib/i18n.server.ts) but is checked for parity all the same.
 */
const NAMESPACES = [
  "common", "auth", "calendar", "leads", "dashboard", "players", "settings", "emails",
  "subscriptions", "payments", "orders", "tickets", "stations",
  "finance", "hrm", "store", "website", "surveys",
  "admin", "affiliates", "summercamp",
];

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// ---- Load both stores -------------------------------------------------------

function readJson(file) {
  if (!fs.existsSync(file)) {
    console.error(`[ERROR] Missing locale file: ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

let failures = 0;

/**
 * Everything resolvable per language, mirroring how src/i18n.ts composes
 * resources: the flat messages bundle backs "common", the per-namespace files
 * layer on top, and fallbackNS lets any namespace fall through to common. For
 * "is this key resolvable at all" that flattens to one set per language.
 */
const resolvable = {};
/** Per-namespace key sets, for the parity check. */
const nsKeys = {};

for (const lang of LANGS) {
  const flat = readJson(path.join(MESSAGES_DIR, `${FLAT_LOCALES[lang]}.json`));
  const all = new Set(flattenKeys(flat));
  nsKeys[lang] = {};
  for (const ns of NAMESPACES) {
    const bundle = readJson(path.join(LOCALES_DIR, lang, `${ns}.json`));
    const keys = flattenKeys(bundle);
    nsKeys[lang][ns] = new Set(keys);
    keys.forEach((k) => all.add(k));
  }
  resolvable[lang] = all;
}

// ---- Check 1: parity across languages ---------------------------------------

// messages/*.json — the flat bundle.
{
  const sets = Object.fromEntries(
    LANGS.map((l) => [l, new Set(flattenKeys(readJson(path.join(MESSAGES_DIR, `${FLAT_LOCALES[l]}.json`))))])
  );
  const union = new Set(LANGS.flatMap((l) => [...sets[l]]));
  for (const lang of LANGS) {
    const missing = [...union].filter((k) => !sets[lang].has(k)).sort();
    if (missing.length) {
      console.error(`\n[parity] messages/${FLAT_LOCALES[lang]}.json is missing ${missing.length} key(s):`);
      missing.slice(0, 30).forEach((k) => console.error(`  - ${k}`));
      if (missing.length > 30) console.error(`  … and ${missing.length - 30} more`);
      failures += missing.length;
    }
  }
}

// public/locales/<lang>/<ns>.json — per namespace.
for (const ns of NAMESPACES) {
  const union = new Set(LANGS.flatMap((l) => [...nsKeys[l][ns]]));
  for (const lang of LANGS) {
    const missing = [...union].filter((k) => !nsKeys[lang][ns].has(k)).sort();
    if (missing.length) {
      console.error(`\n[parity] public/locales/${lang}/${ns}.json is missing ${missing.length} key(s):`);
      missing.slice(0, 30).forEach((k) => console.error(`  - ${k}`));
      if (missing.length > 30) console.error(`  … and ${missing.length - 30} more`);
      failures += missing.length;
    }
  }
}

// ---- Check 2: every key used in source exists --------------------------------

// Matches t("some.key"), t('ns:some.key'), t(`some.key`). Deliberately ignores
// t(variable) and t(`prefix.${x}`) — those cannot be resolved statically, and
// src/i18n.ts's parseMissingKeyHandler is the runtime safety net for them.
const T_CALL = /\bt\(\s*["'`]([A-Za-z0-9_.:]+)["'`]/g;

const used = new Map(); // key -> Set(files)
for (const file of walk(SRC_DIR)) {
  const source = fs.readFileSync(file, "utf-8");
  let m;
  while ((m = T_CALL.exec(source)) !== null) {
    const key = m[1];
    // A bare token with no dot is almost always a local helper called `t`,
    // not a translation lookup — skip to keep the signal clean.
    if (!key.includes(".")) continue;
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(path.relative(ROOT, file));
  }
}

/**
 * Whether a key called in source resolves for a given language.
 *
 * Handles three spellings, all of which i18next accepts:
 *   "ui.cancel"          — a key in the caller's own namespace
 *   "common:ui.cancel"   — an explicit cross-namespace lookup
 *   "common.save"        — a namespace-dotted key the bundle stores unprefixed
 *
 * Every namespace is merged into one per-language set (mirroring fallbackNS),
 * so membership is the only question — which namespace it came from is not.
 */
function resolves(key, set) {
  if (set.has(key)) return true;

  // Explicit "ns:key" form.
  if (key.includes(":")) {
    const [ns, rest] = key.split(":");
    return NAMESPACES.includes(ns) && rest.length > 0 && set.has(rest);
  }

  const [head, ...rest] = key.split(".");
  return NAMESPACES.includes(head) && rest.length > 0 && set.has(rest.join("."));
}

const unresolved = [...used.keys()]
  .filter((key) => LANGS.some((l) => !resolves(key, resolvable[l])))
  .sort();

if (unresolved.length) {
  console.error(`\n[usage] ${unresolved.length} key(s) called in source but missing from at least one language:`);
  for (const key of unresolved) {
    const where = [...used.get(key)].slice(0, 2).join(", ");
    const absent = LANGS.filter((l) => !resolves(key, resolvable[l])).join(", ");
    console.error(`  - ${key}   [missing in: ${absent}]   ${where}`);
  }
  failures += unresolved.length;
}

// ---- Result ------------------------------------------------------------------

if (failures === 0) {
  console.log(
    `✓ Translations OK — ${resolvable.fr.size} resolvable keys per language ` +
      `(${LANGS.join(", ")}); all ${used.size} static t() keys resolve.`
  );
  process.exit(0);
}

console.error(`\n✗ ${failures} translation problem(s) found.`);
process.exit(1);
