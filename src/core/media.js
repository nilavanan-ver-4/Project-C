import { MEDIA } from '../data/media.js';
import { t, onLang } from '../i18n/index.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function initMedia() {
  const shots = $$('#gallery .shot');
  const dlg = $('#lightbox');
  if (!shots.length) return;
  let idx = 0;

  const caption = (i) => t(`media.g${i + 1}`);
  const label = () => shots.forEach((b, i) => b.setAttribute('aria-label', t('media.open', { caption: caption(i) })));

  // real photography replaces the sample posters
  shots.forEach((b, i) => {
    const ph = MEDIA.photos[i];
    if (!ph?.src) return;
    const img = new Image();
    img.src = ph.src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.width = ph.width; img.height = ph.height;
    b.querySelector('.poster').replaceChildren(img);
    b.querySelector('.badge')?.remove();
  });

  function show(i) {
    idx = (i + shots.length) % shots.length;
    const ph = MEDIA.photos[idx];
    const stage = $('#lbStage');
    stage.replaceChildren();
    if (ph.src) {
      const img = new Image(); img.src = ph.src; img.alt = caption(idx); img.decoding = 'async';
      stage.append(img);
    } else {
      const poster = shots[idx].querySelector('.poster').cloneNode(true);
      poster.classList.add('big');
      poster.style.setProperty('--h', shots[idx].style.getPropertyValue('--h'));
      stage.append(poster);
    }
    $('#lbCap').textContent = caption(idx);
  }
  const open = (i) => { show(i); if (!dlg.open) dlg.showModal(); };

  shots.forEach((b, i) => b.addEventListener('click', () => open(i)));
  $('#lbClose').addEventListener('click', () => dlg.close());
  $('#lbPrev').addEventListener('click', () => show(idx + (document.dir === 'rtl' ? 1 : -1)));
  $('#lbNext').addEventListener('click', () => show(idx + (document.dir === 'rtl' ? -1 : 1)));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') $('#lbNext').click();
    if (e.key === 'ArrowLeft') $('#lbPrev').click();
  });

  // films: privacy-friendly facade, iframe only after click
  $$('.vid').forEach((card) => {
    const v = MEDIA.videos.find((x) => x.id === card.dataset.video);
    const btn = $('.vid-play', card);
    if (!v?.youtubeId) return;
    btn.disabled = false;
    $('.soon', card)?.remove();
    if (v.poster) btn.querySelector('.poster').style.background = `center / cover url(${v.poster})`;
    const title = () => t(`media.${v.id}`);
    const lab = () => btn.setAttribute('aria-label', t('media.play', { title: title() }));
    lab(); onLang(lab);
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1&rel=0`;
      f.title = title(); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.className = 'vid-frame';
      btn.replaceWith(f);
    });
  });

  // downloads: direct file when provided, otherwise the link falls through to the quote form
  $$('[data-dl]').forEach((a) => {
    const d = MEDIA.downloads.find((x) => x.id === a.dataset.dl);
    if (d?.file) { a.href = d.file; a.setAttribute('download', ''); a.removeAttribute('data-prefill'); }
  });

  label(); onLang(label);
}
