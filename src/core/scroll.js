import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { state } from './state.js';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

const headerOffset = () => -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76) + 1;

function updateProgress(y) {
  state.scroll = y;
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  state.progress = Math.min(1, Math.max(0, y / max));
}

export function scrollToTarget(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (state.lenis) state.lenis.scrollTo(el, { offset: opts.offset ?? headerOffset(), duration: state.reduced ? 0 : 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: state.reduced ? 'auto' : 'smooth', block: 'start' });
}

export function initScroll() {
  if (!state.reduced) {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.2, smoothWheel: true });
    state.lenis = lenis;
    lenis.on('scroll', (e) => { updateProgress(e.scroll); ScrollTrigger.update(); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    updateProgress(lenis.scroll || 0);
  } else {
    addEventListener('scroll', () => updateProgress(scrollY), { passive: true });
    updateProgress(scrollY);
  }
  addEventListener('resize', () => { state.vh = innerHeight; updateProgress(state.lenis ? state.lenis.scroll : scrollY); });

  // In-page anchors → smooth scroll + move focus for keyboard / screen-reader users.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(a.getAttribute('href') === '#top' ? document.documentElement : target, a.getAttribute('href') === '#top' ? { offset: 0 } : {});
    history.replaceState(null, '', a.getAttribute('href'));
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  return state.lenis;
}
