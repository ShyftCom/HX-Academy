#!/usr/bin/env node
/**
 * Checks that every key in the English locale files exists in French and Arabic.
 * Exits with code 1 if any keys are missing.
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "../public/locales");
const SOURCE_LANG = "en";
const CHECK_LANGS = ["fr", "ar"];
const NAMESPACES = ["common", "auth", "dashboard", "leads", "calendar", "players", "settings", "emails"];

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

let totalMissing = 0;

for (const ns of NAMESPACES) {
  const sourcePath = path.join(LOCALES_DIR, SOURCE_LANG, `${ns}.json`);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`[WARN] Missing source file: ${SOURCE_LANG}/${ns}.json`);
    continue;
  }

  const source = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
  const sourceKeys = flattenKeys(source);

  for (const lang of CHECK_LANGS) {
    const targetPath = path.join(LOCALES_DIR, lang, `${ns}.json`);
    if (!fs.existsSync(targetPath)) {
      console.error(`[ERROR] Missing file: ${lang}/${ns}.json`);
      totalMissing += sourceKeys.length;
      continue;
    }

    const target = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
    const targetKeys = new Set(flattenKeys(target));

    const missing = sourceKeys.filter((k) => !targetKeys.has(k));
    if (missing.length > 0) {
      console.error(`\n[${lang}/${ns}] Missing ${missing.length} key(s):`);
      missing.forEach((k) => console.error(`  - ${k}`));
      totalMissing += missing.length;
    }
  }
}

if (totalMissing === 0) {
  console.log("✓ All translation keys are present in fr and ar.");
  process.exit(0);
} else {
  console.error(`\n✗ ${totalMissing} missing key(s) found.`);
  process.exit(1);
}
