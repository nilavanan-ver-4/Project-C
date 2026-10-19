import { REGIONS, regionBySlug, ALL_DESTINATIONS } from '../data/regions.js';
import { HQ } from '../config.js';
import { t, onLang, country, langPath, getLang } from '../i18n/index.js';

const $ = (s, r = document) => r.querySelector(s);
let region = 'all';
let dest = null;
let globe = null;

export const reach = {
  attachGlobe(g) { globe = g; g.setRegion(region, { instant: true }); },
  get region() { return region; },
};

function renderDetail() {
  const el = $('#regionDetail');
  if (region === 'all') {
    el.innerHTML = `
      <h3>${t('gr.hub')}: ${HQ.city}</h3>
      <p>${t('gr.lead')}</p>
      <dl>
        <dt>${t('gr.dest')}</dt><dd>${ALL_DESTINATIONS.length}</dd>
        <dt>${t('stat.regions')}</dt><dd>${REGIONS.map((r) => t(`reg.${r.slug}`)).join(' · ')}</dd>
      </dl>`;
    return;
  }
  const r = regionBySlug[region];
  el.innerHTML = `
    <h3>${t(`reg.${r.slug}`)}</h3>
    <p>${t(`r.${r.slug}.blurb`)}</p>
    <dl>
      <dt>${t('gr.transit')}</dt><dd dir="ltr">${r.transit} ${t('gr.days')}</dd>
      <dt>${t('gr.incoterms')}</dt><dd dir="ltr">${r.incoterms.join(' · ')}</dd>
      <dt>${t('gr.ports')}</dt><dd>${r.ports.join(', ')}</dd>
    </dl>
    <a class="btn btn-ghost go" href="${langPath(getLang(), `/regions/${r.slug}/`)}" data-magnetic><span>${t('gr.page')}</span></a>`;
}

function renderList() {
  const ul = $('#destList');
  ul.innerHTML = ALL_DESTINATIONS.map((d) => `
    <li><button type="button" data-cc="${d.cc}" data-region="${d.region}" aria-pressed="${dest === d.cc}" ${region !== 'all' && d.region !== region ? 'hidden' : ''}>
      <span>${country(d.cc)}</span><small>${d.port}</small></button></li>`).join('');
}

function setRegion(slug, { fromGlobe = false } = {}) {
  region = slug;
  dest = null;
  document.querySelectorAll('#regionChips button').forEach((b) => b.setAttribute('aria-checked', b.dataset.region === slug));
  renderDetail();
  renderList();
  if (!fromGlobe) globe?.setRegion(slug);
}

export function initReach() {
  $('#regionChips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-region]');
    if (b) setRegion(b.dataset.region);
  });
  $('#regionChips').addEventListener('keydown', (e) => {
    const btns = [...document.querySelectorAll('#regionChips button')];
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const n = btns[(i + (document.dir === 'rtl' ? -step : step) + btns.length) % btns.length];
    n.focus(); n.click();
  });
  $('#destList').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cc]');
    if (!b) return;
    dest = b.dataset.cc;
    $('#destList').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    globe?.focusDest(dest);
  });
  onLang(() => { renderDetail(); renderList(); globe?.refreshLabels(); });
  setRegion('all');
}
