// Generates one static, crawlable HTML page per export region (regions/<slug>/index.html).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { REGIONS } from '../src/data/regions.js';
import { PRODUCTS } from '../src/data/products.js';
import { LANGS } from '../src/config.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sprite = index.match(/<svg width="0"[\s\S]*?<\/svg>/)[0];
const hreflangLinks = (path) =>
  LANGS.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="%VITE_SITE_URL%${l.code === 'en' ? '' : '/' + l.code}${path}" />`).join('\n  ') +
  `\n  <link rel="alternate" hreflang="x-default" href="%VITE_SITE_URL%${path}" />`;

for (const r of REGIONS) {
  const path = `/regions/${r.slug}/`;
  const name = r.slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const title = `${name} — Global seafood exporter | Proj-C`;
  const desc = `Frozen seafood export to ${name}: key ports, typical Incoterms, transit times and compliance notes from Proj-C.`;
  const html = `<!doctype html>
<html lang="en" dir="ltr" data-region="${r.slug}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#030b17" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="%VITE_SITE_URL%${path}" />
  ${hreflangLinks(path)}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Proj-C" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="%VITE_SITE_URL%${path}" />
  <meta property="og:image" content="%VITE_SITE_URL%/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <script>document.documentElement.classList.add('js');</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Proj-C","item":"%VITE_SITE_URL%/"},
    {"@type":"ListItem","position":2,"name":"Global reach","item":"%VITE_SITE_URL%/#reach"},
    {"@type":"ListItem","position":3,"name":"${name}","item":"%VITE_SITE_URL%${path}"}]}
  </script>
</head>
<body class="region-page">
  ${sprite}
  <div class="region-bg" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>
  <a class="skip" href="#main" data-i18n="nav.skip">Skip to content</a>
  <header class="site-header scrolled" id="siteHeader">
    <a class="brand" href="/" data-i18n-attr="aria-label:nav.home" aria-label="Proj-C — home">
      <svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><path class="bm-c" d="M36 12.5A16.5 16.5 0 1 0 36 35.5" /><path class="bm-w" d="M13 25c3.2-4.5 6.4-4.5 9.6 0s6.4 4.5 9.6 0" /></svg>
      <span class="brand-word">Proj‑C</span>
    </a>
    <div class="header-tools">
      <label class="lang"><span class="sr-only" data-i18n="ui.lang">Language</span>
        <select id="langSelect" aria-label="Language">
          <option value="en" lang="en">English</option><option value="ar" lang="ar">العربية</option><option value="zh" lang="zh-Hans">中文</option><option value="ja" lang="ja">日本語</option><option value="es" lang="es">Español</option>
        </select></label>
      <a class="btn btn-sm btn-gold" href="/?region=${r.slug}#rfq" data-magnetic><span data-i18n="nav.rfq">Request a quote</span></a>
    </div>
  </header>
  <main id="main" class="region-body">
    <section class="region-hero">
      <div class="wrap">
        <ol class="crumbs" aria-label="Breadcrumb">
          <li><a href="/" data-i18n="r.crumb.home">Home</a></li>
          <li><a href="/#reach" data-i18n="r.crumb.reach">Global reach</a></li>
          <li aria-current="page" data-i18n="reg.${r.slug}">${name}</li>
        </ol>
        <p class="eyebrow"><span class="dot"></span><span data-i18n="hero.eyebrow">Global seafood exporter</span></p>
        <h1 class="display" data-i18n="reg.${r.slug}">${name}</h1>
        <p class="lead" data-i18n="r.${r.slug}.blurb"></p>
        <a class="btn btn-gold" href="/?region=${r.slug}#rfq" data-magnetic><span data-i18n="r.hero.cta">Request a quote for this region</span><svg class="ico flip-rtl" aria-hidden="true"><use href="#i-arrow" /></svg></a>
      </div>
    </section>
    <div class="wrap">
      <section class="region-block" data-reveal>
        <ul class="facts">
          <li class="glass" data-tilt><small data-i18n="gr.transit">Typical sea transit</small><b dir="ltr">${r.transit} <span data-i18n="gr.days">days</span></b></li>
          <li class="glass" data-tilt><small data-i18n="gr.incoterms">Typical Incoterms</small><b dir="ltr">${r.incoterms.join(' · ')}</b></li>
          <li class="glass" data-tilt><small data-i18n="gr.ports">Key ports</small><b>${r.ports.join(', ')}</b></li>
        </ul>
      </section>
      <section class="region-block" data-reveal>
        <h2 data-i18n="gr.countries">Partner countries</h2>
        <ul class="country-grid">
          ${r.destinations.map((d) => `<li class="glass" data-tilt><h3 data-country="${d.cc}">${d.cc}</h3><p>${d.port}</p></li>`).join('\n          ')}
        </ul>
      </section>
      <section class="region-block" data-reveal>
        <h2 data-i18n="r.compliance">Compliance snapshot</h2>
        <div class="glass card" data-tilt><p data-i18n="r.${r.slug}.rules"></p></div>
      </section>
      <section class="region-block" data-reveal>
        <h2 data-i18n="r.products">Popular products for this market</h2>
        <div class="prod-links">
          ${r.products.map((id) => `<a href="/?product=${id}#catalogue"><svg aria-hidden="true"><use href="#i-${id}" /></svg><span data-i18n="p.${id}.name">${PRODUCTS.find((p) => p.id === id).id}</span></a>`).join('\n          ')}
        </div>
      </section>
      <section class="region-cta" data-reveal>
        <a class="btn btn-gold" href="/?region=${r.slug}#rfq" data-magnetic><span data-i18n="r.hero.cta">Request a quote for this region</span></a>
        <p style="margin-top:28px"><a class="link-arrow" href="/#reach"><span data-i18n="r.back">Back to Proj-C</span><svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg></a></p>
      </section>
    </div>
  </main>
  <footer class="site-footer"><div class="wrap footer-base" style="margin-top:0;border-top:0;padding-top:0">
    <p data-i18n="ft.rights">© Proj-C. All rights reserved.</p>
    <p class="fineprint" data-i18n="ft.legal"></p>
  </div></footer>
  <script type="module" src="/src/region.js"></script>
</body>
</html>
`;
  mkdirSync(new URL(`../regions/${r.slug}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../regions/${r.slug}/index.html`, import.meta.url), html);
}

console.log(`Generated ${REGIONS.length} region pages.`);
