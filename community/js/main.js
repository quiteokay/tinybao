// Boot, the frame loop, the camera, and the visitor's hands.
import { RW, FH, W, OUT, BAO, clamp, clock, dayKey, hourOf } from './core.js';
import { newState, nFloors, weatherAt, adults, ext, minFloor, nextAdded } from './world.js';
import { drawBaoShape } from './drawbao.js';
import { R, init, tick, tickParts, settle, catchUp, petBao, pickUpBao, moveHeld, releaseBao, dropThing, pickUpThingByHand, releaseThing, notePhoto, ensureTray, initBao, dropBao, furnAt, liftFurn, moveFurn, dropFurn } from './sim.js';
import { render } from './draw.js';
import * as music from './music.js';
import { openBook, closeBook, bookOpen, attachBookInput, turn as turnPage, NAME_INK } from './book.js';
import { thingIcon } from './drawthings.js';
import { THINGS } from './diary.js';
import * as snd from './sound.js';

const VERSION = 5; // keep in step with version.json
const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const TEST = ['speed', 'skipDays', 'hour', 'fresh', 'test'].some((k) => Q.has(k));
if (Q.has('u') && history.replaceState) history.replaceState(null, '', location.pathname + (TEST ? '?test' : '')); // tidy the address after an update
const KEY = 'tinybao.community.v1' + (TEST ? '.test' : '');
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
  const f = furnAt(p.x, p.h); if (f) return { furn: f };
  return null;
}
const ptrs = new Map(); let down = null, pinch = null, armed = -1, camOn = false, tagFor = null, tagUntil = 0;
function showTag(b) { tagFor = b; tagUntil = performance.now() + 4500; }
function setHint(text) { const h = $('hint'); if (text) { h.textContent = text; h.hidden = false; } else h.hidden = true; }
function setCam(on) { camOn = on; $('bCam').classList.toggle('on', on); setHint(on ? 'tap anywhere to take a photo' : armed >= 0 ? 'tap anywhere to drop it' : ''); }
function setArmed(i) { armed = i; if (i >= 0 && camOn) setCam(false); drawTray(); setHint(i === BAO_SLOT ? 'tap anywhere to drop the new bao in' : i >= 0 ? 'tap anywhere to drop it' : ''); }

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
    if (camOn) { const p = toWorld(e.clientX, e.clientY); takePhoto(p.x, p.h, false); setCam(false); }
    else if (armed >= 0) { const p = toWorld(e.clientX, e.clientY); useTray(armed, p.x, p.h); }
    else if (d.t && d.t.bao) {
      const now = performance.now(), b = d.t.bao;
      petBao(b); snd.play('pet'); showTag(b);
      if (lastTap.b === b && now - lastTap.t < 400) { startFollow(b); snd.play('blip'); lastTap = { t: 0, b: null }; } else lastTap = { t: now, b };
    }
    else if (d.t && d.t.thing) { d.t.thing.sq = 0.3; snd.play('blip'); }
    else if (d.t && d.t.furn && armed < 0) { setHint('press and hold to move it'); clearTimeout(setHint.t); setHint.t = setTimeout(() => { if (!camOn && armed < 0 && !(down && down.mode === 'furn')) setHint(''); }, 1500); }
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
  if (!$('diary').hidden) { if (e.key === 'Escape') closeDiary(); else if (e.key === 'ArrowRight') turnPage(1); else if (e.key === 'ArrowLeft') turnPage(-1); return; }
  if (e.key === 'Escape') { setArmed(-1); setCam(false); }
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
  const spec = nextAdded(S), free = spec && !S.tray.bao.used, el = document.createElement('div');
  el.className = 'slot bao' + (free ? '' : ' used') + (armed === BAO_SLOT ? ' armed' : '');
  if (free) { const cv = document.createElement('canvas'); baoIcon(cv, spec); el.appendChild(cv); el.title = spec.name + ' would like to move in'; el.addEventListener('pointerdown', (e) => trayDown(e, BAO_SLOT, el)); }
  box.appendChild(el);
  trayNoteAt = 0; updateTrayNote();
}
const BAO_SLOT = 3;
function baoIcon(canvas, spec) {
  const dpr = Math.min(3, window.devicePixelRatio || 1), s = 52;
  canvas.width = s * dpr; canvas.height = s * dpr; canvas.style.width = canvas.style.height = s + 'px';
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineJoin = 'round';
  c.translate(s / 2, s * 0.8); c.scale(0.9, 0.9); drawBaoShape(c, { flavor: spec.flavor, acc: spec.acc, expr: 'joy' }, 0);
}
const trayAllUsed = () => S.tray.items.every((i) => i.used) && (S.tray.bao.used || !nextAdded(S));
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
    if (S.tray.bao.used) return; const b = dropBao(x, Math.max(h, minFloor(S) * FH) + 2); if (!b) return;
    S.tray.bao.used = true; snd.play('whoosh'); setArmed(-1); showTag(b); save(); return;
  }
  const it = S.tray.items[i]; if (!it || it.used) return;
  dropThing(it.type, x, Math.max(h, minFloor(S) * FH) + 2); snd.play('whoosh'); it.used = true; setArmed(-1); save();
}
function trayDown(e, i, el) {
  e.preventDefault(); snd.unlock(); el.setPointerCapture(e.pointerId);
  const sx = e.clientX, sy = e.clientY; let ghost = null, moved = false;
  const mv = (ev) => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) { moved = true; ghost = document.createElement('canvas'); ghost.id = 'ghost'; if (i === BAO_SLOT) baoIcon(ghost, nextAdded(S)); else thingIcon(ghost, S.tray.items[i].type); document.body.appendChild(ghost); el.style.opacity = 0.3; }
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

$('bCam').addEventListener('click', () => { snd.unlock(); snd.play('tick'); setArmed(-1); setCam(!camOn); });
// A photo is a fresh little render of the scene around a point, so it comes out the same wherever the view is.
const PW = 240, PH = 180, photoCanvas = document.createElement('canvas');
function takePhoto(x, h, auto) {
  const f = Math.max(Math.floor((h + 6) / FH), S.basement ? -1 : 0), centreH = Math.min(h, f * FH + 70), s = 1.55;
  const Vp = { vw: PW, vh: PH, dpr: 1, s, cx: x, cy: centreH, gy: PH / 2, wx0: x - PW / 2 / s, wx1: x + PW / 2 / s };
  photoCanvas.width = PW; photoCanvas.height = PH;
  const flash = R.flash; R.flash = 0; render(photoCanvas.getContext('2d'), Vp, S, performance.now() / 1000); R.flash = flash;
  const pc = photoCanvas.getContext('2d'); pc.setTransform(1, 0, 0, 1, 0, 0);
  const g = pc.createRadialGradient(PW / 2, PH / 2, PH * 0.45, PW / 2, PH / 2, PW * 0.7); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(120,80,40,.28)'); pc.fillStyle = g; pc.fillRect(0, 0, PW, PH);
  let d; try { d = photoCanvas.toDataURL('image/jpeg', 0.72); } catch (e) { return; }
  (S.photos = S.photos || []).push({ id: 'p' + Date.now().toString(36), t: clock.t, day: dayKey(clock.t), d });
  if (S.photos.length > 24) S.photos.splice(0, S.photos.length - 24);
  if (!auto) { R.flash = 1; snd.play('shutter'); }
  notePhoto(x, clamp(f, S.basement ? -1 : 0, nFloors(S)), auto); save();
}
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
function openDiary() {
  const who = S.baos.find((b) => b.id === S.diarist);
  $('diaryTitle').textContent = who ? `${who.name}’s diary` : 'The diary';
  // everyone who might be mentioned: residents in their own colour, old friends in a quiet brown
  const people = S.baos.map((b) => ({ name: b.name, id: b.id, color: NAME_INK[b.flavor] || '#8a6a4a' }));
  for (const n of S.everNames || []) if (!people.some((p) => p.name === n)) people.push({ name: n, id: null, color: '#8a7a72' });
  people.sort((a, b) => b.name.length - a.name.length);
  $('diary').hidden = false;
  openBook({ host: $('bookPages'), nav: $('bookNav'), entries: S.diary.slice(-400), photos: S.photos || [], people, dayLabel,
    onTurn: () => snd.play('page'),
    onName: (id) => { const b = S.baos.find((q) => q.id === id); closeDiary(); if (b) { startFollow(b); snd.play('blip'); } } });
  snd.unlock(); snd.play('page');
}
function closeDiary() { $('diary').hidden = true; closeBook(); }
attachBookInput($('bookPages'));
$('bDiary').addEventListener('click', openDiary);
$('diaryClose').addEventListener('click', closeDiary);
$('diary').addEventListener('pointerdown', (e) => { if (e.target === $('diary')) closeDiary(); });
window.addEventListener('resize', () => { if (!$('diary').hidden) openDiary(); });
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
  tickParts(real); updateTrayNote(); stepCamera(real);
  // furniture lifts after a short press, so an ordinary drag still pans the view
  if (down && !down.mode && !down.moved && down.t && down.t.furn && !camOn && armed < 0 && now - down.at > 380) { down.mode = 'furn'; liftFurn(down.t.furn); snd.play('pick'); setHint('drop it in any room'); canvas.style.cursor = 'grabbing'; }
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
  if (first) S.diary.push({ t: clock.t, d: dayKey(clock.t), k: 'first', text: 'I have decided to keep a diary. Things happen in this house and somebody should write them down.' });
  init(S); R.sfx = (n) => { if (clock.speed <= 8) snd.play(n); }; R.onChange = (what, info) => { if (what === 'tray') { armed = -1; drawTray(); if (S.tray.day !== bootDay) snd.play('arrive'); } if (what === 'photo') takePhoto(info.x, info.f * FH + 40, true); if (what === 'floor' || what === 'grounds') { if (what === 'floor' && S.basement && V.cy === 0 && !follow) V.cy = cyMin(); resize(); } };
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
  if (TEST) window.__bao = { S, R, clock, V, save, toScreen, toWorld, snd, music, VERSION, takePhoto, cam: () => ({ follow: follow && follow.name, s: V.s, cx: V.cx, cy: V.cy, baseS, minS: minS() }) };
  requestAnimationFrame(frame);
}
boot();
