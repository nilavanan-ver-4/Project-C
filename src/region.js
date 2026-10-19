import './styles/main.css';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource-variable/outfit';
import { state } from './core/state.js';
import { initScroll, ScrollTrigger } from './core/scroll.js';
import { initCursor, initTilt, initMagnetic, initClickFx, initReveal } from './core/fx.js';
import { initI18n, setLang, getLang, onLang } from './i18n/index.js';

(async () => {
  await initI18n();
  initScroll();
  initCursor(); initTilt(); initMagnetic(); initClickFx();
  const sel = document.getElementById('langSelect');
  sel.value = getLang();
  sel.addEventListener('change', () => setLang(sel.value));
  onLang((c) => (sel.value = c));
  initReveal();
  ScrollTrigger.refresh();
})().catch((e) => { console.error(e); document.documentElement.classList.remove('js'); });
