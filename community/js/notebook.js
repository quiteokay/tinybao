// The diary as a little spiral notebook on a table: one day to a page, a doodle beside every entry,
// pages that flip up over the rings, a ribbon back to today, and a calendar for every other day.
import { doodleFor, bigDoodle } from './doodles.js';

export const NAME_INK = { plain: '#A0712F', custard: '#B07F06', taro: '#8357B0', matcha: '#4F8A2A', rosy: '#CC4D72', wheat: '#9A5F25', sesame: '#4A3A33', peach: '#C9672A', sky: '#3D7DB3', mint: '#2E8C6A' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// a lighter shade of a name's colour, for the wavy underline
function light(hex) { const n = parseInt(hex.slice(1), 16), mix = (v) => Math.round(v + (255 - v) * 0.5); return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`; }

export function markNames(text, people) {
  let html = esc(text);
  if (!people.length) return html;
  const re = new RegExp('(^|[^\\p{L}])(' + people.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}])', 'gu');
  const by = Object.fromEntries(people.map((p) => [p.name, p]));
  return html.replace(re, (m, pre, name) => { const p = by[name];
    return `${pre}<span class="nm${p.id ? ' live' : ''}" style="color:${p.color};text-decoration-color:${light(p.color)}"${p.id ? ` data-id="${p.id}" role="button" tabindex="0"` : ''}>${esc(name)}</span>`; });
}

const WEATHER = { sun: 'sunny', cloud: 'cloudy', rain: 'rainy', snow: 'snowy' };
const parse = (key) => { const [Y, M, D] = key.split('-').map(Number); return new Date(Y, M - 1, D); };
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

let N = null; // the open notebook

// o: { host, today, first, days (sorted keys with writing), load(key) -> entries, photos(key), people, weather(key),
//      onName(id), onPhoto(id), onTurn() }
export function openNotebook(o, day) {
  N = { ...o, day: null, busy: false };
  const all = new Set(o.days); all.add(o.today); N.days = [...all].sort();
  return showDay(day && N.days.includes(day) ? day : o.today, 0);
}
export const notebookOpen = () => !!N;
export const notebookDay = () => (N ? N.day : null);
export function closeNotebook() { N = null; }

const pageNo = (key) => dayDiff(N.first, key) + 1;
function neighbour(dir) { const i = N.days.indexOf(N.day) + dir; return i >= 0 && i < N.days.length ? N.days[i] : null; }

async function pageHTML(key) {
  const entries = await N.load(key), photos = N.photos(key), today = key === N.today, d = parse(key);
  const meta = [d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), WEATHER[N.weather(key)]].filter(Boolean);
  if (photos.length) meta.push(photos.length === 1 ? '1 photo' : photos.length + ' photos');
  const prev = N.days[N.days.indexOf(key) - 1], next = N.days[N.days.indexOf(key) + 1];
  let h = `<header class="pgHead"><button class="dayBtn" data-pick aria-label="Day ${pageNo(key)}. Choose another day"><h2>Day ${pageNo(key)}</h2></button><span class="meta">${esc(meta.join(' · '))}</span></header>`;
  if (today) h += '<div class="hlRow"><span class="hl">today</span></div>';
  if (!entries.length) h += `<div class="row"><span class="mg"></span><p class="empty">${today ? 'Nothing written yet today.' : 'Nothing written this day.'}</p></div>`;
  for (const e of entries) h += `<div class="row"><span class="mg">${doodleFor(e.k)}</span><p>${markNames(e.text, N.people)}</p></div>`;
  if (photos.length) h += `<div class="tapeins">${photos.map((p, i) => `<button class="polaroid" data-photo="${p.id}" style="--r:${[-4, 3, -2, 5][i % 4]}deg" aria-label="Open this photo"><img src="${p.d}" alt=""><i class="tape"></i></button>`).join('')}</div>`;
  else if (entries.length <= 3) { const b = bigDoodle(entries.map((e) => e.k)); h += `<div class="bigRow" data-big="${b.name}">${b.svg}</div>`; }
  h += `<nav class="pgNav">${prev ? `<button data-go="-1">‹ day ${pageNo(prev)}</button>` : '<span></span>'}${next ? `<button data-go="1">day ${pageNo(next)} ›</button>` : '<span></span>'}</nav>`;
  return `<div class="pg" data-day="${key}">${h}</div>`;
}

// dir: 0 just show, 1 forward (the page flips up and away), -1 back (the earlier page flips down over it)
export async function showDay(key, dir) {
  if (!N || !key) return false;
  const html = await pageHTML(key); if (!N) return false;
  const sheet = N.host, tilt = N.days.indexOf(key) % 2 ? 1.3 : -1.5;
  const old = sheet.querySelector('.pg');
  if (dir && old) {
    const flip = document.createElement('div'); flip.className = 'flip ' + (dir > 0 ? 'up' : 'down');
    const front = document.createElement('div'); front.className = 'face';
    if (dir > 0) { front.appendChild(old.cloneNode(true)); front.firstChild.style.marginTop = -sheet.scrollTop + 'px'; }
    else front.innerHTML = html;
    flip.appendChild(front); flip.insertAdjacentHTML('beforeend', '<div class="face back"></div>');
    N.busy = true; sheet.parentElement.appendChild(flip);
    if (dir > 0) { sheet.innerHTML = html; sheet.scrollTop = 0; }
    await new Promise((r) => { flip.addEventListener('animationend', r, { once: true }); setTimeout(r, 700); });
    if (dir < 0) { sheet.innerHTML = html; sheet.scrollTop = 0; }
    flip.remove(); if (N) N.busy = false;
  } else { sheet.innerHTML = html; sheet.scrollTop = 0; }
  if (!N) return false;
  N.day = key; sheet.parentElement.style.setProperty('--tilt', tilt + 'deg');
  return true;
}

export function turn(dir) {
  if (!N || N.busy) return false;
  const k = neighbour(dir); if (!k) return false;
  N.onTurn(); showDay(k, dir); return true;
}
export function goTo(key) {
  if (!N || N.busy || !key) return false;
  if (key === N.day) return true;
  N.onTurn(); showDay(key, key > N.day ? 1 : -1); return true;
}
export const goToday = () => goTo(N && N.today);
export const refresh = () => (N ? showDay(N.day, 0) : null);

// ---------- the calendar of every day ----------
export function pickerHTML() {
  if (!N) return '';
  const has = new Set(N.days), photoDays = new Set(N.photoDays || []);
  const start = parse(N.first), end = parse(N.today);
  const months = [];
  for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); m === 11 ? (y++, m = 0) : m++) months.push([y, m]);
  let h = `<div class="pkHead"><span>Every day so far</span><button data-pkfirst>first page</button></div>`;
  for (const [y, m] of months) {
    const first = new Date(y, m, 1), n = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
    h += `<section class="pkMonth" data-month="${y}-${m}"><h3>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><div class="pkGrid">`;
    for (let i = 0; i < lead; i++) h += '<span></span>';
    for (let d = 1; d <= n; d++) {
      const k = keyOf(new Date(y, m, d)), cls = [k === N.day ? 'cur' : '', k === N.today ? 'today' : '', photoDays.has(k) ? 'ph' : ''].filter(Boolean).join(' ');
      h += has.has(k) ? `<button data-day="${k}" class="${cls}" aria-label="Day ${pageNo(k)}, ${parse(k).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}">${d}</button>` : `<span class="${cls}">${d}</span>`;
    }
    h += '</div></section>';
  }
  return h;
}
export const firstDay = () => (N ? N.days[0] : null);
export const notebookBusy = () => !!(N && N.busy);

// ---------- touch: sideways swipes turn the page; up and down scroll it ----------
export function attachNotebookInput(sheet) {
  let s = null;
  sheet.addEventListener('pointerdown', (e) => { s = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  sheet.addEventListener('pointercancel', () => { s = null; });
  sheet.addEventListener('pointerup', (e) => {
    if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y, quick = performance.now() - s.t < 900; s = null;
    if (quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.6) { sheet.dataset.swiped = performance.now(); turn(dx < 0 ? 1 : -1); }
  });
  sheet.addEventListener('click', (e) => {
    if (!N || performance.now() - (+sheet.dataset.swiped || 0) < 300) return;
    const go = e.target.closest('[data-go]'); if (go) return turn(+go.dataset.go);
    const nm = e.target.closest('.nm.live'); if (nm) return N.onName(nm.dataset.id);
    const ph = e.target.closest('[data-photo]'); if (ph) return N.onPhoto(ph.dataset.photo);
    if (e.target.closest('[data-pick]')) return N.onPick();
  });
  sheet.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.nm.live') && N) { e.preventDefault(); N.onName(e.target.dataset.id); } });
}
