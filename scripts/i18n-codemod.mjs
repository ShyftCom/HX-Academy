#!/usr/bin/env node
/**
 * Rewrites hardcoded user-facing strings in back-office pages into t() calls.
 *
 *   node scripts/i18n-codemod.mjs plan  <file...>   # print strings + proposed keys
 *   node scripts/i18n-codemod.mjs apply <map.json>  # rewrite files
 *
 * The apply map is:
 *   { "src/app/.../page.tsx": { "ns": "players", "keys": { "Add Player": "actions.add" } } }
 *
 * Deliberately conservative — it only rewrites three shapes it can recognise
 * unambiguously, and leaves anything else alone for a human to look at:
 *
 *   1. JSX text that is the entire child of an element:   >Add Player<
 *   2. A fixed allowlist of user-visible string props:    placeholder="Search"
 *   3. sonner toast calls:                                toast.error("Failed")
 *
 * It will NOT touch string concatenation, template literals with expressions,
 * ternaries, or props outside the allowlist. Those need judgement.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Props whose values are rendered to the user. */
const TEXT_PROPS = [
  "placeholder", "label", "title", "description", "emptyMessage", "emptyDescription",
  "header", "confirmLabel", "cancelLabel", "alt", "aria-label", "hint", "mobileLabel",
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Escapes a string for embedding in a double-quoted JS string. */
const jsString = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function rewriteFile(file, ns, keys) {
  const abs = path.join(ROOT, file);
  let src = fs.readFileSync(abs, "utf8");
  const before = src;
  let replaced = 0;
  const missed = [];

  // Longest first, so "Delete player" is handled before "Delete".
  const entries = Object.entries(keys).sort((a, b) => b[0].length - a[0].length);

  for (const [text, key] of entries) {
    const call = `t(${jsString(key)})`;
    const esc = escapeRe(text);
    let hit = false;

    // 1. JSX text node — the whole child, optionally surrounded by whitespace.
    //
    // Guarded against matching inside a string literal. `answer: "<p>Answer</p>"`
    // also contains `>Answer<`, and rewriting it produced
    // `"<p>{t("faqs.answer")}</p>"` — a nested quote that broke the parse.
    // A JSX text node is never inside quotes, so skip any match that is.
    const jsxText = new RegExp(`(>)(\\s*)${esc}(\\s*)(<)`, "g");
    src = src.replace(jsxText, (m, gt, pre, post, lt, offset) => {
      if (insideStringLiteral(src, offset)) return m;
      hit = true; replaced++;
      return `${gt}${pre}{${call}}${post}${lt}`;
    });

    // 2. Allowlisted props.
    for (const prop of TEXT_PROPS) {
      const propRe = new RegExp(`(\\b${escapeRe(prop)}\\s*=\\s*)"${esc}"`, "g");
      src = src.replace(propRe, (_m, lhs) => {
        hit = true; replaced++;
        return `${lhs}{${call}}`;
      });
    }

    // 3. toast.*("…") — first argument only.
    const toastRe = new RegExp(`(\\btoast\\.(?:success|error|info|warning|message)\\(\\s*)"${esc}"`, "g");
    src = src.replace(toastRe, (_m, lhs) => {
      hit = true; replaced++;
      return `${lhs}${call}`;
    });

    if (!hit) missed.push(text);
  }

  if (src === before) return { file, replaced: 0, missed, changed: false };

  src = ensureTranslationHook(src, ns);
  fs.writeFileSync(abs, src);
  return { file, replaced, missed, changed: true };
}

/**
 * Adds the import and a `const { t } = useTranslation(ns)` line to every
 * component in the file whose body actually calls t().
 */
function ensureTranslationHook(src, ns) {
  if (!/from ["']react-i18next["']/.test(src)) {
    // Insert after the final top-level import so the import block stays together.
    const imports = [...src.matchAll(/^import .*?;$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const at = last.index + last[0].length;
      src = src.slice(0, at) + `\nimport { useTranslation } from "react-i18next";` + src.slice(at);
    }
  }

  // Component declarations: `function Name(` / `const Name = (` / `const Name = memo((`
  const decl = /(?:export\s+default\s+)?(?:function\s+([A-Z][A-Za-z0-9_]*)\s*\(|const\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:React\.memo\(|memo\()?\s*(?:function\s*)?\()/g;

  const insertions = [];
  for (const m of src.matchAll(decl)) {
    const bodyStart = findBodyStart(src, m.index + m[0].length - 1);
    if (bodyStart < 0) continue;
    const bodyEnd = matchBrace(src, bodyStart);
    if (bodyEnd < 0) continue;
    const body = src.slice(bodyStart, bodyEnd);
    if (!/\bt\(\s*["'`]/.test(body)) continue;              // doesn't use t()
    if (/const\s*\{\s*t\s*[},]/.test(body)) continue;        // already has the hook
    insertions.push(bodyStart + 1);
  }

  // Apply back-to-front so earlier offsets stay valid.
  for (const at of insertions.sort((a, b) => b - a)) {
    src = src.slice(0, at) + `\n  const { t } = useTranslation(${jsString(ns)});` + src.slice(at);
  }
  return src;
}

/**
 * Whether `offset` sits inside a quoted string on its own line.
 *
 * Scans the line from its start, tracking quote state and honouring backslash
 * escapes. Line-scoped because template literals can span lines and are not
 * worth the complexity — a JSX text node never appears mid-string on a line
 * that opened a quote before it.
 */
function insideStringLiteral(src, offset) {
  const lineStart = src.lastIndexOf("\n", offset) + 1;
  let quote = null;
  for (let i = lineStart; i < offset; i++) {
    const c = src[i];
    if (c === "\\") { i++; continue; }
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'" || c === "`") quote = c;
  }
  return quote !== null;
}

/** From an opening paren, find the `{` that starts the function body. */
function findBodyStart(src, parenIdx) {
  let depth = 0;
  for (let i = parenIdx; i < src.length; i++) {
    const c = src[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) {
        const rest = src.slice(i + 1, i + 40);
        const arrow = rest.match(/^\s*(?::[^=]*?)?=>\s*\{/);
        if (arrow) return i + 1 + rest.indexOf("{", arrow[0].length - 1);
        const plain = rest.match(/^\s*\{/);
        if (plain) return i + 1 + rest.indexOf("{");
        return -1;
      }
    }
  }
  return -1;
}

/** Index just past the `}` matching the `{` at `open`. Skips strings/comments. */
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i) + 1; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

// ---- CLI --------------------------------------------------------------------

const [, , cmd, ...rest] = process.argv;

if (cmd === "apply") {
  const map = JSON.parse(fs.readFileSync(rest[0], "utf8"));
  let totalReplaced = 0;
  const allMissed = [];
  for (const [file, { ns, keys }] of Object.entries(map)) {
    const r = rewriteFile(file, ns, keys);
    totalReplaced += r.replaced;
    if (r.missed.length) allMissed.push([file, r.missed]);
    console.log(`${r.changed ? "✓" : "–"} ${String(r.replaced).padStart(3)}  ${file}`);
  }
  console.log(`\nReplaced ${totalReplaced} strings.`);
  if (allMissed.length) {
    console.log("\nNOT matched (need manual handling):");
    for (const [file, list] of allMissed) {
      console.log(`  ${file}`);
      list.forEach((s) => console.log(`     ${JSON.stringify(s)}`));
    }
  }
} else {
  console.error("Usage: node scripts/i18n-codemod.mjs apply <map.json>");
  process.exit(1);
}
