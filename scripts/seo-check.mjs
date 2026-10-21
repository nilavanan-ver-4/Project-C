// Post-build SEO / GEO audit of dist/: titles, descriptions, h1, canonical, hreflang reciprocity, JSON-LD validity, internal links, alt text.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from 'node-html-parser';
import { LANGS, SITE_URL } from '../src/config.js';

const DIST = new URL('../dist/', import.meta.url).pathname;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = walk(DIST).filter((f) => f.endsWith('index.html'));
let errors = 0, warns = 0;
const err = (f, m) => { errors++; console.error(`✗ ${rel(f)}: ${m}`); };
const warn = (f, m) => { warns++; console.warn(`! ${rel(f)}: ${m}`); };
const rel = (f) => '/' + relative(DIST, f).split(sep).join('/');
const exists = (p) => { const f = join(DIST, p); return existsSync(f) && (statSync(f).isFile() || existsSync(join(f, 'index.html'))); };
const urlPathOf = (f) => rel(f).replace(/index\.html$/, '');
const langOf = (p) => (p.match(/^\/(es|ar|zh|ja)\//) || [, 'en'])[1];
const basePath = (p) => p.replace(/^\/(es|ar|zh|ja)\//, '/');

const pages = new Map();
for (const f of files) pages.set(urlPathOf(f), parse(readFileSync(f, 'utf8')));

for (const f of files) {
  const url = urlPathOf(f), root = pages.get(url), lang = langOf(url);
  const title = root.querySelector('title')?.text.trim() || '';
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const cjk = lang === 'zh' || lang === 'ja';
  if (!title) err(f, 'missing <title>'); else if (title.length > 70) warn(f, `title ${title.length} chars (>70)`);
  if (!desc) err(f, 'missing meta description'); else if (desc.length < (cjk ? 25 : 70) || desc.length > (cjk ? 120 : 175)) warn(f, `description length ${desc.length}`);
  const h1s = root.querySelectorAll('h1').length;
  if (h1s !== 1) err(f, `expected 1 <h1>, found ${h1s}`);
  const canon = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const expectCanon = SITE_URL + url;
  if (canon !== expectCanon) err(f, `canonical ${canon} ≠ ${expectCanon}`);
  const html = root.querySelector('html');
  const want = LANGS.find((l) => l.code === lang);
  if (html.getAttribute('lang') !== (want.hreflang === 'zh-Hans' ? 'zh-Hans' : want.code)) err(f, 'html lang mismatch');
  if (html.getAttribute('dir') !== want.dir) err(f, 'html dir mismatch');
  // hreflang: full set, self-referencing, reciprocal
  const alts = root.querySelectorAll('link[rel="alternate"][hreflang]');
  const set = Object.fromEntries(alts.map((a) => [a.getAttribute('hreflang'), a.getAttribute('href')]));
  for (const l of LANGS) if (!set[l.hreflang]) err(f, `missing hreflang ${l.hreflang}`);
  if (!set['x-default']) err(f, 'missing hreflang x-default');
  if (set[want.hreflang] !== expectCanon) err(f, 'hreflang self-reference ≠ canonical');
  for (const l of LANGS) {
    const target = (l.code === 'en' ? '' : `/${l.code}`) + basePath(url);
    if (set[l.hreflang] && set[l.hreflang] !== SITE_URL + target) err(f, `hreflang ${l.hreflang} → ${set[l.hreflang]} (expected ${SITE_URL + target})`);
    if (!pages.has(target)) err(f, `hreflang target ${target} not built`);
  }
  // JSON-LD
  const ld = root.querySelectorAll('script[type="application/ld+json"]');
  if (!ld.length) err(f, 'no JSON-LD');
  for (const s of ld) {
    try {
      const j = JSON.parse(s.text);
      const types = (j['@graph'] || [j]).flatMap((n) => [].concat(n['@type']));
      if (url === '/' + (lang === 'en' ? '' : lang + '/') && !types.includes('FAQPage')) err(f, 'home JSON-LD lacks FAQPage');
      const faq = (j['@graph'] || []).find((n) => n['@type'] === 'FAQPage');
      if (faq) for (const q of faq.mainEntity) if (!root.text.includes(q.name)) err(f, `FAQ JSON-LD question not visible on page: "${q.name.slice(0, 40)}…"`);
    } catch (e) { err(f, `invalid JSON-LD: ${e.message}`); }
  }
  if (root.querySelector('meta[property="og:image"]') === null) err(f, 'missing og:image');
  // images & links
  for (const img of root.querySelectorAll('img')) if (!img.hasAttribute('alt')) err(f, 'img without alt');
  for (const a of root.querySelectorAll('a[href^="/"]')) {
    const h = a.getAttribute('href').split('#')[0].split('?')[0] || '/';
    if (h.startsWith('//')) continue;
    if (!exists(h.replace(/^\//, ''))) err(f, `broken internal link ${h}`);
  }
  for (const a of root.querySelectorAll('a[target="_blank"]')) if (!/noopener/.test(a.getAttribute('rel') || '')) warn(f, 'target=_blank without rel=noopener');
}
for (const f of ['sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', 'og-image.png']) if (!existsSync(join(DIST, f))) err(DIST + f, 'missing');
const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
for (const url of pages.keys()) if (!sm.includes(`<loc>${SITE_URL}${url}</loc>`)) err(DIST + 'sitemap.xml', `sitemap lacks ${url}`);
console.log(`\nSEO audit: ${files.length} pages, ${errors} error(s), ${warns} warning(s).`);
process.exit(errors ? 1 : 0);
