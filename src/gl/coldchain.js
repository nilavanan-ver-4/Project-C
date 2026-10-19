// Cold-chain diorama: boat → processing plant → cold store → reefer on truck/ship → destination port.
// Scroll (pinned) drives a glowing cargo pod along the route; the camera follows.
import { THREE, createRenderer, makeEnv, autoResize, damp, clamp, smooth, canvasTexture, dotTexture, disposeTree } from './common.js';
import { state } from '../core/state.js';
import { registerView } from '../core/loop.js';
import { gsap } from '../core/scroll.js';
import { COLD_STAGES } from '../data/story.js';
import { t, onLang } from '../i18n/index.js';

const $ = (s) => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MINUS = '−';

const M = {
  std: (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o }),
  glow: (color, i = 1.6) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: i }),
};
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cyl = (r, h, mat, x = 0, y = 0, z = 0, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); return m; };

function containerMesh(color, len = 1.2, label) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.42, 0.42), M.std(color, { roughness: 0.4, metalness: 0.25 }));
  g.add(body);
  const rib = M.std(new THREE.Color(color).multiplyScalar(0.8), { roughness: 0.5 });
  for (let i = -Math.floor(len / 0.1) / 2; i < Math.floor(len / 0.1) / 2; i++) g.add(box(0.035, 0.44, 0.44, rib, i * 0.1 + 0.05, 0, 0));
  if (label) {
    const tex = canvasTexture(256, 64, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.fillStyle = '#0a2240'; c.font = '600 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('Proj‑C', w / 2, 46); });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.6, 0.15), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    plane.position.set(0, 0.04, 0.215); g.add(plane);
    const p2 = plane.clone(); p2.position.z = -0.215; p2.rotation.y = Math.PI; g.add(p2);
  }
  return g;
}

function buildBoat() {
  const g = new THREE.Group();
  const hullGeo = new THREE.BoxGeometry(2.4, 0.42, 0.9, 12, 1, 4);
  const p = hullGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const bow = Math.max(0, x / 1.2);
    p.setZ(i, z * (1 - bow * 0.88));
    p.setY(i, y + bow * bow * 0.18 + (y < 0 ? -0.05 * (1 - Math.abs(z) / 0.45) : 0));
  }
  hullGeo.computeVertexNormals();
  g.add(new THREE.Mesh(hullGeo, M.std(0x174a6e, { roughness: 0.4, metalness: 0.3 })));
  g.add(box(2.38, 0.07, 0.74, M.std(0xe0be7a, { metalness: 0.6, roughness: 0.3 }), -0.02, 0.1, 0));
  g.add(box(0.7, 0.5, 0.55, M.std(0xf1efe6), -0.55, 0.45, 0));
  g.add(box(0.74, 0.08, 0.6, M.std(0x174a6e), -0.55, 0.72, 0));
  g.add(box(0.12, 0.16, 0.4, M.glow(0x4ee8d6, 1.2), -0.2, 0.5, 0));
  g.add(cyl(0.025, 1.0, M.std(0xcfd8de), 0.35, 0.8, 0));
  const boom = cyl(0.015, 1.1, M.std(0xcfd8de), 0.7, 0.9, 0); boom.rotation.z = Math.PI / 2.8; g.add(boom);
  // nets / catch crates
  for (let i = 0; i < 3; i++) g.add(box(0.28, 0.16, 0.34, M.std(0xcfe9f2), 0.75 - i * 0.02, 0.26 + i * 0.16, -0.05 + i * 0.02));
  return g;
}

function buildPlant() {
  const g = new THREE.Group();
  const wall = M.std(0xdfe6ea, { roughness: 0.6 });
  g.add(box(2.3, 1.1, 1.6, wall, 0, 0.55, 0));
  g.add(box(2.4, 0.12, 1.7, M.std(0x174a6e), 0, 1.16, 0));
  g.add(box(1.2, 0.5, 1.0, M.std(0xcdd8df), 0.45, 1.45, 0));
  g.add(cyl(0.13, 0.9, M.std(0x9fb2bf), -0.8, 1.55, -0.3));
  g.add(box(0.5, 0.6, 0.06, M.glow(0x4ee8d6, 0.9), 0.0, 0.32, 0.83));
  for (let i = 0; i < 5; i++) g.add(box(0.28, 0.16, 0.05, M.glow(0x9fefff, 1.4), -0.85 + i * 0.4, 0.8, 0.82));
  g.add(box(2.0, 0.05, 0.03, M.glow(0xe0be7a, 1.0), 0, 0.98, 0.83));
  return g;
}

function buildColdStore() {
  const g = new THREE.Group();
  g.add(box(2.1, 1.0, 1.5, M.std(0xb8cddc, { roughness: 0.5 }), 0, 0.5, 0));
  g.add(box(2.18, 0.08, 1.58, M.std(0x0f3158), 0, 1.04, 0));
  const sign = canvasTexture(256, 128, (c, w, h) => {
    c.fillStyle = '#04141c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4ee8d6'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#4ee8d6'; c.font = '600 54px Outfit, Arial, sans-serif'; c.textAlign = 'center'; c.fillText(`${MINUS}18 °C`, w / 2, 82);
  });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: sign }));
  sg.position.set(0, 0.62, 0.76); g.add(sg);
  for (let i = 0; i < 4; i++) g.add(box(0.5, 0.5, 0.05, M.std(0x7aa3bf, { roughness: 0.4 }), -0.75 + i * 0.5, 0.2, 0.77));
  const ice = M.glow(0x9fefff, 0.9);
  for (let i = 0; i < 4; i++) g.add(box(0.06, 0.34, 0.06, ice, 0.9 - i * 0.6, 1.2, 0.5));
  return g;
}

function buildTruck() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.45, 0.5, M.std(0x174a6e), 0.8, 0.38, 0));
  g.add(box(0.2, 0.2, 0.46, M.std(0xaee9ff, { metalness: 0.8, roughness: 0.1 }), 1.0, 0.5, 0));
  g.add(box(1.5, 0.08, 0.5, M.std(0x24303a), -0.1, 0.2, 0));
  const c = containerMesh(0xe9eef0, 1.4, true); c.position.set(-0.1, 0.46, 0); g.add(c);
  const wm = M.std(0x0b0d10, { roughness: 0.9 });
  [[-0.65, 0.22], [-0.3, 0.22], [0.0, 0.22], [0.8, 0.22]].forEach(([x, y]) => [-1, 1].forEach((s) => { const w = cyl(0.12, 0.1, wm, x, y - 0.06, s * 0.27); w.rotation.x = Math.PI / 2; g.add(w); }));
  return g;
}

function buildShip() {
  const g = new THREE.Group();
  const hullGeo = new THREE.BoxGeometry(3.6, 0.55, 1.0, 14, 1, 3);
  const p = hullGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const bow = Math.max(0, (x - 1.0) / 0.8); p.setZ(i, z * (1 - bow * 0.9)); p.setY(i, p.getY(i) + bow * bow * 0.12); }
  hullGeo.computeVertexNormals();
  g.add(new THREE.Mesh(hullGeo, M.std(0x0f3158, { roughness: 0.4, metalness: 0.35 })));
  g.add(box(3.4, 0.08, 0.9, M.std(0xb52e2e, { roughness: 0.5 }), -0.05, -0.2, 0));
  g.add(box(0.5, 0.8, 0.8, M.std(0xf1efe6), -1.4, 0.65, 0));
  g.add(box(0.3, 0.1, 0.84, M.glow(0x9fefff, 1.2), -1.4, 0.9, 0));
  g.add(cyl(0.08, 0.35, M.std(0xe0be7a), -1.55, 1.2, 0));
  const cols = [0xe0be7a, 0x3b7ea6, 0xe9eef0, 0x4ee8d6, 0xb0483a, 0xe9eef0];
  const stacks = new THREE.Group();
  for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 2; iz++) for (let iy = 0; iy < 2 + ((ix + iz) % 2); iy++) {
    stacks.add(box(0.5, 0.2, 0.34, M.std(cols[(ix * 3 + iz * 2 + iy) % cols.length], { roughness: 0.5 }), -0.7 + ix * 0.56, 0.42 + iy * 0.21, (iz - 0.5) * 0.38));
  }
  g.add(stacks);
  return g;
}

function buildPort() {
  const g = new THREE.Group();
  const steel = M.std(0xe0be7a, { metalness: 0.5, roughness: 0.4 });
  const crane = new THREE.Group();
  [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]].forEach(([x, z]) => crane.add(box(0.08, 1.9, 0.08, steel, x, 0.95, z)));
  crane.add(box(1.7, 0.1, 1.2, steel, 0, 1.9, 0));
  const beam = box(0.14, 0.12, 3.2, steel, 0, 2.02, 0.5);
  crane.add(beam);
  const trolley = new THREE.Group();
  trolley.add(box(0.3, 0.1, 0.3, M.std(0x2c3a45), 0, 1.9, 0));
  const line = cyl(0.01, 1, M.std(0xcfd8de), 0, 1.4, 0); trolley.add(line);
  const hang = containerMesh(0x4ee8d6, 0.9, true); hang.position.set(0, 0.8, 0); trolley.add(hang);
  crane.add(trolley);
  g.add(crane);
  g.userData = { trolley, hang, line };
  // stacked containers + warehouse
  const cols = [0xe0be7a, 0x3b7ea6, 0xe9eef0, 0xb0483a, 0x4ee8d6];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 1 + (i % 3); j++) g.add(box(0.8, 0.4, 0.4, M.std(cols[(i + j) % 5], { roughness: 0.5 }), -1.2 + (i % 3) * 0.9, 0.2 + j * 0.42, -1.2 - Math.floor(i / 3) * 0.45));
  g.add(box(1.8, 0.8, 1.0, M.std(0xcdd8df), 1.6, 0.4, -1.3));
  g.add(box(1.9, 0.08, 1.1, M.std(0x174a6e), 1.6, 0.84, -1.3));
  return g;
}

export async function initColdChain() {
  const canvas = $('#coldCanvas');
  const full = state.tier === 'full';
  const renderer = createRenderer(canvas, { exposure: 1.05 });
  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer, 0.05);
  scene.environmentIntensity = 0.8;
  scene.fog = new THREE.FogExp2(0x061a30, 0.035);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  autoResize(renderer, camera, canvas, { dprCap: 1.75 });

  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0a1f3a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(-4, 9, 6); scene.add(sun);
  const stageLight = new THREE.PointLight(0x4ee8d6, 28, 7, 1.6); scene.add(stageLight);

  /* sea */
  const seaMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uCx: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW; uniform float uT, uCx;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p = vW.xz*1.6;
        float a = n(p*1.3+vec2(uT*.3,uT*.2)) + .5*n(p*2.9-vec2(uT*.4,-uT*.25));
        float ridge = smoothstep(.95,1.25,a);
        vec3 col = mix(vec3(.01,.07,.14), vec3(.03,.20,.30), a*.6);
        col += vec3(.35,.9,.9)*ridge*.35;
        float edge = 1.-smoothstep(11.,19., abs(vW.x-uCx)*.9 + abs(vW.z)*.9);
        gl_FragColor = vec4(col, edge);
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0.0; scene.add(sea);

  /* land slabs */
  const gridTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#10243a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(78,232,214,.18)'; c.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * w / 4, 0); c.lineTo(i * w / 4, h); c.moveTo(0, i * h / 4); c.lineTo(w, i * h / 4); c.stroke(); }
  });
  const slab = (w, d, x, z) => {
    const tex = gridTex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 1.5, d / 1.5);
    const g = new THREE.Group();
    g.add(Object.assign(box(w, 0.5, d, [M.std(0x0a2036), M.std(0x0a2036), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), M.std(0x0a2036), M.std(0x0a2036), M.std(0x0a2036)], 0, 0.25, 0)));
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.5, d)), new THREE.LineBasicMaterial({ color: 0x4ee8d6, transparent: true, opacity: 0.55 }));
    rim.position.y = 0.25; g.add(rim);
    g.position.set(x, 0, z); scene.add(g); return g;
  };
  slab(8.6, 6.2, -2.4, 0);
  slab(5.4, 5.4, 8.6, 0);
  // quay linking to ship lane
  slab(1.2, 2.4, 2.2, 0.6);

  /* stage props */
  const boat = buildBoat(); boat.position.set(-8.6, 0.12, 1.2); scene.add(boat);
  const plant = buildPlant(); plant.position.set(-4.7, 0.5, -0.9); scene.add(plant);
  const store = buildColdStore(); store.position.set(-1.7, 0.5, -1.2); scene.add(store);
  const truck = buildTruck(); truck.position.set(-0.4, 0.5, 1.5); scene.add(truck);
  const ship = buildShip(); ship.position.set(5.0, 0.15, 0.0); scene.add(ship);
  const port = buildPort(); port.position.set(8.0, 0.5, 0.3); scene.add(port);

  /* mist near plant & store */
  const MC = full ? 60 : 24, mp = new Float32Array(MC * 3);
  const mist = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(mp, 3)), new THREE.PointsMaterial({ size: 0.5, map: dotTexture(), transparent: true, opacity: 0.35, depthWrite: false, color: 0xbff4ff, blending: THREE.AdditiveBlending }));
  mist.frustumCulled = false; scene.add(mist);
  const mseed = Array.from({ length: MC }, () => ({ x: (Math.random() - 0.5) * 1.8, z: (Math.random() - 0.5) * 1.2, p: Math.random(), c: Math.random() > 0.5 ? -4.7 : -1.7 }));

  /* route */
  const anchors = [V(-8.6, 0.55, 1.2), V(-6.6, 0.7, 1.0), V(-4.7, 0.75, 0.2), V(-3.0, 0.75, 0.4), V(-1.7, 0.75, 0.2), V(-0.4, 0.8, 1.1), V(1.4, 0.85, 1.2), V(2.4, 0.85, 0.7), V(3.9, 0.5, 0.3), V(5.2, 0.5, 0.2), V(6.6, 0.6, 0.4), V(7.7, 0.95, 0.6), V(8.0, 1.0, 0.4)];
  const curve = new THREE.CatmullRomCurve3(anchors, false, 'centripetal');
  const tubeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uU: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float uT, uU; void main(){ float done = step(vUv.x, uU); float dash = .5+.5*sin((vUv.x*120.) - uT*6.); vec3 c = mix(vec3(.15,.4,.45)*.5, vec3(.3,1.,.9), done); float a = mix(.25, .5+.5*dash, done); gl_FragColor = vec4(c, a); }',
  });
  const routeMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.028, 6, false), tubeMat);
  scene.add(routeMesh);
  // stage anchors → arc-length parameter
  const stageAnchor = [V(-8.6, 0.55, 1.2), V(-4.7, 0.75, 0.2), V(-1.7, 0.75, 0.2), V(3.9, 0.5, 0.3), V(8.0, 1.0, 0.4)];
  const samples = curve.getSpacedPoints(600);
  const stageU = stageAnchor.map((a) => { let best = 0, bd = 1e9; samples.forEach((p, i) => { const d = p.distanceToSquared(a); if (d < bd) { bd = d; best = i; } }); return best / 600; });

  /* cargo pod */
  const pod = new THREE.Group();
  pod.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x4ee8d6, emissiveIntensity: 2.4 })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0x4ee8d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  halo.scale.setScalar(1.6); pod.add(halo);
  scene.add(pod);
  const podLight = new THREE.PointLight(0x4ee8d6, 14, 5, 1.8); pod.add(podLight);

  /* DOM */
  const card = $('#coldCard'), titleEl = $('#coldTitle'), descEl = $('#coldDesc'), countEl = $('#coldCount'), tempEl = $('#coldTemp');
  const stepBtns = [...document.querySelectorAll('#coldSteps button')];
  let target = 0, u = 0, stageIdx = -1;
  const total = COLD_STAGES.length;
  const temps = [1, -40, -20, -18, -18];
  const tempAt = (x) => {
    for (let i = 0; i < total - 1; i++) if (x <= stageU[i + 1]) return temps[i] + (temps[i + 1] - temps[i]) * smooth(stageU[i], stageU[i + 1], x);
    return temps[total - 1];
  };
  function setStage(i, force) {
    if (i === stageIdx && !force) return;
    const change = i !== stageIdx;
    stageIdx = i;
    const id = COLD_STAGES[i].id;
    const apply = () => {
      titleEl.textContent = t(`cc.${id}.t`); descEl.textContent = t(`cc.${id}.d`);
      countEl.textContent = t('cc.stage', { n: i + 1, total });
    };
    if (change && !force && !state.reduced) gsap.fromTo(card, { opacity: 0.2, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', onStart: apply });
    else apply();
    stepBtns.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  }
  onLang(() => setStage(stageIdx < 0 ? 0 : stageIdx, true));
  setStage(0, true);

  /* scroll binding: the pin itself is created eagerly in core/coldpin.js so page height never changes after load */
  const st = state.cold?.st ?? null;
  stepBtns.forEach((b, i) => b.addEventListener('click', () => {
    if (st) {
      const y = st.start + stageU[i] * (st.end - st.start);
      if (state.lenis) state.lenis.scrollTo(y, { duration: 1.6 }); else scrollTo({ top: y, behavior: 'smooth' });
    } else target = stageU[i];
  }));

  const camTarget = V(0, 0.6, 0), camPos = V(-6, 4, 8);
  const tmp = V(0, 0, 0);
  registerView(canvas, (time, dt) => {
    if (st) target = state.cold.progress;
    u = damp(u, target, 5, dt);
    const uu = clamp(u, 0, 1);
    curve.getPointAt(uu, tmp);
    pod.position.copy(tmp);
    pod.position.y += 0.35 + Math.sin(time * 3) * 0.04;
    halo.scale.setScalar(1.5 + Math.sin(time * 4) * 0.2);
    tubeMat.uniforms.uT.value = time; tubeMat.uniforms.uU.value = uu;
    seaMat.uniforms.uT.value = time;

    // camera follows the pod with ease; closer zoom around each stage
    let nearest = 0, nd = 9;
    stageU.forEach((s, i) => { const d = Math.abs(s - uu); if (d < nd) { nd = d; nearest = i; } });
    setStage(nearest);
    const close = 1 - smooth(0.0, 0.09, nd) * 0.0; // keep composition steady, subtle zoom below
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const dist = (aspect < 1 ? 10.5 : 7.4) * (1 - 0.12 * (1 - smooth(0, 0.1, nd)));
    const wantPos = V(tmp.x + state.mouse.tx * 0.6, 3.1 + state.mouse.ty * -0.3, tmp.z + dist);
    camPos.x = damp(camPos.x, wantPos.x, 3, dt); camPos.y = damp(camPos.y, wantPos.y, 3, dt); camPos.z = damp(camPos.z, wantPos.z, 3, dt);
    camTarget.x = damp(camTarget.x, tmp.x, 3.5, dt);
    camera.position.copy(camPos);
    camera.lookAt(camTarget.x, 0.6, 0);
    seaMat.uniforms.uCx.value = camTarget.x;
    stageLight.position.set(tmp.x, 2.2, tmp.z + 1.2);

    // temperature readout
    const T = tempAt(uu);
    tempEl.textContent = `${T < 0 ? MINUS : '+'}${Math.abs(T).toFixed(1)} °C`;

    // ambient animation
    boat.position.y = 0.1 + Math.sin(time * 1.3) * 0.04; boat.rotation.z = Math.sin(time * 1.1) * 0.04;
    ship.position.y = 0.12 + Math.sin(time * 1.0 + 1) * 0.035; ship.rotation.z = Math.sin(time * 0.8) * 0.025;
    const pd = port.userData;
    const k = (Math.sin(time * 0.6) + 1) / 2;
    pd.trolley.position.z = 0.3 + k * 1.2;
    pd.hang.position.y = 0.55 + (1 - Math.abs(Math.sin(time * 0.6))) * 0.5;
    pd.line.scale.y = Math.max(0.1, 1.6 - pd.hang.position.y); pd.line.position.y = 1.85 - pd.line.scale.y * 0.5 + 0.0;
    for (let i = 0; i < MC; i++) {
      const s = mseed[i]; const p = (s.p + time * 0.08) % 1;
      mp[i * 3] = s.c + s.x; mp[i * 3 + 1] = 1.1 + p * 1.2; mp[i * 3 + 2] = -1 + s.z + 0.8;
    }
    mist.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  });
  return { dispose() { disposeTree(scene); renderer.dispose(); } };
}
