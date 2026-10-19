import en from './en.js';
import { DEFAULT_LANG, translate, regionName, parseAttrSpec, pageMeta } from './shared.js';
import { LANGS } from '../config.js';

const loaders = {
  ar: () => import('./ar.js'),
  zh: () => import('./zh.js'),
  ja: () => import('./ja.js'),
  es: () => import('./es.js'),
};
const cache = { en };
const listeners = new Set();
let current = DEFAULT_LANG;

export const langCodes = LANGS.map((l) => l.code);
export const getLang = () => current;
export const getDir = () => LANGS.find((l) => l.code === current)?.dir || 'ltr';
export const isRTL = () => getDir() === 'rtl';

export function t(key, vars) {
  return translate(cache[current] || en, en, key, vars);
}
export const country = (cc) => regionName(current, cc);
export const onLang = (fn) => (listeners.add(fn), () => listeners.delete(fn));

const LANG_PREFIX = /^\/(es|ar|zh|ja)(?=\/|$)/;
export const stripLangPath = (p) => p.replace(LANG_PREFIX, '') || '/';
export function langPath(code, path = location.pathname) {
  const bare = stripLangPath(path);
  return code === DEFAULT_LANG ? bare : `/${code}${bare === '/' ? '/' : bare}`;
}

export function detectLang() {
  const m = location.pathname.match(LANG_PREFIX);
  if (m) return m[1];
  const q = new URLSearchParams(location.search).get('lang');
  if (q && langCodes.includes(q)) return q;
  try {
    const stored = localStorage.getItem('pc-lang');
    if (stored && langCodes.includes(stored)) return stored;
  } catch {}
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return langCodes.includes(nav) && !document.documentElement.dataset.langLocked ? nav : DEFAULT_LANG;
}

async function ensure(code) {
  if (!cache[code] && loaders[code]) cache[code] = (await loaders[code]()).default;
  if (code === 'ar') import('../styles/fonts-ar.js');
}

export function applyDom(root = document) {
  const lang = current;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    let vars;
    if (el.dataset.i18nVars) {
      try { vars = JSON.parse(el.dataset.i18nVars); } catch {}
    }
    el.textContent = t(el.dataset.i18n, vars);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const [attr, key] of parseAttrSpec(el.dataset.i18nAttr)) {
      let vars;
      if (el.dataset.i18nVars) {
        try { vars = JSON.parse(el.dataset.i18nVars); } catch {}
      }
      el.setAttribute(attr, t(key, vars));
    }
  });
  root.querySelectorAll('[data-country]').forEach((el) => {
    el.textContent = regionName(lang, el.dataset.country);
  });
  // keep internal links inside the current language (/es/…)
  root.querySelectorAll('a[href^="/"]:not([href^="//"])').forEach((a) => {
    const u = new URL(a.getAttribute('href'), location.origin);
    a.setAttribute('href', langPath(lang, u.pathname) + u.search + u.hash);
  });
}

function applyHead() {
  const meta = LANGS.find((l) => l.code === current);
  const html = document.documentElement;
  html.lang = meta.hreflang === 'zh-Hans' ? 'zh-Hans' : meta.code;
  html.dir = meta.dir;
  const { title, desc } = pageMeta(cache[current] || en, en, html.dataset.region);
  document.title = title;
  const set = (sel, v) => document.querySelector(sel)?.setAttribute('content', v);
  set('meta[name="description"]', desc);
  set('meta[property="og:title"]', title);
  set('meta[property="og:description"]', desc);
  set('meta[name="twitter:title"]', title);
  set('meta[name="twitter:description"]', desc);
}

export async function setLang(code, { push = true } = {}) {
  if (!langCodes.includes(code)) code = DEFAULT_LANG;
  await ensure(code);
  current = code;
  applyHead();
  applyDom();
  try { localStorage.setItem('pc-lang', code); } catch {}
  if (push && !import.meta.env?.DEV) {
    const next = langPath(code) + location.search + location.hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, '', next);
  }
  listeners.forEach((fn) => fn(code));
}

export async function initI18n() {
  const code = detectLang();
  current = code;
  await ensure(code);
  applyHead();
  applyDom();
  return code;
}
