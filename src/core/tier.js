function webglOK() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    // Software rasterisers (SwiftShader / llvmpipe) can't sustain the scenes — use the lightweight static experience.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|software/i.test(name);
  } catch {
    return false;
  }
}

/** Decide how much 3D to run. ?tier=full|lite|static overrides (handy for QA). */
export function detectTier() {
  const forced = new URLSearchParams(location.search).get('tier');
  if (['full', 'lite', 'static'].includes(forced)) return forced;
  if (navigator.connection?.saveData) return 'static';
  if (!webglOK()) return 'static';
  const smallScreen = matchMedia('(max-width: 820px)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  return smallScreen || touch || weak ? 'lite' : 'full';
}
