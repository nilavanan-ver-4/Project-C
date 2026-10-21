// Localised JSON-LD graphs (Organization, WebPage + speakable, FAQ, HowTo, Product, Service, VideoObject…).
// Built at prerender time so structured data always matches the visible, translated copy.
import { SITE_URL, CONTACT, LANGS, HQ } from '../config.js';
import { PRODUCTS, productById } from '../data/products.js';
import { REGIONS, regionBySlug } from '../data/regions.js';
import { MEDIA } from '../data/media.js';
import { translate, regionName, pageMeta } from '../i18n/shared.js';

const prefix = (code) => (code === 'en' ? '' : `/${code}`);
export const urlFor = (lang, path) => `${SITE_URL}${prefix(lang)}${path}`;
const ORG = `${SITE_URL}/#org`;

export function buildGraph({ lang, dict, en, kind, slug }) {
  const t = (k, v) => translate(dict, en, k, v);
  const meta = LANGS.find((l) => l.code === lang);
  const inLanguage = meta.hreflang;
  const path = kind === 'home' ? '/' : `/${kind === 'region' ? 'regions' : 'products'}/${slug}/`;
  const pageUrl = urlFor(lang, path);
  const crumbs = [{ name: 'Proj-C', url: urlFor(lang, '/') }];
  let title, desc, extra = [];

  const org = {
    '@type': ['Organization', 'Corporation'],
    '@id': ORG, name: 'Proj-C', url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    image: `${SITE_URL}/og-image.png`,
    description: translate(dicts0(en), en, 'meta.desc'),
    slogan: t('hero.title'),
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', email: CONTACT.email, availableLanguage: LANGS.map((l) => l.label), areaServed: REGIONS.map((r) => en[`reg.${r.slug}`]) }],
    areaServed: REGIONS.map((r) => ({ '@type': 'Place', name: en[`reg.${r.slug}`] })),
    knowsAbout: ['Frozen seafood export', 'Frozen shrimp', 'Frozen prawns', 'Frozen fish', 'Frozen crab', 'Frozen lobster', 'Frozen squid', 'Cold chain logistics', 'HACCP', 'BRC food safety', 'HS codes 0303 0304 0306 0307 1604 1605', 'Incoterms 2020'],
    makesOffer: undefined,
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Proj-C export range',
      itemListElement: PRODUCTS.map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'Product', name: en[`p.${p.id}.name`], url: urlFor('en', `/products/${p.id}/`) } })),
    },
    location: { '@type': 'Place', name: `${HQ.city} export hub`, address: { '@type': 'PostalAddress', addressLocality: HQ.city, addressCountry: HQ.country } },
  };
  delete org.makesOffer;

  if (kind === 'home') {
    ({ title, desc } = { title: t('meta.title'), desc: t('meta.desc') });
  } else if (kind === 'region') {
    const r = regionBySlug[slug];
    title = `${t(`reg.${slug}`)} — ${t('hero.eyebrow')} | Proj-C`; desc = t(`r.${slug}.blurb`);
    crumbs.push({ name: t('r.crumb.reach'), url: urlFor(lang, '/#reach') }, { name: t(`reg.${slug}`), url: pageUrl });
    extra.push({
      '@type': 'Service', '@id': `${pageUrl}#service`, name: `${t(`reg.${slug}`)} — seafood export`, serviceType: 'Frozen seafood export',
      provider: { '@id': ORG }, description: desc, url: pageUrl,
      areaServed: r.destinations.map((d) => ({ '@type': 'Country', name: regionName(lang, d.cc) })),
      termsOfService: t(`r.${slug}.rules`),
    });
  } else {
    const p = productById[slug];
    ({ title, desc } = pageMeta(dict, en, undefined, slug));
    crumbs.push({ name: t('nav.catalogue'), url: urlFor(lang, '/#catalogue') }, { name: t(`p.${slug}.name`), url: pageUrl });
    const pv = (name, value) => ({ '@type': 'PropertyValue', name, value: Array.isArray(value) ? value.join(', ') : String(value) });
    extra.push({
      '@type': 'Product', '@id': `${pageUrl}#product`, name: t(`p.${slug}.name`), description: desc, url: pageUrl,
      category: 'Frozen seafood', sku: `PROJC-${slug.toUpperCase()}`, brand: { '@type': 'Brand', name: 'Proj-C' }, manufacturer: { '@id': ORG },
      image: `${SITE_URL}/og-image.png`,
      additionalProperty: [pv('HS code', p.hs), pv('Species', p.species), pv('Forms', p.forms), pv(`Sizes (${p.sizeUnit})`, p.sizes), pv('Grades', p.grades), pv('Packaging', p.packs), pv('Storage temperature', p.temp), pv('Shelf life (months)', p.shelf)],
      isRelatedTo: undefined,
    });
    delete extra[0].isRelatedTo;
  }

  const webpage = {
    '@type': kind === 'home' ? 'WebPage' : 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: title, description: desc, inLanguage,
    isPartOf: { '@id': `${SITE_URL}/#website` }, about: { '@id': ORG }, publisher: { '@id': ORG },
    breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
    primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.lead', '.facts-geo li'] },
  };
  const graph = [
    org,
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'Proj-C', publisher: { '@id': ORG }, inLanguage: LANGS.map((l) => l.hreflang) },
    webpage,
    { '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`, itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) },
    ...extra,
  ];

  if (kind === 'home') {
    graph.push(
      { '@type': 'ItemList', '@id': `${pageUrl}#products`, name: 'Proj-C export product range', itemListElement: PRODUCTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: t(`p.${p.id}.name`), url: urlFor(lang, `/products/${p.id}/`) })) },
      { '@type': 'FAQPage', '@id': `${pageUrl}#faq`, inLanguage, mainEntity: [1, 2, 3, 4, 5, 6].map((n) => ({ '@type': 'Question', name: t(`faq.q${n}`), acceptedAnswer: { '@type': 'Answer', text: t(`faq.a${n}`) } })) },
      { '@type': 'HowTo', '@id': `${pageUrl}#howto`, name: t('rfq.title'), description: t('rfq.lead'), inLanguage,
        step: [['f.s1', 'f.products'], ['f.s2', 'f.s2'], ['f.s3', 'f.s3'], ['f.s4', 'f.s4']].map(([n, tx], i) => ({ '@type': 'HowToStep', position: i + 1, name: t(n), text: t(tx), url: `${pageUrl}#rfq` })) },
    );
    MEDIA.videos.filter((v) => v.youtubeId).forEach((v) => graph.push({
      '@type': 'VideoObject', name: t(`media.${v.id}`), description: t(`media.${v.id}`), inLanguage,
      thumbnailUrl: v.poster ? (v.poster.startsWith('http') ? v.poster : SITE_URL + v.poster) : `${SITE_URL}/og-image.png`,
      uploadDate: v.uploadDate || undefined, duration: v.duration || undefined, embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
    }));
    MEDIA.photos.filter((p) => p.src).forEach((p) => graph.push({ '@type': 'ImageObject', contentUrl: p.src.startsWith('http') ? p.src : SITE_URL + p.src, caption: t(`media.${p.id}`), width: p.width, height: p.height, creditText: 'Proj-C', copyrightNotice: '© Proj-C' }));
  }
  return { '@context': 'https://schema.org', '@graph': graph, _title: title, _desc: desc };
}
const dicts0 = (en) => en;

export function jsonLdScript(args) {
  const { _title, _desc, ...g } = buildGraph(args);
  const json = JSON.stringify(g, (k, v) => (v === undefined ? undefined : v)).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}
