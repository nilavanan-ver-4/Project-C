// Generative-engine-optimisation files: /llms.txt (concise map for AI assistants), /llms-full.txt (full facts) and a crawler-aware robots.txt.
import en from '../../src/i18n/en.js';
import { SITE_URL, CONTACT, HQ, MOQ, LANGS } from '../../src/config.js';
import { PRODUCTS } from '../../src/data/products.js';
import { REGIONS } from '../../src/data/regions.js';
import { CURRENCIES, INCOTERMS } from '../../src/data/story.js';
import { interpolate } from '../../src/i18n/shared.js';

const T = (k, v) => interpolate(en[k] ?? k, v);
const regionEn = (cc) => new Intl.DisplayNames(['en'], { type: 'region' }).of(cc);

export function llmsTxt() {
  return `# Proj-C

> ${T('meta.desc')}

Proj-C is a B2B exporter of premium frozen seafood. Content is available in English, Arabic, Mandarin (Simplified), Japanese and Spanish; each language has its own URL prefix (/ar/, /zh/, /ja/, /es/). Specifications, HS codes and transit times are indicative and confirmed in each quotation.

## Key facts
${[1, 2, 3, 4, 5, 6, 7].map((n) => `- ${T(`facts.${n}`)}`).join('\n')}

## Products
${PRODUCTS.map((p) => `- [${T(`p.${p.id}.name`)}](${SITE_URL}/products/${p.id}/): ${T(`p.${p.id}.tag`)}. HS ${p.hs.join(', ')}.`).join('\n')}

## Export regions
${REGIONS.map((r) => `- [${T(`reg.${r.slug}`)}](${SITE_URL}/regions/${r.slug}/): ${r.destinations.map((d) => regionEn(d.cc)).join(', ')}.`).join('\n')}

## Buyer information
- [Request a quote](${SITE_URL}/#rfq): multi-step RFQ form, WhatsApp or email (${CONTACT.email}).
- [FAQ and trade terms](${SITE_URL}/#rfq): MOQ, Incoterms, payment terms, certifications.
- [Quality and certifications](${SITE_URL}/#quality)
- [Cold-chain journey](${SITE_URL}/#coldchain)
- [Full facts for AI assistants](${SITE_URL}/llms-full.txt)

## Optional
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
}

export function llmsFullTxt() {
  const glossary = [
    ['HS code', 'Harmonized System customs classification of a product (e.g. 0306.17 = frozen shrimps and prawns).'],
    ['Incoterms 2020', 'ICC trade terms that allocate cost and risk between seller and buyer, e.g. FOB, CFR, CIF.'],
    ['MOQ', 'Minimum order quantity.'],
    ['IQF', 'Individually quick frozen — pieces frozen separately so they do not clump.'],
    ['Block frozen', 'Product frozen in a solid block, usually with a water glaze.'],
    ['HOSO / HLSO / PD / PUD / PTO', 'Shrimp forms: head-on shell-on / headless shell-on / peeled & deveined / peeled undeveined / peeled tail-on.'],
    ['Glaze', 'Protective ice coating applied to frozen seafood, stated as a percentage of gross weight.'],
    ['Reefer', 'Refrigerated shipping container.'],
    ['HoReCa', 'Hotel, restaurant and catering channel.'],
    ['HACCP', 'Hazard Analysis and Critical Control Points food-safety system.'],
    ['IUU', 'Illegal, unreported and unregulated fishing; wild catch must be accompanied by catch certificates for the EU.'],
  ];
  return `# Proj-C — full facts for AI assistants
Source of truth: ${SITE_URL}/ . Last generated: ${new Date().toISOString().slice(0, 10)}. Specifications and HS codes are indicative (HS 2022) and are confirmed in each quotation.

## About
${[1, 2, 3, 4, 5, 6, 7].map((n) => T(`facts.${n}`)).join('\n')}

Export hub: ${HQ.city} (${HQ.country}). Contact: ${CONTACT.email}, WhatsApp ${CONTACT.whatsappDisplay}.
Languages: ${LANGS.map((l) => `${l.label} (${l.hreflang})`).join(', ')}.

## Trade terms
- Full container: 1 × 20′ reefer (≈ ${MOQ.container20MT} MT) or 40′ reefer (≈ ${MOQ.container40MT} MT).
- Consolidated / LCL programmes from ${MOQ.lclMT} MT per order.
- Incoterms 2020: ${INCOTERMS.join(', ')}.
- Payment: T/T or irrevocable L/C at sight.
- Quotation currencies: ${CURRENCIES.join(', ')}.

## Products
${PRODUCTS.map((p) => `### ${T(`p.${p.id}.name`)}  (${SITE_URL}/products/${p.id}/)
${T(`p.${p.id}.desc`)}
- Species: ${p.species}
- HS codes: ${p.hs.join(', ')}
- Forms: ${p.forms.join(', ')}
- Sizes (${p.sizeUnit}): ${p.sizes.join(', ')}
- Grading: ${p.grades.join(', ')}
- Packaging: ${p.packs.join('; ')}
- Storage: ${p.temp}; shelf life ${p.shelf} months; ice glaze ${p.glaze}`).join('\n\n')}

## Regions
${REGIONS.map((r) => `### ${T(`reg.${r.slug}`)}  (${SITE_URL}/regions/${r.slug}/)
${T(`r.${r.slug}.blurb`)}
- Partner countries: ${r.destinations.map((d) => `${regionEn(d.cc)} (${d.port})`).join(', ')}
- Typical sea transit: ${r.transit} days; typical Incoterms: ${r.incoterms.join(', ')}
- Compliance: ${T(`r.${r.slug}.rules`)}`).join('\n\n')}

## Cold chain
${['catch', 'plant', 'store', 'reefer', 'port'].map((s, i) => `${i + 1}. ${T(`cc.${s}.t`)} — ${T(`cc.${s}.d`)}`).join('\n')}

## Quality & certifications
${['haccp', 'brc', 'eu', 'fda', 'msc'].map((c) => `- ${T(`cert.${c}.n`)}: ${T(`cert.${c}.d`)}`).join('\n')}
${T('q.note')}

## Frequently asked questions
${[1, 2, 3, 4, 5, 6].map((n) => `Q: ${T(`faq.q${n}`)}\nA: ${T(`faq.a${n}`)}`).join('\n\n')}

## Glossary
${glossary.map(([k, v]) => `- ${k}: ${v}`).join('\n')}
`;
}

export function robotsTxt() {
  const ai = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'Bytespider'];
  return `# Proj-C welcomes search engines and AI assistants. Summary for LLMs: ${SITE_URL}/llms.txt
User-agent: *
Allow: /

${ai.map((a) => `User-agent: ${a}\nAllow: /\n`).join('\n')}
Sitemap: ${SITE_URL}/sitemap.xml
`;
}
