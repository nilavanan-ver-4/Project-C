// Procedural seafood models, built from swept, segmented geometry + canvas-generated skins.
// They are stand-ins that read as the real thing; drop optimised GLBs into /public/models and list
// them in /public/models/manifest.json (see README) and they replace the procedural versions automatically.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTexture, clamp } from './common.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const capEnds = (t, e = 0.035) => Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - (1 - e)) / e), 2))) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (e - t) / e), 2)));
const rnd = (() => { let s = 1337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

/* ───────── geometry helpers ───────── */

/** Sweep an elliptical cross-section along a curve. rfn(t, theta) → [radiusA, radiusB]; a = up × tangent, b = tangent × a. */
export function sweep(curve, nSeg, nRad, rfn, up = V(0, 1, 0)) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nSeg; i++) {
    const t = i / nSeg;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    let a = new THREE.Vector3().crossVectors(up, T);
    if (a.lengthSq() < 1e-6) a = new THREE.Vector3().crossVectors(V(1, 0, 0), T);
    a.normalize();
    const b = new THREE.Vector3().crossVectors(T, a).normalize();
    for (let j = 0; j <= nRad; j++) {
      const th = (j / nRad) * TAU;
      const [ra, rb] = rfn(t, th);
      const c = Math.cos(th), s = Math.sin(th);
      pos.push(p.x + a.x * c * ra + b.x * s * rb, p.y + a.y * c * ra + b.y * s * rb, p.z + a.z * c * ra + b.z * s * rb);
      uv.push(t, j / nRad);
    }
  }
  for (let i = 0; i < nSeg; i++) for (let j = 0; j < nRad; j++) {
    const a0 = i * (nRad + 1) + j, b0 = a0 + nRad + 1;
    idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // weld normals across the texture seam
  const n = g.attributes.normal;
  for (let i = 0; i <= nSeg; i++) {
    const a0 = i * (nRad + 1), b0 = a0 + nRad;
    const x = n.getX(a0) + n.getX(b0), y = n.getY(a0) + n.getY(b0), z = n.getZ(a0) + n.getZ(b0);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a0, x / l, y / l, z / l); n.setXYZ(b0, x / l, y / l, z / l);
  }
  return g;
}

const tube = (pts, r0, r1 = r0 * 0.3, seg = 24, rad = 6, mat) => {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = sweep(curve, seg, rad, (t) => { const r = lerp(r0, r1, t) * capEnds(t, 0.06); return [r, r]; }, V(0, 1, 0));
  return new THREE.Mesh(g, mat);
};

const basisGroup = (p, T, a, b) => {
  const g = new THREE.Group();
  g.matrix.makeBasis(T.clone().normalize(), a.clone().normalize(), b.clone().normalize()).setPosition(p);
  g.matrixAutoUpdate = false;
  g.matrixWorldNeedsUpdate = true;
  return g;
};

const mesh = (geo, mat, pos, scale, rot) => {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  if (scale) m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  return m;
};

function fit(group, size = 2.3) {
  const box = new THREE.Box3().setFromObject(group);
  const c = box.getCenter(new THREE.Vector3());
  const s = size / Math.max(...box.getSize(new THREE.Vector3()).toArray());
  const wrap = new THREE.Group();
  group.position.sub(c);
  const inner = new THREE.Group();
  inner.add(group);
  inner.scale.setScalar(s);
  wrap.add(inner);
  return wrap;
}

const mats = {
  eye: () => new THREE.MeshPhysicalMaterial({ color: 0x07080a, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }),
};

/* ───────── textures ───────── */

function scalesBump() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    const sx = 14, sy = 10;
    for (let y = -1; y < h / sy + 1; y++) for (let x = -1; x < w / sx + 1; x++) {
      const cx = x * sx + (y % 2 ? sx / 2 : 0), cy = y * sy;
      const gr = g.createRadialGradient(cx, cy, 1, cx, cy + 2, sx * 0.62);
      gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(1, '#505050');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, sx * 0.58, 0, TAU); g.fill();
    }
  }, { srgb: false });
}

function fishSkin() {
  return canvasTexture(512, 256, (g, w, h) => {
    for (let y = 0; y < h; y++) {
      const v = 1 - y / h, s = Math.sin(v * TAU); // +1 dorsal … −1 belly
      const dorsal = ss(0.05, 0.7, s), belly = ss(-0.1, -0.55, s);
      const r = lerp(lerp(205, 36, dorsal), 245, belly), gg = lerp(lerp(216, 82, dorsal), 247, belly), b = lerp(lerp(224, 112, dorsal), 246, belly);
      g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(0, y, w, 1);
    }
    // darker head / tail tones along the body
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(20,40,60,.35)'); gx.addColorStop(0.18, 'rgba(20,40,60,0)'); gx.addColorStop(0.9, 'rgba(10,25,40,0)'); gx.addColorStop(1, 'rgba(10,25,40,.4)');
    g.fillStyle = gx; g.fillRect(0, 0, w, h);
    // lateral line + mackerel-like wavy bars on the back
    g.strokeStyle = 'rgba(20,40,60,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h * 0.465); g.lineTo(w, h * 0.465); g.stroke();
    g.strokeStyle = 'rgba(8,24,40,.35)'; g.lineWidth = 3;
    for (let x = 20; x < w; x += 22) { g.beginPath(); for (let y = 0.1; y < 0.42; y += 0.02) g.lineTo(x + Math.sin(y * 18 + x) * 5, y * h); g.stroke(); }
    // soft scale highlights
    for (let y = 0; y < h; y += 7) for (let x = 0; x < w; x += 10) {
      const cx = x + (y % 14 ? 5 : 0), gr = g.createRadialGradient(cx, y, 0, cx, y, 7);
      gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(cx - 7, y - 7, 14, 14);
    }
  });
}

function crustSkin(stops, { stripes, speckle, dorsal = 0.28 } = {}) {
  return canvasTexture(512, 128, (g, w, h) => {
    const gx = g.createLinearGradient(0, 0, w, 0);
    stops.forEach(([p, c]) => gx.addColorStop(p, c));
    g.fillStyle = gx; g.fillRect(0, 0, w, h);
    // darker dorsal ridge, lighter underside
    for (let y = 0; y < h; y++) {
      const s = Math.sin((1 - y / h) * TAU);
      g.fillStyle = s > 0 ? `rgba(60,10,0,${s * dorsal})` : `rgba(255,214,190,${-s * 0.22})`;
      g.fillRect(0, y, w, 1);
    }
    if (stripes) { g.fillStyle = stripes.color; stripes.at.forEach(([a, b]) => g.fillRect(a * w, 0, (b - a) * w, h)); }
    if (speckle) for (let i = 0; i < speckle.n; i++) { g.fillStyle = speckle.color; g.globalAlpha = rnd() * 0.5 + 0.2; g.beginPath(); g.arc(rnd() * w, rnd() * h, rnd() * 2.2 + 0.6, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  });
}

const noiseBump = (n = 2400, size = 256) => canvasTexture(size, size, (g, w, h) => {
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (rnd() * 120 + 80) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, rnd() * 3 + 0.8, 0, TAU); g.fill(); }
}, { srgb: false });

/* ───────── FISH ───────── */
function fish(q) {
  const grp = new THREE.Group();
  const skin = fishSkin();
  const mat = new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: scalesBump(), bumpScale: 1.4, metalness: 0.5, roughness: 0.27, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 0.7, iridescenceIOR: 1.35, envMapIntensity: 1.35 });
  const spine = new THREE.CatmullRomCurve3([V(-1.2, 0, 0.05), V(-0.6, 0, -0.04), V(0, 0, 0), V(0.6, 0, 0.03), V(1.2, -0.02, 0)], false, 'centripetal');
  const H = (t) => 0.46 * (0.2 + 0.8 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.78)), 0.9)) * capEnds(t, 0.03);
  const body = sweep(spine, Math.round(80 * q), Math.round(40 * q), (t, th) => {
    const h = H(t), belly = Math.sin(th) < 0 ? 0.93 : 1;
    return [h * 0.5, h * belly];
  }, V(0, 1, 0));
  grp.add(new THREE.Mesh(body, mat));

  const finMat = new THREE.MeshPhysicalMaterial({ color: 0x2f6483, roughness: 0.45, metalness: 0.2, transparent: true, opacity: 0.92, side: THREE.DoubleSide, clearcoat: 0.6, envMapIntensity: 1.1 });
  const fin = (start, ...segs) => {
    const sh = new THREE.Shape(); sh.moveTo(...start);
    segs.forEach(([c1, c2, e]) => sh.bezierCurveTo(...c1, ...c2, ...e));
    return new THREE.ShapeGeometry(sh, 16);
  };
  // forked tail, dorsal, anal and pectoral fins
  const tailFin = mesh(fin([0, 0.07], [[-0.2, 0.2], [-0.45, 0.42], [-0.62, 0.55]], [[-0.5, 0.25], [-0.4, 0.05], [-0.4, 0]], [[-0.4, -0.05], [-0.5, -0.25], [-0.62, -0.55]], [[-0.45, -0.42], [-0.2, -0.2], [0, -0.07]]), finMat, V(-1.17, 0, 0));
  tailFin.scale.set(0.82, 0.82, 1);
  grp.add(tailFin);
  grp.add(mesh(fin([0, 0], [[0.1, 0.12], [0.2, 0.3], [0.38, 0.32]], [[0.34, 0.2], [0.4, 0.1], [0.62, 0]]), finMat, V(-0.15, 0.36, 0)));
  grp.add(mesh(fin([0, 0], [[0.08, -0.1], [0.15, -0.2], [0.3, -0.22]], [[0.28, -0.12], [0.36, -0.05], [0.5, 0]]), finMat, V(-0.35, -0.3, 0)));
  for (const s of [-1, 1]) {
    const f = mesh(fin([0, 0], [[-0.05, -0.1], [-0.12, -0.2], [-0.32, -0.26]], [[-0.26, -0.12], [-0.3, -0.04], [-0.34, 0]]), finMat, V(0.58, -0.12, 0.14 * s));
    f.rotation.set(s * 0.9, s * 0.2, 0);
    grp.add(f);
  }
  // eyes & gill cover
  const eyeW = new THREE.MeshPhysicalMaterial({ color: 0xf2f2e8, roughness: 0.2, clearcoat: 1 });
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.058, 20, 16), eyeW, V(0.86, 0.045, 0.108 * s));
    e.add(mesh(new THREE.SphereGeometry(0.036, 16, 12), mats.eye(), V(0.026, 0, 0.026 * s)));
    grp.add(e);
  }
  grp.rotation.y = -0.4;
  return fit(grp, 2.5);
}

/* ───────── generic crustacean (shrimp, prawn, spiny lobster) ───────── */
function crustacean(q, o) {
  const grp = new THREE.Group();
  const skin = crustSkin(o.skin, o.skinOpts);
  const mat = new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: o.bump ?? null, bumpScale: 0.6, roughness: o.rough ?? 0.34, clearcoat: o.clear ?? 0.9, clearcoatRoughness: 0.18, sheen: 0.6, sheenColor: new THREE.Color(o.sheen ?? '#ff9d80'), sheenRoughness: 0.45, envMapIntensity: 0.9 });
  const curve = new THREE.CatmullRomCurve3(o.pts, false, 'centripetal');
  const nSeg = Math.round(o.nSeg * q);
  const body = sweep(curve, nSeg, Math.round(28 * q), (t, th) => {
    const head = ss(o.headEnd + 0.04, o.headEnd - 0.06, t);
    const segPhase = clamp((t - o.headEnd) / (o.tailStart - o.headEnd), 0, 1) * o.segs;
    const ridge = 1 + o.ridge * Math.cos(segPhase * TAU) * (1 - head);
    const base = lerp(o.rAbd0, o.rAbd1, ss(o.headEnd, o.tailStart, t));
    const car = o.rHead * (0.8 + 0.2 * Math.sin(ss(0, o.headEnd, t) * Math.PI)) * (t < o.headEnd ? 1 : 0);
    let r = (head > 0.001 ? lerp(base * ridge, car + base * 0.2, head) : base * ridge) * capEnds(t, 0.05);
    r *= 1 + (Math.sin(th) > 0 ? 0.04 : -0.02);
    return [r * o.hz, r * o.wz];
  }, V(0, 0, 1));
  grp.add(new THREE.Mesh(body, mat));

  const P = (t) => curve.getPointAt(t), Tn = (t) => curve.getTangentAt(t).normalize();
  const dark = new THREE.MeshPhysicalMaterial({ color: o.limb ?? 0xe58f78, roughness: 0.45, clearcoat: 0.6 });

  // rostrum / carapace spines
  const t0 = Tn(0), pHead = P(0);
  const ros = new THREE.Mesh(new THREE.ConeGeometry(o.rHead * 0.2, o.rostrum, 10), mat);
  ros.position.copy(pHead).addScaledVector(t0.clone().negate(), o.rostrum * 0.42).add(V(0, o.rHead * 0.35, 0));
  ros.quaternion.setFromUnitVectors(V(0, 1, 0), t0.clone().negate().add(V(0, 0.28, 0)).normalize());
  grp.add(ros);
  if (o.spines) for (let i = 0; i < o.spines; i++) {
    const t = 0.04 + (i / o.spines) * (o.headEnd - 0.04);
    const p = P(t), T = Tn(t), n = new THREE.Vector3().crossVectors(V(0, 0, 1), T).normalize();
    for (const s of [-1, 1]) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 6), mat);
      sp.position.copy(p).addScaledVector(n, -o.rHead * o.hz * 0.85).add(V(0, 0, s * o.rHead * o.wz * 0.5));
      sp.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().negate().add(V(0, 0, s * 0.8)).normalize());
      grp.add(sp);
    }
  }
  // eyes
  for (const s of [-1, 1]) {
    const p = P(0.015);
    const stalk = tube([p.clone().add(V(0, o.rHead * 0.2, s * o.rHead * 0.5)), p.clone().add(V(-0.02, o.rHead * 0.6, s * o.rHead * 0.78))], 0.018, 0.016, 4, 5, dark);
    grp.add(stalk);
    grp.add(mesh(new THREE.SphereGeometry(0.036, 14, 12), mats.eye(), p.clone().add(V(-0.02, o.rHead * 0.62, s * o.rHead * 0.8))));
  }
  // antennae
  for (const s of [-1, 1]) {
    const hp = pHead.clone().add(V(0, o.rHead * 0.35, s * o.rHead * 0.35));
    const out = o.antenna;
    const pts = [hp, hp.clone().add(V(out[0] * 0.3, out[1] * 0.5, s * out[2] * 0.3)), hp.clone().add(V(out[0] * 0.7, out[1] * 0.9, s * out[2] * 0.75)), hp.clone().add(V(out[0], out[1] * 0.6, s * out[2]))];
    grp.add(tube(pts, o.antR, 0.004, 28, 6, o.antMat ?? dark));
    if (o.antennules) grp.add(tube([hp, hp.clone().add(V(0.32, 0.18, s * 0.1)), hp.clone().add(V(0.55, 0.12, s * 0.3))], 0.014, 0.004, 14, 5, dark));
  }
  // walking legs + swimmerets along the underside
  const legMat = o.legMat ?? dark;
  for (let i = 0; i < o.legs; i++) {
    const t = 0.06 + (i / o.legs) * (o.headEnd + 0.1 - 0.06);
    const p = P(t), T = Tn(t), n = new THREE.Vector3().crossVectors(V(0, 0, 1), T).normalize();
    for (const s of [-1, 1]) {
      const base = p.clone().addScaledVector(n, o.rHead * 0.55).add(V(0, 0, s * o.rHead * o.wz * 0.4));
      const pts = [base, base.clone().addScaledVector(n, o.legLen * 0.4).add(V(0, 0, s * o.legLen * 0.5)).addScaledVector(T, -o.legLen * 0.2), base.clone().addScaledVector(n, o.legLen * 0.75).add(V(0, 0, s * o.legLen * 0.75)).addScaledVector(T, o.legLen * 0.15 * (i % 2 ? 1 : -1)), base.clone().addScaledVector(n, o.legLen * 0.95).add(V(0, 0, s * o.legLen * 0.62)).addScaledVector(T, o.legLen * 0.3 * (i % 2 ? 1 : -1))];
      grp.add(tube(pts, 0.022, 0.006, 16, 5, legMat));
    }
  }
  for (let i = 0; i < o.segs - 1; i++) {
    const t = lerp(o.headEnd + 0.04, o.tailStart - 0.02, i / (o.segs - 1));
    const p = P(t), T = Tn(t), n = new THREE.Vector3().crossVectors(V(0, 0, 1), T).normalize();
    const r = lerp(o.rAbd0, o.rAbd1, ss(o.headEnd, o.tailStart, t));
    for (const s of [-1, 1]) {
      const base = p.clone().addScaledVector(n, r * o.hz * 0.8).add(V(0, 0, s * r * 0.3));
      grp.add(tube([base, base.clone().addScaledVector(n, 0.12).addScaledVector(T, -0.07).add(V(0, 0, s * 0.07)), base.clone().addScaledVector(n, 0.22).addScaledVector(T, -0.02).add(V(0, 0, s * 0.1))], 0.016, 0.005, 8, 5, dark));
    }
  }
  // tail fan
  const tEnd = P(1), TT = Tn(1), aa = new THREE.Vector3().crossVectors(V(0, 0, 1), TT).normalize();
  const fan = basisGroup(tEnd.clone().addScaledVector(TT, -0.02), TT, aa, V(0, 0, 1));
  const fanMat = new THREE.MeshPhysicalMaterial({ color: o.fan ?? 0xe8644a, roughness: 0.4, clearcoat: 0.7, side: THREE.DoubleSide });
  const leaf = new THREE.SphereGeometry(1, 18, 10);
  [[0, 0, 0.3, 0.05], [-0.34, 0.5, 0.26, 0.07], [0.34, -0.5, 0.26, 0.07], [-0.72, 0.9, 0.24, 0.09], [0.72, -0.9, 0.24, 0.09]].forEach(([ang, , len, w]) => {
    const l = mesh(leaf, fanMat, V(0, 0, 0), [len * o.fanScale, 0.012, w * o.fanScale * 1.4]);
    const holder = new THREE.Group();
    holder.rotation.y = ang * 1.1;
    l.position.x = len * o.fanScale;
    holder.add(l);
    fan.add(holder);
  });
  grp.add(fan);
  grp.rotation.set(o.tilt?.[0] ?? 0, o.tilt?.[1] ?? 0, o.tilt?.[2] ?? 0);
  return fit(grp, 2.7);
}

function shrimp(q) {
  return crustacean(q, {
    pts: [V(0.98, 0.52, 0), V(0.58, 0.78, 0), V(0.02, 0.74, 0), V(-0.5, 0.38, 0), V(-0.74, -0.15, 0), V(-0.55, -0.62, 0), V(-0.12, -0.78, 0), V(0.26, -0.6, 0), V(0.4, -0.36, 0)],
    nSeg: 110, segs: 6, headEnd: 0.27, tailStart: 0.92, ridge: 0.11, rHead: 0.27, rAbd0: 0.215, rAbd1: 0.085, hz: 1, wz: 0.86,
    skin: [[0, '#e8765a'], [0.28, '#ea7d62'], [0.5, '#f0957b'], [0.8, '#e46c4e'], [1, '#cf4128']],
    skinOpts: { dorsal: 0.42, speckle: { n: 380, color: '#8f2412' } }, bump: noiseBump(1200),
    rostrum: 0.34, spines: 3, antenna: [0.9, 0.55, 0.7], antR: 0.012, antennules: true, legs: 5, legLen: 0.26,
    sheen: '#ff9d80', limb: 0xe98466, fan: 0xd9553a, fanScale: 0.62, tilt: [0.25, -0.5, 0],
  });
}
function prawn(q) {
  return crustacean(q, {
    pts: [V(1.15, 0.38, 0), V(0.7, 0.62, 0), V(0.1, 0.68, 0), V(-0.45, 0.46, 0), V(-0.85, 0.02, 0), V(-0.9, -0.5, 0), V(-0.55, -0.85, 0), V(-0.1, -0.88, 0)],
    nSeg: 120, segs: 6, headEnd: 0.3, tailStart: 0.93, ridge: 0.12, rHead: 0.23, rAbd0: 0.2, rAbd1: 0.082, hz: 1, wz: 0.85,
    skin: [[0, '#8a7566'], [0.3, '#7b6a5e'], [0.7, '#9a8678'], [1, '#c9744f']],
    skinOpts: { dorsal: 0.3, stripes: { color: 'rgba(10,14,26,.9)', at: [[0.04, 0.075], [0.12, 0.165], [0.2, 0.26], [0.33, 0.38], [0.44, 0.49], [0.55, 0.6], [0.66, 0.71], [0.77, 0.82], [0.88, 0.92]] }, speckle: { n: 300, color: '#202c38' } },
    bump: noiseBump(800), rough: 0.3, rostrum: 0.46, spines: 3, antenna: [1.1, 0.5, 0.8], antR: 0.014, antennules: true, legs: 5, legLen: 0.3,
    sheen: '#cfe4ff', limb: 0x6f8aa0, fan: 0x7f93a6, fanScale: 0.7, tilt: [0.25, -0.5, 0],
  });
}
function lobster(q) {
  const spiny = new THREE.MeshPhysicalMaterial({ color: 0xc7bda8, roughness: 0.5, clearcoat: 0.5 });
  return crustacean(q, {
    pts: [V(1.1, 0.12, 0), V(0.6, 0.18, 0), V(0.05, 0.14, 0), V(-0.5, 0.04, 0), V(-1.0, -0.1, 0), V(-1.35, -0.34, 0), V(-1.5, -0.62, 0)],
    nSeg: 110, segs: 6, headEnd: 0.4, tailStart: 0.93, ridge: 0.07, rHead: 0.44, rAbd0: 0.37, rAbd1: 0.16, hz: 0.88, wz: 1.0,
    skin: [[0, '#7a2a2a'], [0.35, '#8c3328'], [0.7, '#a1442d'], [1, '#c0583a']],
    skinOpts: { dorsal: 0.3, speckle: { n: 700, color: '#f3e3c4' } }, bump: noiseBump(2600), rough: 0.42, clear: 0.55, sheen: '#ffb08a',
    rostrum: 0.2, spines: 7, antenna: [1.15, 0.75, 0.85], antR: 0.06, antennules: true, antMat: new THREE.MeshPhysicalMaterial({ color: 0x8c3328, roughness: 0.45, clearcoat: 0.5 }),
    legs: 5, legLen: 0.6, legMat: spiny, limb: 0x9a4030, fan: 0xb34c34, fanScale: 0.8, tilt: [0.2, -0.6, 0.08],
  });
}

/* ───────── CRAB ───────── */
function crab(q) {
  const grp = new THREE.Group();
  const skin = canvasTexture(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    gr.addColorStop(0, '#e8602e'); gr.addColorStop(0.6, '#c93a1f'); gr.addColorStop(1, '#8f2415');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = rnd() > 0.5 ? 'rgba(255,230,200,.35)' : 'rgba(110,20,0,.25)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, rnd() * 3 + 0.8, 0, TAU); g.fill(); }
  });
  const shell = new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: noiseBump(1800), bumpScale: 1.1, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.6, sheenColor: new THREE.Color('#ffb48a'), envMapIntensity: 1.15 });
  const light = new THREE.MeshPhysicalMaterial({ color: 0xf3d6b6, roughness: 0.45, clearcoat: 0.5 });
  const seg = Math.round(48 * q);
  // carapace: wide, shallow dome
  const cara = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  const pos = cara.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    y *= y > 0 ? 0.36 : 0.22; x *= 1.32; z *= 0.82;
    z += 0.08 * Math.max(0, -z) * 0; // keep centred
    pos.setXYZ(i, x, y, z);
  }
  cara.computeVertexNormals();
  grp.add(new THREE.Mesh(cara, shell));
  grp.add(mesh(new THREE.SphereGeometry(1, 24, 12), light, V(0, -0.16, 0), [1.12, 0.14, 0.72]));
  // lateral spines
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) {
    const a = lerp(-0.35, 0.95, i / 7), last = i === 7;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(last ? 0.06 : 0.035, last ? 0.5 : 0.14, 7), shell);
    sp.position.set(Math.cos(a) * 1.28 * s * (last ? 1.0 : 0.97), -0.02, Math.sin(a) * 0.8 * 0.86 * 1);
    sp.position.z = -Math.sin(a) * 0.78 + 0.28;
    sp.position.x = s * Math.cos(a) * (last ? 1.3 : 1.25);
    sp.quaternion.setFromUnitVectors(V(0, 1, 0), V(s * (last ? 1 : 0.8), 0.1, last ? -0.1 : 0.3).normalize());
    grp.add(sp);
  }
  // front teeth + eyes
  for (let i = -2; i <= 2; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), shell);
    t.position.set(i * 0.1, 0.0, 0.8); t.rotation.x = Math.PI / 2; grp.add(t);
  }
  for (const s of [-1, 1]) {
    grp.add(tube([V(0.22 * s, 0.12, 0.7), V(0.3 * s, 0.26, 0.82)], 0.022, 0.02, 4, 5, shell));
    grp.add(mesh(new THREE.SphereGeometry(0.05, 14, 12), mats.eye(), V(0.3 * s, 0.28, 0.84)));
  }
  // claws (long, slender) & walking legs
  for (const s of [-1, 1]) {
    const arm = tube([V(0.7 * s, -0.02, 0.5), V(1.05 * s, 0.1, 0.78), V(1.35 * s, 0.05, 1.1), V(1.28 * s, 0.0, 1.45)], 0.075, 0.062, 28, 8, shell);
    grp.add(arm);
    const palm = mesh(new THREE.SphereGeometry(1, 20, 14), shell, V(1.22 * s, 0.0, 1.74), [0.13, 0.11, 0.3], [0, 0.0, 0]);
    grp.add(palm);
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.46, 8), light);
    f1.position.set(1.2 * s, 0.0, 2.1); f1.rotation.x = Math.PI / 2; f1.rotation.z = s * 0.1; grp.add(f1);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 8), light);
    f2.position.set(1.3 * s, 0.07, 2.08); f2.rotation.x = Math.PI / 2; f2.rotation.z = -s * 0.2; grp.add(f2);
    for (let i = 0; i < 3; i++) {
      const z0 = 0.35 - i * 0.28;
      grp.add(tube([V(1.0 * s, -0.02, z0), V(1.55 * s, 0.25, z0 - 0.08), V(2.0 * s, 0.05, z0 - 0.25 - i * 0.05), V(2.2 * s, -0.4, z0 - 0.35 - i * 0.08)], 0.05, 0.016, 22, 6, shell));
    }
    // swimming paddle (last leg)
    grp.add(tube([V(0.9 * s, -0.02, -0.5), V(1.4 * s, 0.1, -0.78), V(1.7 * s, 0.0, -1.0)], 0.05, 0.03, 12, 6, shell));
    grp.add(mesh(new THREE.SphereGeometry(1, 16, 10), shell, V(1.85 * s, -0.02, -1.1), [0.2, 0.025, 0.12], [0, s * -0.4, 0]));
  }
  grp.rotation.set(0.5, 0.2, 0);
  return fit(grp, 2.55);
}

/* ───────── SQUID ───────── */
function squid(q) {
  const grp = new THREE.Group();
  const skin = canvasTexture(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#e2b3c0'); gr.addColorStop(0.5, '#ecc9cc'); gr.addColorStop(1, '#f3dcd6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) { const dorsal = rnd(); g.fillStyle = `rgba(${110 + rnd() * 40 | 0},${40 + rnd() * 30 | 0},${70 + rnd() * 40 | 0},${rnd() * 0.45})`; g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.85, rnd() * 3.2 + 0.7, 0, TAU); g.fill(); }
  });
  const mat = new THREE.MeshPhysicalMaterial({ map: skin, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 1, sheenColor: new THREE.Color('#ffc9e0'), iridescence: 0.5, iridescenceIOR: 1.3, envMapIntensity: 1.25 });
  const axis = new THREE.CatmullRomCurve3([V(0.0, 1.15, 0), V(0.0, 0.5, 0.02), V(0, -0.2, 0)], false, 'centripetal');
  const mantle = sweep(axis, Math.round(70 * q), Math.round(40 * q), (t) => {
    const r = 0.37 * Math.pow(Math.sin(Math.PI * Math.pow(t * 0.96 + 0.015, 0.62)), 0.8) * (0.5 + 0.5 * ss(0, 0.45, t)) + 0.06 * ss(0.85, 1, t);
    return [r * capEnds(t, 0.02), r * 0.9 * capEnds(t, 0.02)];
  }, V(0, 0, 1));
  grp.add(new THREE.Mesh(mantle, mat));
  // fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.0); finShape.bezierCurveTo(0.35, 0.05, 0.62, 0.28, 0.52, 0.5); finShape.bezierCurveTo(0.35, 0.58, 0.12, 0.42, 0, 0.5); finShape.bezierCurveTo(-0.12, 0.42, -0.35, 0.58, -0.52, 0.5); finShape.bezierCurveTo(-0.62, 0.28, -0.35, 0.05, 0, 0.0);
  const finMat = new THREE.MeshPhysicalMaterial({ color: 0xe8c3cd, roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
  const fin = new THREE.Mesh(new THREE.ShapeGeometry(finShape, 20), finMat);
  fin.position.set(0, 0.76, 0.0); fin.rotation.x = 0; fin.scale.set(1, 1.1, 1);
  const fin2 = fin.clone(); fin2.rotation.y = Math.PI / 2;
  grp.add(fin);
  // head & eyes
  grp.add(mesh(new THREE.SphereGeometry(1, 28, 20), mat, V(0, -0.27, 0), [0.22, 0.17, 0.2]));
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.085, 20, 16), mats.eye(), V(0.21 * s, -0.25, 0.05));
    const ring = mesh(new THREE.TorusGeometry(0.087, 0.012, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xd9b46a, metalness: 0.8, roughness: 0.3 }), V(0.21 * s, -0.25, 0.05), null, [0, Math.PI / 2, 0]);
    grp.add(eye, ring);
  }
  // arms & tentacles
  const arms = 8, ten = 2;
  for (let i = 0; i < arms + ten; i++) {
    const a = (i / (arms + ten)) * TAU + 0.3, isT = i % 5 === 2;
    const len = isT ? 1.05 : 0.62 + rnd() * 0.18, r0 = isT ? 0.04 : 0.058;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      pts.push(V(Math.cos(a) * (0.1 + u * 0.28) + Math.sin(u * 6 + i) * 0.045, -0.4 - u * len, Math.sin(a) * (0.1 + u * 0.28) + Math.cos(u * 5 + i) * 0.045));
    }
    const m = tube(pts, r0, 0.006, 40, 8, mat);
    grp.add(m);
    if (isT) grp.add(mesh(new THREE.SphereGeometry(1, 14, 10), mat, pts[5].clone().add(V(0, -0.04, 0)), [0.045, 0.14, 0.02]));
  }
  grp.rotation.set(0.12, 0.2, -0.5);
  return fit(grp, 2.9);
}

/* ───────── VALUE-ADDED ───────── */
function valueAdded(q) {
  const grp = new THREE.Group();
  const label = canvasTexture(512, 700, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c2b4e'); bg.addColorStop(1, '#061830');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(224,190,122,.9)'; g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44);
    // wave
    g.strokeStyle = '#4ee8d6'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); for (let x = 90; x <= 420; x += 6) g.lineTo(x, 150 + Math.sin((x - 90) / 38) * 22); g.stroke();
    g.fillStyle = '#f1efe6'; g.textAlign = 'center';
    g.font = '500 92px "Cormorant Garamond", Georgia, serif'; g.fillText('Proj‑C', w / 2, 290);
    g.fillStyle = '#e0be7a'; g.font = '600 26px Outfit, Arial, sans-serif'; g.fillText('PREMIUM SEA PRODUCTS', w / 2, 340);
    g.fillStyle = '#f1efe6'; g.font = '300 56px "Cormorant Garamond", Georgia, serif'; g.fillText('Crispy Breaded', w / 2, 460); g.fillText('Shrimp', w / 2, 520);
    g.fillStyle = 'rgba(241,239,230,.7)'; g.font = '400 24px Outfit, Arial, sans-serif'; g.fillText('IQF · READY TO COOK · 500 g', w / 2, 590);
  });
  const box = new THREE.MeshPhysicalMaterial({ map: label, roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.15, envMapIntensity: 1.1 });
  const edge = new THREE.MeshPhysicalMaterial({ color: 0x0a2240, roughness: 0.4, clearcoat: 0.7 });
  const b = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.6, 0.42, 4, 0.05), [edge, edge, edge, edge, box, edge]);
  b.position.set(-0.45, 0.25, -0.2); b.rotation.set(0, 0.35, 0);
  grp.add(b);
  // breaded shrimp pieces
  const crumbTex = canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#d99a3e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { const v = rnd(); g.fillStyle = v > 0.6 ? 'rgba(255,214,130,.8)' : v > 0.25 ? 'rgba(160,90,20,.6)' : 'rgba(120,60,10,.5)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, rnd() * 3 + 0.5, 0, TAU); g.fill(); }
  });
  const crumb = new THREE.MeshPhysicalMaterial({ map: crumbTex, bumpMap: noiseBump(3000), bumpScale: 2.2, roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color('#ffd27a'), envMapIntensity: 0.7 });
  const piece = (x, y, z, rot, sc = 1) => {
    const c = new THREE.CatmullRomCurve3([V(-0.55, -0.1, 0), V(-0.2, 0.2, 0), V(0.25, 0.22, 0), V(0.55, -0.05, 0), V(0.58, -0.35, 0)], false, 'centripetal');
    const g = sweep(c, Math.round(50 * q), Math.round(20 * q), (t) => { const r = (0.12 + 0.07 * Math.sin(t * Math.PI)) * capEnds(t, 0.08); return [r * 0.9, r * 1.2]; }, V(0, 0, 1));
    const m = new THREE.Mesh(g, crumb);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), new THREE.MeshPhysicalMaterial({ color: 0xe8644a, roughness: 0.5 }));
    tail.position.set(0.6, -0.48, 0); tail.rotation.z = Math.PI + 0.1; m.add(tail);
    m.position.set(x, y, z); m.rotation.set(...rot); m.scale.setScalar(sc);
    return m;
  };
  grp.add(piece(0.55, -0.55, 0.6, [0.3, -0.5, 0.15], 1.0), piece(0.15, -0.75, 0.9, [-0.1, 0.4, -0.12], 0.92), piece(0.95, -0.2, 0.3, [0.1, -1.0, 0.3], 0.85));
  grp.rotation.set(0.1, -0.2, 0);
  return fit(grp, 2.7);
}

export const BUILDERS = { shrimp, prawn, fish, crab, lobster, squid, valueadded: valueAdded };

/* ───────── public API: procedural, or GLB (+Draco) override ───────── */
let manifestP;
const manifest = () => (manifestP ??= fetch('/models/manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

async function loadGLB(url) {
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
  ]);
  const draco = new DRACOLoader(); // three bundles the Draco WASM decoder; fetched only when a GLB is actually loaded
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  draco.dispose();
  return fit(gltf.scene, 2.4);
}

export async function getProductModel(id, quality = 1) {
  try {
    const url = (await manifest())[id];
    if (url) return await loadGLB(url);
  } catch (err) {
    console.warn(`[models] GLB for "${id}" failed, using procedural model`, err);
  }
  return BUILDERS[id](quality);
}
