#!/usr/bin/env node
// Verifies that en.json and fr.json expose exactly the same set of (nested) keys.
// Exits non-zero with a diff on any mismatch so CI can gate on i18n parity.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = join(here, '..', 'src', 'locales');

/**
 * Flatten a nested translation value into dotted key paths. Arrays are indexed
 * (e.g. `calendar.weekdays.0`) so a length/shape divergence between locales is
 * also caught, not just object keys.
 */
function flatten(value, prefix = '') {
  if (value && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? value.map((v, i) => [String(i), v])
      : Object.entries(value);
    return entries.flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

function load(name) {
  try {
    return JSON.parse(readFileSync(join(localesDir, name), 'utf8'));
  } catch (e) {
    console.error(`i18n parity FAILED — cannot read/parse ${name}: ${e.message}`);
    process.exit(1);
  }
}

const en = new Set(flatten(load('en.json')));
const fr = new Set(flatten(load('fr.json')));

const missingInFr = [...en].filter((k) => !fr.has(k)).sort();
const missingInEn = [...fr].filter((k) => !en.has(k)).sort();

if (missingInFr.length === 0 && missingInEn.length === 0) {
  console.log(`i18n parity OK — ${en.size} keys present in both en.json and fr.json.`);
  process.exit(0);
}

console.error('i18n parity FAILED — en.json and fr.json are out of sync.');
if (missingInFr.length) {
  console.error(`\nMissing in fr.json (${missingInFr.length}):`);
  missingInFr.forEach((k) => console.error(`  - ${k}`));
}
if (missingInEn.length) {
  console.error(`\nMissing in en.json (${missingInEn.length}):`);
  missingInEn.forEach((k) => console.error(`  - ${k}`));
}
process.exit(1);
