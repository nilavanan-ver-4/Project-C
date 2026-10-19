// Full-page deep-ocean scene: shader water volume (god rays, caustics, bioluminescence),
// drifting marine snow, and signature product models the camera passes while descending.
import { THREE, createRenderer, makeEnv, autoResize, smooth, clamp, damp, disposeTree } from './common.js';
import { getProductModel } from './models.js';
import { state } from '../core/state.js';
import { registerView } from '../core/loop.js';
import { audio } from '../core/audio.js';
import { isRTL } from '../i18n/index.js';

const BG_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
const BG_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uDepth, uSurf, uAspect, uRays, uCaust;
uniform vec2 uMouse;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
// tileable water caustics (after Dave_Hoskins / joltz0r)
float caustic(vec2 uv, float t){
  vec2 p = mod(uv*6.28318, 6.28318) - 250.; vec2 i = p; float c = 1.; float inten = .005;
  for (int n=0; n<4; n++){
    float tt = t*(1.-(3.5/float(n+1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1./length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten)));
  }
  c /= 4.; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.);
}
void main(){
  vec2 uv = vUv;
  float d = clamp(uDepth + (1.-uv.y)*0.09, 0., 1.);
  vec3 c0 = vec3(.10,.52,.62), c1 = vec3(.035,.20,.38), c2 = vec3(.016,.075,.17), c3 = vec3(.004,.016,.04);
  vec3 col = mix(c0, c1, smoothstep(0.,.3,d));
  col = mix(col, c2, smoothstep(.22,.66,d));
  col = mix(col, c3, smoothstep(.56,1.,d));

  // sea surface seen from below
  float sy = 0.80 + uSurf;
  float wave = sin(uv.x*9.+uTime*.9)*.012 + sin(uv.x*23.-uTime*1.3)*.005 + (fbm(vec2(uv.x*6., uTime*.2))-.5)*.03;
  float sd = uv.y - (sy + wave);
  float below = smoothstep(.015, -.03, sd);
  float above = 1. - below;

  // god rays from a sun above the surface
  vec2 sunp = vec2(.5 + uMouse.x*.07, sy + .38);
  vec2 q = uv - sunp; q.x *= uAspect;
  float ang = atan(q.x, -q.y);
  float dist = length(q);
  float s1 = noise(vec2(ang*7. + uTime*.12, uTime*.05));
  float s2 = noise(vec2(ang*17. - uTime*.09, 3.1 + uTime*.07));
  float s3 = noise(vec2(ang*41. + uTime*.2, 7.7));
  float shafts = smoothstep(.40, .88, s1*.5 + s2*.35 + s3*.15);
  shafts *= .72 + .28*noise(vec2(ang*30., uTime*1.1));
  float rays = shafts * exp(-dist*1.25) * (1. - smoothstep(0., .85, d));
  col += vec3(.55,.96,.95) * rays * uRays * .62 * below;

  // caustic light net near the surface
  if (uCaust > 0.01) {
    float c = caustic(uv*vec2(uAspect,1.)*1.35, uTime*.32);
    float m = (1. - smoothstep(0., .5, d)) * smoothstep(sy - .75, sy - .02, uv.y);
    col += vec3(.5,.95,.95) * c * m * uCaust * .5 * below;
  }
  // bioluminescent plankton clouds in the deep
  float bio = smoothstep(.52, .86, fbm(uv*vec2(uAspect,1.)*3. + vec2(uTime*.03, -uTime*.05)));
  col += vec3(.06,.85,.78) * bio * smoothstep(.42, 1., d) * .2;

  // underside of the surface
  float ripple = fbm(vec2(uv.x*8., (uv.y - sy)*34.) + uTime*.25);
  vec3 sfc = mix(vec3(.45,.9,.92), vec3(.88,1.,.98), ripple);
  sfc += pow(max(0., 1. - abs(sd)*38.), 2.) * vec3(.7,1.,.95);
  col = mix(col, sfc, above * smoothstep(0., .035, sd) * .92 + above * .08);
  col += pow(max(0., 1. - abs(sd)*55.), 3.) * vec3(.6,1.,.95) * .8;

  col += (hash(uv*vec2(1920.,1080.) + fract(uTime)) - .5) * .014;
  gl_FragColor = vec4(col, 1.);
}`;

const SNOW_VERT = /* glsl */ `
attribute vec4 aRand;
uniform float uTime, uCamY, uRange, uSize, uPx, uDepth;
varying float vA; varying vec3 vCol;
void main(){
  vec3 p = position;
  float R = uRange;
  p.x += sin(uTime*.2 + aRand.w*6.28)*.35;
  p.z += cos(uTime*.17 + aRand.w*9.)*.35;
  p.y = uCamY + mod(p.y - uCamY + R*.5 - uTime*.09*(.4+aRand.w), R) - R*.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float tw = .65 + .35*sin(uTime*(.6+aRand.w*2.) + aRand.w*40.);
  gl_PointSize = uSize * uPx * (.35 + aRand.w*.9) * (8. / -mv.z) * tw;
  float edge = 1. - smoothstep(.3, .5, abs(p.y - uCamY)/R);
  vA = edge * (.3 + .55*aRand.w);
  vCol = mix(vec3(.86,.98,1.), vec3(.3,1.,.9), step(.72, aRand.w) * smoothstep(.15, .8, uDepth));
}`;
const SNOW_FRAG = /* glsl */ `
varying float vA; varying vec3 vCol;
void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); gl_FragColor = vec4(vCol, a*a*vA); }`;

const shallow = [0.10, 0.52, 0.62], mid = [0.035, 0.20, 0.38], deep = [0.016, 0.075, 0.17], abyss = [0.004, 0.016, 0.04];
const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function waterRGB(d) {
  let c = mix3(shallow, mid, smooth(0, 0.3, d));
  c = mix3(c, deep, smooth(0.22, 0.66, d));
  return mix3(c, abyss, smooth(0.56, 1, d));
}

export async function initOcean(canvas, { onProgress } = {}) {
  const full = state.tier === 'full';
  const renderer = createRenderer(canvas, { exposure: 1.0, antialias: full });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  const DIST = 8;
  camera.position.set(0, 0, DIST);
  scene.environment = makeEnv(renderer, 0.06);
  scene.environmentIntensity = 0.7;
  scene.fog = new THREE.FogExp2(0x0a3a58, 0.055);

  const visH = () => 2 * DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let aspect = 1;

  /* water volume */
  const bgU = { uTime: { value: 0 }, uDepth: { value: 0 }, uSurf: { value: 0 }, uAspect: { value: 1 }, uRays: { value: 1 }, uCaust: { value: full ? 1 : 0.55 }, uMouse: { value: new THREE.Vector2() } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: bgU, depthTest: false, depthWrite: false, toneMapped: false }));
  bg.frustumCulled = false; bg.renderOrder = -10;
  scene.add(bg);

  /* marine snow / plankton */
  const N = full ? 1500 : 520, R = 15;
  const pos = new Float32Array(N * 3), rand = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pos.set([(Math.random() - 0.5) * 20, (Math.random() - 0.5) * R, -13 + Math.random() * 17], i * 3);
    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  const snowU = { uTime: { value: 0 }, uCamY: { value: 0 }, uRange: { value: R }, uSize: { value: 34 }, uPx: { value: 1 }, uDepth: { value: 0 } };
  const snow = new THREE.Points(sg, new THREE.ShaderMaterial({ vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, uniforms: snowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  snow.frustumCulled = false;
  scene.add(snow);

  /* lights */
  scene.add(new THREE.HemisphereLight(0xa6ecff, 0x06213a, 0.9));
  const key = new THREE.DirectionalLight(0xdff6ff, 1.8); key.position.set(-3, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(0x39e6d0, 30, 14, 1.6); rim.position.set(2, 1, -3); scene.add(rim);
  const glint = new THREE.PointLight(0xffe1a0, 18, 9, 1.8); scene.add(glint);

  /* swimmers: models that sit beside each "dive" caption */
  const items = [...document.querySelectorAll('.dive-item[data-model]')];
  const swimmers = items.map((el) => ({ el, id: el.dataset.model, side: el.dataset.side, obj: null, y: 0, x: 0, base: 1, vis: 0, spin: Math.random() * 6 }));
  function layout() {
    const vh = innerHeight, H = visH(), W = H * aspect;
    const portrait = aspect < 0.95;
    const narrow = innerWidth < 720;
    for (const s of swimmers) {
      const r = s.el.getBoundingClientRect();
      const docCenter = r.top + scrollY + r.height / 2;
      s.y = -((docCenter - vh / 2) / vh) * H - (narrow ? H * 0.2 : 0);
      const dir = (s.side === 'start' ? 1 : -1) * (isRTL() ? -1 : 1);
      s.x = portrait ? 0 : dir * W * 0.245;
      s.base = portrait ? Math.min(0.95, W / 3.6) : Math.min(1.15, H / 4.4);
    }
  }
  const disposeResize = autoResize(renderer, camera, canvas, { self: true, dprCap: full ? 1.5 : 1, onResize: (w, h) => { aspect = w / h; bgU.uAspect.value = aspect; snowU.uPx.value = renderer.getPixelRatio(); layout(); } });
  addEventListener('load', layout);
  new ResizeObserver(layout).observe(document.body);

  const q = full ? 1 : 0.6;
  let loaded = 0;
  swimmers.forEach(async (s, i) => {
    try {
      const obj = await getProductModel(s.id, q);
      obj.visible = false;
      s.obj = obj;
      scene.add(obj);
    } catch (e) { console.warn('[ocean] model failed', s.id, e); }
    onProgress?.(++loaded / swimmers.length);
  });
  if (!swimmers.length) onProgress?.(1);

  layout();
  const view = registerView(canvas, (t, dt) => {
    const vh = state.vh || innerHeight, H = visH();
    const sv = state.scroll / vh;
    const depth = state.progress;
    const camY = -sv * H;
    // camera: descends with scroll; parallax with pointer
    camera.position.x = damp(camera.position.x, state.mouse.tx * 0.45, 3, dt);
    camera.position.y = camY + state.mouse.ty * -0.22;
    camera.rotation.x = 0.26 * (1 - smooth(0, 1.1, sv)) + state.mouse.ty * -0.015;
    camera.rotation.y = state.mouse.tx * -0.025;

    bgU.uTime.value = t; bgU.uDepth.value = depth; bgU.uSurf.value = sv * 1.15;
    bgU.uRays.value = (full ? 1 : 0.85) * (state.paused ? 1 : 1);
    bgU.uMouse.value.set(state.mouse.tx, state.mouse.ty);
    snowU.uTime.value = t; snowU.uCamY.value = camY; snowU.uDepth.value = depth;

    const w = waterRGB(clamp(depth + 0.04, 0, 1));
    scene.fog.color.setRGB(w[0], w[1], w[2], THREE.SRGBColorSpace);
    key.intensity = 1.8 - depth * 1.0; rim.intensity = 30 + depth * 30;
    audio.setDepth(depth);

    let nearest = null, nd = 9;
    for (const s of swimmers) {
      if (!s.obj) continue;
      const rel = (s.y - camY) / H; // −0.5…0.5 on screen
      const a = Math.abs(rel);
      const on = a < 1.0;
      s.obj.visible = on;
      if (!on) continue;
      const k = 1 - smooth(0.45, 0.95, a);
      s.vis = damp(s.vis, k, 6, dt);
      const sc = s.base * (0.55 + 0.45 * s.vis);
      s.obj.scale.setScalar(sc);
      s.spin += dt * 0.32;
      s.obj.position.set(s.x + Math.sin(t * 0.5 + s.y) * 0.08 + state.mouse.tx * 0.12, s.y + Math.sin(t * 0.7 + s.y) * 0.1, 0);
      s.obj.rotation.y = s.spin + state.mouse.tx * 0.9;
      s.obj.rotation.x = state.mouse.ty * 0.25;
      s.obj.rotation.z = Math.sin(t * 0.4 + s.y) * 0.06;
      if (a < nd) { nd = a; nearest = s; }
    }
    if (nearest) {
      const p = nearest.obj.position;
      glint.position.set(p.x + Math.cos(t * 0.9) * 2.2, p.y + 1 + Math.sin(t * 1.3) * 0.8, 2.2);
      glint.intensity = 14 + Math.sin(t * 2.4) * 6;
    }
    renderer.render(scene, camera);
  }, { always: true });

  // compile once up front so the first visible frame doesn't hitch
  renderer.compile(scene, camera);
  canvas.classList.add('on');

  return {
    refresh: layout,
    dispose() {
      view && (view.visible = false);
      disposeResize();
      disposeTree(scene);
      renderer.dispose();
    },
  };
}
