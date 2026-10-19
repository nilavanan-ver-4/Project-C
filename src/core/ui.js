import { state } from './state.js';
import { audio } from './audio.js';
import { t, onLang, setLang, getLang, langCodes } from '../i18n/index.js';
import { REGIONS, ALL_DESTINATIONS } from '../data/regions.js';
import { PRODUCTS } from '../data/products.js';
import { CERTS } from '../data/story.js';
import gsap from 'gsap';

const $ = (s, r = document) => r.querySelector(s);

export function initUI() {
  const header = $('#siteHeader');
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  const onScroll = () => header.classList.toggle('scrolled', (state.lenis ? state.lenis.scroll : scrollY) > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-arrow' : '#i-menu');
    if (state.lenis) open ? state.lenis.stop() : state.lenis.start();
    document.body.style.overflow = open && !state.lenis ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && nav.classList.contains('open') && (setMenu(false), menuBtn.focus()));

  // language
  const sel = $('#langSelect');
  sel.value = getLang();
  sel.addEventListener('change', () => setLang(sel.value));
  onLang((c) => (sel.value = c));

  // sound
  const sb = $('#soundBtn');
  const paintSound = () => { const on = audio.on; sb.setAttribute('aria-pressed', on); const l = t(on ? 'ui.soundOn' : 'ui.soundOff'); sb.setAttribute('aria-label', l); sb.title = l; };
  sb.addEventListener('click', () => audio.toggle());
  audio.onChange(paintSound); onLang(paintSound); paintSound();
  audio.resumeOnGesture();

  // motion
  const mb = $('#motionBtn');
  const paintMotion = () => { mb.setAttribute('aria-pressed', state.paused); const l = t(state.paused ? 'ui.motionPlay' : 'ui.motionPause'); mb.setAttribute('aria-label', l); mb.title = l; document.documentElement.classList.toggle('motion-off', state.paused); };
  mb.addEventListener('click', () => { state.paused = !state.paused; try { localStorage.setItem('pc-paused', state.paused ? '1' : '0'); } catch {} paintMotion(); });
  try { if (localStorage.getItem('pc-paused') === '1') state.paused = true; } catch {}
  onLang(paintMotion); paintMotion();
  if (state.reduced) mb.hidden = true;

  // depth gauge
  const gauge = $('#depthGauge'), fill = $('#dgFill'), val = $('#dgValue');
  const upd = () => { const p = state.progress; val.textContent = Math.round(p * 3800).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en'); fill.style.transform = `scaleY(${p})`; gauge.classList.toggle('on', (state.lenis ? state.lenis.scroll : scrollY) > 80); };
  gsap.ticker.add(upd);

  // dynamic stats from the data layer
  const set = { regions: REGIONS.length, countries: ALL_DESTINATIONS.length, products: PRODUCTS.length, certs: CERTS.length };
  document.querySelectorAll('[data-stat]').forEach((el) => (el.dataset.count = set[el.dataset.stat]));

  // active nav link
  const links = new Map([...document.querySelectorAll('.nav a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const a = links.get(e.target.id); if (a && e.isIntersecting) { links.forEach((l) => l.classList.remove('active')); a.classList.add('active'); } });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
}
