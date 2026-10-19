// Verifies every language has exactly the English key set, and that every data-i18n key used in HTML exists.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import dicts from '../src/i18n/dicts.js';

let bad = 0;
const enKeys = Object.keys(dicts.en);
for (const [code, d] of Object.entries(dicts)) {
  const keys = new Set(Object.keys(d));
  const missing = enKeys.filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !(k in dicts.en));
  const vars = enKeys.filter((k) => k in d && JSON.stringify((dicts.en[k].match(/\{\w+\}/g) || []).sort()) !== JSON.stringify((d[k].match(/\{\w+\}/g) || []).sort()));
  if (missing.length || extra.length || vars.length) {
    bad++;
    console.error(`[${code}] missing: ${missing.join(', ') || '-'} | extra: ${extra.join(', ') || '-'} | placeholder mismatch: ${vars.join(', ') || '-'}`);
  }
}
const files = ['index.html'];
if (existsSync('regions')) for (const d of readdirSync('regions')) files.push(`regions/${d}/index.html`);
// Keys referenced dynamically from JS are checked by grep of t('...') too.
const srcFiles = readdirSync('src', { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`);
const used = new Set();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/data-i18n(?:-html)?="([^"]+)"|[a-z-]+:([a-zA-Z0-9_.-]+)(?=[;"])/g)) m[1] && used.add(m[1]);
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].split(';').forEach((p) => used.add(p.split(':')[1]));
for (const f of srcFiles) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([\w.-]+)'/g)) used.add(m[1]);
const unknown = [...used].filter((k) => !(k in dicts.en));
if (unknown.length) { bad++; console.error('Unknown keys used:', unknown.join(', ')); }
if (!bad) console.log(`i18n OK — ${enKeys.length} keys × ${Object.keys(dicts).length} languages, ${used.size} keys referenced.`);
process.exit(bad ? 1 : 0);
