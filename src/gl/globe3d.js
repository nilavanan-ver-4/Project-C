import { THREE, createRenderer, autoResize, damp, clamp, disposeTree } from './common.js';
import { state } from '../core/state.js';
import { registerView } from '../core/loop.js';
import { REGIONS, ALL_DESTINATIONS, regionBySlug } from '../data/regions.js';
import { HQ } from '../config.js';
import { country } from '../i18n/index.js';
import gsap from 'gsap';

const $ = (s) => document.querySelector(s);
const toVec = (lat, lon, r = 1) => {
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
};
const angleBetween = (a, b) => a.clone().normalize().angleTo(b.clone().normalize());

async function landMask() {
  const [{ feature }, landTopo] = await Promise.all([import('topojson-client'), import('world-atlas/land-110m.json')]);
  const topo = landTopo.default;
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  const f = feature(topo, topo.objects.land);
  const polys = f.features ? f.features.flatMap((x) => x.geometry.coordinates) : (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]);
  for (const poly of polys) {
    // unwrap longitudes so rings that cross the antimeridian don't paint a band across the map
    const rings = poly.map((ring) => { let off = 0, prev = ring[0][0]; return ring.map(([lon, lat]) => { if (lon - prev > 180) off -= 360; else if (prev - lon > 180) off += 360; prev = lon; return [lon + off, lat]; }); });
    for (const shift of [-360, 0, 360]) {
      g.beginPath();
      for (const ring of rings) ring.forEach(([lon, lat], i) => { const x = ((lon + shift + 180) / 360) * W, y = ((90 - lat) / 180) * H; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.fill('evenodd');
    }
  }
  const data = g.getImageData(0, 0, W, H).data;
  return (lat, lon) => {
    const x = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W)));
    const y = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
    return data[(y * W + x) * 4] > 127;
  };
}

export async function initGlobe() {
  const canvas = $('#globeCanvas');
  const full = state.tier === 'full';
  const renderer = createRenderer(canvas, { exposure: 1.0 });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  let camDist = 4.6;
  autoResize(renderer, camera, canvas, { dprCap: 2, onResize: (w, h) => { camDist = h / w > 1.05 ? 6.6 : 5.6; camera.position.set(0, 0, camDist); } });

  const globe = new THREE.Group();
  scene.add(globe);

  /* body */
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.992, 64, 48), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ vec3 n = normalize(vN); float f = pow(1.-max(dot(n, vec3(0,0,1)),0.), 2.2); float l = max(dot(n, normalize(vec3(-.5,.6,.7))),0.); vec3 c = mix(vec3(.012,.05,.10), vec3(.03,.20,.28), f*.8) + vec3(.02,.07,.1)*l; gl_FragColor = vec4(c,1.); }',
  })));
  const atmos = new THREE.Mesh(new THREE.SphereGeometry(1.16, 48, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(max(0., .72 - dot(vN, vec3(0,0,1))), 3.); gl_FragColor = vec4(vec3(.2,.9,.85)*i*.55, i*.55); }',
  }));
  scene.add(atmos);

  /* graticule */
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4ee8d6, transparent: true, opacity: 0.07 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = []; for (let i = 0; i <= 96; i++) pts.push(toVec(lat, (i / 96) * 360 - 180, 1.002));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const pts = []; for (let i = 0; i <= 64; i++) pts.push(toVec(-90 + (i / 64) * 180, lon, 1.002));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }

  /* land dots */
  const isLand = await landMask();
  const N = full ? 70000 : 24000;
  const pos = [], ll = [];
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2, r = Math.sqrt(1 - y * y), phi = i * GA;
    const x = Math.cos(phi) * r, z = Math.sin(phi) * r;
    const lat = THREE.MathUtils.radToDeg(Math.asin(y)), lon = THREE.MathUtils.radToDeg(Math.atan2(x, z));
    if (lat < -58 || !isLand(lat, lon)) continue;
    pos.push(x * 1.003, y * 1.003, z * 1.003); ll.push(lat, lon);
  }
  const count = pos.length / 3;
  const hi = new Float32Array(count);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  dg.setAttribute('aHi', new THREE.BufferAttribute(hi, 1));
  const dotU = { uPx: { value: 1 }, uT: { value: 0 } };
  const dots = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: dotU, transparent: true, depthWrite: false,
    vertexShader: `attribute float aHi; uniform float uPx, uT; varying float vF, vHi;
      void main(){ vec3 wn = normalize(mat3(modelMatrix)*position); vF = smoothstep(-.05,.55,dot(wn, normalize(cameraPosition))); vHi = aHi;
        vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = (1.9 + aHi*1.4) * uPx * (5.6/ -mv.z); }`,
    fragmentShader: 'varying float vF, vHi; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.15,d); vec3 c = mix(vec3(.66,.93,.95), vec3(1.,.82,.45), vHi); gl_FragColor = vec4(c, a*(.16+.84*vF)*(.8+.2*vHi)); }',
  }));
  globe.add(dots);
  const resizePx = () => (dotU.uPx.value = renderer.getPixelRatio());
  resizePx(); new ResizeObserver(resizePx).observe(canvas);

  const dotVec = []; for (let i = 0; i < count; i++) dotVec.push(new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  function paintHighlight(list) {
    const vecs = list.map((d) => toVec(d.lat, d.lon));
    const cut = Math.cos(THREE.MathUtils.degToRad(full ? 7 : 8));
    for (let i = 0; i < count; i++) { let h = 0; for (const v of vecs) if (v.dot(dotVec[i]) > cut) { h = 1; break; } hi[i] = h; }
    dg.attributes.aHi.needsUpdate = true;
  }

  /* hub, destinations, arcs */
  const hubV = toVec(HQ.lat, HQ.lon);
  const markers = [], hitMeshes = [];
  const gold = new THREE.Color(0xe0be7a), teal = new THREE.Color(0x4ee8d6);
  const hub = new THREE.Group(); hub.position.copy(hubV); hub.lookAt(hubV.clone().multiplyScalar(2));
  hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), new THREE.MeshBasicMaterial({ color: gold })));
  const hubRing = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.05, 40), new THREE.MeshBasicMaterial({ color: gold, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  hub.add(hubRing); globe.add(hub);

  const arcU = { uT: { value: 0 } };
  ALL_DESTINATIONS.forEach((d, idx) => {
    const v = toVec(d.lat, d.lon);
    const g = new THREE.Group(); g.position.copy(v); g.lookAt(v.clone().multiplyScalar(2));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), new THREE.MeshBasicMaterial({ color: teal }));
    const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 32), new THREE.MeshBasicMaterial({ color: teal, transparent: true, depthWrite: false, side: THREE.DoubleSide })); g.add(m); return m; });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.dest = d; g.add(dot, hit); globe.add(g); hitMeshes.push(hit);

    // arc along the great circle, lifted proportionally to distance
    const ang = angleBetween(hubV, v);
    const pts = [];
    const ax = hubV.clone().normalize(), bx = v.clone().normalize();
    for (let i = 0; i <= 56; i++) {
      const k = i / 56;
      const p = new THREE.Vector3().copy(ax).lerp(bx, k).normalize().multiplyScalar(1.004 + Math.sin(Math.PI * k) * (0.06 + 0.3 * (ang / Math.PI)));
      pts.push(p);
    }
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: arcU.uT, uHi: { value: 1 }, uPh: { value: (idx * 0.137) % 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec2 vUv; uniform float uT, uHi, uPh; void main(){ float d = fract(vUv.x - fract(uT*.18 + uPh) + .5) - .5; float pulse = exp(-d*d*520.); vec3 c = mix(vec3(1.,.82,.45), vec3(.3,1.,.9), vUv.x); float a = (.22 + pulse*1.1) * uHi; gl_FragColor = vec4(c*(.7+pulse), a); }',
    });
    const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0042, 5, false), mat);
    globe.add(arc);
    markers.push({ d, group: g, dot, rings, arc, mat, v });
  });

  /* label tooltip */
  const tip = $('#globeTip');
  const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let tipDest = null;
  function showTip(d) {
    tipDest = d;
    if (!d) { tip.classList.remove('on'); return; }
    tip.textContent = `${country(d.cc)} · ${d.port}`;
    tip.classList.add('on');
  }
  function placeTip() {
    if (!tipDest) return;
    const m = markers.find((x) => x.d === tipDest);
    const p = m.v.clone().applyMatrix4(globe.matrixWorld).project(camera);
    const behind = m.v.clone().applyMatrix4(globe.matrixWorld).normalize().z < 0.05;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    tip.style.left = `${(p.x * 0.5 + 0.5) * w}px`;
    tip.style.top = `${(-p.y * 0.5 + 0.5) * h}px`;
    tip.style.opacity = behind ? 0 : 1;
  }

  /* rotation state + interaction */
  const rot = { x: 0.3, y: -1.1 };
  let vx = 0, vy = 0, dragging = false, lx = 0, ly = 0, idle = 0, moved = 0, focusing = false;
  const wrap = canvas.parentElement;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; idle = 0; focusing = false; gsap.killTweensOf(rot); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (dragging) {
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy); idle = 0;
      vy = dx * 0.006; vx = dy * 0.006; rot.y += vy; rot.x = clamp(rot.x + vx, -1.2, 1.2);
    } else {
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const h = raycaster.intersectObjects(hitMeshes.filter((m) => m.parent.visible))[0];
      const front = h && h.point.clone().normalize().z > 0;
      canvas.style.cursor = front ? 'pointer' : '';
      if (front) showTip(h.object.userData.dest); else if (!selected) showTip(null);
    }
  });
  const up = (e) => {
    if (!dragging) return; dragging = false;
    if (moved < 6) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const h = raycaster.intersectObjects(hitMeshes.filter((m) => m.parent.visible))[0];
      if (h) { const d = h.object.userData.dest; document.querySelector(`#destList [data-cc="${d.cc}"]`)?.click(); }
    }
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', () => (dragging = false));
  let selected = null;

  function rotateTo(lat, lon, instant) {
    const ty = -THREE.MathUtils.degToRad(lon);
    let cy = rot.y % (Math.PI * 2); const shortest = ((ty - cy + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const to = { x: THREE.MathUtils.degToRad(lat) * 0.8, y: rot.y + shortest };
    focusing = true; idle = 0; vx = vy = 0;
    if (instant || state.reduced) { rot.x = to.x; rot.y = to.y; return; }
    gsap.to(rot, { ...to, duration: 1.6, ease: 'power3.inOut', onComplete: () => (focusing = false) });
  }

  const api = {
    setRegion(slug, { instant } = {}) {
      selected = null; showTip(null);
      const list = slug === 'all' ? ALL_DESTINATIONS : regionBySlug[slug].destinations.map((d) => ({ ...d }));
      paintHighlight(list);
      markers.forEach((m) => { const on = slug === 'all' || m.d.region === slug; m.group.userData.on = on; gsap.to(m.mat.uniforms.uHi, { value: on ? 1 : 0.08, duration: 0.8 }); m.dot.material.opacity = 1; m.dot.scale.setScalar(on ? 1 : 0.55); });
      if (slug === 'all') rotateTo(HQ.lat * 0.6 + 12, 40, instant); else rotateTo(regionBySlug[slug].centroid[0], regionBySlug[slug].centroid[1], instant);
    },
    focusDest(cc) {
      const d = ALL_DESTINATIONS.find((x) => x.cc === cc);
      if (!d) return;
      selected = d; showTip(d); rotateTo(d.lat, d.lon);
    },
    refreshLabels() { if (tipDest) showTip(tipDest); },
  };

  const view = registerView(canvas, (t, dt) => {
    idle += dt;
    if (!dragging) {
      rot.y += vy; rot.x = clamp(rot.x + vx, -1.2, 1.2); vx *= Math.pow(0.03, dt); vy *= Math.pow(0.03, dt);
      if (!focusing && idle > 3 && !state.paused && !state.reduced) rot.y += dt * 0.07;
    }
    globe.rotation.set(rot.x, rot.y, 0);
    arcU.uT.value = t;
    dotU.uT.value = t;
    // pulses
    const s = (t * 0.7) % 1;
    markers.forEach((m, i) => {
      const on = m.group.userData.on !== false;
      m.rings.forEach((r, k) => { const p = (s + k * 0.5) % 1; r.scale.setScalar(0.6 + p * 1.8); r.material.opacity = on ? (1 - p) * 0.8 : 0; });
    });
    const hp = (t * 0.5) % 1; hubRing.scale.setScalar(0.7 + hp * 2.8); hubRing.material.opacity = (1 - hp) * 0.9;
    placeTip();
    renderer.render(scene, camera);
  });

  return { ...api, dispose() { view.visible = false; disposeTree(scene); renderer.dispose(); } };
}
