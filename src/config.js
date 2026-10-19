// Central, editable business configuration. Also imported by the Node build scripts.
const env =
  (typeof import.meta !== 'undefined' && import.meta.env) ||
  (typeof process !== 'undefined' ? process.env : {});

export const SITE_URL = (env.VITE_SITE_URL || 'https://proj-c.example').replace(/\/$/, '');

export const CONTACT = {
  email: 'sales@proj-c.example',
  // digits only, international format, for wa.me links — PLACEHOLDER, replace before launch
  whatsapp: '15555550100',
  whatsappDisplay: '+1 555 555 0100',
  rfqEndpoint: env.VITE_RFQ_ENDPOINT || '',
};

// Export hub the globe routes originate from.
export const HQ = { city: 'Kochi', country: 'IN', lat: 9.9312, lon: 76.2673 };

// Minimum order quantities (metric tons). Edit to match commercial policy.
export const MOQ = { lclMT: 2, container20MT: 12, container40MT: 24 };

// Indicative FX (units per 1 USD). Used only to give buyers a rough USD equivalent in the RFQ form.
export const FX_AS_OF = '2026-01';
export const FX = {
  USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.6725, SAR: 3.75, QAR: 3.64, KWD: 0.307,
  JPY: 150, CNY: 7.2, KRW: 1350, HKD: 7.8, CAD: 1.36,
};

export const LANGS = [
  { code: 'en', label: 'English', dir: 'ltr', hreflang: 'en', locale: 'en_US' },
  { code: 'ar', label: 'العربية', dir: 'rtl', hreflang: 'ar', locale: 'ar_AE' },
  { code: 'zh', label: '中文', dir: 'ltr', hreflang: 'zh-Hans', locale: 'zh_CN' },
  { code: 'ja', label: '日本語', dir: 'ltr', hreflang: 'ja', locale: 'ja_JP' },
  { code: 'es', label: 'Español', dir: 'ltr', hreflang: 'es', locale: 'es_ES' },
];
