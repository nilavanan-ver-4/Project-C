// Procedural ambient ocean soundscape (Web Audio) — no audio files to download.
// Layers: filtered brown-noise swell, airy shimmer, deep drone, occasional bubbles. Depth darkens the tone.
let ctx, master, swellFilter, running = false, bubbleTimer, depth = 0;
const listeners = new Set();

function noiseBuffer(seconds, type) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w * 0.5;
    }
  }
  return buf;
}

function lfo(freq, depthAmt, target) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  g.gain.value = depthAmt;
  o.connect(g).connect(target);
  o.start();
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // swell
  const swell = ctx.createBufferSource();
  swell.buffer = noiseBuffer(6, 'brown');
  swell.loop = true;
  swellFilter = ctx.createBiquadFilter();
  swellFilter.type = 'lowpass';
  swellFilter.frequency.value = 520;
  swellFilter.Q.value = 0.6;
  const swellGain = ctx.createGain();
  swellGain.gain.value = 0.55;
  swell.connect(swellFilter).connect(swellGain).connect(master);
  swell.start();
  lfo(0.07, 280, swellFilter.frequency);
  lfo(0.11, 0.25, swellGain.gain);

  // shimmer
  const sh = ctx.createBufferSource();
  sh.buffer = noiseBuffer(4, 'white');
  sh.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = 2400;
  hp.Q.value = 0.9;
  const shGain = ctx.createGain();
  shGain.gain.value = 0.018;
  sh.connect(hp).connect(shGain).connect(master);
  sh.start();
  lfo(0.13, 0.012, shGain.gain);

  // drone
  [55, 55.35, 82.4].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = i === 2 ? 0.012 : 0.03;
    o.connect(g).connect(master);
    o.start();
    lfo(0.05 + i * 0.02, 0.012, g.gain);
  });
}

function bubble() {
  if (!running) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f0 = 320 + Math.random() * 380;
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * (1.8 + Math.random()), t + 0.11);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.2);
  bubbleTimer = setTimeout(bubble, 1800 + Math.random() * 6500);
}

function emit() { listeners.forEach((fn) => fn(running)); }

export const audio = {
  get on() { return running; },
  onChange(fn) { listeners.add(fn); },
  async start() {
    if (!ctx) build();
    await ctx.resume();
    running = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(bubble, 1200);
    try { localStorage.setItem('pc-sound', '1'); } catch {}
    emit();
  },
  stop() {
    if (!ctx) return;
    running = false;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    clearTimeout(bubbleTimer);
    setTimeout(() => !running && ctx.suspend(), 900);
    try { localStorage.setItem('pc-sound', '0'); } catch {}
    emit();
  },
  toggle() { return running ? this.stop() : this.start(); },
  setDepth(d) {
    depth = d;
    if (swellFilter && running) swellFilter.frequency.setTargetAtTime(520 - d * 320, ctx.currentTime, 0.6);
  },
  /** The browser blocks audio until a gesture — if the visitor left sound on last time, resume on first interaction. */
  resumeOnGesture() {
    let want = false;
    try { want = localStorage.getItem('pc-sound') === '1'; } catch {}
    if (!want) return;
    const go = () => { removeEventListener('pointerdown', go); removeEventListener('keydown', go); this.start(); };
    addEventListener('pointerdown', go, { once: true });
    addEventListener('keydown', go, { once: true });
  },
};
