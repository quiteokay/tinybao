// Boot, the frame loop, the camera, and the visitor's hands.
import { RW, FH, W, OUT, BAO, clamp, clock, dayKey, hourOf } from './core.js';
import { newState, nFloors, weatherAt, adults, ext, minFloor, nextAdded } from './world.js';
import { drawBaoShape } from './drawbao.js';
import { R, init, tick, tickParts, settle, catchUp, petBao, pickUpBao, moveHeld, releaseBao, dropThing, pickUpThingByHand, releaseThing, notePhoto, ensureTray, initBao, dropBao, renameBao, plansInfo, choosePlan, furnAt, liftFurn, moveFurn, dropFurn } from './sim.js';
import { render } from './draw.js';
import * as music from './music.js';
import { openBook, closeBook, bookOpen, bookPage, bookBusy, attachBookInput, turn as turnPage, NAME_INK } from './book.js';
import { usePhotoStore, putFull, getFull, delFull } from './photos.js';
import { FLAVORS } from './drawbao.js';
import { SIGN } from './drawsites.js';
import { thingIcon } from './drawthings.js';
import { THINGS } from './diary.js';
import * as snd from './sound.js';

const VERSION = 7; // keep in step with version.json
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const Q = new URLSearchParams(location.search);
const TEST = ['speed', 'skipDays', 'hour', 'fresh', 'test'].some((k) => Q.has(k));
if (Q.has('u') && history.replaceState) history.replaceState(null, '', location.pathname + (TEST ? '?test' : '')); // tidy the address after an update
const KEY = 'tinybao.community.v1' + (TEST ? '.test' : '');
usePhotoStore(TEST ? '-test' : '');
const canvas = $('c'), ctx = canvas.getContext('2d');
let S, V = { vw: 0, vh: 0, dpr: 1, s: 1, cx: W / 2, cy: 0, gy: 0, wx0: 0, wx1: 0 }, baseS = 1;

// ---------- saving ----------
function serialize() {
  const out = { ...S, lastSeen: clock.t };
  out.baos = S.baos.map((b) => ({ id: b.id, name: b.name, kind: b.kind, flavor: b.flavor, acc: b.acc, trait: b.trait, from: b.from, arrived: b.arrived,
    x: Math.round(b.x), floor: b.held || b.fall ? 0 : b.floor, needs: b.needs }));
  out.objects = S.objects.map((o) => { let x = o.x, floor = o.held ? 0 : o.floor; if (o.heldBy) { const c = S.baos.find((b) => b.id === o.heldBy); if (c) { x = c.x; floor = c.floor; } }
    return { id: o.id, type: o.type, x: Math.round(x), floor, uses: o.uses, water: o.water, t: o.t, unseen: o.unseen, hue: o.hue }; });
  return JSON.stringify(out);
}
function save() { try { localStorage.setItem(KEY, serialize()); } catch (e) { /* private mode or full: carry on without saving */ } }
function load() {
  if (Q.has('fresh')) return null;
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; const d = JSON.parse(raw); if (!d || !Array.isArray(d.floors) || !Array.isArray(d.baos)) return null; migrate(d); return Object.assign(newState0(), d); } catch (e) { return null; }
}
function migrate(d) {
  d.weather = null; // the weather is no longer the visitor's to set
  // version 3 had a stairwell column on the right; the house is 110 narrower again, so the right-hand garden moves in with it
  if (d.geo == null && d.done) {
    const shift = (e, ground) => { if (ground && e.x > 570) e.x -= 110; else if (!ground && e.x > 554) e.x = 554; };
    for (const list of [d.baos, d.objects, d.mess]) for (const e of list || []) shift(e, e.floor === 0);
    for (const list of [d.flowers, d.trees, d.snowbaos]) for (const e of list || []) shift(e, true);
    if (d.proj && d.proj.x != null) shift(d.proj, true);
  }
  d.geo = 2;
}
function newState0() { const s = newState(); s.baos = []; s.everNames = []; s.diarist = null; return s; }

// ---------- camera ----------
function resize() {
  V.dpr = Math.min(3, window.devicePixelRatio || 1); V.vw = window.innerWidth; V.vh = window.innerHeight;
  canvas.width = Math.round(V.vw * V.dpr); canvas.height = Math.round(V.vh * V.dpr);
  const phone = V.vw < 700, old = baseS;
  V.gy = V.vh - (phone ? 150 : 140);
  baseS = phone ? V.vw / (W + 70) : clamp(Math.min((V.gy - 50) / (Math.min(nFloors(S) + 1.3, 4.7) * FH), V.vw / (W + 300)), 0.55, 1.6);
  V.s = old && V.s ? clamp(V.s * baseS / old, minS(), 2.6) : baseS;
  if (!V.placed) { V.placed = true; V.cy = cyMin(); }
  clampCam();
}
// The farthest you can zoom out shows today's grounds, not the grounds of the future.
const minS = () => { const e = ext(S); return Math.min(baseS, V.vw / (e.R - e.L + 80), (V.gy - 30) / ((nFloors(S) + 1.4 - minFloor(S)) * FH)); };
const cyMin = () => (S.basement ? -(FH + 34) : 0);
function clampCam() {
  const e = ext(S), half = V.vw / 2 / V.s, lo = e.L - 40 + half, hi = e.R + 40 - half;
  V.cx = lo >= hi ? (e.L + e.R) / 2 : clamp(V.cx, lo, hi);
  const topH = nFloors(S) * FH + 150, vis = (V.gy - 10) / V.s;
  // when zoomed right in, allow a little extra scroll so a bao on the ground can sit mid-screen
  const slack = V.s > baseS * 1.25 ? Math.max(0, (V.gy - V.vh * 0.5) / V.s) : 0;
  V.cy = clamp(V.cy, cyMin() - slack, Math.max(cyMin(), topH - vis));
  V.wx0 = V.cx - half; V.wx1 = V.cx + half;
}
// ---------- following a bao ----------
let follow = null, goHome = false, lastTap = { t: 0, b: null };
const followS = () => clamp(baseS * 2.3, 1.5, 2.6);
function startFollow(b, snap) {
  follow = b; goHome = false; showTag(b);
  if (snap) { V.s = followS(); V.cx = b.x; V.cy = b.floor * FH + b.alt + 20 - (V.gy - V.vh * 0.5) / V.s; clampCam(); }
}
function stopFollow() { follow = null; goHome = false; }
function stepCamera(real) {
  if (follow && !S.baos.includes(follow)) follow = null;
  if (follow) {
    const k = Math.min(1, real * 3.5); V.s += (followS() - V.s) * Math.min(1, real * 3);
    V.cx += (follow.x - V.cx) * k; V.cy += (follow.floor * FH + follow.alt + 20 - (V.gy - V.vh * 0.5) / V.s - V.cy) * k; clampCam();
  } else if (goHome) {
    const k = Math.min(1, real * 3.5); V.s += (baseS - V.s) * k; V.cx += (W / 2 - V.cx) * k; V.cy += (cyMin() - V.cy) * k; clampCam();
    if (Math.abs(V.s - baseS) < 0.004) goHome = false;
  }
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
  if (Math.abs(p.x - SIGN.x) < SIGN.w / 2 + pad && p.h > SIGN.h0 - pad && p.h < SIGN.h1 + pad && S.proj) return { sign: true };
  const f = furnAt(p.x, p.h); if (f) return { furn: f };
  return null;
}
const ptrs = new Map(); let down = null, pinch = null, armed = -1, tagFor = null, tagUntil = 0;
function showTag(b) { tagFor = b; tagUntil = performance.now() + 4500; }
function setHint(text) { const h = $('hint'); if (text) { h.textContent = text; h.hidden = false; } else h.hidden = true; }
function setArmed(i) { armed = i; drawTray(); setHint(i === BAO_SLOT ? `tap anywhere to drop ${todaysBao().name} in` : i >= 0 ? 'tap anywhere to drop it' : ''); }

canvas.addEventListener('pointerdown', (e) => {
  snd.unlock(); music.resumeIfOn();
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    if (down && down.mode === 'furn') dropFurn(); if (down && down.mode === 'bao') releaseBao(down.t.bao); if (down && down.mode === 'thing') releaseThing(down.t.thing);
    down = null; stopFollow(); const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; return;
  }
  const t = hit(e.clientX, e.clientY);
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t, moved: false, mode: null, id: e.pointerId, at: performance.now() };
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) { canvas.style.cursor = hit(e.clientX, e.clientY) ? 'grab' : 'default'; return; }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.d); pinch.d = d; return; }
  if (!down || down.id !== e.pointerId) return;
  const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (down.mode === 'furn') { const p = toWorld(e.clientX, e.clientY); moveFurn(p.x, p.h - 12); down.moved = true; return; }
  if (!down.moved && dist > 8) {
    down.moved = true;
    if (down.t && down.t.bao) { down.mode = 'bao'; snd.play('pick'); pickUpBao(down.t.bao); const p = toWorld(down.x, down.y); down.off = { x: down.t.bao.x - p.x, h: 0 }; tagFor = null; }
    else if (down.t && down.t.thing) { down.mode = 'thing'; snd.play('pick'); pickUpThingByHand(down.t.thing); }
    else { down.mode = 'pan'; stopFollow(); }
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
  if (d.mode === 'furn') { if (!dropFurn()) snd.play('blip'); setHint(''); save(); }
  else if (d.mode === 'bao') { releaseBao(d.t.bao); save(); }
  else if (d.mode === 'thing') { releaseThing(d.t.thing); save(); }
  else if (!d.moved && e.type === 'pointerup') {
    if (armed >= 0) { const p = toWorld(e.clientX, e.clientY); useTray(armed, p.x, p.h); }
    else if (d.t && d.t.bao) {
      const b = d.t.bao;
      petBao(b); snd.play('pet'); startFollow(b); lastTap = { t: 0, b: null };
    }
    else if (d.t && d.t.thing) { d.t.thing.sq = 0.3; snd.play('blip'); }
    else if (d.t && d.t.sign) openPlans();
    else if (d.t && d.t.furn && armed < 0) { setHint('press and hold to move it'); clearTimeout(setHint.t); setHint.t = setTimeout(() => { if (armed < 0 && !(down && down.mode === 'furn')) setHint(''); }, 1500); }
    else { const now = performance.now(); tagFor = null; if (lastTap.b === 'sky' && now - lastTap.t < 400) { follow = null; goHome = true; lastTap = { t: 0, b: null }; } else lastTap = { t: now, b: 'sky' }; }
  }
}
canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  stopFollow();
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
  else { V.cy -= e.deltaY / V.s; V.cx += e.deltaX / V.s; clampCam(); }
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (!$('photoView').hidden) { if (e.key === 'Escape') closePhoto(); return; }
  if (!$('diary').hidden) { if (e.key === 'Escape') closeDiary(); else if (e.key === 'ArrowRight') turnPage(1); else if (e.key === 'ArrowLeft') turnPage(-1); return; }
  if (!$('photoView').hidden) { if (e.key === 'Escape') closePhoto(); return; }
  if (!$('baoCard').hidden) { if (e.key === 'Escape') closeCard(); return; }
  if (!$('plansCard').hidden) { if (e.key === 'Escape') closePlans(); return; }
  if (e.key === 'Escape') setArmed(-1);
  const k = { ArrowUp: [0, 60], ArrowDown: [0, -60], ArrowLeft: [-60, 0], ArrowRight: [60, 0] }[e.key];
  if (k) { stopFollow(); V.cx += k[0] / V.s; V.cy += k[1] / V.s; clampCam(); }
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
  // one new bao a day
  const sep = document.createElement('div'); sep.className = 'sep'; box.appendChild(sep);
  const spec = todaysBao(), free = spec && !S.tray.bao.used, el = document.createElement('div');
  el.className = 'slot bao' + (free ? '' : ' used') + (armed === BAO_SLOT ? ' armed' : '');
  if (free) { const cv = document.createElement('canvas'); baoIcon(cv, spec); el.appendChild(cv); el.title = spec.name + ' would like to move in'; el.addEventListener('pointerdown', (e) => trayDown(e, BAO_SLOT, el)); }
  box.appendChild(el);
  trayNoteAt = 0; updateTrayNote();
}
const BAO_SLOT = 3;
// Today's newcomer, with any name or colour the visitor has already picked.
function todaysBao() { const base = nextAdded(S); return base && { ...base, ...(S.tray.bao.pick || {}) }; }
function baoIcon(canvas, spec) {
  const dpr = Math.min(3, window.devicePixelRatio || 1), s = 52;
  canvas.width = s * dpr; canvas.height = s * dpr; canvas.style.width = canvas.style.height = s + 'px';
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineJoin = 'round';
  c.translate(s / 2, s * 0.8); c.scale(0.9, 0.9); drawBaoShape(c, { flavor: spec.flavor, acc: spec.acc, expr: 'joy' }, 0);
}
const trayAllUsed = () => S.tray.items.every((i) => i.used) && (S.tray.bao.used || !todaysBao());
// Under the tray: once today's things are used, count down to midnight (the visitor's own clock).
let trayNoteAt = 0;
function updateTrayNote() {
  if (performance.now() < trayNoteAt) return; trayNoteAt = performance.now() + 1000;
  let text = 'today’s things';
  if (trayAllUsed()) {
    const d = new Date(clock.t); d.setHours(24, 0, 0, 0);
    const mins = Math.ceil((d.getTime() - clock.t) / 60000), h = Math.floor(mins / 60), m = mins % 60;
    text = mins <= 1 ? 'new things any moment now' : h ? `new things in ${h}h ${String(m).padStart(2, '0')}m` : `new things in ${m}m`;
  }
  const el = $('trayNote'); if (el.textContent !== text) el.textContent = text;
}
function useTray(i, x, h) {
  if (i === BAO_SLOT) {
    if (S.tray.bao.used) return; const chosen = !!S.tray.bao.met, b = dropBao(x, Math.max(h, minFloor(S) * FH) + 2, S.tray.bao.pick); if (!b) return;
    S.tray.bao.used = true; snd.play('whoosh'); setArmed(-1); showTag(b); save();
    if (!chosen) setTimeout(() => openCard('welcome', b), 1300); // dragged straight in: say hello once it has landed
    return;
  }
  const it = S.tray.items[i]; if (!it || it.used) return;
  dropThing(it.type, x, Math.max(h, minFloor(S) * FH) + 2); snd.play('whoosh'); it.used = true; setArmed(-1); save();
}
function trayDown(e, i, el) {
  e.preventDefault(); snd.unlock(); el.setPointerCapture(e.pointerId);
  const sx = e.clientX, sy = e.clientY; let ghost = null, moved = false;
  const mv = (ev) => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) { moved = true; ghost = document.createElement('canvas'); ghost.id = 'ghost'; if (i === BAO_SLOT) baoIcon(ghost, todaysBao()); else thingIcon(ghost, S.tray.items[i].type); document.body.appendChild(ghost); el.style.opacity = 0.3; }
    if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
  };
  const up = (ev) => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    if (ghost) ghost.remove(); el.style.opacity = 1;
    if (ev.type === 'pointercancel') return;
    if (!moved) { snd.play('tick'); if (i === BAO_SLOT && armed !== i) openCard('meet'); else setArmed(armed === i ? -1 : i); }
    else if (ev.clientY < $('bar').getBoundingClientRect().top + 10) { const p = toWorld(ev.clientX, ev.clientY); useTray(i, p.x, p.h); }
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}

$('bCam').addEventListener('click', () => { snd.unlock(); setArmed(-1); takeShot(); });
// ---------- photos ----------
// The camera keeps exactly what is on screen. The save holds a small preview; the full photo goes in IndexedDB.
const thumbCanvas = document.createElement('canvas'), fullCanvas = document.createElement('canvas');
function makeThumb(src, sx, sy, sw, sh) {
  thumbCanvas.width = 240; thumbCanvas.height = 180; const pc = thumbCanvas.getContext('2d');
  pc.drawImage(src, sx, sy, sw, sh, 0, 0, 240, 180);
  const g = pc.createRadialGradient(120, 90, 81, 120, 90, 168); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(120,80,40,.28)'); pc.fillStyle = g; pc.fillRect(0, 0, 240, 180);
  return thumbCanvas.toDataURL('image/jpeg', 0.72);
}
function makeFull(src) {
  const k = Math.min(1, 1280 / Math.max(src.width, src.height)); fullCanvas.width = Math.round(src.width * k); fullCanvas.height = Math.round(src.height * k);
  fullCanvas.getContext('2d').drawImage(src, 0, 0, fullCanvas.width, fullCanvas.height);
  return fullCanvas.toDataURL('image/jpeg', 0.82);
}
function keepPhoto(thumb, full, w, h) {
  const p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 99), t: clock.t, day: dayKey(clock.t), d: thumb, w, h };
  (S.photos = S.photos || []).push(p); putFull(p.id, full);
  while (S.photos.length > 24) delFull(S.photos.shift().id);
  return p;
}
function takeShot() {
  let thumb, full; const cw = canvas.width, ch = canvas.height, sceneH = Math.min(ch, V.gy * V.dpr + 20 * V.dpr);
  // preview: the middle of the scene, landscape
  const tw = Math.min(cw, sceneH * 4 / 3), th = tw * 3 / 4;
  try { thumb = makeThumb(canvas, (cw - tw) / 2, Math.max(0, (sceneH - th) / 2), tw, th); full = makeFull(canvas); } catch (e) { return; }
  keepPhoto(thumb, full, fullCanvas.width, fullCanvas.height);
  R.flash = 1; snd.play('shutter');
  const mid = toWorld(V.vw / 2, V.gy * 0.55); notePhoto(mid.x, clamp(Math.floor((mid.h + 6) / FH), S.basement ? -1 : 0, nFloors(S)), false);
  setHint('saved in the diary'); clearTimeout(setHint.t); setHint.t = setTimeout(() => { if (armed < 0) setHint(''); }, 1600);
  save();
}
// The party photo is taken off-screen, around the party, wherever the view happens to be.
const offCanvas = document.createElement('canvas');
function takePhoto(x, h, auto) {
  const f = Math.max(Math.floor((h + 6) / FH), S.basement ? -1 : 0), centreH = Math.min(h, f * FH + 70), W2 = 1024, H2 = 768, s = 2.4;
  const Vp = { vw: W2, vh: H2, dpr: 1, s, cx: x, cy: centreH, gy: H2 / 2, wx0: x - W2 / 2 / s, wx1: x + W2 / 2 / s };
  offCanvas.width = W2; offCanvas.height = H2;
  const flash = R.flash; R.flash = 0; render(offCanvas.getContext('2d'), Vp, S, performance.now() / 1000); R.flash = flash;
  let thumb, full; try { thumb = makeThumb(offCanvas, 0, 0, W2, H2); full = offCanvas.toDataURL('image/jpeg', 0.82); } catch (e) { return; }
  keepPhoto(thumb, full, W2, H2);
  if (!auto) { R.flash = 1; snd.play('shutter'); }
  notePhoto(x, clamp(f, S.basement ? -1 : 0, nFloors(S)), auto); save();
}
// Full-screen viewer, with delete.
let viewing = null;
async function openPhoto(id) {
  const p = (S.photos || []).find((q) => q.id === id); if (!p) return;
  viewing = p; const img = $('pvImg'); img.src = p.d; img.style.transform = '';
  const d = new Date(p.t); $('pvWhen').textContent = dayLabel(p.day) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  $('pvDel').textContent = 'delete'; $('pvDel').classList.remove('sure'); $('photoView').hidden = false; viewing.at = performance.now(); snd.play('page');
  const full = await getFull(id); if (full && viewing === p) img.src = full;
}
function closePhoto() { $('photoView').hidden = true; viewing = null; }
$('pvClose').addEventListener('click', closePhoto);
$('photoView').addEventListener('click', (e) => { if (e.target === $('photoView') && viewing && performance.now() - viewing.at > 450) closePhoto(); });
$('pvDel').addEventListener('click', () => {
  const btn = $('pvDel'); if (!btn.classList.contains('sure')) { btn.classList.add('sure'); btn.textContent = 'really delete?'; return; }
  const p = viewing; if (!p) return; S.photos.splice(S.photos.indexOf(p), 1); delFull(p.id); save(); closePhoto(); snd.play('blip');
  if (!$('diary').hidden) openDiary(bookPage());
});
swipeToClose($('photoView'), $('pvImg'), closePhoto);
// Pull something down far enough and it closes.
function swipeToClose(area, mover, close, busy = () => false) {
  let s = null;
  area.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a, input')) return; s = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now(), on: false }; });
  area.addEventListener('pointermove', (e) => {
    if (!s || s.id !== e.pointerId) return; const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.on) { if (busy() || dy < 12 || dy < Math.abs(dx) * 1.3) return; s.on = true; try { area.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } mover.style.transition = 'none'; }
    mover.style.transform = `translateY(${Math.max(0, dy)}px)`;
  });
  const end = (e) => {
    if (!s || s.id !== e.pointerId) { s = null; return; } const g = s; s = null; if (!g.on) return;
    const dy = e.clientY - g.y, fast = dy > 50 && performance.now() - g.t < 250; mover.style.transition = '';
    if (dy > 120 || fast) { mover.style.transform = 'translateY(110vh)'; setTimeout(() => { close(); mover.style.transform = ''; }, 230); }
    else mover.style.transform = '';
  };
  area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
}
// ---------- the building plans ----------
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const HAMMER = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20l8-8" stroke="#8a5a3c" stroke-width="3" stroke-linecap="round"/><rect x="9" y="3" width="11" height="6" rx="1.5" transform="rotate(45 14.5 6)" fill="#9aa3a8" stroke="#3a2a22" stroke-width="1.5"/></svg>';
let chipAt = 0;
function updatePlansChip(force) {
  const now = performance.now(); if (!force && now < chipAt) return; chipAt = now + 1000;
  const I = plansInfo(), el = $('plans'); if (!I) { el.hidden = true; return; } el.hidden = false;
  const html = `${HAMMER}<span class="tx">${I.waiting ? 'pick what’s next!' : esc(cap(I.short))} <small>· ${I.waiting ? esc(I.choice.opts.map((o) => o.name.replace(/^an? /, '')).join(' or ')) : esc(I.eta)}</small><span class="bar"><i style="width:${Math.round(I.p * 100)}%"></i></span></span>`;
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  el.classList.toggle('ask', I.waiting);
}
function renderPlans() {
  const I = plansInfo(); if (!I) return closePlans();
  let h = `<h2>What the baos are building</h2><div class="now"><b>${esc(cap(I.name))}</b><span>${esc(cap(I.stage))}</span><div class="bar"><i style="width:${Math.round(I.p * 100)}%"></i></div><small>${esc(cap(I.eta))}</small></div>`;
  if (I.choice) {
    h += `<h3>${I.choice.pick ? 'Next up' : 'Inspire their next addendum to be…'}</h3><div class="opts">${I.choice.opts.map((o) => `<button data-id="${o.id}" class="${o.id === I.choice.pick ? 'on' : ''}">${esc(cap(o.name))}<small>${esc(o.blurb)}</small></button>`).join('')}</div>`;
    h += `<p class="note">${I.choice.pick ? `${esc(cap(I.choice.opts.find((o) => o.id === I.choice.pick).name))} it is. They’ll start once this one is done. You can still change your mind until then.` : 'Tap one to choose.'}</p>`;
  } else h += `<p class="note">${I.more ? 'The next two ideas go up on the board when this one is a bit further along.' : 'The big list is done. Now it’s trees, flowers and odd jobs, for ever.'}</p>`;
  h += '<div class="cardBtns"><button id="pcOk">ok</button></div>';
  $('pcBody').innerHTML = h;
}
function openPlans() { renderPlans(); $('plansCard').hidden = false; $('plansCard').dataset.at = performance.now(); snd.unlock(); snd.play('page'); }
function closePlans() { $('plansCard').hidden = true; }
$('plans').addEventListener('click', openPlans);
$('plansCard').addEventListener('click', (e) => {
  const opt = e.target.closest('.opts button'); if (opt) { if (choosePlan(opt.dataset.id)) { snd.play('pet'); renderPlans(); updatePlansChip(true); save(); } return; }
  if (e.target.closest('#pcOk') || (e.target === $('plansCard') && performance.now() - +$('plansCard').dataset.at > 450)) closePlans();
});
// ---------- meeting, naming and colouring a bao ----------
const SWATCHES = ['plain', 'custard', 'peach', 'rosy', 'taro', 'sky', 'mint', 'matcha', 'wheat', 'sesame'];
const ABOUT = { tidy: 'likes everything just so', lazy: 'is an expert napper', nosy: 'wants to know everything', mischief: 'is a bit of a scamp', doting: 'adores the baby',
  sporty: 'never sits still', dreamy: 'watches the clouds a lot', hungry: 'is always a little peckish', musical: 'hums all day long', green: 'is happiest in the garden', elder: 'knits, and knows things', baby: 'is very small' };
let card = null;
function drawCardPic() {
  const cv = $('bcPic'), dpr = Math.min(3, window.devicePixelRatio || 1); cv.width = 160 * dpr; cv.height = 140 * dpr;
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineJoin = 'round'; c.clearRect(0, 0, 160, 140);
  c.translate(80, 128); c.scale(2.3, 2.3); drawBaoShape(c, { flavor: card.flavor, acc: card.acc, expr: 'joy', size: card.size || 1 }, 0);
}
function openCard(mode, b) {
  const spec = mode === 'meet' ? todaysBao() : b; if (!spec) return;
  card = { mode, b, flavor: spec.flavor, acc: spec.acc, size: b && b.size, orig: spec.name, trait: spec.trait, from: spec.from };
  $('bcTitle').textContent = mode === 'meet' ? `Meet ${spec.name}!` : mode === 'welcome' ? `Welcome, ${spec.name}!` : spec.name;
  const where = mode === 'meet' ? ` ${spec.name} would like to move in today.` : b && b.arrived ? ` Here since ${dayLabel(dayKey(b.arrived)).replace(/^(Today|Yesterday)$/, (m) => m.toLowerCase())}.` : '';
  $('bcAbout').textContent = `${spec.name} ${ABOUT[spec.trait] || 'is lovely'}.${where}`;
  $('bcName').value = spec.name; $('bcErr').textContent = '';
  $('bcOk').textContent = mode === 'meet' ? `bring ${spec.name} in` : 'done';
  $('bcCancel').textContent = mode === 'meet' ? 'not now' : 'cancel'; $('bcCancel').hidden = mode === 'welcome';
  const sw = $('bcSwatches'); sw.innerHTML = '';
  for (const k of SWATCHES) { const btn = document.createElement('button'); btn.style.background = FLAVORS[k].fill; btn.title = k; btn.setAttribute('role', 'radio');
    if (k === 'sesame') btn.style.backgroundImage = 'radial-gradient(#3a2a22 1.2px, transparent 1.6px)', btn.style.backgroundSize = '7px 7px';
    btn.className = k === card.flavor ? 'on' : ''; btn.setAttribute('aria-checked', String(k === card.flavor));
    btn.addEventListener('click', () => { card.flavor = k; for (const q of sw.children) { q.classList.toggle('on', q === btn); q.setAttribute('aria-checked', String(q === btn)); } drawCardPic(); snd.play('tick'); });
    sw.appendChild(btn); }
  drawCardPic(); $('baoCard').hidden = false; card.at = performance.now(); snd.unlock(); snd.play('pet');
}
function closeCard() { $('baoCard').hidden = true; card = null; }
function cardName() {
  const name = $('bcName').value.replace(/\s+/g, ' ').trim();
  if (!name) return [null, 'Every bao needs a name.'];
  if (name.length > 14) return [null, 'That name is a bit long.'];
  const taken = [...S.everNames, ...(S.usedAdded || [])].some((n) => n.toLowerCase() === name.toLowerCase() && n !== card.orig);
  if (taken) return [null, `There is already a ${name}.`];
  return [name, ''];
}
$('bcOk').addEventListener('click', () => {
  const [name, err] = cardName(); if (err) { $('bcErr').textContent = err; snd.play('blip'); return; }
  if (card.mode === 'meet') {
    S.tray.bao.pick = { name, flavor: card.flavor }; S.tray.bao.met = true; closeCard(); drawTray(); setArmed(BAO_SLOT); save(); return;
  }
  if (card.b && S.baos.includes(card.b)) { renameBao(card.b, name, card.flavor); card.b.joyT = 2; card.b.squash = 0.2; }
  closeCard(); snd.play('pet'); save();
});
$('bcCancel').addEventListener('click', closeCard);
// a phone sends a late click after the tap that opened the card: ignore background taps for a moment
$('baoCard').addEventListener('click', (e) => { if (e.target === $('baoCard') && card && card.mode !== 'welcome' && performance.now() - card.at > 450) closeCard(); });
$('bcName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('bcOk').click(); e.stopPropagation(); });
$('tag').addEventListener('click', (e) => { if (e.target.closest('.edit') && tagFor) openCard('edit', tagFor); });
// ---------- music ----------
function drawMusicBtn() { const on = music.isOn(); $('bMusic').innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 17V6l10-2v11" fill="none"/><circle cx="6.5" cy="17.5" r="2.6" fill="${on ? '#B58BD9' : '#FFF3D6'}"/><circle cx="16.5" cy="15.5" r="2.6" fill="${on ? '#B58BD9' : '#FFF3D6'}"/>${on ? '' : '<path d="M4 4l16 16" stroke="#E8604C"/>'}</svg>`;
  $('bMusic').classList.toggle('on', on); $('bMusic').title = on ? 'Music is on' : 'Music is off'; $('bMusic').setAttribute('aria-pressed', String(on)); }
$('bMusic').addEventListener('click', () => { snd.unlock(); music.setOn(!music.isOn()); drawMusicBtn(); });
function drawSoundBtn() { const m = snd.isMuted(); $('bSound').innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="#FFF3D6"/>${m ? '<path d="M16 9.5l5 5M21 9.5l-5 5"/>' : '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'}</svg>`; $('bSound').title = m ? 'Sound is off' : 'Sound is on'; $('bSound').setAttribute('aria-pressed', String(!m)); }
$('bSound').addEventListener('click', () => { snd.unlock(); snd.setMuted(!snd.isMuted()); drawSoundBtn(); snd.play('pet'); });

// ---------- diary ----------
function dayLabel(key) {
  const today = dayKey(clock.t), y = dayKey(clock.t - 86400000);
  if (key === today) return 'Today'; if (key === y) return 'Yesterday';
  const [Y, M, D] = key.split('-').map(Number);
  return new Date(Y, M - 1, D).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}
function openDiary(at) {
  const who = S.baos.find((b) => b.id === S.diarist);
  $('diaryTitle').textContent = who ? `${who.name}’s diary` : 'The diary';
  // everyone who might be mentioned: residents in their own colour, old friends in a quiet brown
  const people = S.baos.map((b) => ({ name: b.name, id: b.id, color: NAME_INK[b.flavor] || '#8a6a4a' }));
  for (const n of S.everNames || []) if (!people.some((p) => p.name === n)) people.push({ name: n, id: null, color: '#8a7a72' });
  people.sort((a, b) => b.name.length - a.name.length);
  $('diary').hidden = false;
  openBook({ host: $('bookPages'), nav: $('bookNav'), entries: S.diary.slice(-400), photos: S.photos || [], people, dayLabel, at: typeof at === 'number' ? at : null,
    onPhoto: (id) => openPhoto(id),
    onTurn: () => snd.play('page'),
    onName: (id) => { const b = S.baos.find((q) => q.id === id); closeDiary(); if (b) { startFollow(b); snd.play('blip'); } } });
  snd.unlock(); snd.play('page');
}
function closeDiary() { $('diary').hidden = true; closeBook(); }
attachBookInput($('bookPages'));
$('bDiary').addEventListener('click', () => openDiary());
swipeToClose($('diary'), document.querySelector('#diary .book'), () => closeDiary(), bookBusy);
$('diaryClose').addEventListener('click', closeDiary);
$('diary').addEventListener('pointerdown', (e) => { if (e.target === $('diary')) closeDiary(); });
window.addEventListener('resize', () => { if (!$('diary').hidden) openDiary(bookPage()); });
$('exportBtn').addEventListener('click', (e) => { e.preventDefault(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' })); a.download = `tinybao-community-${dayKey(clock.t)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
$('importBtn').addEventListener('click', (e) => { e.preventDefault(); $('importFile').click(); });
$('importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!Array.isArray(d.floors) || !Array.isArray(d.baos)) throw 0;
    if (!confirm('Replace the community in this browser with the one in this file?')) return;
    localStorage.setItem(KEY, JSON.stringify(d)); location.reload();
  } catch (err) { alert('That file does not look like a saved community.'); }
});

// ---------- updates ----------
// Home-screen apps hang on to old files, so this fetches the latest ones on request and says what changed.
const notesSince = (info, v) => info.changes.filter((c) => c.v > v).flatMap((c) => c.notes);
async function checkForUpdates() {
  const link = $('updateBtn'); link.textContent = 'checking…';
  let info;
  try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0; info = await r.json(); }
  catch (e) { link.textContent = 'check for updates'; closeDiary(); showCard('Could not check', ['The baos could not reach the outside world just now. Try again when you are online.'], false); return; }
  if (!(info.v > VERSION)) {
    link.textContent = 'check for updates'; closeDiary();
    showCard('You already have the latest', [].concat(notesSince(info, VERSION - 1).map((n) => '• ' + n)), false); return;
  }
  link.textContent = 'fetching…'; save();
  try { localStorage.setItem('tinybao.updatedFrom', String(VERSION)); } catch (e) { /* ignore */ }
  // pull every file fresh so the reload cannot pick up stale copies
  await Promise.all((info.files || []).map((f) => fetch(f + (f.endsWith('main.js') || f.endsWith('.css') ? '?v=' + info.v : ''), { cache: 'reload' }).catch(() => null)));
  location.replace(location.pathname + '?u=' + info.v + (TEST ? '&test' : ''));
}
async function announceUpdate() {
  let from; try { from = localStorage.getItem('tinybao.updatedFrom'); localStorage.removeItem('tinybao.updatedFrom'); } catch (e) { return; }
  if (from == null) return;
  if (+from >= VERSION) { showCard('Not quite yet', ['The new version would not load this time. Close the app fully, open it again, and it should be there.'], false); return; }
  let notes = [];
  try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); notes = notesSince(await r.json(), +from); } catch (e) { /* show the card without the list */ }
  showCard('Updated!', ['The community has had some work done:'].concat(notes.map((n) => '• ' + n)), false);
}
$('updateBtn').addEventListener('click', (e) => { e.preventDefault(); checkForUpdates(); });

function showCard(title, lines, withDiary) {
  $('cardTitle').textContent = title; const body = $('cardBody'); body.innerHTML = '';
  for (const l of lines) { const p = document.createElement('p'); p.textContent = l; body.appendChild(p); }
  $('cardDiary').hidden = !withDiary; $('card').hidden = false;
}
$('cardOk').addEventListener('click', () => { $('card').hidden = true; });
$('cardDiary').addEventListener('click', () => { $('card').hidden = true; openDiary(); });

function away(from, to) {
  snd.setQuiet(true); const made = catchUp(S, from, to); settle(); snd.setQuiet(false); ensureTray(S); drawTray(); resize();
  if (to - from > 20 * 60000 && made.length) showCard('While you were away', made.slice(-4).map((e) => e.text), true);
}

// ---------- the loop ----------
let last = performance.now(), bootDay = '';
function frame(now) {
  const real = Math.min(0.25, (now - last) / 1000); last = now;
  const target = TEST ? clock.t + real * 1000 * clock.speed : Date.now();
  const gap = target - clock.t;
  if (gap > 150000 && !TEST) { clock.t = target; away(target - gap, target); }
  else if (gap > 0) { const n = Math.min(240, Math.ceil(gap / 100)), dt = gap / n / 1000; for (let i = 0; i < n; i++) { clock.t += dt * 1000; tick(dt); } }
  tickParts(real); updateTrayNote(); updatePlansChip(); stepCamera(real);
  // furniture lifts after a short press, so an ordinary drag still pans the view
  if (down && !down.mode && !down.moved && down.t && down.t.furn && armed < 0 && now - down.at > 380) { down.mode = 'furn'; liftFurn(down.t.furn); snd.play('pick'); setHint('drop it in any room'); canvas.style.cursor = 'grabbing'; }
  render(ctx, V, S, now / 1000);
  const tag = $('tag');
  if (follow && !tagFor) tagFor = follow;
  if (tagFor && (now < tagUntil || tagFor === follow) && S.baos.includes(tagFor) && !tagFor.held) {
    const p = toScreen(tagFor.x, tagFor.floor * FH + tagFor.alt + BAO * 0.84 * (tagFor.size || 1) + 16);
    tag.hidden = false; tag.style.left = clamp(p.x, 70, V.vw - 70) + 'px'; tag.style.top = Math.max(30, p.y) + 'px';
    const txt = `${esc(tagFor.name)} <small>· ${esc(tagFor.label)}</small><button class="edit" title="Rename or recolour" aria-label="Rename or recolour ${esc(tagFor.name)}">✎</button>`; if (tag.dataset.t !== txt) { tag.innerHTML = txt; tag.dataset.t = txt; }
  } else tag.hidden = true;
  requestAnimationFrame(frame);
}

// ---------- start ----------
function boot() {
  if (Q.has('speed')) clock.speed = clamp(+Q.get('speed') || 1, 0.1, 5000);
  if (Q.has('hour')) { const want = +Q.get('hour'), d = new Date(); d.setHours(Math.floor(want), Math.round((want % 1) * 60), 0, 0); clock.t = d.getTime(); } else clock.t = Date.now();
  const loaded = load(); S = loaded || newState();
  const first = !loaded;
  if (first) S.diary.push({ t: clock.t, d: dayKey(clock.t), k: 'first', text: 'I have decided to keep a diary. Things happen in this house and somebody should write them down.' });
  init(S); R.sfx = (n) => { if (clock.speed <= 8) snd.play(n); }; R.onChange = (what, info) => { if (what === 'tray') { armed = -1; drawTray(); if (S.tray.day !== bootDay) snd.play('arrive'); } if (what === 'photo') takePhoto(info.x, info.f * FH + 40, true); if (what === 'plans' || what === 'grounds') { updatePlansChip(true); if (!$('plansCard').hidden) renderPlans(); } if (what === 'floor' || what === 'grounds') { if (what === 'floor' && S.basement && V.cy === 0 && !follow) V.cy = cyMin(); resize(); } };
  window.addEventListener('resize', resize); resize();
  let from = S.lastSeen || clock.t;
  if (Q.has('skipDays')) from = clock.t - (+Q.get('skipDays') || 1) * 86400000;
  if (first) { settle();
    showCard('The tiny bao community', ['They get on with things by themselves.', 'You can pet them, pick them up and put them somewhere else, and drop in today’s things to see what they make of them.'], false); }
  else if (clock.t - from > 150000) away(from, clock.t);
  else settle();
  // coming back on a new day: open close in on one bao and follow it
  if (!first && dayKey(from) !== dayKey(clock.t) && S.baos.length) {
    const ad = S.baos.filter((b) => b.kind !== 'baby'), awake = ad.filter((b) => !b.sleeping), busy = awake.filter((b) => b.act && b.act !== 'wander');
    let pool = busy.length ? busy : awake.length ? awake : ad.length ? ad : S.baos; const fresh = pool.filter((b) => b.id !== S.lastStar); if (fresh.length) pool = fresh;
    const star = pool[Math.floor(Math.random() * pool.length)]; S.lastStar = star.id; startFollow(star, true);
  }
  announceUpdate();
  bootDay = S.tray.day; drawTray(); drawSoundBtn(); drawMusicBtn(); save();
  setInterval(save, 8000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else last = performance.now(); });
  window.addEventListener('pagehide', save);
  if (TEST) window.__bao = { S, R, clock, V, save, toScreen, toWorld, snd, music, VERSION, plansInfo, takePhoto, takeShot, getFull, cam: () => ({ follow: follow && follow.name, s: V.s, cx: V.cx, cy: V.cy, baseS, minS: minS() }) };
  requestAnimationFrame(frame);
}
boot();
