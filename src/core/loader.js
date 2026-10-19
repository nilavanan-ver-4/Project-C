// Premium loader: a wave rises through the Proj-C wordmark as real boot tasks complete.
const W = 420;
const wavePath = (level, amp, phase, freq) => {
  const top = 142 - level * 128; // 142 = below descender, 14 = above cap height
  let d = `M0 ${top.toFixed(1)}`;
  for (let x = 0; x <= W; x += 6) d += ` L${x} ${(top + Math.sin(x * freq + phase) * amp).toFixed(1)}`;
  return d + ` L${W} 170 L0 170 Z`;
};

export function createLoader({ reduced = false, quick = false } = {}) {
  const el = document.getElementById('loader');
  const front = document.getElementById('waveFront');
  const back = document.getElementById('waveBack');
  const bar = document.getElementById('loaderBar');
  const minMs = reduced ? 200 : quick ? 900 : 2100;
  const t0 = performance.now();
  let target = 0, shown = 0, raf, done = false, settle = 0;

  const frame = (now) => {
    const t = (now - t0) / 1000;
    shown += (target - shown) * 0.07;
    const timeCap = Math.min(1, (now - t0) / minMs); // never faster than the min display time
    const lvl = Math.min(shown, timeCap);
    const amp = (1 - settle) * (8 * (1 - lvl * 0.6) + 1.5);
    front.setAttribute('d', wavePath(Math.min(1.08, lvl * 1.06), amp, t * 3.2, 0.036));
    back.setAttribute('d', wavePath(Math.min(1.1, lvl * 1.06 + 0.03), amp * 1.3, -t * 2.1 + 1.4, 0.027));
    bar.style.transform = `scaleX(${lvl})`;
    if (!done) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    set(p) { target = Math.max(target, Math.min(1, p)); },
    async finish() {
      target = 1;
      const wait = Math.max(0, minMs - (performance.now() - t0)) + 350;
      await new Promise((r) => setTimeout(r, wait));
      el.classList.add('fin');
      await new Promise((r) => setTimeout(r, 450));
      settle = 1;
      el.classList.add('done');
      await new Promise((r) => setTimeout(r, 700));
      done = true;
      cancelAnimationFrame(raf);
      el.setAttribute('aria-hidden', 'true');
      el.remove();
    },
  };
}
