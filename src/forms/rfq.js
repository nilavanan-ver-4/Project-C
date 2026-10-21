import { PRODUCTS, productById } from '../data/products.js';
import { REGIONS, regionBySlug } from '../data/regions.js';
import { CURRENCIES } from '../data/story.js';
import { CONTACT, MOQ, FX, FX_AS_OF } from '../config.js';
import en from '../i18n/en.js';
import { t, onLang, getLang, country } from '../i18n/index.js';
import { interpolate } from '../i18n/shared.js';
import gsap from 'gsap';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const tEn = (k, v) => interpolate(en[k] ?? k, v);
const TOTAL = 5;
let step = 1;
let form;

const unitMT = { kg: 0.001, mt: 1, c20: MOQ.container20MT, c40: MOQ.container40MT };

function buildDest() {
  const sel = $('#dest');
  const prev = sel.value;
  const opt = (v, label) => `<option value="${v}">${label}</option>`;
  sel.innerHTML = opt('', t('f.dest.pick')) + REGIONS.map((r) =>
    `<optgroup label="${t(`reg.${r.slug}`)}">${r.destinations.map((d) => opt(d.cc, country(d.cc))).join('')}</optgroup>`).join('') + opt('OTHER', t('f.dest.other'));
  sel.value = prev;
}

function buildCurrencies() {
  const sel = $('#cur');
  const prev = sel.value || 'USD';
  let names;
  try { names = new Intl.DisplayNames([getLang()], { type: 'currency' }); } catch {}
  sel.innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c} — ${names?.of(c) ?? c}</option>`).join('');
  sel.value = prev;
}

const fmtMoney = (v, cur) => { try { return new Intl.NumberFormat(getLang(), { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v); } catch { return `${cur} ${v}`; } };

function updatePriceHint() {
  const price = parseFloat($('#price').value);
  const cur = $('#cur').value;
  const hint = $('#priceHint');
  if (!(price > 0)) { hint.textContent = ''; return; }
  const usd = price / (FX[cur] || 1);
  hint.textContent = cur === 'USD' ? '' : t('f.approx', { usd: fmtMoney(usd, 'USD'), asof: FX_AS_OF });
}

function updateMoq() {
  const qty = parseFloat($('#qty').value);
  const mt = qty * (unitMT[$('#unit').value] ?? 1);
  const w = $('#moqWarn');
  if (qty > 0 && mt < MOQ.lclMT) { w.hidden = false; w.textContent = t('f.moqWarn', { moq: MOQ.lclMT }); } else w.hidden = true;
}

function values() {
  const fd = new FormData(form);
  const v = Object.fromEntries(fd.entries());
  v.products = fd.getAll('products');
  return v;
}

function labelOf(sel, value) { return $(`${sel} option[value="${value}"]`)?.textContent ?? value; }

function summaryRows(v, tt = t, enLabels = false) {
  const tr = enLabels ? tEn : t;
  const none = tr('f.sum.none');
  const prods = v.products.map((id) => (enLabels ? tEn(`p.${id}.name`) : t(`p.${id}.name`))).join(', ') || none;
  const destName = v.dest === 'OTHER' ? tr('f.dest.other') : v.dest ? (enLabels ? new Intl.DisplayNames(['en'], { type: 'region' }).of(v.dest) : country(v.dest)) : none;
  const unitLbl = enLabels ? tEn(`f.u.${v.unit}`) : t(`f.u.${v.unit}`);
  const payLbl = tr(`f.pay.${v.pay}`);
  const freqLbl = tr(`f.freq.${v.freq}`);
  const roleLbl = tr(`f.role.${v.role}`);
  const price = parseFloat(v.price) > 0 ? `${fmtMoney(parseFloat(v.price), v.cur)} / kg` : none;
  return [
    [tr('f.sum.products'), prods],
    [tr('f.sum.volume'), `${v.qty || '—'} ${unitLbl} · ${freqLbl}`],
    [tr('f.sum.terms'), `${v.inco} · ${destName}${v.port ? ` (${v.port})` : ''}${v.date ? ` · ${v.date}` : ''} · ${payLbl}`],
    [tr('f.sum.price'), `${price} · ${v.cur}`],
    [tr('f.sum.company'), `${v.company} · ${roleLbl}`],
    [tr('f.sum.contact'), `${v.name} · ${v.email}${v.phone ? ` · ${v.phone}` : ''}`],
    ...(v.msg ? [['✎', v.msg]] : []),
  ];
}

function plainText(v) {
  const lines = summaryRows(v, t, true).map(([k, val]) => `${k}: ${val}`);
  return [t('f.mail.greet'), '', t('f.mail.intro'), '', ...lines, '', `(${getLang()})`].join('\n');
}

function renderReview() {
  const v = values();
  $('#summary').innerHTML = summaryRows(v).map(([k, val]) => `<div><dt>${k}</dt><dd></dd></div>`).join('');
  $$('#summary dd').forEach((dd, i) => (dd.textContent = summaryRows(v)[i][1]));
  const body = plainText(v);
  const subject = t('f.mail.subject', { products: v.products.map((id) => tEn(`p.${id}.name`)).join(', ') });
  $('#sendMail').href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#sendWa').href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`${subject}\n\n${body}`)}`;
  $('#sentNote').hidden = true;
}

function setErr(input, key) {
  const err = input.closest('.field')?.querySelector('.err') || (input.id === 'consent' ? $('#err-consent') : null);
  if (!err) return;
  if (key) {
    err.hidden = false; err.textContent = t(key);
    if (!err.id) err.id = `err-${input.id}`;
    input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id);
  } else { err.hidden = true; input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
}

function validate(n) {
  let ok = true, first = null;
  const bad = (el, key) => { ok = false; setErr(el, key); first ||= el; };
  if (n === 1) {
    const any = $$('input[name=products]:checked').length > 0;
    const e = $('#err-products'); e.hidden = any; if (!any) { e.textContent = t('f.err.products'); ok = false; first = $('input[name=products]'); }
  }
  if (n === 2) {
    const q = $('#qty'); setErr(q, null);
    if (!(parseFloat(q.value) > 0)) bad(q, 'f.err.required');
    const d = $('#dest'); setErr(d, null);
    if (!d.value) bad(d, 'f.err.required');
  }
  if (n === 4) {
    ['company', 'name'].forEach((id) => { const el = $('#' + id); setErr(el, null); if (!el.value.trim()) bad(el, 'f.err.required'); });
    const em = $('#email'); setErr(em, null);
    if (!em.value.trim()) bad(em, 'f.err.required'); else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) bad(em, 'f.err.email');
    const c = $('#consent'); const ce = $('#err-consent'); ce.hidden = c.checked; if (!c.checked) { ce.textContent = t('f.err.consent'); ok = false; first ||= c; }
  }
  if (first) first.focus();
  return ok;
}

function show(n, { focus = true } = {}) {
  step = n;
  $$('fieldset.step', form).forEach((fs) => { fs.hidden = Number(fs.dataset.step) !== n; });
  $$('#rfqSteps li').forEach((li) => { const s = Number(li.dataset.step); li.classList.toggle('active', s === n); li.classList.toggle('done', s < n); s === n ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'); });
  $('#rfqBar').style.width = `${(n / TOTAL) * 100}%`;
  $('#rfqBack').hidden = n === 1;
  $('#rfqNext').hidden = n === TOTAL;
  $('#rfqLive').textContent = t('f.progress', { n, total: TOTAL });
  if (n === TOTAL) renderReview();
  const fs = $(`fieldset[data-step="${n}"]`, form);
  gsap.fromTo(fs, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'opacity,transform' });
  if (focus) (fs.querySelector('input:not([type=hidden]), select, textarea, a.btn') || fs).focus({ preventScroll: true });
}

export function initRfq() {
  form = $('#rfqForm');
  // contact links
  const mail = `mailto:${CONTACT.email}`, wa = `https://wa.me/${CONTACT.whatsapp}`;
  $('#waLink').href = wa; $('#mailLink').href = mail;
  $('#waText').textContent = CONTACT.whatsappDisplay; $('#mailText').textContent = CONTACT.email;
  const fm = $('#ftMail'), fw = $('#ftWa');
  fm.href = mail; fm.textContent = CONTACT.email; fw.href = wa; fw.textContent = CONTACT.whatsappDisplay;

  buildDest(); buildCurrencies();
  onLang(() => { buildDest(); buildCurrencies(); updatePriceHint(); updateMoq(); if (step === TOTAL) renderReview(); $('#rfqLive').textContent = ''; });

  $('#rfqNext').addEventListener('click', () => { if (validate(step)) show(step + 1); });
  $('#rfqBack').addEventListener('click', () => show(step - 1));
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'checkbox' && step < TOTAL) { e.preventDefault(); $('#rfqNext').click(); } });
  form.addEventListener('submit', (e) => e.preventDefault());
  ['qty', 'unit'].forEach((id) => $('#' + id).addEventListener('input', updateMoq));
  ['price', 'cur'].forEach((id) => $('#' + id).addEventListener('input', updatePriceHint));
  $$('.field input, .field select').forEach((el) => el.addEventListener('input', () => el.getAttribute('aria-invalid') && setErr(el, null)));
  $$('input[name=products]').forEach((el) => el.addEventListener('change', () => ($('#err-products').hidden = true)));

  const sent = () => {
    const note = $('#sentNote');
    note.hidden = false;
    note.textContent = CONTACT.rfqEndpoint ? t('f.posted') : t('f.sent');
    if (CONTACT.rfqEndpoint) fetch(CONTACT.rfqEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values(), lang: getLang(), submittedAt: new Date().toISOString() }), keepalive: true }).catch(() => {});
  };
  $('#sendMail').addEventListener('click', sent);
  $('#sendWa').addEventListener('click', sent);
  $('#copySummary').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(plainText(values())); } catch {}
    const s = $('#copySummary span'); const old = s.textContent; s.textContent = t('f.copied'); setTimeout(() => (s.textContent = t('f.copy')), 1600);
  });

  // external triggers: add product from catalogue, prefill from links / URL
  document.addEventListener('rfq:add', (e) => {
    const cb = $(`input[name=products][value="${e.detail.id}"]`);
    if (cb) { cb.checked = true; $('#err-products').hidden = true; }
    if (step !== 1) show(1, { focus: false });
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-prefill]');
    if (!a) return;
    const msg = $('#msg');
    const keys = { certs: 'q.cta', tour: 'fa.book', catalogue: 'dl.catalogue', specs: 'dl.specs', brand: 'dl.brand', press: 'media.pressCta' };
    const line = tEn(keys[a.dataset.prefill] || 'q.cta');
    if (!msg.value.includes(line)) msg.value = (msg.value ? msg.value + '\n' : '') + line;
  });
  const params = new URLSearchParams(location.search);
  const rg = regionBySlug[params.get('region')];
  if (rg) $('#dest').value = rg.destinations[0].cc;
  const pr = params.get('product');
  if (pr && productById[pr]) $(`input[name=products][value="${pr}"]`).checked = true;

  show(1, { focus: false });
}
