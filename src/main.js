import './styles/main.css';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource-variable/outfit';

import { state } from './core/state.js';
import { detectTier } from './core/tier.js';
import { createLoader } from './core/loader.js';
import { initScroll, ScrollTrigger, gsap, scrollToTarget } from './core/scroll.js';
import { initCursor, initTilt, initMagnetic, initClickFx, initReveal, initCounters, initSeals } from './core/fx.js';
import { initUI } from './core/ui.js';
import { initColdPin, killColdPin } from './core/coldpin.js';
import { initI18n } from './i18n/index.js';
import { initCatalogue, catalogue } from './forms/catalogue.js';
import { initReach, reach } from './forms/reach.js';
import { initRfq } from './forms/rfq.js';

const $ = (s) => document.querySelector(s);
const html = document.documentElement;

async function boot() {
  state.tier = detectTier();
  html.classList.add(`tier-${state.tier}`);
  let seen = false;
  try { seen = sessionStorage.getItem('pc-seen') === '1'; sessionStorage.setItem('pc-seen', '1'); } catch {}
  const loader = createLoader({ reduced: state.reduced, quick: seen });

  await initI18n();
  initScroll();
  initUI();
  initCatalogue();
  initReach();
  initRfq();
  initCursor(); initTilt(); initClickFx(); initMagnetic();
  loader.set(0.25);

  // hero copy waits behind the loader
  const heroBits = gsap.utils.toArray('.hero-copy > *, .scroll-cue');
  if (!state.reduced) gsap.set(heroBits, { opacity: 0, y: 40 });

  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]);
  loader.set(0.4);

  let ocean = null;
  if (state.tier !== 'static') {
    try {
      const { initOcean } = await import('./gl/ocean.js');
      ocean = await initOcean($('#ocean'), { onProgress: (p) => loader.set(0.4 + 0.55 * p) });
    } catch (err) {
      console.warn('[boot] WebGL ocean failed — falling back to static mode', err);
      state.tier = 'static'; html.classList.remove('tier-full', 'tier-lite'); html.classList.add('tier-static');
    }
  }
  loader.set(1);
  await loader.finish();

  if (state.tier !== 'static') initColdPin();
  initReveal(); initCounters(); initSeals();
  if (!state.reduced) {
    gsap.to(heroBits, { opacity: 1, y: 0, duration: 1.5, stagger: 0.14, ease: 'power3.out', clearProps: 'opacity,transform' });
  }
  ScrollTrigger.refresh();
  ocean?.refresh();
  if (location.hash.length > 1) setTimeout(() => scrollToTarget(location.hash), 80);

  if (state.tier !== 'static') lazyScenes();
  addEventListener('load', () => ScrollTrigger.refresh());
}

function lazy(sel, margin, fn) {
  const el = $(sel);
  if (!el) return;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    fn().catch((err) => { console.warn(`[3d] ${sel} failed`, err); html.classList.add('no-webgl'); killColdPin(); ScrollTrigger.refresh(); });
  }, { rootMargin: `${margin}% 0px` });
  io.observe(el);
}

function lazyScenes() {
  lazy('#catalogue', 150, async () => {
    const { initViewer3D } = await import('./gl/viewer3d.js');
    catalogue.attachViewer(await initViewer3D());
    // the cold-chain scene is heavy; warm it as soon as the catalogue is on its way
    lazy('#coldchain', 260, async () => {
      const { initColdChain } = await import('./gl/coldchain.js');
      await initColdChain();
      ScrollTrigger.refresh();
    });
  });
  lazy('#reach', 160, async () => {
    const { initGlobe } = await import('./gl/globe3d.js');
    reach.attachGlobe(await initGlobe());
  });
  lazy('#facility', 160, async () => {
    const { initFacility } = await import('./gl/facility.js');
    await initFacility();
  });
}

boot().catch((err) => {
  console.error('[boot] fatal', err);
  html.classList.remove('js'); // make sure content is visible even if scripting broke
  document.getElementById('loader')?.remove();
});
