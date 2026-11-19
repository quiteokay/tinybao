// The diary as a little book: pages you peel and turn with a finger or the mouse.
//
// Page turning, in the book's own coordinates: the turning sheet sits in `box`; its corner C
// is pulled to a point P. The fold is the line halfway between C and P. The part of the sheet on
// the corner's side of the fold (Q) is flipped over: the front shows everything else, and the
// back of the sheet shows Q reflected across the fold. A finished turn lands the sheet on the
// other side of the spine.

const INK = { plain: '#A0712F', custard: '#B07F06', taro: '#8357B0', matcha: '#4F8A2A', rosy: '#CC4D72', wheat: '#9A5F25', sesame: '#4A3A33', peach: '#C9672A', sky: '#3D7DB3', mint: '#2E8C6A' };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let B = null; // the open book

function markNames(text, people) {
  let html = esc(text);
  if (!people.length) return html;
  const re = new RegExp('(^|[^\\p{L}])(' + people.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}])', 'gu');
  const by = Object.fromEntries(people.map((p) => [p.name, p]));
  return html.replace(re, (m, pre, name) => { const p = by[name];
    return `${pre}<b class="nm${p.id ? ' live' : ''}" style="color:${p.color}"${p.id ? ` data-id="${p.id}" role="button" tabindex="0"` : ''}>${name}</b>`; });
}

// ---------- splitting the diary into pages ----------
function paginate(o, pw, ph) {
  const measure = document.createElement('div'); measure.className = 'page measure'; measure.style.width = pw + 'px'; measure.style.height = ph + 'px';
  o.host.appendChild(measure);
  const pages = []; let cur = [];
  const fits = () => measure.scrollHeight <= measure.clientHeight + 1;
  const flush = () => { if (cur.length) pages.push({ html: cur.join('') }); cur = []; measure.innerHTML = ''; };
  const put = (html) => {
    measure.insertAdjacentHTML('beforeend', html); cur.push(html);
    if (fits()) return;
    measure.lastElementChild.remove(); cur.pop();
    // never leave a day's heading alone at the bottom of a page
    let carry = [];
    if (cur.length && /^<h3/.test(cur[cur.length - 1])) carry = [cur.pop()];
    flush(); for (const h of carry) { measure.insertAdjacentHTML('beforeend', h); cur.push(h); }
    measure.insertAdjacentHTML('beforeend', html); cur.push(html);
  };
  const days = {}; for (const e of o.entries) (days[e.d] = days[e.d] || []).push(e);
  const keys = Object.keys(days).sort();
  if (!keys.length) put('<p class="empty">Nothing written yet.</p>');
  for (const k of keys) {
    put(`<h3>${esc(o.dayLabel(k))}</h3>`);
    for (const e of days[k]) put(`<p>${markNames(e.text, o.people)}</p>`);
  }
  flush();
  const lastText = pages.length - 1;
  // photographs at the back, four to a page
  const ph4 = o.photos.slice().reverse();
  for (let i = 0; i < ph4.length; i += 4) {
    pages.push({ html: `<h3>Photographs</h3><div class="photos">${ph4.slice(i, i + 4).map((p) => `<figure data-photo="${p.id}" role="button" tabindex="0"><img src="${p.d}" alt=""><figcaption>${esc(o.dayLabel(p.day))}</figcaption></figure>`).join('')}</div>`, photos: true });
  }
  measure.remove();
  pages.forEach((p, i) => { p.no = i + 1; });
  return { pages, lastText };
}

// ---------- geometry ----------
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
function clip(poly, M, n, keepCorner) {
  const side = (p) => dot(sub(p, M), n) * (keepCorner ? 1 : -1), out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return out;
}
const poly = (pts, dx = 0, flipW = null) => (pts.length < 3 ? 'polygon(0 0, 0 0, 0 0)' :
  'polygon(' + pts.map((p) => `${(flipW != null ? flipW - (p.x - dx) : p.x - dx).toFixed(2)}px ${p.y.toFixed(2)}px`).join(',') + ')');

// ---------- drawing a turn in progress ----------
function el(cls, html, x) {
  const d = document.createElement('div'); d.className = 'page ' + cls; d.style.width = B.pw + 'px'; d.style.height = B.ph + 'px'; d.style.left = x + 'px';
  d.innerHTML = html == null ? '' : html; return d;
}
const pageHtml = (i) => (i >= 0 && i < B.pages.length ? B.pages[i].html + `<div class="pno">${i + 1}</div>` : null);
function layoutStatic() {
  const L = B.layer; L.innerHTML = '';
  if (B.spread) { L.appendChild(el('pg-left', pageHtml(B.i) ?? '', 0)); L.appendChild(el('pg-right', pageHtml(B.i + 1) ?? '', B.pw)); }
  else L.appendChild(el('', pageHtml(B.i) ?? '', 0));
  B.nav.textContent = B.spread ? `${B.i + 1}–${Math.min(B.i + 2, B.pages.length)} of ${B.pages.length}` : `${B.i + 1} of ${B.pages.length}`;
}
// Set up the elements for a turn in direction dir (+1 forward, -1 back).
function beginTurn(dir, cy) {
  const step = B.spread ? 2 : 1, ni = B.i + dir * step;
  if (ni < 0 || ni >= B.pages.length) return false;
  const pw = B.pw, xs = B.spread ? pw : 0, L = B.layer; L.innerHTML = '';
  const T = { dir, cy, xs, boxL: dir > 0 ? xs : xs - pw };
  T.C = { x: dir > 0 ? xs + pw : xs - pw, y: cy }; T.land = { x: 2 * xs - T.C.x, y: cy };
  let front, back, under;
  if (B.spread) {
    if (dir > 0) { L.appendChild(el('pg-left', pageHtml(B.i) ?? '', 0)); front = pageHtml(B.i + 1); back = pageHtml(B.i + 2); under = pageHtml(B.i + 3); }
    else { L.appendChild(el('pg-right', pageHtml(B.i + 1) ?? '', pw)); front = pageHtml(B.i); back = pageHtml(B.i - 1); under = pageHtml(B.i - 2); }
  } else if (dir > 0) { front = pageHtml(B.i); back = ''; under = pageHtml(B.i + 1); }
  else { // one page at a time, going back: the previous page was turned away to the left, so play its turn in reverse
    T.boxL = 0; T.C = { x: pw, y: cy }; T.land = { x: -pw, y: cy }; T.rev = true;
    front = pageHtml(B.i - 1); back = ''; under = pageHtml(B.i); }
  const side = (x) => (B.spread ? (x < pw ? 'pg-left' : 'pg-right') : '');
  if (under != null) { T.under = el(side(T.boxL), under, T.boxL); L.appendChild(T.under); T.shade = document.createElement('div'); T.shade.className = 'shade'; T.under.appendChild(T.shade); }
  T.front = el(side(T.boxL) + ' turning', front ?? '', T.boxL); L.appendChild(T.front);
  const wrap = document.createElement('div'); wrap.className = 'backwrap'; L.appendChild(wrap);
  T.back = el((B.spread ? (dir > 0 ? 'pg-left' : 'pg-right') : '') + ' back' + (back ? '' : ' blank'), back ?? '', T.boxL); wrap.appendChild(T.back);
  T.from = T.rev ? T.land : T.C; T.to = T.rev ? T.C : T.land; T.P = { ...T.from };
  B.T = T; setP(T.P); return true;
}
function setP(P) {
  const T = B.T, pw = B.pw, ph = B.ph, C = T.C, bl = T.boxL;
  const rect = [{ x: bl, y: 0 }, { x: bl + pw, y: 0 }, { x: bl + pw, y: ph }, { x: bl, y: ph }];
  const d = sub(C, P), len = Math.hypot(d.x, d.y);
  if (len < 0.5) { T.front.style.clipPath = 'none'; T.back.style.visibility = 'hidden'; if (T.shade) T.shade.style.opacity = 0; return; }
  T.back.style.visibility = 'visible';
  const n = { x: d.x / len, y: d.y / len }, M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
  const F = clip(rect, M, n, false), Q = clip(rect, M, n, true);
  T.front.style.clipPath = poly(F, bl);
  T.back.style.clipPath = poly(Q, bl, pw); // local x = boxR - x
  // back transform: reflect across the fold after mirroring within the box
  const Rm = [1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.y, 1 - 2 * n.y * n.y], k = 2 * dot(M, n), tR = { x: k * n.x, y: k * n.y };
  const A = [-Rm[0], Rm[1], -Rm[2], Rm[3]]; // Rm * diag(-1, 1)
  const tB = { x: bl + bl + pw, y: 0 }, t = { x: Rm[0] * tB.x + Rm[1] * tB.y + tR.x, y: Rm[2] * tB.x + Rm[3] * tB.y + tR.y };
  const b0 = { x: bl, y: 0 }, e = { x: A[0] * b0.x + A[1] * b0.y + t.x - b0.x, y: A[2] * b0.x + A[3] * b0.y + t.y - b0.y };
  T.back.style.transform = `matrix(${A[0]},${A[2]},${A[1]},${A[3]},${e.x},${e.y})`;
  if (T.shade) { // a soft shadow on the revealed page, along the fold
    const th = Math.atan2(n.x, -n.y), g = { x: Math.sin(th), y: -Math.cos(th) }, Lg = Math.abs(pw * Math.sin(th)) + Math.abs(ph * Math.cos(th));
    const start = { x: bl + pw / 2 - g.x * Lg / 2, y: ph / 2 - g.y * Lg / 2 }, s = dot(sub(M, start), g);
    T.shade.style.opacity = 1; T.shade.style.clipPath = poly(Q, bl);
    T.shade.style.background = `linear-gradient(${th * 180 / Math.PI}deg, rgba(40,25,10,0) ${Math.max(0, s - 2)}px, rgba(40,25,10,.28) ${s}px, rgba(40,25,10,0) ${s + 60}px)`;
  }
}
function animateTo(target, done) {
  const T = B.T, from = { ...T.P }, t0 = performance.now(), dur = 420, lift = (T.cy === 0 ? 1 : -1) * B.ph * 0.07;
  B.anim = true;
  const step = (now) => {
    const u = Math.min(1, (now - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, arc = Math.sin(Math.PI * e) * lift * (target === T.to ? 1 : 0.3);
    const P = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e + arc }; T.P = P; setP(P);
    if (u < 1) requestAnimationFrame(step); else { B.anim = false; done(); }
  };
  requestAnimationFrame(step);
}
function finish(completed) {
  const T = B.T; B.T = null;
  if (completed) { B.i += T.dir * (B.spread ? 2 : 1); B.opts.onTurn(); }
  layoutStatic();
}
export function turn(dir) {
  if (!B || B.anim || B.T) return;
  if (!beginTurn(dir, B.ph)) return;
  animateTo(B.T.to, () => finish(true));
}

// ---------- open / close ----------
export function openBook(opts) {
  const host = opts.host; host.innerHTML = '';
  const vw = window.innerWidth, vh = window.innerHeight, spread = vw >= 820;
  const pw = Math.floor(spread ? Math.min(400, (vw - 70) / 2) : Math.min(500, vw - 18)), ph = Math.floor(Math.min(vh * 0.86, 780) - 106);
  const layer = document.createElement('div'); layer.className = 'layer'; host.style.width = (spread ? pw * 2 : pw) + 'px'; host.style.height = ph + 'px'; host.appendChild(layer);
  B = { host, layer, pw, ph, spread, opts, nav: opts.nav, T: null, anim: false };
  const { pages, lastText } = paginate({ ...opts, host }, pw, ph);
  const at = opts.at != null ? Math.min(opts.at, pages.length - 1) : lastText;
  B.pages = pages; B.i = spread ? at - (at % 2) : at;
  host.classList.toggle('spread', spread);
  layoutStatic();
}
export const bookOpen = () => !!B;
export const bookPage = () => (B ? B.i : null);
export const bookBusy = () => !!(B && (B.T || B.anim));
export function closeBook() { B = null; }

// ---------- dragging ----------
export function attachBookInput(host) {
  let d = null;
  host.addEventListener('pointerdown', (e) => {
    if (!B || B.anim) return;
    const r = host.getBoundingClientRect(); d = { x0: e.clientX, y0: e.clientY, rx: e.clientX - r.left, ry: e.clientY - r.top, id: e.pointerId, turning: false, t0: performance.now() };
  });
  host.addEventListener('pointermove', (e) => {
    if (!d || d.id !== e.pointerId || !B) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.turning) {
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      if (!beginTurn(dx < 0 ? 1 : -1, d.ry < B.ph / 2 ? 0 : B.ph)) { d = null; return; }
      d.turning = true; host.setPointerCapture(e.pointerId);
    }
    const T = B.T, k = B.spread ? 1 : 2, lo = Math.min(T.from.x, T.to.x), hi = Math.max(T.from.x, T.to.x);
    const px = Math.max(lo, Math.min(hi, T.from.x + dx * k)), prog = Math.abs(px - T.from.x) / (hi - lo);
    const curl = Math.sin(Math.PI * Math.min(1, prog * 1.6 + 0.02)) * B.ph * 0.16 * (T.cy === 0 ? 1 : -1) * (T.rev ? Math.sin(Math.PI * prog) : 1);
    T.P = { x: px, y: T.C.y + curl + dy * 0.25 }; setP(T.P); d.lastDx = dx; d.lastT = performance.now();
  });
  const up = (e) => {
    if (!d || d.id !== e.pointerId || !B) { d = null; return; }
    const g = d; d = null;
    if (g.turning && B.T) {
      const T = B.T, prog = Math.abs(T.P.x - T.from.x) / Math.abs(T.to.x - T.from.x), flick = performance.now() - g.t0 < 260 && Math.abs(g.lastDx || 0) > 30;
      const done = prog > 0.5 || flick; animateTo(done ? T.to : T.from, () => finish(done)); return;
    }
    if (e.type !== 'pointerup' || Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 10) return;
    const name = e.target.closest && e.target.closest('.nm.live');
    if (name) { B.opts.onName(name.dataset.id); return; }
    const fig = e.target.closest && e.target.closest('figure[data-photo]');
    if (fig) { B.opts.onPhoto(fig.dataset.photo); return; }
    const w = host.clientWidth;
    if (g.rx > w * 0.78) turn(1); else if (g.rx < w * 0.22) turn(-1);
  };
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
}
export { INK as NAME_INK, markNames };
