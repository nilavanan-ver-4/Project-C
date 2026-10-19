import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { state } from './state.js';

const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* Cursor ring + hover growth */
export function initCursor() {
  const el = document.getElementById('cursor');
  if (!el || !fine) return;
  const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
  const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
  gsap.set(el, { x: -100, y: -100 });
  addEventListener('pointermove', (e) => { el.classList.add('on'); x(e.clientX); y(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    el.classList.toggle('hot', !!e.target.closest('a, button, summary, label, select, input, textarea, [data-cursor], canvas'));
  });
  document.addEventListener('pointerdown', () => el.classList.add('down'));
  document.addEventListener('pointerup', () => el.classList.remove('down'));
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('on'));
}

/* Glass glow follows cursor; [data-tilt] cards lean toward it */
export function initTilt() {
  if (!fine) return;
  let last = null;
  const reset = (el) => el && (el.style.removeProperty('--rx'), el.style.removeProperty('--ry'));
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('.glass, [data-tilt]');
    if (last && last !== el) reset(last);
    last = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    if (el.hasAttribute('data-tilt') && !state.reduced && !state.paused) {
      const rtl = document.dir === 'rtl' ? -1 : 1;
      el.style.setProperty('--ry', `${(px - 0.5) * 7 * rtl}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * 5}deg`);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => reset(last), true);
}

/* Magnetic buttons */
export function initMagnetic(root = document) {
  if (!fine || state.reduced) return;
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (el.__mag) return;
    el.__mag = true;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.22, y: (e.clientY - (r.top + r.height / 2)) * 0.32, duration: 0.45, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' }));
  });
}

/* Click ripple on buttons + tiny bubble burst anywhere */
export function initClickFx() {
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .icon-btn');
    if (b && !state.reduced) {
      const r = b.getBoundingClientRect();
      const s = document.createElement('span');
      const size = Math.max(r.width, r.height);
      s.className = 'ripple';
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
    if (state.reduced || state.paused || e.target.closest('input, textarea, select')) return;
    for (let i = 0; i < 4; i++) {
      const bub = document.createElement('i');
      bub.className = 'bubble';
      const sz = 5 + Math.random() * 9;
      bub.style.cssText = `left:${e.clientX + (Math.random() - 0.5) * 24}px;top:${e.clientY}px;width:${sz}px;height:${sz}px;--bx:${(Math.random() - 0.5) * 50}px;animation-delay:${i * 70}ms`;
      document.body.appendChild(bub);
      setTimeout(() => bub.remove(), 1500);
    }
  });
}

/* Scroll reveal for [data-reveal] */
export function initReveal(root = document) {
  const els = [...root.querySelectorAll('[data-reveal]:not(.revealed)')];
  if (state.reduced) { els.forEach((e) => e.classList.add('revealed')); return; }
  els.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.fromTo(el, { opacity: 0, y: 36 }, {
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          onComplete: () => { gsap.set(el, { clearProps: 'opacity,transform' }); el.classList.add('revealed'); },
        });
      },
    });
  });
}

/* Count-up numbers */
export function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (state.reduced) { el.textContent = end; return; }
    const o = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });
}

/* Animated seals */
export function initSeals() {
  document.querySelectorAll('.seal').forEach((s) => {
    s.querySelectorAll('.seal-stars circle').forEach((c, i) => c.style.setProperty('--i', i));
    ScrollTrigger.create({ trigger: s, start: 'top 85%', once: true, onEnter: () => s.classList.add('in') });
  });
}
