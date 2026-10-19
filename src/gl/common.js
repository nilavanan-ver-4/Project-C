import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { state } from '../core/state.js';

export { THREE };

export function createRenderer(canvas, { exposure = 1.05, antialias } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: antialias ?? state.tier === 'full',
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function makeEnv(renderer, blur = 0.04) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), blur).texture;
  pmrem.dispose();
  return tex;
}

export const maxDpr = (cap = 2) => Math.min(window.devicePixelRatio || 1, state.tier === 'full' ? cap : Math.min(cap, 1.5));

/** Keep renderer + camera matched to the canvas' CSS box. Returns a disposer. */
export function autoResize(renderer, camera, canvas, { dprCap = 2, onResize, self = false } = {}) {
  const box = self ? canvas : canvas.parentElement || canvas;
  const apply = () => {
    const w = Math.max(2, box.clientWidth);
    const h = Math.max(2, box.clientHeight);
    renderer.setPixelRatio(maxDpr(dprCap));
    renderer.setSize(w, h, false);
    if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    onResize?.(w, h);
  };
  apply();
  const ro = new ResizeObserver(apply);
  ro.observe(box);
  return () => ro.disconnect();
}

export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function canvasTexture(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (repeat) t.repeat.set(...repeat);
  return t;
}

/** Soft radial sprite texture, used for particles & glows. */
let _dot;
export function dotTexture() {
  if (_dot) return _dot;
  _dot = canvasTexture(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  return _dot;
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
      for (const k in mm) if (mm[k]?.isTexture) mm[k].dispose();
      mm.dispose();
    });
  });
}
