import { gsap, ScrollTrigger } from './scroll.js';
import { state } from './state.js';

/** Pins the cold-chain stage for the scroll-driven journey. Created at boot (no WebGL needed) so the page height is final from the start. */
export function initColdPin() {
  const pin = document.getElementById('coldPin');
  if (!pin || state.tier === 'static' || state.reduced) return;
  const len = () => innerHeight * (state.tier === 'full' ? 3.2 : 2.4);
  const cold = (state.cold = { progress: 0, st: null });
  cold.st = ScrollTrigger.create({ trigger: pin, start: 'top top', end: () => `+=${len()}`, pin: true, anticipatePin: 1, scrub: true, invalidateOnRefresh: true, onUpdate: (self) => (cold.progress = self.progress) });
}

export function killColdPin() {
  state.cold?.st?.kill(true);
  state.cold = null;
}
