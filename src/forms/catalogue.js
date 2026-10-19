import { PRODUCTS, productById } from '../data/products.js';
import { t, onLang } from '../i18n/index.js';
import { scrollToTarget } from '../core/scroll.js';
import gsap from 'gsap';

const $ = (s, r = document) => r.querySelector(s);
let current = 'shrimp';
let viewer = null; // set by the lazy 3D module
const subs = new Set();

export const catalogue = {
  get current() { return current; },
  attachViewer(v) { viewer = v; viewer.setProduct(current, { instant: true }); },
  onSelect(fn) { subs.add(fn); },
};

const chips = (arr, cls = '') => arr.map((x) => `<span class="chip ${cls}">${x}</span>`).join('');

function renderSpec() {
  const p = productById[current];
  const panel = $('#specPanel');
  const id = p.id;
  panel.setAttribute('aria-labelledby', `tab-${id}`);
  panel.innerHTML = `
    <div>
      <h3>${t(`p.${id}.name`)}</h3>
      <p class="tag">${t(`p.${id}.tag`)}</p>
    </div>
    <p class="desc">${t(`p.${id}.desc`)}</p>
    <dl>
      <div><dt>${t('spec.species')}</dt><dd><span class="chip species">${p.species}</span></dd></div>
      <div><dt>${t('spec.hs')}</dt><dd>${p.hs.map((c) => `<button type="button" class="chip hs" data-hs="${c}" title="${t('spec.copy')}" aria-label="${t('spec.copy')}: ${c}">${c}</button>`).join('')}</dd></div>
      <div><dt>${t('spec.forms')}</dt><dd>${chips(p.forms)}</dd></div>
      <div><dt>${t('spec.sizes')} · ${p.sizeUnit}</dt><dd dir="ltr">${chips(p.sizes)}</dd></div>
      <div><dt>${t('spec.grades')}</dt><dd>${chips(p.grades)}</dd></div>
      <div><dt>${t('spec.packs')}</dt><dd>${chips(p.packs)}</dd></div>
      <div><dt>${t('spec.temp')} · ${t('spec.shelf')} · ${t('spec.glaze')}</dt><dd dir="ltr">${chips([p.temp, `${p.shelf} ${t('spec.months')}`, p.glaze])}</dd></div>
    </dl>
    <button type="button" class="btn btn-gold add" data-magnetic><span>${t('cat.addQuote')}</span></button>`;
  const fallbackUse = $('#viewerFallback use');
  if (fallbackUse) fallbackUse.setAttribute('href', `#i-${id}`);
  $('#viewerCanvas')?.setAttribute('aria-label', t('cat.viewer', { name: t(`p.${id}.name`) }));
}

function select(id, { focus = false, animate = true } = {}) {
  if (!productById[id]) return;
  current = id;
  document.querySelectorAll('#productTabs [role=tab]').forEach((b) => {
    const on = b.dataset.id === id;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  renderSpec();
  if (animate) gsap.fromTo('#specPanel > *', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'opacity,transform' });
  viewer?.setProduct(id);
  subs.forEach((fn) => fn(id));
}

export function initCatalogue() {
  const tabs = $('#productTabs');
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) select(b.dataset.id); });
  tabs.addEventListener('keydown', (e) => {
    const ids = PRODUCTS.map((p) => p.id);
    const i = ids.indexOf(current);
    let n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + (document.dir === 'rtl' ? -1 : 1) + ids.length) % ids.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i + (document.dir === 'rtl' ? 1 : -1) + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    if (n !== null) { e.preventDefault(); select(ids[n], { focus: true }); }
  });

  const panel = $('#specPanel');
  panel.addEventListener('click', (e) => {
    const hs = e.target.closest('[data-hs]');
    if (hs) {
      navigator.clipboard?.writeText(hs.dataset.hs).catch(() => {});
      const old = hs.textContent;
      hs.textContent = `✓ ${t('spec.copied')}`;
      setTimeout(() => (hs.textContent = old), 1200);
    }
    if (e.target.closest('.add')) {
      document.dispatchEvent(new CustomEvent('rfq:add', { detail: { id: current } }));
      scrollToTarget('#rfq');
    }
  });

  // "Explore the range" links in the dive section preselect a product
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-product]');
    if (a) select(a.dataset.product, { animate: false });
  });

  onLang(() => renderSpec());
  select('shrimp', { animate: false });
}
