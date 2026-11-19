// The workshop: a hidden testing panel that works on a separate copy of the community.
// The real community is never touched: the workshop has its own save slot and its own storage.
import { THINGS } from './diary.js';
import { ADDED, PROJ } from './world.js';
import { drawBaoShape } from './drawbao.js';
import { thingIcon } from './drawthings.js';

export const REAL_KEY = 'tinybao.community.v1', SHOP_KEY = REAL_KEY + '.workshop', FLAG = 'tinybao.workshop', CLOCK = 'tinybao.workshop.clock';
const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
export const inWorkshop = () => ss.get(FLAG) === '1';
export const shopClock = () => { try { return JSON.parse(ls.get(CLOCK)) || { offset: 0, speed: 1 }; } catch (e) { return { offset: 0, speed: 1 }; } };
export const saveShopClock = (c) => ls.set(CLOCK, JSON.stringify(c));

// Copy the real community into the workshop slot (a fresh copy, or keep the one already there).
export function enterWorkshop(fresh) {
  if (fresh || !ls.get(SHOP_KEY)) { const real = ls.get(REAL_KEY); if (real) ls.set(SHOP_KEY, real); else try { localStorage.removeItem(SHOP_KEY); } catch (e) { /* ignore */ } saveShopClock({ offset: 0, speed: 1 }); }
  ss.set(FLAG, '1'); location.reload();
}
export function leaveWorkshop() { ss.del(FLAG); location.reload(); }

const H = 3600000, D = 24 * H;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// The door: a small card, then a reload into the test copy.
export function openDoor(api) {
  if (inWorkshop()) return openPanel(api);
  const box = el('div', 'ws-door');
  box.innerHTML = `<div class="bc"><h2>The workshop</h2><p>Testing tools, on a separate copy of your community. Your real one stays exactly as it is.</p>
    <div class="cardBtns ws-stack">${ls.get(SHOP_KEY) ? '<button data-a="resume">resume the test copy</button><button data-a="fresh">start over from my real community</button>' : '<button data-a="fresh">enter the workshop</button>'}<button data-a="no">not now</button></div></div>`;
  box.addEventListener('click', (e) => { const a = e.target.closest('button') && e.target.closest('button').dataset.a; if (a === 'resume') enterWorkshop(false); else if (a === 'fresh') enterWorkshop(true); else if (a === 'no' || e.target === box) box.remove(); });
  document.body.appendChild(box);
}

// ---------- the panel ----------
let panel = null;
export function mountWorkshop(api) {
  const bar = el('div', 'ws-banner', '<b>workshop</b> · test copy <button data-a="panel">tools</button><button data-a="leave">leave</button>');
  bar.addEventListener('click', (e) => { const a = e.target.dataset.a; if (a === 'panel') openPanel(api); if (a === 'leave') leaveWorkshop(); });
  document.body.appendChild(bar);
}
function openPanel(api) {
  if (panel) { panel.hidden = !panel.hidden; if (!panel.hidden) refresh(api); return; }
  panel = el('div', 'ws-panel'); document.body.appendChild(panel); refresh(api);
  panel.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; act(api, b.dataset.a, b.dataset.v); });
}
function section(title, body) { return `<details open><summary>${title}</summary><div class="g-body">${body}</div></details>`; }
const btn = (a, v, label, extra = '') => `<button data-a="${a}" data-v="${v ?? ''}" ${extra}>${label}</button>`;
function refresh(api) {
  if (!panel || panel.hidden) return;
  const S = api.S(), c = shopClock(), now = new Date(api.clock.t);
  const usedNames = new Set([...S.everNames, ...(S.usedAdded || [])]);
  const proj = S.proj ? PROJ[S.proj.id].short : 'nothing';
  panel.innerHTML = `<div class="g-head"><b>The workshop</b><span>${now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ×${c.speed}</span>${btn('close', '', '×', 'class="g-x" aria-label="Close"')}</div>`
    + section('Time', `<div class="g-row"><span>skip</span>${[1, 2, 3].map((n) => btn('skip', n * H, `+${n}h`)).join('')}${[1, 2, 3].map((n) => btn('skip', n * D, `+${n}d`)).join('')}${[1, 2, 3].map((n) => btn('skip', n * 7 * D, `+${n}w`)).join('')}</div>
      <div class="g-row"><span>go to</span>${btn('hour', 7, 'morning')}${btn('hour', 12, 'noon')}${btn('hour', 19, 'evening')}${btn('hour', 3, '3am')}</div>
      <div class="g-row"><span>speed</span>${[1, 10, 60].map((s) => btn('speed', s, '×' + s, c.speed === s ? 'class="on"' : '')).join('')}</div>`)
    + section('Today’s tray', `<div class="g-grid g-items">${Object.keys(THINGS).filter((k) => k !== 'treat' && k !== 'basketball').map((k) => `<button data-a="item" data-v="${k}" title="${THINGS[k].name}"><canvas data-icon="${k}"></canvas></button>`).join('')}</div>
      <div class="g-grid g-baos">${ADDED.map((b, i) => `<button data-a="bao" data-v="${i}" title="${b.name}" ${usedNames.has(b.name) ? 'disabled' : ''}><canvas data-bao="${i}"></canvas><small>${b.name}</small></button>`).join('')}</div>
      <div class="g-row">${btn('refill', '', 'refill today’s tray')}</div>`)
    + section('Building', `<div class="g-row"><span>now: ${proj}</span>${btn('finish', '', 'finish it')}${btn('choice', '', 'put the choice up')}</div>
      <div class="g-row g-wrap">${Object.keys(PROJ).filter((k) => !['tree', 'flowers', 'birdhouse', 'repaint'].includes(k)).map((k) => btn('start', k, 'start ' + PROJ[k].short.replace(/^the /, ''), S.done[k] && k !== 'floor' ? 'disabled' : '')).join('')}</div>`)
    + section('Weather', `<div class="g-row">${[['', 'as it comes'], ['sun', 'sun'], ['rain', 'rain'], ['snow', 'snow']].map(([v, l]) => btn('weather', v, l, (S.weather || '') === v ? 'class="on"' : '')).join('')}</div>`)
    + section('Events', `<div class="g-row g-wrap">${btn('event', 'party', 'party now')}${btn('event', 'treats', 'treats now')}${btn('event', 'arrive', 'a neighbour walks in')}${btn('event', 'baby', 'baby needs changing')}${btn('event', 'photo', 'take a photo')}</div>`)
    + section('Cards', `<div class="g-row g-wrap">${btn('card', 'update', 'update card')}${btn('card', 'first', 'first visit')}${btn('card', 'away', 'while you were away')}</div>`)
    + `<div class="g-row g-foot">${btn('fresh', '', 'start over from my real community')}${btn('leave', '', 'leave the workshop')}</div>`;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  panel.querySelectorAll('canvas[data-icon]').forEach((cv) => { thingIcon(cv, cv.dataset.icon); cv.style.width = cv.style.height = '34px'; });
  panel.querySelectorAll('canvas[data-bao]').forEach((cv) => { const s = ADDED[+cv.dataset.bao]; cv.width = 36 * dpr; cv.height = 32 * dpr; cv.style.width = '36px'; cv.style.height = '32px';
    const c2 = cv.getContext('2d'); c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.lineJoin = 'round'; c2.translate(18, 30); c2.scale(0.62, 0.62); drawBaoShape(c2, { flavor: s.flavor, acc: s.acc, expr: 'joy' }, 0); });
}
function flash(api, text) { api.hint(text); }
function act(api, a, v) {
  const S = api.S(), sim = api.sim;
  switch (a) {
    case 'close': panel.hidden = true; return;
    case 'leave': return leaveWorkshop();
    case 'fresh': return enterWorkshop(true);
    case 'skip': api.skip(+v); flash(api, 'skipped ahead'); break;
    case 'hour': { const d = new Date(api.clock.t); d.setHours(+v, 0, 0, 0); if (d.getTime() <= api.clock.t) d.setDate(d.getDate() + 1); api.skip(d.getTime() - api.clock.t); break; }
    case 'speed': { const c = shopClock(); c.speed = +v; saveShopClock(c); api.clock.speed = +v; break; }
    case 'item': S.tray.items.push({ type: v, used: false }); api.drawTray(); flash(api, THINGS[v].name + ' is in the tray'); break;
    case 'bao': { const b = ADDED[+v]; S.tray.bao = { used: false, met: false, pick: { ...b, listName: b.name } }; api.drawTray(); flash(api, b.name + ' is in the tray'); break; }
    case 'refill': S.tray = null; sim.ensureTray(S); api.drawTray(); break;
    case 'finish': sim.shopBuild('finish'); break;
    case 'choice': sim.shopBuild('choice'); break;
    case 'start': sim.shopBuild('start', v); break;
    case 'weather': S.weather = v || null; break;
    case 'event': {
      const mid = api.centre();
      if (v === 'party' || v === 'treats') sim.dropThing(v, mid.x, mid.h + 60);
      if (v === 'arrive') sim.shopArrive();
      if (v === 'baby') { const baby = S.baos.find((q) => q.kind === 'baby'); if (baby) baby.needs.diaper = 1; }
      if (v === 'photo') { panel.hidden = true; setTimeout(() => api.takeShot(), 60); }
      break;
    }
    case 'card': api.card(v); panel.hidden = true; break;
  }
  api.save(); refresh(api);
}
export function workshopTick(api) { if (panel && !panel.hidden && performance.now() > (workshopTick.next || 0)) { workshopTick.next = performance.now() + 2000; const head = panel.querySelector('.g-head span'); if (head) { const now = new Date(api.clock.t); head.textContent = `${now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ×${shopClock().speed}`; } } }
