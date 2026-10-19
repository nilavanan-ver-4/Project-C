// Virtual facility tour: a six-station 3D walkthrough of the processing plant (illustrative; swap for 360° photography when available).
import { THREE, createRenderer, makeEnv, autoResize, damp, clamp, canvasTexture, dotTexture, disposeTree } from './common.js';
import { state } from '../core/state.js';
import { registerView } from '../core/loop.js';
import { FACILITY_STATIONS } from '../data/story.js';
import { t, onLang } from '../i18n/index.js';
import gsap from 'gsap';

const $ = (s) => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...o });
const glow = (color, i = 1.5) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: i });
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cyl = (r, h, mat, x = 0, y = 0, z = 0, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); return m; };
const steel = () => std(0xc9d2d9, { metalness: 0.85, roughness: 0.28 });
const MINUS = '−';

const ZS = [-3, -11, -19, -27, -35, -43];

function makeSign(text, color = '#4ee8d6', w = 256, h = 96) {
  const tex = canvasTexture(w, h, (c) => { c.fillStyle = '#04121b'; c.fillRect(0, 0, w, h); c.strokeStyle = color; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = color; c.font = '600 54px Outfit, Arial, sans-serif'; c.textAlign = 'center'; c.fillText(text, w / 2, h * 0.7); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w / h * 0.4, 0.4), new THREE.MeshBasicMaterial({ map: tex }));
}

export async function initFacility() {
  const canvas = $('#tourCanvas');
  const stage = canvas.parentElement;
  const full = state.tier === 'full';
  const renderer = createRenderer(canvas, { exposure: 0.82 });
  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer, 0.08);
  scene.environmentIntensity = 0.3;
  scene.fog = new THREE.FogExp2(0x0a1d33, 0.02);
  scene.background = new THREE.Color(0x06121f);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
  autoResize(renderer, camera, canvas, { dprCap: 1.75 });

  /* hall shell */
  const floorTex = canvasTexture(128, 128, (c, w, h) => { c.fillStyle = '#9fadb8'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); });
  floorTex.repeat.set(5, 30);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 60), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.2, metalness: 0.35, envMapIntensity: 1.2 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -24); scene.add(floor);
  [[-1.2, 0xe0be7a], [1.2, 0xe0be7a]].forEach(([x, c]) => scene.add(box(0.08, 0.005, 56, glow(c, 0.5), x * 1.5 + (x < 0 ? -1.6 : 1.6), 0.01, -24)));
  const wallMat = std(0xb9c6cf, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    scene.add(box(0.2, 4.4, 60, wallMat, 5 * s, 2.2, -24));
    scene.add(box(0.06, 0.12, 60, glow(0x4ee8d6, 0.8), 4.88 * s, 1.5, -24));
    scene.add(box(0.06, 0.5, 60, std(0x174a6e), 4.9 * s, 0.25, -24));
  }
  scene.add(box(10, 0.2, 60, std(0x9fb0bb), 0, 4.4, -24));
  scene.add(box(10, 4.4, 0.2, wallMat, 0, 2.2, -54));
  for (let z = 2; z > -54; z -= 4) scene.add(box(5.5, 0.06, 0.28, glow(0xeaf6ff, 1.6), 0, 4.26, z));
  // pipes along ceiling
  [-3.6, 3.6].forEach((x) => { const p = cyl(0.07, 58, steel(), x, 3.9, -24); p.rotation.x = Math.PI / 2; scene.add(p); });

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x10243a, 0.35));
  const lights = ZS.map((z) => { const l = new THREE.PointLight(0xdff4ff, full ? 22 : 16, 11, 1.7); l.position.set(0, 3.7, z); scene.add(l); return l; });

  const props = new THREE.Group(); scene.add(props);
  const anim = [];

  /* 0 — receiving */
  {
    const g = new THREE.Group(); g.position.z = ZS[0];
    g.add(box(2.6, 0.12, 1.8, steel(), 0, 0.06, 0));
    g.add(box(2.4, 0.04, 1.6, std(0x24323d), 0, 0.14, 0));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) g.add(box(0.7, 0.4, 0.55, std(0x7fc3df, { roughness: 0.4 }), -0.7 + i * 0.75, 0.36 + k * 0.42, -0.4 + j * 0.6));
    const scale = box(0.5, 1.0, 0.4, steel(), 1.9, 0.5, 0.6); g.add(scale);
    const disp = makeSign('248 kg', '#8dffa8'); disp.position.set(1.9, 1.05, 0.82); g.add(disp);
    g.add(box(1.2, 0.8, 0.8, std(0xe9eef0), -3.2, 0.4, -0.3));
    for (let i = 0; i < 8; i++) g.add(box(0.1, 0.1, 0.1, glow(0xbfefff, 1.0), -3.5 + (i % 4) * 0.24, 0.85, -0.5 + Math.floor(i / 4) * 0.2));
    props.add(g);
  }
  /* 1 — grading conveyor */
  const beltTex = canvasTexture(128, 32, (c, w, h) => { c.fillStyle = '#1a242c'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b3b46'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 8, h); });
  beltTex.repeat.set(10, 1);
  {
    const g = new THREE.Group(); g.position.z = ZS[1];
    const belt = box(0.9, 0.08, 6, new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.7 }), 0, 0.95, 0.0);
    g.add(belt, box(1.0, 0.1, 6.1, steel(), 0, 0.88, 0));
    [-2.6, -0.9, 0.9, 2.6].forEach((z) => [-1, 1].forEach((s) => g.add(box(0.07, 0.88, 0.07, steel(), 0.5 * s, 0.44, z))));
    const grader = box(1.4, 0.6, 1.0, steel(), 0, 1.55, -0.5); g.add(grader);
    g.add(box(1.3, 0.05, 0.9, glow(0x4ee8d6, 1.0), 0, 1.24, -0.5));
    [-1, 1].forEach((s) => { g.add(box(0.9, 0.06, 2.2, steel(), 1.8 * s, 0.95, 0.6)); g.add(box(0.06, 0.9, 0.06, steel(), 1.5 * s, 0.45, 1.5)); g.add(box(0.06, 0.9, 0.06, steel(), 2.1 * s, 0.45, -0.1)); });
    const N = 28;
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), std(0xf19a86, { roughness: 0.35, metalness: 0 }), N);
    g.add(inst); props.add(g);
    const d = new THREE.Object3D();
    anim.push((tm) => {
      beltTex.offset.x = (tm * 0.6) % 1;
      for (let i = 0; i < N; i++) {
        const k = (((i / N) + tm * 0.06) % 1); d.position.set(Math.sin(i * 7.1) * 0.22, 1.05, 3 - k * 6); d.scale.set(1, 0.7, 2.1 + (i % 3) * 0.2); d.rotation.y = i; d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });
  }
  /* 2 — processing & glazing */
  {
    const g = new THREE.Group(); g.position.z = ZS[2];
    [-2.4, -1.2, 0.0].forEach((x, i) => {
      g.add(cyl(0.52, 0.9, steel(), x, 0.45, 0.2));
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), std(0x2bbbc9, { emissive: 0x0a5a66, emissiveIntensity: 0.8, roughness: 0.1 })); w.rotation.x = -Math.PI / 2; w.position.set(x, 0.86, 0.2); g.add(w);
      anim.push((tm) => { w.position.y = 0.84 + Math.sin(tm * 1.5 + i) * 0.012; });
    });
    [1.6, 3.0].forEach((x) => { g.add(box(1.2, 0.08, 2.2, steel(), x, 0.92, 0)); [[-0.5, -1], [0.5, -1], [-0.5, 1], [0.5, 1]].forEach(([a, b]) => g.add(box(0.06, 0.9, 0.06, steel(), x + a, 0.45, b))); g.add(box(0.9, 0.03, 1.6, std(0xf1efe6), x, 0.98, 0)); });
    g.add(cyl(0.05, 2.4, steel(), -1.2, 3.0, 0.2)); g.add(box(0.5, 0.35, 0.2, glow(0x9fefff, 1), -1.2, 2.2, 0.2));
    props.add(g);
  }
  /* 3 — blast freezing tunnel */
  const fans = [];
  {
    const g = new THREE.Group(); g.position.z = ZS[3];
    g.add(box(4.2, 2.5, 2.4, std(0xdfe8ee, { roughness: 0.45 }), 0, 1.25, -0.2));
    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.38, roughness: 0.25, metalness: 0, clearcoat: 1 }));
    glass.position.set(0, 1.3, 1.03); g.add(glass);
    g.add(box(2.8, 0.1, 0.9, glow(0x58b8ff, 1.8), 0, 1.35, 0.7));
    g.add(box(2.8, 0.08, 0.6, std(0x24323d), 0, 0.82, 0.6));
    const sg = makeSign(`${MINUS}40 °C`, '#58b8ff'); sg.position.set(1.7, 2.2, 1.04); g.add(sg);
    for (let i = 0; i < 3; i++) { const f = new THREE.Group(); f.position.set(-1.4 + i * 1.4, 2.62, 0.2); f.add(cyl(0.38, 0.06, steel(), 0, 0, 0)); for (let b = 0; b < 4; b++) { const bl = box(0.34, 0.015, 0.09, std(0x6d7c88), 0, 0.045, 0); bl.position.x = Math.cos(b * Math.PI / 2) * 0.18; bl.position.z = Math.sin(b * Math.PI / 2) * 0.18; bl.rotation.y = -b * Math.PI / 2; f.add(bl); } fans.push(f); g.add(f); }
    const MC = full ? 50 : 20, mp = new Float32Array(MC * 3);
    const mist = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(mp, 3)), new THREE.PointsMaterial({ size: 0.7, map: dotTexture(), transparent: true, opacity: 0.28, depthWrite: false, color: 0xd9f3ff, blending: THREE.AdditiveBlending }));
    mist.frustumCulled = false; g.add(mist);
    const seeds = Array.from({ length: MC }, () => ({ x: (Math.random() - 0.5) * 3, p: Math.random(), z: Math.random() }));
    anim.push((tm) => { for (let i = 0; i < MC; i++) { const s = seeds[i], p = (s.p + tm * 0.12) % 1; mp[i * 3] = s.x; mp[i * 3 + 1] = 0.3 + p * 0.5; mp[i * 3 + 2] = 1.1 + p * 1.6 + s.z * 0.2; } mist.geometry.attributes.position.needsUpdate = true; });
    props.add(g);
  }
  /* 4 — packing */
  {
    const g = new THREE.Group(); g.position.z = ZS[4];
    g.add(box(3.2, 0.08, 1.1, steel(), 0, 0.95, 0.2));
    [[-1.5, -0.3], [1.5, -0.3], [-1.5, 0.7], [1.5, 0.7]].forEach(([x, z]) => g.add(box(0.07, 0.92, 0.07, steel(), x, 0.46, z)));
    for (let i = 0; i < 5; i++) g.add(box(0.5, 0.3, 0.38, std(0xefe4cf, { roughness: 0.8 }), -1.2 + i * 0.6, 1.14, 0.2));
    const arch = new THREE.Group();
    arch.add(box(0.12, 1.6, 0.12, steel(), -0.8, 0.8, 0), box(0.12, 1.6, 0.12, steel(), 0.8, 0.8, 0), box(1.72, 0.2, 0.2, steel(), 0, 1.7, 0), box(1.5, 0.05, 0.05, glow(0x8dffa8, 2.2), 0, 1.58, 0.11));
    arch.position.set(-2.6, 0, -1.6); g.add(arch);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) g.add(box(0.7, 0.28, 0.5, std(0xe9d9b5, { roughness: 0.8 }), 2.7, 0.24 + j * 0.29, -0.6 - k * 0.03 + k * 0.0 + (k - 1) * 0.0));
    g.add(box(0.6, 0.3, 0.45, std(0x24323d), 1.0, 1.2, 0.2));
    const sg = makeSign('LOT 24-117', '#e0be7a'); sg.scale.set(0.8, 0.8, 1); sg.position.set(1.0, 1.55, 0.2); g.add(sg);
    props.add(g);
  }
  /* 5 — cold store & loading */
  {
    const g = new THREE.Group(); g.position.z = ZS[5];
    for (const s of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        const z = -1.4 + r * 2.1;
        [[-0.1, 0], [0.1, 0]].forEach(() => 0);
        g.add(box(0.07, 3.4, 0.07, std(0xe0be7a, { metalness: 0.4 }), 3.2 * s, 1.7, z - 0.9), box(0.07, 3.4, 0.07, std(0xe0be7a, { metalness: 0.4 }), 3.2 * s, 1.7, z + 0.9));
        for (let lv = 0; lv < 3; lv++) {
          g.add(box(1.0, 0.06, 2.0, std(0x3b7ea6, { metalness: 0.3 }), 3.2 * s, 0.35 + lv * 1.05, z));
          g.add(box(0.85, 0.7, 1.6, std(lv % 2 ? 0xeee3cc : 0xe9d9b5, { roughness: 0.85 }), 3.2 * s, 0.75 + lv * 1.05, z));
        }
      }
    }
    // dock door + reefer
    g.add(box(4.6, 3.2, 0.3, std(0xcfd8de), 0, 1.6, -3.4));
    g.add(box(3.4, 2.6, 0.32, glow(0xcfe9ff, 0.6), 0, 1.3, -3.42));
    const cont = box(2.7, 2.4, 2.2, std(0xe9eef0, { metalness: 0.3, roughness: 0.35 }), 0, 1.25, -4.4);
    g.add(cont);
    for (let i = -6; i <= 6; i++) g.add(box(0.05, 2.45, 2.24, std(0xc5ced4), i * 0.2, 1.25, -4.4));
    const sg = makeSign(`${MINUS}20 °C`, '#58b8ff'); sg.position.set(-3.4, 3.3, -0.5); g.add(sg);
    props.add(g);
  }

  /* camera rig */
  const camPts = ZS.map((z) => V(0, 1.75, z + 5.2));
  const lookPts = ZS.map((z) => V(0, 1.15, z - 1.5));
  let idx = 0, pathT = 0; // pathT eases between station indices
  const camTween = { v: 0 };
  let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0, dragging = false, lx = 0, ly = 0, userIdle = 0;
  const camP = V(0, 0, 0), lookP = V(0, 0, 0);

  const total = FACILITY_STATIONS.length;
  const card = $('#tourCard'), titleEl = $('#tourTitle'), descEl = $('#tourDesc'), countEl = $('#tourCount');
  const dots = [...document.querySelectorAll('#tourDots button')];
  function paintCard(animate) {
    const id = FACILITY_STATIONS[idx];
    const apply = () => { titleEl.textContent = t(`fa.${id}.t`); descEl.textContent = t(`fa.${id}.d`); countEl.textContent = t('fa.step', { n: idx + 1, total }); };
    if (animate && !state.reduced) gsap.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', onStart: apply }); else apply();
    dots.forEach((b, i) => (i === idx ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    dots[idx]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  function go(i, { user = true } = {}) {
    idx = (i + total) % total;
    if (user) { auto = false; syncPlay(); }
    tYaw = 0; tPitch = 0;
    gsap.to(camTween, { v: idx, duration: state.reduced ? 0 : 2.2, ease: 'power3.inOut' });
    paintCard(true);
  }
  $('#tourPrev').addEventListener('click', () => go(idx - 1));
  $('#tourNext').addEventListener('click', () => go(idx + 1));
  dots.forEach((b, i) => b.addEventListener('click', () => go(i)));
  let auto = false, autoTimer = 0;
  const playBtn = $('#tourPlay');
  function syncPlay() { playBtn.setAttribute('aria-pressed', auto); playBtn.querySelector('use').setAttribute('href', auto ? '#i-pause' : '#i-play'); playBtn.querySelector('span').textContent = t(auto ? 'fa.pause' : 'fa.play'); }
  playBtn.addEventListener('click', () => { auto = !auto; autoTimer = 0; syncPlay(); });
  onLang(() => { paintCard(false); syncPlay(); });
  canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); } });

  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; userIdle = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; tYaw = clamp(tYaw - (e.clientX - lx) * 0.004, -0.9, 0.9); tPitch = clamp(tPitch - (e.clientY - ly) * 0.003, -0.3, 0.3); lx = e.clientX; ly = e.clientY; userIdle = 0; });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  paintCard(false); syncPlay();

  const dir = V(0, 0, 0);
  registerView(canvas, (tm, dt) => {
    userIdle += dt;
    if (!dragging && userIdle > 3.5) { tYaw = damp(tYaw, 0, 1.2, dt); tPitch = damp(tPitch, 0, 1.2, dt); }
    if (auto && !state.paused) { autoTimer += dt; if (autoTimer > 7) { autoTimer = 0; go(idx + 1, { user: false }); } }
    yaw = damp(yaw, tYaw + state.mouse.tx * -0.06, 6, dt); pitch = damp(pitch, tPitch + state.mouse.ty * -0.03, 6, dt);
    // interpolate rig between stations (Catmull-style via lerp)
    const v = clamp(camTween.v, 0, total - 1), i0 = Math.floor(v), i1 = Math.min(total - 1, i0 + 1), f = v - i0;
    camP.lerpVectors(camPts[i0], camPts[i1], f); lookP.lerpVectors(lookPts[i0], lookPts[i1], f);
    camP.y += Math.sin(tm * 0.8) * 0.015;
    camera.position.copy(camP);
    dir.subVectors(lookP, camP);
    const len = dir.length();
    dir.applyAxisAngle(V(0, 1, 0), yaw); dir.y += Math.tan(pitch) * len;
    camera.lookAt(camP.x + dir.x, camP.y + dir.y, camP.z + dir.z);
    anim.forEach((fn) => fn(tm));
    fans.forEach((fan, k) => (fan.rotation.y = tm * 9 + k));
    renderer.render(scene, camera);
  });
  return { dispose() { disposeTree(scene); renderer.dispose(); } };
}
