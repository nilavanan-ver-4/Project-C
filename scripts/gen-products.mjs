// Generates one crawlable page per product family (products/<id>/index.html) with Product structured data (injected at build).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { PRODUCTS } from '../src/data/products.js';
import { REGIONS } from '../src/data/regions.js';
import { LANGS } from '../src/config.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sprite = index.match(/<svg width="0"[\s\S]*?<\/svg>/)[0];
const hl = (path) => LANGS.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="%VITE_SITE_URL%${l.code === 'en' ? '' : '/' + l.code}${path}" />`).join('\n  ') + `\n  <link rel="alternate" hreflang="x-default" href="%VITE_SITE_URL%${path}" />`;
const chips = (a, cls = '') => a.map((x) => `<span class="chip ${cls}">${x}</span>`).join('');

for (const p of PRODUCTS) {
  const path = `/products/${p.id}/`;
  const name = { shrimp: 'Frozen Shrimp', prawn: 'Frozen Prawns', fish: 'Frozen Fish', crab: 'Crab', lobster: 'Lobster', squid: 'Squid', valueadded: 'Value-added Marine Products' }[p.id];
  const markets = REGIONS.filter((r) => r.products.includes(p.id));
  const html = `<!doctype html>
<html lang="en" dir="ltr" data-product="${p.id}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#030b17" />
  <title>${name} export | Proj-C</title>
  <meta name="description" content="${name} — specifications, sizes, grading, packaging and HS codes from Proj-C." />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="%VITE_SITE_URL%${path}" />
  ${hl(path)}
  <meta name="author" content="Proj-C" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Proj-C" />
  <meta property="og:title" content="${name} export | Proj-C" />
  <meta property="og:description" content="${name} — specifications, sizes, grading, packaging and HS codes from Proj-C." />
  <meta property="og:url" content="%VITE_SITE_URL%${path}" />
  <meta property="og:image" content="%VITE_SITE_URL%/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${name} export | Proj-C" />
  <meta name="twitter:description" content="${name} — specifications, sizes, grading, packaging and HS codes from Proj-C." />
  <script>document.documentElement.classList.add('js');</script>
  <!--JSONLD-->
</head>
<body class="region-page">
  ${sprite}
  <div class="region-bg" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>
  <a class="skip" href="#main" data-i18n="nav.skip">Skip to content</a>
  <header class="site-header scrolled" id="siteHeader">
    <a class="brand" href="/" data-i18n-attr="aria-label:nav.home" aria-label="Proj-C — home"><svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><path class="bm-c" d="M36 12.5A16.5 16.5 0 1 0 36 35.5" /><path class="bm-w" d="M13 25c3.2-4.5 6.4-4.5 9.6 0s6.4 4.5 9.6 0" /></svg><span class="brand-word">Proj‑C</span></a>
    <div class="header-tools">
      <label class="lang"><span class="sr-only" data-i18n="ui.lang">Language</span><select id="langSelect" aria-label="Language"><option value="en" lang="en">English</option><option value="ar" lang="ar">العربية</option><option value="zh" lang="zh-Hans">中文</option><option value="ja" lang="ja">日本語</option><option value="es" lang="es">Español</option></select></label>
      <a class="btn btn-sm btn-gold" href="/?product=${p.id}#rfq" data-magnetic><span data-i18n="nav.rfq">Request a quote</span></a>
    </div>
  </header>
  <main id="main" class="region-body">
    <section class="region-hero"><div class="wrap">
      <ol class="crumbs" aria-label="Breadcrumb"><li><a href="/" data-i18n="r.crumb.home">Home</a></li><li><a href="/#catalogue" data-i18n="nav.catalogue">Catalogue</a></li><li aria-current="page" data-i18n="p.${p.id}.name">${name}</li></ol>
      <p class="eyebrow"><span class="dot"></span><span data-i18n="p.${p.id}.tag"></span></p>
      <h1 class="display" data-i18n="p.${p.id}.name">${name}</h1>
      <p class="lead" data-i18n="p.${p.id}.desc"></p>
      <a class="btn btn-gold" href="/?product=${p.id}#rfq" data-magnetic><span data-i18n="pp.rfq" data-i18n-vars='{"name":"${name}"}'>Request a quote for ${name}</span></a>
    </div></section>
    <div class="wrap">
      <section class="region-block" data-reveal>
        <h2 data-i18n="pp.more">Product details</h2>
        <dl class="spec-list glass">
          <div><dt data-i18n="spec.species">Species</dt><dd><span class="chip">${p.species}</span></dd></div>
          <div><dt data-i18n="spec.hs">HS codes</dt><dd>${chips(p.hs, 'hs')}</dd></div>
          <div><dt data-i18n="spec.forms">Forms</dt><dd>${chips(p.forms)}</dd></div>
          <div><dt><span data-i18n="spec.sizes">Sizes</span> · ${p.sizeUnit}</dt><dd dir="ltr">${chips(p.sizes)}</dd></div>
          <div><dt data-i18n="spec.grades">Grading</dt><dd>${chips(p.grades)}</dd></div>
          <div><dt data-i18n="spec.packs">Packaging formats</dt><dd>${chips(p.packs)}</dd></div>
          <div><dt data-i18n="spec.temp">Storage temperature</dt><dd dir="ltr">${chips([p.temp])}</dd></div>
          <div><dt data-i18n="spec.shelf">Shelf life</dt><dd dir="ltr"><span class="chip">${p.shelf} <span data-i18n="spec.months" style="margin-inline-start:.3em">months</span></span></dd></div>
          <div><dt data-i18n="spec.glaze">Ice glaze</dt><dd dir="ltr">${chips([p.glaze])}</dd></div>
        </dl>
        <p class="fineprint" style="margin-top:20px" data-i18n="cat.note"></p>
      </section>
      <section class="region-block" data-reveal>
        <h2 data-i18n="pp.markets">Markets for this product</h2>
        <div class="prod-links">${markets.map((r) => `<a href="/regions/${r.slug}/"><span data-i18n="reg.${r.slug}">${r.slug}</span></a>`).join('')}</div>
      </section>
      <section class="region-cta" data-reveal>
        <a class="btn btn-gold" href="/?product=${p.id}#rfq" data-magnetic><span data-i18n="pp.rfq" data-i18n-vars='{"name":"${name}"}'>Request a quote for ${name}</span></a>
        <p style="margin-top:28px"><a class="link-arrow" href="/#catalogue"><span data-i18n="r.back">Back to Proj-C</span><svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg></a></p>
      </section>
    </div>
  </main>
  <footer class="site-footer"><div class="wrap footer-base" style="margin-top:0;border-top:0;padding-top:0"><p data-i18n="ft.rights">© Proj-C. All rights reserved.</p><p class="fineprint" data-i18n="ft.legal"></p></div></footer>
  <script type="module" src="/src/region.js"></script>
</body>
</html>
`;
  mkdirSync(new URL(`../products/${p.id}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../products/${p.id}/index.html`, import.meta.url), html);
}
console.log(`Generated ${PRODUCTS.length} product pages.`);
