// Shared mutable runtime state (a tiny store; no framework needed).
export const state = {
  tier: 'full', // 'full' | 'lite' | 'static'
  paused: false, // user pressed "pause animations"
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  lenis: null,
  scroll: 0,
  progress: 0, // 0..1 of whole page
  vh: innerHeight,
  mouse: { x: 0, y: 0, tx: 0, ty: 0 }, // normalised -1..1 (tx/ty = smoothed)
  time: 0, // animation clock; frozen while paused
  cold: null, // pinned cold-chain journey ({ st, progress })
};

export const motionOK = () => !state.paused && !state.reduced;

addEventListener('pointermove', (e) => {
  state.mouse.x = (e.clientX / innerWidth) * 2 - 1;
  state.mouse.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });
