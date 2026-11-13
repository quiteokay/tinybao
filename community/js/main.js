// Boot, the frame loop, the camera, and the visitor's hands.
import { RW, FH, W, OUT, BAO, clamp, clock, dayKey, hourOf } from './core.js';
import { newState, nFloors, weatherAt, adults } from './world.js';
import { R, init, tick, tickParts, settle, catchUp, petBao, pickUpBao, moveHeld, releaseBao, dropThing, pickUpThingByHand, releaseThing, vaporize, ensureTray, initBao } from './sim.js';
import { render } from './draw.js';
import { thingIcon } from './drawthings.js';
import { THINGS } from './diary.js';
import * as snd from './sound.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const TEST = ['speed', 'skipDays', 'hour', 'fresh', 'test'].some((k) => Q.has(k));
const KEY = 'tinybao.community.v1' + (TEST ? '.test' : '');
const canvas = $('c'), ctx = canvas.getContext('2d');
let S, V = { vw: 0, vh: 0, dpr: 1, s: 1, cx: W / 2, cy: 0, gy: 0, wx0: 0, wx1: 0 }, baseS = 1;

// ---------- saving ----------
function serialize() {
  const out = { ...S, lastSeen: clock.t };
  out.baos = S.baos.map((b) => ({ id: b.id, name: b.name, kind: b.kind, flavor: b.flavor, acc: b.acc, trait: b.trait, from: b.from, arrived: b.arrived,
    x: Math.round(b.x), floor: b.held || b.fall ? 0 : b.floor, needs: b.needs }));
  out.objects = S.objects.map((o) => { let x = o.x, floor = o.held ? 0 : o.floor; if (o.heldBy) { const c = S.baos.find((b) => b.id === o.heldBy); if (c) { x = c.x; floor = c.floor; } }
    return { id: o.id, type: o.type, x: Math.round(x), floor, uses: o.uses, water: o.water, t: o.t, unseen: o.unseen }; });
  return JSON.stringify(out);
}
function save() { try { localStorage.setItem(KEY, serialize()); } catch (e) { /* private mode or full: carry on without saving */ } }
function load() {
  if (Q.has('fresh')) return null;
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; const d = JSON.parse(raw); if (!d || !Array.isArray(d.floors) || !Array.isArray(d.baos)) return null; return Object.assign(newState0(), d); } catch (e) { return null; }
}
function newState0() { const s = newState(); s.baos = []; s.everNames = []; s.diarist = null; return s; }

// ---------- camera ----------
function resize() {
  V.dpr = Math.min(3, window.devicePixelRatio || 1); V.vw = window.innerWidth; V.vh = window.innerHeight;
  canvas.width = Math.round(V.vw * V.dpr); canvas.height = Math.round(V.vh * V.dpr);
  const phone = V.vw < 700, old = baseS;
  V.gy = V.vh - (phone ? 150 : 140);
  baseS = phone ? V.vw / (W + 76) : clamp(Math.min((V.gy - 50) / (Math.min(nFloors(S) + 1.3, 4.7) * FH), V.vw / (W + 300)), 0.55, 1.6);
  V.s = old && V.s ? clamp(V.s * baseS / old, minS(), 2.6) : baseS;
  clampCam();
}
const minS = () => Math.min(baseS, V.vw / (W + 2 * OUT + 60), (V.gy - 30) / ((nFloors(S) + 1.4) * FH));
function clampCam() {
  const half = V.vw / 2 / V.s, lo = -OUT - 40 + half, hi = W + OUT + 40 - half;
  V.cx = lo >= hi ? W / 2 : clamp(V.cx, lo, hi);
  const topH = nFloors(S) * FH + 150, vis = (V.gy - 10) / V.s;
  V.cy = clamp(V.cy, 0, Math.max(0, topH - vis));
  V.wx0 = V.cx - half; V.wx1 = V.cx + half;
}
const toWorld = (sx, sy) => ({ x: (sx - V.vw / 2) / V.s + V.cx, h: (V.gy + V.cy * V.s - sy) / V.s });
const toScreen = (x, h) => ({ x: (x - V.cx) * V.s + V.vw / 2, y: V.gy + V.cy * V.s - h * V.s });
function zoomAt(sx, sy, k) {
  const before = toWorld(sx, sy); V.s = clamp(V.s * k, minS(), 2.6);
  const after = toWorld(sx, sy); V.cx += before.x - after.x; V.cy += before.h - after.h; clampCam();
}

// ---------- hands ----------
function hit(sx, sy) {
  const p = toWorld(sx, sy), pad = 14 / V.s;
  for (let i = S.baos.length - 1; i >= 0; i--) { const b = S.baos[i], sz = b.size || 1, cy = b.floor * FH + b.alt + BAO * 0.4 * sz;
    if (Math.abs(p.x - b.x) < BAO * 0.52 * sz + pad && Math.abs(p.h - cy) < BAO * 0.46 * sz + pad) return { bao: b }; }
  for (let i = S.objects.length - 1; i >= 0; i--) { const o = S.objects[i]; if (o.heldBy) continue; const cy = o.floor * FH + (o.alt || 0) + (o.type === 'balloon' ? -14 : 14);
    if (Math.abs(p.x - o.x) < 16 + pad && Math.abs(p.h - cy) < 18 + pad) return { thing: o }; }
  return null;
}
const ptrs = new Map(); let down = null, pinch = null, armed = -1, zapOn = false, tagFor = null, tagUntil = 0;
function showTag(b) { tagFor = b; tagUntil = performance.now() + 4500; }
function setHint(text) { const h = $('hint'); if (text) { h.textContent = text; h.hidden = false; } else h.hidden = true; }
function setZap(on) { zapOn = on; $('bZap').classList.toggle('on', on); setHint(on ? 'press and hold a bao to vaporize it · tap ⚡ to cancel' : armed >= 0 ? 'tap anywhere to drop it' : ''); }
function setArmed(i) { armed = i; if (i >= 0 && zapOn) setZap(false); drawTray(); setHint(i >= 0 ? 'tap anywhere to drop it' : ''); }

canvas.addEventListener('pointerdown', (e) => {
  snd.unlock();
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    if (down && down.mode === 'bao') releaseBao(down.t.bao); if (down && down.mode === 'thing') releaseThing(down.t.thing); if (down && down.t && down.t.bao) { down.t.bao.vapor = 0; down.t.bao.frozen = false; }
    down = null; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; return;
  }
  const t = hit(e.clientX, e.clientY);
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t, moved: false, mode: null, id: e.pointerId };
  if (zapOn && t && t.bao) { down.mode = 'zap'; t.bao.vapor = 0.001; t.bao.frozen = true; snd.play('charge'); }
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) { canvas.style.cursor = hit(e.clientX, e.clientY) ? 'grab' : 'default'; return; }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.d); pinch.d = d; return; }
  if (!down || down.id !== e.pointerId) return;
  const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (down.mode === 'zap') return; // the bao holds still, so a wobbly finger does not cancel it
  if (!down.moved && dist > 8) {
    down.moved = true;
    if (down.t && down.t.bao) { down.mode = 'bao'; snd.play('pick'); pickUpBao(down.t.bao); const p = toWorld(down.x, down.y); down.off = { x: down.t.bao.x - p.x, h: 0 }; tagFor = null; }
    else if (down.t && down.t.thing) { down.mode = 'thing'; snd.play('pick'); pickUpThingByHand(down.t.thing); }
    else down.mode = 'pan';
    canvas.style.cursor = 'grabbing';
  }
  if (down.mode === 'pan') { V.cx -= (e.clientX - down.lx) / V.s; V.cy += (e.clientY - down.ly) / V.s; clampCam(); }
  else if (down.mode === 'bao') { const p = toWorld(e.clientX, e.clientY); moveHeld(down.t.bao, p.x, p.h - BAO * 0.4 * (down.t.bao.size || 1)); }
  else if (down.mode === 'thing') { const p = toWorld(e.clientX, e.clientY); moveHeld(down.t.thing, p.x, p.h - 10); }
  down.lx = e.clientX; down.ly = e.clientY;
});
function pointerEnd(e) {
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
  if (!down || down.id !== e.pointerId) return;
  const d = down; down = null; canvas.style.cursor = 'default';
  if (d.mode === 'bao') { releaseBao(d.t.bao); save(); }
  else if (d.mode === 'thing') { releaseThing(d.t.thing); save(); }
  else if (d.mode === 'zap') { d.t.bao.vapor = 0; d.t.bao.frozen = false; }
  else if (!d.moved && e.type === 'pointerup') {
    if (armed >= 0) { const p = toWorld(e.clientX, e.clientY); useTray(armed, p.x, p.h); }
    else if (d.t && d.t.bao) { petBao(d.t.bao); snd.play('pet'); showTag(d.t.bao); }
    else if (d.t && d.t.thing) { d.t.thing.sq = 0.3; snd.play('blip'); }
    else tagFor = null;
  }
}
canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
  else { V.cy -= e.deltaY / V.s; V.cx += e.deltaX / V.s; clampCam(); }
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $('diary').hidden = true; setArmed(-1); setZap(false); }
  const k = { ArrowUp: [0, 60], ArrowDown: [0, -60], ArrowLeft: [-60, 0], ArrowRight: [60, 0] }[e.key];
  if (k) { V.cx += k[0] / V.s; V.cy += k[1] / V.s; clampCam(); }
  if (e.key === '+' || e.key === '=') zoomAt(V.vw / 2, V.vh / 2, 1.15); if (e.key === '-') zoomAt(V.vw / 2, V.vh / 2, 1 / 1.15);
});

// ---------- today's things ----------
function drawTray() {
  const box = $('slots'); box.innerHTML = '';
  S.tray.items.forEach((it, i) => {
    const el = document.createElement('div'); el.className = 'slot' + (it.used ? ' used' : '') + (armed === i ? ' armed' : '');
    if (!it.used) { const cv = document.createElement('canvas'); thingIcon(cv, it.type); el.appendChild(cv); el.title = THINGS[it.type].name; el.addEventListener('pointerdown', (e) => trayDown(e, i, el)); }
    box.appendChild(el);
  });
  $('trayNote').textContent = S.tray.items.every((i) => i.used) ? 'more tomorrow' : 'today’s things';
}
function useTray(i, x, h) {
  const it = S.tray.items[i]; if (!it || it.used) return;
  dropThing(it.type, x, Math.max(h, 0) + 2); snd.play('whoosh'); it.used = true; setArmed(-1); save();
}
function trayDown(e, i, el) {
  e.preventDefault(); snd.unlock(); el.setPointerCapture(e.pointerId);
  const sx = e.clientX, sy = e.clientY; let ghost = null, moved = false;
  const mv = (ev) => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) { moved = true; ghost = document.createElement('canvas'); ghost.id = 'ghost'; thingIcon(ghost, S.tray.items[i].type); document.body.appendChild(ghost); el.style.opacity = 0.3; }
    if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
  };
  const up = (ev) => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    if (ghost) ghost.remove(); el.style.opacity = 1;
    if (ev.type === 'pointercancel') return;
    if (!moved) { snd.play('tick'); setArmed(armed === i ? -1 : i); }
    else if (ev.clientY < $('bar').getBoundingClientRect().top + 10) { const p = toWorld(ev.clientX, ev.clientY); useTray(i, p.x, p.h); }
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}

// ---------- weather button ----------
const WX = { sun: '<circle cx="12" cy="12" r="4.5" fill="#FFD166"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  rain: '<path d="M7 15a4 4 0 0 1 .6-8 5 5 0 0 1 9.6 1.2A3.4 3.4 0 0 1 17 15z" fill="#DCE8F2"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" stroke="#5FA8DC"/>',
  snow: '<path d="M7 14a4 4 0 0 1 .6-8 5 5 0 0 1 9.6 1.2A3.4 3.4 0 0 1 17 14z" fill="#F1F6FA"/><g stroke="#7FBDE6"><path d="M8 18.5h.01M12 20h.01M16 18.5h.01M10 21.5h.01M14 17h.01" stroke-width="2.4"/></g>',
  auto: '<circle cx="9" cy="9" r="3.5" fill="#FFD166"/><path d="M9 19a3.5 3.5 0 0 1 .5-7 4.5 4.5 0 0 1 8.6 1A3 3 0 0 1 18 19z" fill="#fff"/>' };
function drawWeatherBtn() { const k = S.weather || 'auto'; $('bWeather').innerHTML = `<svg viewBox="0 0 24 24">${WX[k]}</svg>`; $('bWeather').title = 'Weather: ' + ({ auto: 'as it comes', sun: 'sunny', rain: 'rain', snow: 'snow' }[k]); }
$('bWeather').addEventListener('click', () => { snd.unlock(); snd.play('tick'); const order = [null, 'sun', 'rain', 'snow']; S.weather = order[(order.indexOf(S.weather || null) + 1) % 4]; drawWeatherBtn();
  setHint({ null: 'weather: as it comes', sun: 'weather: sunny', rain: 'weather: rain', snow: 'weather: snow' }[S.weather]); clearTimeout(drawWeatherBtn.t); drawWeatherBtn.t = setTimeout(() => { if (!zapOn && armed < 0) setHint(''); }, 1400); save(); });
$('bZap').addEventListener('click', () => { snd.unlock(); snd.play('tick'); setArmed(-1); setZap(!zapOn); });
function drawSoundBtn() { const m = snd.isMuted(); $('bSound').innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="#FFF3D6"/>${m ? '<path d="M16 9.5l5 5M21 9.5l-5 5"/>' : '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'}</svg>`; $('bSound').title = m ? 'Sound is off' : 'Sound is on'; $('bSound').setAttribute('aria-pressed', String(!m)); }
$('bSound').addEventListener('click', () => { snd.unlock(); snd.setMuted(!snd.isMuted()); drawSoundBtn(); snd.play('pet'); });

// ---------- diary ----------
function dayLabel(key) {
  const today = dayKey(clock.t), y = dayKey(clock.t - 86400000);
  if (key === today) return 'Today'; if (key === y) return 'Yesterday';
  const [Y, M, D] = key.split('-').map(Number);
  return new Date(Y, M - 1, D).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}
function openDiary() {
  const who = S.baos.find((b) => b.id === S.diarist);
  $('diaryTitle').textContent = who ? `${who.name}’s diary` : 'The diary';
  const list = $('diaryList'); list.innerHTML = '';
  const days = {}; for (const e of S.diary) (days[e.d] = days[e.d] || []).push(e);
  const keys = Object.keys(days).sort().reverse();
  if (!keys.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Nothing written yet.'; list.appendChild(p); }
  for (const k of keys.slice(0, 45)) {
    const h = document.createElement('h3'); h.textContent = dayLabel(k); list.appendChild(h);
    for (const e of days[k]) { const p = document.createElement('p'); p.textContent = e.text; list.appendChild(p); }
  }
  $('diary').hidden = false; list.scrollTop = 0; snd.unlock(); snd.play('page');
}
$('bDiary').addEventListener('click', openDiary);
$('diaryClose').addEventListener('click', () => { $('diary').hidden = true; });
$('diary').addEventListener('pointerdown', (e) => { if (e.target === $('diary')) $('diary').hidden = true; });
$('exportBtn').addEventListener('click', (e) => { e.preventDefault(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' })); a.download = `tinybao-community-${dayKey(clock.t)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
$('importBtn').addEventListener('click', (e) => { e.preventDefault(); $('importFile').click(); });
$('importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!Array.isArray(d.floors) || !Array.isArray(d.baos)) throw 0;
    if (!confirm('Replace the community in this browser with the one in this file?')) return;
    localStorage.setItem(KEY, JSON.stringify(d)); location.reload();
  } catch (err) { alert('That file does not look like a saved community.'); }
});

function showCard(title, lines, withDiary) {
  $('cardTitle').textContent = title; const body = $('cardBody'); body.innerHTML = '';
  for (const l of lines) { const p = document.createElement('p'); p.textContent = l; body.appendChild(p); }
  $('cardDiary').hidden = !withDiary; $('card').hidden = false;
}
$('cardOk').addEventListener('click', () => { $('card').hidden = true; });
$('cardDiary').addEventListener('click', () => { $('card').hidden = true; openDiary(); });

function away(from, to) {
  snd.setQuiet(true); const made = catchUp(S, from, to); settle(); snd.setQuiet(false); drawTray(); resize();
  if (to - from > 20 * 60000 && made.length) showCard('While you were away', made.slice(-4).map((e) => e.text), true);
}

// ---------- the loop ----------
let last = performance.now();
function frame(now) {
  const real = Math.min(0.25, (now - last) / 1000); last = now;
  const target = TEST ? clock.t + real * 1000 * clock.speed : Date.now();
  const gap = target - clock.t;
  if (gap > 150000 && !TEST) { clock.t = target; away(target - gap, target); }
  else if (gap > 0) { const n = Math.min(240, Math.ceil(gap / 100)), dt = gap / n / 1000; for (let i = 0; i < n; i++) { clock.t += dt * 1000; tick(dt); } }
  tickParts(real);
  if (down && down.mode === 'zap') { const b = down.t.bao; b.vapor += real / 1.7; if (b.vapor >= 1) { vaporize(b); down = null; setZap(false); save(); } }
  render(ctx, V, S, now / 1000);
  const tag = $('tag');
  if (tagFor && now < tagUntil && S.baos.includes(tagFor) && !tagFor.held) {
    const p = toScreen(tagFor.x, tagFor.floor * FH + tagFor.alt + BAO * 0.84 * (tagFor.size || 1) + 16);
    tag.hidden = false; tag.style.left = clamp(p.x, 70, V.vw - 70) + 'px'; tag.style.top = Math.max(30, p.y) + 'px';
    const txt = `${tagFor.name} <small>· ${tagFor.label}</small>`; if (tag.dataset.t !== txt) { tag.innerHTML = txt; tag.dataset.t = txt; }
  } else tag.hidden = true;
  requestAnimationFrame(frame);
}

// ---------- start ----------
function boot() {
  if (Q.has('speed')) clock.speed = clamp(+Q.get('speed') || 1, 0.1, 5000);
  if (Q.has('hour')) { const want = +Q.get('hour'), d = new Date(); d.setHours(Math.floor(want), Math.round((want % 1) * 60), 0, 0); clock.t = d.getTime(); } else clock.t = Date.now();
  const loaded = load(); S = loaded || newState();
  const first = !loaded;
  init(S); R.sfx = (n) => { if (clock.speed <= 8) snd.play(n); }; R.onChange = (what) => { if (what === 'tray') { armed = -1; drawTray(); } if (what === 'floor') resize(); };
  window.addEventListener('resize', resize); resize();
  let from = S.lastSeen || clock.t;
  if (Q.has('skipDays')) from = clock.t - (+Q.get('skipDays') || 1) * 86400000;
  if (first) { S.diary.push({ t: clock.t, d: dayKey(clock.t), k: 'first', text: 'I have decided to keep a diary. Things happen in this house and somebody should write them down.' }); settle();
    showCard('The tiny bao community', ['They get on with things by themselves.', 'You can pet them, pick them up and put them somewhere else, and drop in today’s things to see what they make of them.'], false); }
  else if (clock.t - from > 150000) away(from, clock.t);
  else settle();
  drawTray(); drawWeatherBtn(); drawSoundBtn(); save();
  setInterval(save, 8000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else last = performance.now(); });
  window.addEventListener('pagehide', save);
  if (TEST) window.__bao = { S, R, clock, V, save, toScreen, toWorld, snd };
  requestAnimationFrame(frame);
}
boot();
