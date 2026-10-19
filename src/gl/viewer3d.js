import { THREE, createRenderer, makeEnv, autoResize, damp, clamp, dotTexture, disposeTree } from './common.js';
import { getProductModel } from './models.js';
import { state } from '../core/state.js';
import { registerView } from '../core/loop.js';
import gsap from 'gsap';

const $ = (s) => document.querySelector(s);

export async function initViewer3D() {
  const canvas = $('#viewerCanvas');
  const full = state.tier === 'full';
  const renderer = createRenderer(canvas, { exposure: 1.1 });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  scene.environment = makeEnv(renderer, 0.03);
  scene.environmentIntensity = 0.75;

  let dist = 7;
  const fitCamera = (w, h) => { dist = h / w > 0.95 ? 8.2 : 5.9; camera.position.set(0, 0.35, dist); camera.lookAt(0, -0.05, 0); };
  autoResize(renderer, camera, canvas, { dprCap: 2, onResize: fitCamera });

  // lights
  scene.add(new THREE.HemisphereLight(0xcdefff, 0x0a2440, 0.45));
  const key = new THREE.SpotLight(0xfff4e0, 55, 20, 0.6, 0.6, 1.6); key.position.set(-3.5, 5, 4.5); scene.add(key);
  const rim = new THREE.PointLight(0x4ee8d6, 40, 14, 1.6); rim.position.set(3.2, 1.2, -3); scene.add(rim);
  const gold = new THREE.PointLight(0xe0be7a, 26, 10, 1.8); scene.add(gold);

  // pedestal glow
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float uT; void main(){ float r = length(vUv-.5)*2.; float a = pow(max(0.,1.-r),2.2)*.55; float ring = smoothstep(.04,0.,abs(r-.62-.02*sin(uT*1.4)))*.5; float k = a + ring; gl_FragColor = vec4(vec3(.2,.9,.82), k); }',
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = -1.5; scene.add(glow);

  // sparkle motes
  const M = full ? 110 : 40, mp = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) mp.set([(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4.2, (Math.random() - 0.5) * 4], i * 3);
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xaef7ee, opacity: 0.8 }));
  scene.add(motes);

  const holder = new THREE.Group();
  scene.add(holder);
  const cache = new Map();
  let active = null, activeId = null, token = 0;
  const q = full ? 1 : 0.6;

  async function setProduct(id, { instant = false } = {}) {
    if (id === activeId) return;
    activeId = id;
    const my = ++token;
    const leaving = active;
    if (leaving) gsap.to(leaving.scale, { x: 0.001, y: 0.001, z: 0.001, duration: instant ? 0 : 0.35, ease: 'power2.in', onComplete: () => (leaving.visible = false) });
    let m = cache.get(id);
    if (!m) { m = await getProductModel(id, q); cache.set(id, m); holder.add(m); }
    if (my !== token) return;
    m.visible = true;
    active = m;
    m.scale.setScalar(0.001);
    m.rotation.y = 0;
    gsap.to(m.scale, { x: 1, y: 1, z: 1, duration: instant ? 0 : 1.1, delay: instant ? 0 : 0.25, ease: 'back.out(1.5)' });
    if (!instant) gsap.fromTo(m.rotation, { y: -1.8 }, { y: 0, duration: 1.3, delay: 0.2, ease: 'power3.out' });
  }

  /* interaction: drag / keys / buttons */
  let yaw = 0.6, vel = 0, dragging = false, lastX = 0, idle = 0, auto = true;
  const stage = $('#viewerStage');
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; idle = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; vel = (e.clientX - lastX) * 0.012; yaw += vel; lastX = e.clientX; idle = 0; });
  const end = () => (dragging = false);
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  const nudge = (d) => { vel += d; idle = 0; };
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { nudge(-0.18); e.preventDefault(); } else if (e.key === 'ArrowRight') { nudge(0.18); e.preventDefault(); }
  });
  $('#vRotL').addEventListener('click', () => nudge(-0.35));
  $('#vRotR').addEventListener('click', () => nudge(0.35));
  const autoBtn = $('#vAuto');
  autoBtn.addEventListener('click', () => { auto = !auto; autoBtn.setAttribute('aria-pressed', auto); });

  // cursor tilt relative to the stage
  let hx = 0, hy = 0, tx = 0, ty = 0;
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  const view = registerView(canvas, (t, dt) => {
    idle += dt;
    if (!dragging) { yaw += vel; vel *= Math.pow(0.04, dt); if (auto && idle > 1.5 && !state.paused && !state.reduced) yaw += dt * 0.55; }
    hx = damp(hx, tx, 5, dt); hy = damp(hy, ty, 5, dt);
    holder.rotation.y = yaw + hx * 0.5;
    holder.rotation.x = hy * 0.22;
    holder.position.y = Math.sin(t * 0.9) * 0.06;
    glowMat.uniforms.uT.value = t;
    gold.position.set(Math.cos(t * 0.8) * 3, 1.2 + Math.sin(t * 1.1) * 0.6, Math.sin(t * 0.8) * 3 + 1);
    gold.intensity = 14 + Math.sin(t * 2.2) * 6; // glisten
    motes.rotation.y = t * 0.05;
    motes.position.y = Math.sin(t * 0.3) * 0.1;
    renderer.render(scene, camera);
  });

  return { setProduct, dispose() { view.visible = false; disposeTree(scene); renderer.dispose(); } };
}
