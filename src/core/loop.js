import gsap from 'gsap';
import { state } from './state.js';

// One shared RAF (GSAP ticker) drives every WebGL view. Views only render while on screen.
const views = new Set();
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target.__view;
        if (v) { v.visible = e.isIntersecting; v.onVisible?.(e.isIntersecting); }
      }
    }, { rootMargin: '15% 0px' })
  : null;

export function registerView(el, render, opts = {}) {
  const view = { el, render, visible: !io || !!opts.always, always: !!opts.always, onVisible: opts.onVisible };
  el.__view = view;
  if (io && !opts.always) io.observe(el);
  views.add(view);
  return view;
}
export function unregisterView(view) { io?.unobserve(view.el); views.delete(view); }

gsap.ticker.add((_, deltaMs) => {
  if (document.hidden) return;
  const dt = Math.min(deltaMs / 1000, 0.05);
  if (!state.paused && !state.reduced) state.time += dt;
  // smooth pointer
  state.mouse.tx += (state.mouse.x - state.mouse.tx) * Math.min(1, dt * 4);
  state.mouse.ty += (state.mouse.y - state.mouse.ty) * Math.min(1, dt * 4);
  for (const v of views) if (v.visible || v.always) v.render(state.time, dt);
});
