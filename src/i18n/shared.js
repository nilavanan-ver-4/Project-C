import { MOQ, HQ } from '../config.js';

export const DEFAULT_LANG = 'en';

export function globalVars() {
  return {
    year: new Date().getFullYear(),
    lcl: MOQ.lclMT,
    c20: MOQ.container20MT,
    c40: MOQ.container40MT,
    hub: HQ.city,
  };
}

export function interpolate(str, vars) {
  const all = { ...globalVars(), ...(vars || {}) };
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in all ? all[k] : m));
}

export function translate(dict, fallback, key, vars) {
  const s = dict[key] ?? fallback[key] ?? key;
  return interpolate(s, vars);
}

export function regionName(lang, cc) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(cc) || cc;
  } catch {
    return cc;
  }
}

// Parses "attr:key;attr2:key2" into [[attr,key],...]
export function parseAttrSpec(spec) {
  return spec
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf(':');
      return [p.slice(0, i), p.slice(i + 1)];
    });
}

/** Title + description for the home page or (when `region` is set) a region page. */
export function pageMeta(dict, fallback, region) {
  const tr = (k, v) => translate(dict, fallback, k, v);
  if (!region) return { title: tr('meta.title'), desc: tr('meta.desc') };
  return {
    title: `${tr(`reg.${region}`)} — ${tr('hero.eyebrow')} | Proj-C`,
    desc: tr(`r.${region}.blurb`),
  };
}
