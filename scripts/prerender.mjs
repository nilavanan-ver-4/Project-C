// Post-build step: emits real, crawlable HTML for every language (/es/, /ar/, /zh/, /ja/ + English at /)
// by applying the dictionaries to the built pages, then writes sitemap.xml + robots.txt.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { parse } from 'node-html-parser';
import dicts from '../src/i18n/dicts.js';
import { LANGS, SITE_URL } from '../src/config.js';
import { translate, regionName, parseAttrSpec, pageMeta } from '../src/i18n/shared.js';

const DIST = new URL('../dist/', import.meta.url);
const pages = ['/'];
if (existsSync(new URL('regions/', DIST))) for (const d of readdirSync(new URL('regions/', DIST))) pages.push(`/regions/${d}/`);

const fileFor = (path) => new URL(`.${path}index.html`, DIST);
const prefix = (code) => (code === 'en' ? '' : `/${code}`);

function render(source, lang, path) {
  const dict = dicts[lang], en = dicts.en;
  const meta = LANGS.find((l) => l.code === lang);
  const root = parse(source, { comment: true, blockTextElements: { script: true, style: true, pre: true } });
  const html = root.querySelector('html');
  const region = html.getAttribute('data-region') || undefined;
  html.setAttribute('lang', meta.hreflang === 'zh-Hans' ? 'zh-Hans' : meta.code);
  html.setAttribute('dir', meta.dir);

  for (const el of root.querySelectorAll('[data-i18n]')) {
    let vars; const raw = el.getAttribute('data-i18n-vars');
    if (raw) try { vars = JSON.parse(raw); } catch {}
    el.set_content(translate(dict, en, el.getAttribute('data-i18n'), vars).replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  }
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const [attr, key] of parseAttrSpec(el.getAttribute('data-i18n-attr'))) el.setAttribute(attr, translate(dict, en, key));
  }
  for (const el of root.querySelectorAll('[data-country]')) el.set_content(regionName(lang, el.getAttribute('data-country')));

  const { title, desc } = pageMeta(dict, en, region);
  root.querySelector('title')?.set_content(title.replace(/&/g, '&amp;'));
  const setMeta = (sel, v) => root.querySelector(sel)?.setAttribute('content', v);
  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:title"]', title); setMeta('meta[property="og:description"]', desc);
  setMeta('meta[name="twitter:title"]', title); setMeta('meta[name="twitter:description"]', desc);
  setMeta('meta[property="og:url"]', `${SITE_URL}${prefix(lang)}${path}`);
  root.querySelector('link[rel="canonical"]')?.setAttribute('href', `${SITE_URL}${prefix(lang)}${path}`);
  if (!root.querySelector('meta[property="og:locale"]')) root.querySelector('head').insertAdjacentHTML('beforeend', `<meta property="og:locale" content="${meta.locale}" />`);

  // keep internal links inside the language
  if (lang !== 'en') {
    for (const a of root.querySelectorAll('a[href^="/"]')) {
      const h = a.getAttribute('href');
      if (h.startsWith('//')) continue;
      a.setAttribute('href', `/${lang}${h}`);
    }
  }
  const opt = root.querySelector(`#langSelect option[value="${lang}"]`);
  if (opt) { root.querySelectorAll('#langSelect option').forEach((o) => o.removeAttribute('selected')); opt.setAttribute('selected', ''); }
  return root.toString();
}

for (const path of pages) {
  const source = readFileSync(fileFor(path), 'utf8');
  for (const l of LANGS) {
    const out = render(source, l.code, path);
    const target = l.code === 'en' ? fileFor(path) : fileFor(`/${l.code}${path}`);
    mkdirSync(new URL('./', target), { recursive: true });
    writeFileSync(target, out);
  }
}

const urls = pages.flatMap((path) => LANGS.map((l) => {
  const alts = LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${SITE_URL}${prefix(a.code)}${path}"/>`).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}"/>`;
  return `  <url>\n    <loc>${SITE_URL}${prefix(l.code)}${path}</loc>\n${alts}\n    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.7'}</priority>\n  </url>`;
}));
writeFileSync(new URL('sitemap.xml', DIST), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(new URL('robots.txt', DIST), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log(`Prerendered ${pages.length} pages × ${LANGS.length} languages, sitemap + robots written.`);
