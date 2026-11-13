// What the baos do. Each bao has hidden needs and picks its own next activity;
// chores come from the state of the house. Nothing here is steered by the visitor.
import { RW, FH, COLS, W, OUT, BAO, clamp, rand, randInt, pick, chance, uid, clock, isNight, darkness, dayKey, hourOf, seeded, hashStr } from './core.js';
import { ROOMS, PAINTS, buildFixtures, ladderX, roofFloor, nFloors, xBounds, roomAt, roomName, whereIs, roomsOf, roomSpot, bedCount, adults, babyOf,
  nextNewcomer, addNewcomer, addFloor, canGrow, weatherAt, addMark, wallSpot } from './world.js';
import { log, THINGS } from './diary.js';

export const R = { S: null, fx: [], parts: [], flash: 0, onChange: null };

// ---------- particles ----------
export function emit(k, x, h, o = {}) {
  if (R.parts.length > 260) return;
  R.parts.push({ k, x, h, vx: o.vx ?? rand(-6, 6), vy: o.vy ?? 18, age: 0, life: o.life ?? 1.4, s: o.s ?? 1, r: rand(7) });
}
function burst(k, x, h, n, spread = 30) { for (let i = 0; i < n; i++) emit(k, x + rand(-8, 8), h + rand(-6, 6), { vx: rand(-spread, spread), vy: rand(10, spread * 1.4), life: rand(0.7, 1.5) }); }

// ---------- helpers ----------
const fxs = (kind) => R.fx.filter((f) => f.kind === kind);
function used(key) { let n = 0; for (const b of R.S.baos) if (b.claim === key) n++; return n; }
function freeFx(kind, b, filter) {
  let best = null, bd = 1e9;
  for (const f of R.fx) {
    if (f.kind !== kind || used(f.key) >= (f.cap || 1) || (filter && !filter(f))) continue;
    const d = Math.abs(f.floor - b.floor) * 400 + Math.abs(f.x - b.x) + rand(60);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}
const things = (type) => R.S.objects.filter((o) => o.type === type && !o.heldBy && !o.held && !o.falling);
const freeThing = (type) => things(type).find((o) => !used('obj:' + o.id));
const U = (n) => (n < 0.7 ? (1 - n) * 1.3 : 0);
const seatDx = (f) => (f.kind === 'sofa' ? (used(f.key) ? 14 : -14) : 0);
const go = (x, floor) => ({ go: { x, floor } });
const at = (f, dx = 0) => ({ go: { x: f.x + dx, floor: f.floor } });
const act = (dur, o = {}) => ({ act: dur, ...o });
const call = (fn) => ({ call: fn });
const hOf = (b) => b.floor * FH + b.alt;
const say = (b, ic, t = 2.4) => { b.bubble = { ic, t, T: t }; };
const cold = (S) => { const w = weatherAt(S); return w === 'rain' || w === 'snow'; };
const an = (w) => (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
const evening = (h) => h >= 17 && h < 23;

export function addMess(kind, x, floor) {
  const S = R.S; if (S.mess.length >= 12) return;
  const [a, b] = xBounds(S, floor);
  S.mess.push({ id: uid(), kind, x: clamp(x, a, b), floor });
}
function removeThing(o) { const i = R.S.objects.indexOf(o); if (i >= 0) R.S.objects.splice(i, 1); }

export function initBao(b) {
  Object.assign(b, { alt: b.alt || 0, hop: 0, facing: 1, pose: 'idle', expr: null, plan: null, si: 0, st: 0, blinkT: rand(1, 5), blink: 0,
    squash: 0, cool: {}, carry: null, prop: null, front: null, claim: null, bubble: null, act: null, label: 'pottering about',
    held: false, fall: false, vy: 0, dizzy: 0, joyT: 0, sleeping: false, climb: null, owl: 0, zT: rand(2), carriedBy: null });
  b.speed = b.kind === 'baby' ? 24 : b.kind === 'elder' ? 34 : b.trait === 'lazy' ? 42 : b.trait === 'sporty' ? 68 : 54;
  b.size = b.kind === 'baby' ? 0.56 : b.kind === 'elder' ? 0.94 : 1;
}

export function init(S) {
  R.S = S; R.fx = buildFixtures(S); R.parts = [];
  S.baos.forEach(initBao);
  S.objects.forEach((o) => { o.alt = 0; o.vy = 0; o.falling = false; o.heldBy = null; o.held = false; });
  ensureTray(S);
}

// ---------- plans ----------
function endPlan(b) {
  const S = R.S;
  if (b.carry && b.carry.obj) { const o = b.carry.obj; o.heldBy = null; o.x = b.x; o.floor = b.floor; o.alt = 0; }
  const baby = babyOf(S);
  if (baby && baby.carriedBy === b.id) { baby.carriedBy = null; baby.alt = 0; baby.x = b.x; baby.floor = b.floor; }
  if (b.chatWith) { const o = S.baos.find((x) => x.id === b.chatWith); b.chatWith = null; if (o && o.chatWith === b.id) { o.chatWith = null; abort(o); } }
  Object.assign(b, { carry: null, prop: null, front: null, claim: null, sleeping: false, climb: b.climb, pose: 'idle', expr: null, plan: null, si: 0, st: 0, act: null });
  if (!b.climb) b.alt = b.fall || b.held ? b.alt : 0;
}
export function abort(b) { if (b.climb) { /* finish the rung first */ } endPlan(b); }
function setPlan(b, steps, id, label) { endPlan(b); b.plan = steps; b.si = 0; b.st = 0; b.act = id; if (label) b.label = label; }
function next(b) {
  const st = b.plan && b.plan[b.si];
  if (st && st.act != null) { b.alt = 0; b.prop = null; b.front = null; b.pose = 'idle'; b.expr = null; b.sleeping = false; }
  b.si++; b.st = 0;
}
const curStep = (b) => (b.plan ? b.plan[b.si] : null);
const interruptible = (b) => !b.held && !b.fall && !b.carriedBy && !b.chatWith && !(b.carry) && (!b.plan || !curStep(b) || curStep(b).soft || curStep(b).go);

function stepX(b, tx, dt) {
  const d = tx - b.x, s = Math.sign(d);
  b.facing = s || b.facing;
  const sp = b.speed * (b.carry ? 0.85 : 1);
  b.x += s * Math.min(Math.abs(d), sp * dt);
  b.hop = (b.hop + dt * sp / 24) % 1;
}
function moveToward(b, tg, dt) {
  if (b.climb) {
    b.pose = 'climb';
    b.climb.p += dt * (b.speed * 0.8) / FH;
    const p = Math.min(1, b.climb.p);
    if (b.climb.dir > 0) { b.alt = p * FH; if (p >= 1) { b.floor++; b.alt = 0; b.climb = null; } }
    else { b.alt = (1 - p) * FH; if (p >= 1) { b.alt = 0; b.climb = null; } }
    return false;
  }
  b.pose = 'hop';
  const tf = clamp(tg.floor, 0, roofFloor(R.S));
  if (b.floor !== tf) {
    if (b.kind === 'baby') return true; // babies cannot climb
    const up = tf > b.floor, lx = ladderX(up ? b.floor : b.floor - 1);
    if (Math.abs(b.x - lx) < 1.5) {
      b.x = lx;
      if (up) b.climb = { dir: 1, p: 0 }; else { b.floor--; b.alt = FH; b.climb = { dir: -1, p: 0 }; }
      return false;
    }
    stepX(b, lx, dt); return false;
  }
  const [lo, hi] = xBounds(R.S, b.floor), tx = clamp(tg.x, lo, hi);
  if (Math.abs(b.x - tx) < 1.5) { b.x = tx; b.hop = 0; return true; }
  stepX(b, tx, dt); return false;
}

function runBao(S, b, dt) {
  if (b.joyT > 0) b.joyT -= dt;
  if (b.bubble) { b.bubble.t -= dt; if (b.bubble.t <= 0) b.bubble = null; }
  b.blinkT -= dt; if (b.blinkT <= 0) { b.blink = 0.13; b.blinkT = rand(2, 6); } if (b.blink > 0) b.blink -= dt;
  b.squash *= Math.pow(0.002, dt);
  if (b.held) { b.pose = 'held'; return; }
  if (b.fall) {
    b.vy -= 1500 * dt; b.alt += b.vy * dt; b.pose = 'held';
    if (b.alt <= 0) { b.alt = 0; b.fall = false; b.squash = 0.4; b.dizzy = 1.3; burst('puff', b.x, hOf(b) + 4, 5, 26); landedBao(S, b); }
    return;
  }
  if (b.dizzy > 0) { b.dizzy -= dt; b.pose = 'dizzy'; if (b.dizzy <= 0) b.pose = 'idle'; return; }
  if (b.carriedBy) {
    const c = S.baos.find((x) => x.id === b.carriedBy);
    if (!c) { b.carriedBy = null; b.alt = 0; return; }
    b.x = c.x; b.floor = c.floor; b.alt = c.alt + BAO * 0.84 * c.size - 3; b.pose = 'idle'; b.facing = c.facing; return;
  }
  if (b.sleeping) { b.zT -= dt; if (b.zT <= 0) { b.zT = 2.4; emit('zzz', b.x + 12, hOf(b) + 34 * b.size, { vx: 6, vy: 12, life: 2.2 }); } }
  if (!b.plan || b.si >= b.plan.length) { endPlan(b); choose(S, b); return; }
  const st = b.plan[b.si], plan = b.plan;
  if (b.climb && !st.go) { moveToward(b, null, dt); return; }
  b.st += dt;
  if (st.go) {
    const tg = typeof st.go === 'function' ? st.go(b) : st.go;
    if (!tg || (st.giveUp && b.st > st.giveUp)) { abort(b); return; }
    if (moveToward(b, tg, dt)) next(b);
  } else if (st.act != null) {
    if (!st.begun) {
      st.begun = true; b.hop = 0;
      b.pose = st.pose || 'idle'; b.expr = st.expr || null; b.prop = st.prop || null; b.front = st.front || null; b.alt = st.alt || 0;
      b.sleeping = !!st.sleep; if (st.face != null) b.facing = st.face;
      if (st.start) st.start(b);
      if (b.plan !== plan) return;
    }
    if (st.tick) st.tick(b, dt);
    if (b.plan !== plan) return;
    if (b.st >= st.act) { if (st.done) st.done(b); if (b.plan === plan) next(b); }
  } else if (st.call) { st.call(b); if (b.plan === plan) next(b); }
}

// ---------- the list of things a bao might decide to do ----------
function carryBaby(b, baby) { abort(baby); baby.carriedBy = b.id; baby.sleeping = false; }
function pickUpThing(b, o) { o.heldBy = b.id; b.carry = { obj: o }; o.unseen = false; }
function putDown(b) { if (b.carry && b.carry.obj) { const o = b.carry.obj; o.heldBy = null; o.x = b.x + b.facing * 6; o.floor = b.floor; o.alt = 0; } b.carry = null; }
function untilMorning(b) {
  const h = clock.hour(), wake = 6.5 + rand(0, 1.2) + (b.trait === 'lazy' ? 1 : 0);
  return ((wake - h + 24) % 24) * 3600;
}
function wakeNearby(S, b, type) {
  for (const o of S.baos) {
    if (o === b || !o.sleeping || Math.abs(o.floor - b.floor) > 1 || o.kind === 'baby') continue;
    abort(o); o.owl = clock.t + 40000; say(o, 'grump', 3); o.expr = 'grump';
    log(S, type, { a: b, b: o }, { p: 0.6 });
  }
}

const ACTS = [
  { id: 'eat', tags: ['food'], label: 'eating', try(S, b) {
    const u = U(b.needs.hunger); if (!u) return;
    const table = freeFx('table', b), src = S.pot > 0 ? fxs('stove')[0] : fxs('fridge')[0];
    if (!table || !src) return;
    const side = used(table.key) ? 15 : -15;
    return { score: u + (S.pot > 0 ? 0.2 : 0), claim: table.key, plan: [at(src, S.pot > 0 ? 14 : 12), act(2, { pose: 'work' }),
      call((b) => { if (S.pot > 0) S.pot--; b.carry = 'bowl'; }), at(table, side),
      act(9, { pose: 'eat', expr: 'chew', prop: 'bowl', face: -Math.sign(side), start: (b) => { b.carry = null; }, done: (b) => {
        b.needs.hunger = 1; S.dishes++; S.bin = Math.min(1, S.bin + 0.07);
        if (chance(0.45)) addMess('crumbs', b.x + rand(-14, 14), b.floor);
        if (isNight()) log(S, 'midnight_snack', { a: b }, { p: 0.7, gap: 3600 });
      } })] };
  } },
  { id: 'cook', tags: ['food', 'chore'], label: 'cooking', try(S, b, h) {
    if (S.pot > 0) return; const st = freeFx('stove', b); if (!st) return;
    const meal = (h >= 6.8 && h < 9.5) || (h >= 11.5 && h < 13.8) || (h >= 17.5 && h < 20);
    const hungry = adults(S).filter((a) => a.needs.hunger < 0.5).length;
    return { score: (meal ? 0.7 : 0.12) + hungry * 0.1, claim: st.key, plan: [at(st, 2), act(14, { pose: 'work', expr: 'content', prop: 'spoon',
      tick: (b, dt) => { if (chance(dt * 3)) emit('steam', st.x + rand(-5, 5), st.floor * FH + 46, { life: 1.6 }); },
      done: (b) => {
        S.pot = adults(S).length + 1; b.needs.fun = Math.min(1, b.needs.fun + 0.2);
        if (chance(0.04) && !S.marks.some((m) => m.k === 'stain')) { addMark(S, { k: 'stain', f: st.floor, x: st.x + 26 }); addMess('puddle', st.x + 26, st.floor); S.pot = 2; b.expr = 'wow'; log(S, 'spill', { a: b }, { important: true }); }
        else log(S, 'cook', { a: b }, { p: 0.35 });
      } })] };
  } },
  { id: 'sleep', tags: ['rest'], label: 'asleep', try(S, b, h) {
    const night = isNight(h), u = U(b.needs.energy);
    if ((!night && !u) || b.owl > clock.t) return;
    const spot = night ? (freeFx('bed', b) || freeFx('sofa', b) || freeFx('armchair', b)) : (freeFx('sofa', b) || freeFx('armchair', b) || freeFx('bed', b));
    const dur = night ? untilMorning(b) : rand(25, 50);
    const step = act(dur, { pose: 'sleep', expr: 'sleep', alt: spot ? spot.alt : 0, front: spot && spot.kind === 'bed' ? 'blanket' : null, soft: true, sleep: true,
      tick: (b, dt) => { b.needs.energy = Math.min(1, b.needs.energy + dt * (night ? 0.0005 : 0.03)); },
      done: (b) => { b.needs.energy = 1; if (night) b.needs.hunger = Math.min(b.needs.hunger, 0.25); else log(S, 'nap', { a: b }, { p: 0.15 }); } });
    return { score: night ? 1.7 : u * 0.9, urgent: night, claim: spot && spot.key, plan: spot ? [at(spot, seatDx(spot)), step] : [step] };
  } },
  { id: 'bath', tags: ['rest'], label: 'in the bath', try(S, b) {
    const u = U(b.needs.clean); if (!u) return; const tub = freeFx('tub', b); if (!tub) return;
    const duck = S.objects.some((o) => o.type === 'duck' && o.floor === tub.floor && Math.abs(o.x - tub.x) < 95);
    return { score: u * 0.9, claim: tub.key, plan: [at(tub), act(15, { pose: 'bath', expr: 'content', alt: tub.alt, front: 'tub', soft: true,
      tick: (b, dt) => { if (chance(dt * 2.5)) emit('soap', tub.x + rand(-22, 22), tub.floor * FH + 30, { vy: 14, life: 1.8 }); },
      done: (b) => { b.needs.clean = 1; b.needs.fun = Math.min(1, b.needs.fun + (duck ? 0.4 : 0.15)); if (chance(0.4)) addMess('puddle', tub.x + rand(34, 50), tub.floor); log(S, duck ? 'duck' : 'bath', { a: b }, { p: 0.3 }); } })] };
  } },
  { id: 'read', tags: ['look', 'rest'], label: 'reading', try(S, b) {
    const src = freeFx('shelf', b) || things('books')[0]; if (!src) return;
    const seat = freeFx('armchair', b) || freeFx('sofa', b);
    const plan = [go(src.x + (src.kind ? 0 : 16), src.floor), act(2, { pose: 'idle', expr: 'gaze' }), call((b) => { b.carry = 'book'; })];
    if (seat) plan.push(at(seat, seatDx(seat)));
    plan.push(act(rand(14, 22), { pose: 'sit', prop: 'book', alt: seat ? seat.alt : 0, soft: true, start: (b) => { b.carry = null; }, done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.6); log(S, 'read', { a: b }, { p: 0.2 }); } }));
    return { score: (1 - b.needs.fun) * 0.7, claim: seat && seat.key, plan };
  } },
  { id: 'chat', tags: ['social'], label: 'off for a chat', try(S, b) {
    const u = U(b.needs.social); if (!u) return;
    const os = adults(S).filter((o) => o !== b && !o.sleeping && interruptible(o) && !o.climb);
    if (!os.length) return;
    os.sort((p, q) => (Math.abs(p.floor - b.floor) * 400 + Math.abs(p.x - b.x)) - (Math.abs(q.floor - b.floor) * 400 + Math.abs(q.x - b.x)));
    const o = os[0];
    return { score: u * 0.85, plan: [{ go: () => (S.baos.includes(o) ? { x: o.x + (b.x < o.x ? -36 : 36), floor: o.floor } : null), giveUp: 25 }, call((b) => startChat(S, b, o))] };
  } },
  { id: 'window', tags: ['look'], label: 'looking out of the window', try(S, b) {
    const w = freeFx('window', b, (f) => Math.abs(f.floor - b.floor) <= 1); if (!w) return;
    return { score: (1 - b.needs.fun) * 0.45 + 0.08, claim: w.key, plan: [at(w, used(w.key) ? 18 : -10), act(rand(8, 16), { pose: 'idle', expr: 'gaze', face: 0, soft: true,
      done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.3); log(S, weatherAt(S) === 'rain' ? 'window_rain' : 'window', { a: b }, { p: 0.12 }); } })] };
  } },
  { id: 'stargaze', tags: ['look'], label: 'looking at the stars', try(S, b) {
    if (darkness() < 0.7 || cold(S)) return;
    const tel = things('telescope').find((o) => o.floor === roofFloor(S) && !used('obj:' + o.id));
    const sp = tel ? { x: tel.x - 20, floor: tel.floor, key: 'obj:' + tel.id } : freeFx('roofspot', b); if (!sp) return;
    return { score: (1 - b.needs.fun) * 0.6 + (tel ? 0.25 : 0), urgent: true, claim: sp.key, plan: [go(sp.x, sp.floor), act(22, { pose: 'sit', expr: 'gaze', face: tel ? 1 : 0, soft: true,
      start: (b) => say(b, 'star'), done: (b) => { b.needs.fun = 1; log(S, tel ? 'telescope' : 'stargaze', { a: b }, { p: 0.35 }); } })] };
  } },
  { id: 'sun', tags: ['rest'], label: 'sitting in the sun', try(S, b) {
    if (darkness() > 0.2 || weatherAt(S) !== 'sun') return;
    const sp = freeFx('gardenspot', b) || freeFx('roofspot', b); if (!sp) return;
    return { score: (1 - b.needs.fun) * 0.4, claim: sp.key, plan: [at(sp, used(sp.key) ? 26 : 0), act(14, { pose: 'sit', expr: 'content', soft: true, done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.4); } })] };
  } },
  { id: 'fireside', tags: ['rest'], label: 'warming up by the fire', try(S, b) {
    if (S.fire.fuel <= 0.05) return; const fp = freeFx('fireplace', b); if (!fp) return;
    return { score: (1 - b.needs.fun) * 0.55 + (cold(S) ? 0.12 : 0), claim: fp.key, plan: [at(fp, 34 + 24 * used(fp.key)), act(16, { pose: 'sit', expr: 'content', face: -1, soft: true, done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.4); } })] };
  } },
  { id: 'ball', tags: ['play'], label: 'playing with the ball', try(S, b) {
    const o = freeThing('ball'); if (!o) return;
    return { score: (1 - b.needs.fun) * 0.9, claim: 'obj:' + o.id, plan: [go(o.x - 18, o.floor), act(10, { pose: 'jump', expr: 'joy',
      start: (b) => { b.ballX = b.x; }, tick: (b) => { const k = b.st * 4.2; o.x = b.ballX + 18 + Math.sin(k * 0.5) * 22; o.alt = Math.abs(Math.sin(k)) * 34; o.floor = b.floor; b.facing = 1; },
      done: (b) => { o.alt = 0; b.needs.fun = 1; b.needs.energy -= 0.08; } })] };
  } },
  { id: 'tv', tags: ['rest'], label: 'watching television', try(S, b) {
    const o = things('tv')[0]; if (!o) return; const n = used('obj:' + o.id); if (n >= 3) return;
    return { score: (1 - b.needs.fun) * 0.75, claim: 'obj:' + o.id, plan: [go(o.x - 36 - n * 26, o.floor), act(18, { pose: 'sit', expr: 'gaze', face: 1, soft: true,
      tick: () => { o.on = clock.t; }, done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.6); log(S, 'tv', { a: b }, { p: 0.15 }); } })] };
  } },
  { id: 'drum', tags: ['music', 'play'], label: 'playing the drum', try(S, b) {
    const o = freeThing('drum'); if (!o) return;
    return { score: (1 - b.needs.fun) * 0.7, claim: 'obj:' + o.id, plan: [go(o.x - 20, o.floor), act(10, { pose: 'work', expr: 'joy', prop: 'sticks', face: 1,
      start: (b) => wakeNearby(S, b, 'drum_wake'), tick: (b, dt) => { o.on = clock.t; if (chance(dt * 2.5)) emit('note', o.x + rand(-8, 8), o.floor * FH + 30, { vy: 22 }); },
      done: (b) => { b.needs.fun = 1; log(S, 'drum', { a: b }, { p: 0.3 }); } })] };
  } },
  { id: 'dance', tags: ['music', 'play'], label: 'dancing', try(S, b) {
    const o = things('radio')[0] || fxs('gramophone')[0]; if (!o) return; const key = o.key || 'obj:' + o.id; const n = used(key); if (n >= 3) return;
    return { score: (1 - b.needs.fun) * 0.75, claim: key, plan: [go(o.x + (n % 2 ? 30 + n * 12 : -30 - n * 12), o.floor), act(12, { pose: 'dance', expr: 'joy', soft: true,
      tick: (b, dt) => { o.on = clock.t; if (chance(dt * 1.6)) emit('note', o.x + rand(-6, 6), o.floor * FH + 26, { vy: 22 }); },
      done: (b) => { b.needs.fun = 1; log(S, 'dance', { a: b }, { p: 0.25 }); } })] };
  } },
  { id: 'box', tags: ['rest', 'play'], label: 'sitting in the box', try(S, b) {
    const o = freeThing('box'); if (!o) return;
    return { score: (1 - b.needs.fun) * 0.7 + 0.1, claim: 'obj:' + o.id, plan: [go(o.x, o.floor), act(16, { pose: 'sit', expr: 'content', front: 'box', soft: true, alt: 2,
      done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.6); log(S, 'box', { a: b }, { p: 0.35 }); } })] };
  } },
  { id: 'mirror', tags: ['look'], label: 'looking in the mirror', try(S, b) {
    const o = freeThing('mirror'); if (!o) return;
    return { score: (1 - b.needs.fun) * 0.5, claim: 'obj:' + o.id, plan: [go(o.x - 24, o.floor), act(6, { pose: 'dance', expr: 'joy', face: 1, soft: true, start: (b) => say(b, 'star'),
      done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.3); log(S, 'mirror', { a: b }, { p: 0.2 }); } })] };
  } },
  { id: 'fish', tags: ['look'], label: 'watching the goldfish', try(S, b) {
    const o = freeThing('fish'); if (!o) return;
    return { score: (1 - b.needs.fun) * 0.5 + (S.fish < 0.3 ? 0.4 : 0), claim: 'obj:' + o.id, plan: [go(o.x - 22, o.floor), act(8, { pose: 'idle', expr: 'gaze', face: 1, soft: true,
      done: (b) => { S.fish = 1; b.needs.fun = Math.min(1, b.needs.fun + 0.3); log(S, 'fish', { a: b }, { p: 0.2 }); } })] };
  } },
  { id: 'balloon', tags: ['play'], label: 'jumping at the balloon', try(S, b) {
    const o = freeThing('balloon'); if (!o) return;
    return { score: (1 - b.needs.fun) * 0.8, claim: 'obj:' + o.id, plan: [go(o.x, o.floor), act(6, { pose: 'jump', expr: 'joy', done: (b) => {
      b.needs.fun = 1; o.uses = (o.uses ?? 4) - 1;
      if (o.uses <= 0) { removeThing(o); burst('spark', o.x, o.floor * FH + 80, 8, 60); startleNear(S, o.x, o.floor, 200); log(S, 'balloon_pop', { a: b }, { p: 0.9, gap: 60 }); }
    } })] };
  } },
  { id: 'snack', tags: ['food'], label: 'having a snack', try(S, b) {
    const o = freeThing('snacks') || freeThing('cake'); if (!o) return;
    const cake = o.type === 'cake';
    if (cake && b.cool.cake === o.id) return;
    return { score: (1 - b.needs.hunger) * 0.9 + (cake ? 1.0 : 0.25), claim: cake ? null : 'obj:' + o.id, plan: [go(o.x + (cake ? rand(-44, 44) : -16), o.floor), act(cake ? 9 : 5, { pose: 'eat', expr: 'chew', soft: cake,
      start: (b) => { if (cake) say(b, 'heart'); }, done: (b) => {
        b.needs.hunger = Math.min(1, b.needs.hunger + (cake ? 0.6 : 0.35)); b.needs.fun = Math.min(1, b.needs.fun + 0.3);
        if (cake) b.cool.cake = o.id;
        if (!S.objects.includes(o)) return;
        o.uses = (o.uses ?? 5) - 1; if (chance(0.6)) addMess('crumbs', b.x + rand(-12, 12), b.floor);
        if (o.uses <= 0) { removeThing(o); if (!cake) { addMess('wrapper', o.x, o.floor); log(S, 'snack_empty', { a: b }, { p: 0.7, gap: 60 }); } }
      } })] };
  } },
  { id: 'playbaby', tags: ['baby', 'social'], label: 'playing with the baby', try(S, b) {
    const baby = babyOf(S); if (!baby || baby.sleeping || baby.carriedBy || baby.held || used('baby')) return;
    return { score: (1 - b.needs.social) * 0.45 + 0.05, claim: 'baby', plan: [{ go: () => ({ x: baby.x - 26, floor: baby.floor }), giveUp: 30 }, act(8, { pose: 'dance', expr: 'joy', face: 1,
      tick: (bb, dt) => { if (chance(dt * 1.2)) emit('heart', baby.x, hOf(baby) + 30, { vy: 24 }); baby.joyT = 0.5; },
      done: (b) => { b.needs.social = Math.min(1, b.needs.social + 0.5); baby.needs.fun = 1; } })] };
  } },
  { id: 'tea', tags: ['rest', 'social'], label: 'having tea', try(S, b) {
    const t = freeFx('teatable', b); if (!t) return; const n = used(t.key);
    return { score: (1 - b.needs.fun) * 0.55 + (1 - b.needs.social) * 0.2, claim: t.key, plan: [at(t, [-34, 34, 58][n]), act(15, { pose: 'sit', expr: 'content', prop: 'cup', face: n === 0 ? 1 : -1, soft: true,
      done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.5); b.needs.social = Math.min(1, b.needs.social + 0.3); log(S, 'tea', { a: b }, { p: 0.2 }); } })] };
  } },
  { id: 'piano', tags: ['music'], label: 'playing the piano', try(S, b) {
    const p = freeFx('piano', b); if (!p) return;
    return { score: (1 - b.needs.fun) * 0.6, claim: p.key, plan: [at(p, 30), act(12, { pose: 'work', expr: 'content', face: -1,
      tick: (b, dt) => { if (chance(dt * 2)) emit('note', p.x + rand(-10, 10), p.floor * FH + 50, { vy: 22 }); },
      done: (b) => { b.needs.fun = 1; log(S, 'piano', { a: b }, { p: 0.25 }); } })] };
  } },
  { id: 'easel', tags: ['look', 'play'], label: 'painting a picture', try(S, b) {
    const e = freeFx('easel', b); if (!e) return;
    return { score: (1 - b.needs.fun) * 0.6, claim: e.key, plan: [at(e, 28), act(15, { pose: 'work', expr: 'effort', prop: 'brush', face: -1, done: (b) => {
      b.needs.fun = 1;
      if (chance(0.35)) { const w = wallSpot(S); addMark(S, { k: 'drawing', ...w, hue: randInt(0, 360) }); log(S, 'drawing', { a: b, room: ROOMS[S.floors[w.f][w.c]].name }, { p: 0.8, gap: 120 }); }
    } })] };
  } },
  { id: 'toys', tags: ['play'], label: 'playing', try(S, b) {
    const t = freeFx('blocks', b) || freeFx('horse', b); if (!t) return;
    return { score: (1 - b.needs.fun) * 0.55, claim: t.key, plan: [at(t, t.kind === 'horse' ? 0 : 24), act(9, { pose: t.kind === 'horse' ? 'dance' : 'work', expr: 'joy', alt: t.kind === 'horse' ? 16 : 0, done: (b) => { b.needs.fun = 1; } })] };
  } },
  { id: 'write', tags: ['look'], label: 'writing in the diary', try(S, b) {
    if (b.id !== S.diarist) return; const d = freeFx('desk', b); if (!d) return;
    if ((b.cool.write || 0) > clock.t) return;
    return { score: 0.4, claim: d.key, plan: [at(d, -16), act(12, { pose: 'work', expr: 'effort', prop: 'pen', face: 1, soft: true, done: (b) => { b.cool.write = clock.t + 15 * 60000; } })] };
  } },
  { id: 'knit', tags: ['rest'], label: 'knitting', try(S, b) {
    if (b.kind !== 'elder') return; const s = freeFx('armchair', b) || freeFx('sofa', b); if (!s) return;
    return { score: 0.45, claim: s.key, plan: [at(s, seatDx(s)), act(20, { pose: 'sit', expr: 'content', prop: 'needles', alt: s.alt, soft: true, done: (b) => { b.needs.fun = Math.min(1, b.needs.fun + 0.5); } })] };
  } },
  { id: 'splash', tags: ['play'], label: 'jumping in puddles', try(S, b) {
    if (S.wet < 0.3 || weatherAt(S) !== 'rain') return; const sp = freeFx('gardenspot', b); if (!sp) return;
    return { score: (1 - b.needs.fun) * 0.45, claim: sp.key, plan: [at(sp, rand(-20, 20)), act(8, { pose: 'jump', expr: 'joy',
      tick: (b, dt) => { if (chance(dt * 4)) emit('drop', b.x + rand(-14, 14), 4, { vx: rand(-30, 30), vy: rand(30, 60), life: 0.6 }); },
      done: (b) => { b.needs.fun = 1; b.needs.clean = Math.min(b.needs.clean, 0.2); log(S, 'splash', { a: b }, { p: 0.5 }); } })] };
  } },
  { id: 'snowbao', tags: ['play'], label: 'building a snowbao', try(S, b) {
    if (S.snow < 0.4 || S.snowbaos.length >= 3 || used('snowbao')) return;
    const x = pick([-1, 1]) > 0 ? W + rand(40, 220) : -rand(130, 220);
    return { score: 0.6, claim: 'snowbao', plan: [go(x - 22, 0), act(16, { pose: 'work', expr: 'effort', face: 1,
      done: (b) => { S.snowbaos.push({ x, acc: b.acc }); b.needs.fun = 1; log(S, 'snowbao', { a: b }, { p: 0.8, gap: 60 }); } })] };
  } },
  { id: 'scribble', tags: ['play'], label: 'up to something', try(S, b) {
    if (b.trait !== 'mischief' || (b.cool.scribble || 0) > clock.t || !nFloors(S)) return;
    const w = wallSpot(S);
    return { score: 0.2, plan: [go(w.c * RW + w.x + 14, w.f), act(6, { pose: 'work', expr: 'content', prop: 'crayon', face: -1, done: (b) => {
      b.cool.scribble = clock.t + 40 * 60000; addMark(S, { k: 'scribble', f: w.f, c: w.c, x: w.x, hue: randInt(0, 360) });
      log(S, 'scribble', { a: b, room: ROOMS[S.floors[w.f][w.c]].name }, { p: 0.9, gap: 120 });
    } })] };
  } },
  { id: 'inspect', tags: ['look'], label: 'having a look', try(S, b) {
    const o = S.objects.find((o) => o.unseen && !o.heldBy && !o.held && !o.falling && !used('obj:' + o.id)); if (!o) return;
    return { score: 0.75, claim: 'obj:' + o.id, plan: inspectPlan(S, o, false) };
  } },

  // ----- chores -----
  { id: 'dishes', tags: ['chore'], label: 'washing up', try(S, b) {
    if (S.dishes < 3) return; const s = freeFx('sink', b); if (!s) return;
    return { score: 0.3 + Math.min(1, S.dishes / 7) * 0.6, claim: s.key, plan: [at(s, 2), act(10, { pose: 'work', expr: 'effort', prop: 'cloth',
      tick: (b, dt) => { if (chance(dt * 3)) emit('soap', s.x + rand(-8, 8), s.floor * FH + 40, { vy: 16 }); },
      done: (b) => { S.dishes = 0; log(S, 'dishes', { a: b }, { p: 0.3 }); } })] };
  } },
  { id: 'sweep', tags: ['chore'], label: 'tidying up', try(S, b) {
    const m = S.mess.filter((m) => !used('mess:' + m.id)).sort((p, q) => (Math.abs(p.floor - b.floor) * 400 + Math.abs(p.x - b.x)) - (Math.abs(q.floor - b.floor) * 400 + Math.abs(q.x - b.x)))[0];
    if (!m) return;
    return { score: 0.38 + Math.min(0.4, S.mess.length * 0.07), claim: 'mess:' + m.id, plan: [go(m.x - 14, m.floor), act(5, { pose: 'work', expr: 'effort', prop: m.kind === 'puddle' ? 'mop' : 'broom', face: 1,
      tick: (b, dt) => { if (chance(dt * 3)) emit('puff', m.x + rand(-6, 6), m.floor * FH + 3, { vy: 10, life: 0.6, s: 0.6 }); },
      done: (b) => {
        const i = S.mess.indexOf(m); if (i >= 0) S.mess.splice(i, 1);
        if (m.kind === 'sock') S.laundry.basket = Math.min(1, S.laundry.basket + 0.15); else S.bin = Math.min(1, S.bin + 0.1);
        log(S, 'sweep', { a: b }, { p: 0.22 });
      } })] };
  } },
  { id: 'trash', tags: ['chore'], label: 'taking the rubbish out', try(S, b) {
    if (S.bin < 0.7) return; const k = freeFx('kbin', b), o = fxs('outbin')[0]; if (!k) return;
    return { score: 0.4 + S.bin * 0.5, claim: k.key, plan: [at(k, -14), act(3, { pose: 'work', expr: 'effort' }), call((b) => { b.carry = 'bag'; S.bin = 0; }), at(o, 18), act(2, { pose: 'work' }),
      call((b) => { b.carry = null; S.outBin += 0.22; burst('puff', o.x, 30, 3, 14); log(S, 'trash', { a: b }, { p: 0.4 }); })] };
  } },
  { id: 'firewood', tags: ['chore'], label: 'fetching firewood', try(S, b, h) {
    if (S.fire.logs >= 2) return; const w = freeFx('woodpile', b), lb = fxs('logbasket')[0]; if (!w || !lb) return;
    return { score: evening(h) || cold(S) ? 0.65 : 0.3, claim: w.key, plan: [at(w, 22), act(3, { pose: 'work', expr: 'effort' }), call((b) => { b.carry = 'log'; }), at(lb, 4),
      call((b) => { b.carry = null; S.fire.logs += 2; log(S, 'firewood', { a: b }, { p: 0.25 }); })] };
  } },
  { id: 'lightfire', tags: ['chore'], label: 'seeing to the fire', try(S, b, h) {
    if (S.fire.fuel > 0.3 || S.fire.logs < 1 || !(evening(h) || cold(S)) || used('fire')) return; const fp = fxs('fireplace')[0]; if (!fp) return;
    const fresh = S.fire.fuel <= 0;
    return { score: 0.72, claim: 'fire', plan: [at(fp, 30), act(fresh ? 5 : 3, { pose: 'work', expr: 'effort', prop: fresh ? 'match' : 'log', face: -1,
      done: (b) => { S.fire.fuel = 1; S.fire.logs--; if (fresh) { log(S, 'fire', { a: b }, { p: 0.6 }); say(b, 'flame'); } } })] };
  } },
  { id: 'changebaby', tags: ['chore', 'baby'], label: 'changing the baby', try(S, b) {
    const baby = babyOf(S); if (!baby || baby.needs.diaper < 0.7 || baby.carriedBy || baby.held || baby.fall || used('baby')) return;
    const ch = fxs('changer')[0];
    const plan = [{ go: () => ({ x: baby.x - 14, floor: baby.floor }), giveUp: 45 }];
    if (ch) plan.push(call((b) => carryBaby(b, baby)), at(ch, -24), call(() => { baby.carriedBy = null; baby.x = ch.x; baby.floor = ch.floor; setPlan(baby, [act(9.5, { pose: 'idle', expr: 'wow', alt: ch.alt })], 'changed', 'being changed'); }));
    plan.push(act(8, { pose: 'work', expr: 'effort', face: 1, tick: (bb, dt) => { if (chance(dt * 1.5)) emit('puff', baby.x + rand(-6, 6), hOf(baby) + 10, { life: 0.7, s: 0.6 }); },
      done: (b) => { baby.needs.diaper = 0; S.bin = Math.min(1, S.bin + 0.15); emit('spark', baby.x, hOf(baby) + 22); log(S, 'baby_change', { a: b }, { p: 0.4 }); } }));
    return { score: 0.5 + baby.needs.diaper * 0.5, urgent: true, claim: 'baby', plan };
  } },
  { id: 'feedbaby', tags: ['chore', 'baby'], label: 'feeding the baby', try(S, b) {
    const baby = babyOf(S); if (!baby || baby.needs.hunger > 0.35 || baby.carriedBy || baby.held || baby.sleeping || used('baby')) return; const fr = fxs('fridge')[0]; if (!fr) return;
    return { score: 0.85, urgent: true, claim: 'baby', plan: [at(fr, 12), act(2, { pose: 'work' }), call((b) => { b.carry = 'bottle'; }), { go: () => ({ x: baby.x - 22, floor: baby.floor }), giveUp: 45 },
      act(7, { pose: 'idle', expr: 'content', prop: 'bottle', face: 1, start: (b) => { b.carry = null; setPlan(baby, [act(7.5, { pose: 'eat', expr: 'chew' })], 'fed', 'having a bottle'); },
        done: (b) => { baby.needs.hunger = 1; log(S, 'baby_feed', { a: b }, { p: 0.3 }); } })] };
  } },
  { id: 'bedbaby', tags: ['chore', 'baby'], label: 'putting the baby to bed', try(S, b, h) {
    const baby = babyOf(S); if (!baby || baby.carriedBy || baby.held || baby.fall || used('baby')) return;
    const night = isNight(h); if (!night && baby.needs.energy > 0.25) return;
    const crib = fxs('crib')[0]; if (!crib || used(crib.key) || baby.claim === crib.key) return;
    return { score: night ? 2.0 : 0.65, urgent: true, claim: 'baby', plan: [{ go: () => ({ x: baby.x - 14, floor: baby.floor }), giveUp: 45 }, call((b) => carryBaby(b, baby)), at(crib, -26),
      call((b) => { baby.carriedBy = null; putBabyToBed(S, baby, crib); log(S, 'baby_sleep', { a: b }, { p: 0.4 }); })] };
  } },
  { id: 'laundry', tags: ['chore'], label: 'doing the laundry', try(S, b) {
    const L = S.laundry; if (L.basket < 0.8 || L.machineEnd || L.wet) return; const lb = freeFx('lbasket', b), w = fxs('washer')[0]; if (!lb || !w) return;
    return { score: 0.55, claim: lb.key, plan: [at(lb, 12), act(2, { pose: 'work' }), call((b) => { b.carry = 'basket'; }), at(w, 22), act(4, { pose: 'work', expr: 'effort', face: -1,
      start: (b) => { b.carry = null; }, done: (b) => { L.basket = 0; L.machineEnd = clock.t + 50000; log(S, 'laundry', { a: b }, { p: 0.3 }); } })] };
  } },
  { id: 'hang', tags: ['chore'], label: 'hanging out the washing', try(S, b) {
    const L = S.laundry; if (!L.wet || used('line')) return; const w = fxs('washer')[0], ln = fxs('line')[0]; if (!w) return;
    return { score: 0.6, claim: 'line', plan: [at(w, 22), act(2, { pose: 'work' }), call((b) => { b.carry = 'basket'; }), at(ln, -10), act(8, { pose: 'jump', expr: 'effort',
      start: (b) => { b.carry = null; }, done: (b) => { L.wet = false; L.line = 5; L.lineAt = clock.t; log(S, 'hang', { a: b }, { p: 0.3 }); } })] };
  } },
  { id: 'collect', tags: ['chore'], label: 'bringing the washing in', try(S, b) {
    const L = S.laundry; if (!L.line || clock.t - L.lineAt < 240000 || used('line')) return; const ln = fxs('line')[0], wd = freeFx('wardrobe', b);
    const plan = [at(ln, -10), act(5, { pose: 'jump', expr: 'effort' }), call((b) => { L.line = 0; b.carry = 'basket'; if (weatherAt(S) === 'rain') log(S, 'rain_laundry', { a: b }, { p: 0.8 }); })];
    if (wd) plan.push(at(wd, -22), act(3, { pose: 'work', face: 1, start: (b) => { b.carry = null; } }));
    return { score: 0.5, claim: 'line', plan };
  } },
  { id: 'water', tags: ['chore', 'green'], label: 'watering the plants', try(S, b) {
    let tg = S.objects.find((o) => o.type === 'plant' && (o.water ?? 0.6) < 0.35 && !o.heldBy && !used('obj:' + o.id));
    let key = tg && 'obj:' + tg.id, setW = tg && (() => { tg.water = 1; });
    if (!tg) { const p = fxs('planter').find((p) => (S.planters[p.pid] ?? 0.5) < 0.35 && !used(p.key)); if (p) { tg = p; key = p.key; setW = () => { S.planters[p.pid] = 1; }; } }
    if (!tg) return;
    return { score: 0.5, claim: key, plan: [go(tg.x - 22, tg.floor), act(5, { pose: 'work', expr: 'content', prop: 'can', face: 1,
      tick: (b, dt) => { if (chance(dt * 5)) emit('drop', tg.x + rand(-5, 5), tg.floor * FH + 26, { vx: 0, vy: -20, life: 0.5, s: 0.6 }); },
      done: (b) => { setW(); log(S, 'water', { a: b }, { p: 0.2 }); } })] };
  } },
  { id: 'tidy', tags: ['chore'], label: 'putting things away', try(S, b) {
    const rf = roofFloor(S);
    const o = S.objects.find((o) => {
      const home = THINGS[o.type].home; if (!home || o.heldBy || o.held || o.falling || o.unseen || clock.t - o.t < 120000 || used('obj:' + o.id)) return false;
      if (home[0] === 'roof') return o.floor !== rf;
      const r = roomAt(S, o.x, o.floor); if (r && home.includes(r.type)) return false;
      return home.some((t) => roomsOf(S, t).length);
    });
    if (!o) return;
    const home = THINGS[o.type].home; let dest, rn;
    if (home[0] === 'roof') { dest = { x: rand(90, 480), floor: rf }; rn = 'roof'; }
    else { const t = home.find((t) => roomsOf(S, t).length), r = pick(roomsOf(S, t)); dest = { x: roomSpot(r), floor: r.f }; rn = ROOMS[t].name; }
    return { score: 0.3, claim: 'obj:' + o.id, plan: [go(o.x - 10, o.floor), act(1.2, { pose: 'work' }), call((b) => pickUpThing(b, o)), go(dest.x, dest.floor),
      call((b) => { putDown(b); log(S, 'tidy', { a: b, thing: THINGS[o.type].name.replace(/^an? /, 'the '), room: rn }, { p: 0.3 }); })] };
  } },
  { id: 'wood', tags: ['chore'], label: 'stacking firewood', try(S, b) {
    const o = freeThing('wood'), lb = fxs('logbasket')[0]; if (!o || !lb || o.unseen) return;
    return { score: 0.5, claim: 'obj:' + o.id, plan: [go(o.x - 10, o.floor), act(1.2, { pose: 'work' }), call((b) => pickUpThing(b, o)), at(lb, 6), call((b) => { b.carry = null; removeThing(o); S.fire.logs += 3; })] };
  } },
  { id: 'seeds', tags: ['chore', 'green'], label: 'planting seeds', try(S, b) {
    const o = freeThing('seeds'), p = fxs('patch')[0]; if (!o || o.unseen) return;
    return { score: 0.55, claim: 'obj:' + o.id, plan: [go(o.x - 10, o.floor), act(1.2, { pose: 'work' }), call((b) => pickUpThing(b, o)), at(p, -20), act(8, { pose: 'work', expr: 'effort', prop: 'can', face: 1,
      start: (b) => { b.carry = null; removeThing(o); }, done: (b) => {
        for (let i = 0; i < 4; i++) if (S.flowers.length < 14) S.flowers.push({ x: p.x + rand(-40, 44), t: clock.t, hue: pick([340, 20, 48, 280, 200]), seen: false });
        log(S, 'plant_seeds', { a: b }, { p: 0.9, gap: 60 });
      } })] };
  } },
  { id: 'paint', tags: ['play', 'chore'], label: 'painting the walls', try(S, b) {
    const o = freeThing('paint'); if (!o || o.unseen) return; const r = roomAt(S, o.x, o.floor);
    if (!r) { // carry it indoors first
      const rr = { f: 0, c: o.x < 0 ? 0 : 2 };
      return { score: 0.4, claim: 'obj:' + o.id, plan: [go(o.x - 10, o.floor), call((b) => pickUpThing(b, o)), go(roomSpot(rr), o.floor >= nFloors(S) ? nFloors(S) - 1 : 0), call(putDown)] };
    }
    return { score: 0.6, claim: 'obj:' + o.id, plan: [go(o.x + 16, o.floor), act(18, { pose: 'jump', expr: 'effort', prop: 'brush',
      tick: (b, dt) => { b.x = clamp(b.x + Math.sin(b.st * 0.9) * 22 * dt, r.c * RW + 20, r.c * RW + 150); },
      done: (b) => {
        const key = r.f + ',' + r.c; let col; do { col = pick(PAINTS); } while (col === S.paint[key]);
        S.paint[key] = col; removeThing(o); burst('spark', b.x, hOf(b) + 40, 6, 40);
        log(S, 'paint', { a: b, room: ROOMS[r.type].name }, { important: true });
      } })] };
  } },
  { id: 'build', tags: ['chore'], label: 'building the new floor', try(S, b) {
    if (!S.build) return; const sc = freeFx('scaffold', b), pl = fxs('planks')[0]; if (!sc) return;
    return { score: 0.5, claim: sc.key, plan: [at(pl, -22), act(2, { pose: 'work', expr: 'effort' }), call((b) => { b.carry = 'plank'; }), go(sc.x + rand(-150, 150), sc.floor),
      act(6, { pose: 'work', expr: 'effort', prop: 'hammer', start: (b) => { b.carry = null; }, tick: (b, dt) => { if (chance(dt * 2)) emit('puff', b.x + b.facing * 16, hOf(b) + 8, { life: 0.5, s: 0.5 }); },
        done: (b) => { if (S.build) S.build.p += 0.0003; log(S, 'build_haul', { a: b }, { p: 0.12 }); } })] };
  } },
  { id: 'wander', tags: [], label: 'pottering about', try(S, b) {
    const f = clamp(b.floor + randInt(-1, 1), 0, nFloors(S) - 1);
    return { score: 0.12, plan: [go(rand(20, W - 20), f), act(rand(2, 5), { pose: 'idle', soft: true })] };
  } },
];

const TRAITS = {
  tidy: { chore: 1.7 }, lazy: { rest: 1.7, chore: 0.55 }, nosy: { look: 1.7, social: 1.4 }, mischief: { play: 1.6, chore: 0.7 },
  doting: { baby: 2, chore: 1.1 }, elder: { food: 1.4, rest: 1.3, baby: 1.4 }, sporty: { play: 1.8 }, dreamy: { look: 1.8, rest: 1.2 },
  hungry: { food: 1.8 }, musical: { music: 2.2 }, green: { green: 2.4 },
};
const THOUGHT = { food: 'food', rest: 'zzz', baby: 'heart', music: 'note', look: 'star', social: 'heart' };

function choose(S, b) {
  if (b.kind === 'baby') return chooseBaby(S, b);
  const h = clock.hour(), night = isNight(h) && b.owl < clock.t, tm = TRAITS[b.trait] || {};
  let best = null, bs = -1;
  for (const A of ACTS) {
    const c = A.try(S, b, h); if (!c) continue;
    let s = c.score;
    for (const t of A.tags) if (tm[t]) s *= tm[t];
    if (night && !c.urgent) s *= 0.15;
    if (b.last === A.id) s *= 0.5;
    s += rand(0.22);
    if (s > bs) { bs = s; best = { A, c }; }
  }
  if (!best) return;
  b.plan = best.c.plan; b.si = 0; b.st = 0; b.act = best.A.id; b.last = best.A.id; b.label = best.c.label || best.A.label; b.claim = best.c.claim || null;
  const th = THOUGHT[best.A.tags[0]];
  if (th && chance(0.3) && best.A.id !== 'sleep') say(b, th, 2);
}

function putBabyToBed(S, baby, crib) {
  const night = isNight();
  baby.x = crib.x; baby.floor = crib.floor;
  setPlan(baby, [act(night ? untilMorning(baby) : rand(50, 90), { pose: 'sleep', expr: 'sleep', alt: crib.alt, front: 'crib', sleep: true, soft: true,
    done: (b) => { b.needs.energy = 1; } })], 'sleep', 'asleep');
  baby.claim = crib.key;
}
function chooseBaby(S, b) {
  const n = b.needs; let plan, label = 'crawling about';
  if (n.diaper > 0.92 || n.hunger < 0.12) {
    label = 'crying';
    plan = [act(6, { pose: 'cry', expr: 'cry', tick: (b, dt) => { if (chance(dt * 5)) emit('drop', b.x + pick([-9, 9]), hOf(b) + 14, { vx: rand(-14, 14), vy: 20, life: 0.6, s: 0.5 }); }, start: () => log(S, 'baby_cry', {}, { p: 0.05 }) })];
  } else if (n.energy < 0.1) {
    label = 'asleep'; plan = [act(45, { pose: 'sleep', expr: 'sleep', sleep: true, soft: true, done: (b) => { b.needs.energy = 0.8; } })];
  } else {
    const teddy = things('teddy').find((o) => o.floor === b.floor);
    const toy = R.fx.find((f) => (f.kind === 'toybox' || f.kind === 'blocks') && f.floor === b.floor && !used(f.key));
    const r = Math.random();
    if (teddy && r < 0.4) { label = 'cuddling the teddy'; plan = [go(teddy.x - 10, b.floor), act(8, { pose: 'sit', expr: 'joy', tick: (b, dt) => { if (chance(dt * 0.8)) emit('heart', b.x, hOf(b) + 26, { vy: 22 }); }, done: (b) => { b.needs.fun = 1; log(S, 'teddy', {}, { p: 0.1 }); } })]; }
    else if (toy && r < 0.6) { label = 'playing'; plan = [go(toy.x + 22, b.floor), act(8, { pose: 'dance', expr: 'joy', done: (b) => { b.needs.fun = 1; } })]; }
    else {
      const lo = b.floor === 0 ? 20 : 16, hi = W - 20;
      plan = [go(clamp(b.x + rand(-120, 120), lo, hi), b.floor), act(rand(2, 5), { pose: 'idle', soft: true })];
    }
  }
  b.plan = plan; b.si = 0; b.st = 0; b.act = 'baby'; b.label = label;
}

function startChat(S, a, o) {
  if (!S.baos.includes(o) || o.floor !== a.floor || Math.abs(o.x - a.x) > 70 || !interruptible(o) || o.sleeping) { say(a, 'dots', 1.5); return; }
  const mk = (me, other, lead) => act(8, { pose: 'chat', expr: 'normal', face: Math.sign(other.x - me.x) || 1,
    tick: (b, dt) => { b.chatT = (b.chatT || 0) - dt; if (b.chatT <= 0) { b.chatT = 2.6; if ((Math.floor(b.st / 1.3) % 2 === 0) === lead) say(b, pick(['heart', 'note', 'q', 'food', 'star', 'dots', 'sun', 'bao']), 1.2); } },
    done: (b) => { b.needs.social = 1; b.chatWith = null; } });
  setPlan(o, [mk(o, a, false)], 'chat', 'chatting');
  setPlan(a, [mk(a, o, true)], 'chat', 'chatting');
  a.chatWith = o.id; o.chatWith = a.id;
  log(S, 'chat', { a, b: o }, { p: 0.12 });
}

function inspectPlan(S, o, jumpy) {
  const steps = [];
  if (jumpy) steps.push(act(0.9, { pose: 'jump', expr: 'wow', start: (b) => say(b, 'ex', 1) }));
  steps.push({ go: () => (S.objects.includes(o) && !o.heldBy ? { x: o.x - 26, floor: o.floor } : null), giveUp: 40 },
    act(4, { pose: 'idle', expr: 'gaze', face: 1, soft: true, start: (b) => say(b, 'q', 2.5), done: (b) => {
      b.needs.fun = Math.min(1, b.needs.fun + 0.3);
      if (o.unseen) {
        o.unseen = false;
        const others = adults(S).filter((x) => x !== b);
        log(S, 'drop', { a: b, b: others.length ? pick(others) : b, thing: THINGS[o.type].name, room: whereIs(S, o.x, o.floor) }, { important: true, theory: true });
      }
    } }));
  return steps;
}
function startleNear(S, x, floor, range, o) {
  let n = 0;
  for (const b of S.baos) {
    if (b.sleeping || !interruptible(b) || b.floor !== floor || Math.abs(b.x - x) > range || b.kind === 'baby') continue;
    if (o && n < 2 && chance(0.7)) { setPlan(b, inspectPlan(S, o, true), 'inspect', 'having a look'); if (n === 0) b.claim = 'obj:' + o.id; n++; }
    else if (chance(0.5)) { setPlan(b, [act(0.9, { pose: 'jump', expr: 'wow', start: (b) => say(b, 'ex', 1) })], 'startle', 'startled'); }
  }
}

// ---------- things the visitor does ----------
export function landFloor(S, x, h) {
  if (x < 6 || x > W - 6) return 0;
  return clamp(Math.floor((h + 6) / FH), 0, roofFloor(S));
}
export function petBao(b) {
  const S = R.S;
  burst('heart', b.x, hOf(b) + 40 * b.size, 3, 22); b.squash = 0.22; b.joyT = 1.3;
  b.needs.social = Math.min(1, b.needs.social + 0.15); b.needs.fun = Math.min(1, b.needs.fun + 0.1);
  if (b.sleeping && chance(0.25) && b.kind !== 'baby') { abort(b); b.owl = clock.t + 30000; say(b, 'grump', 2.5); }
}
export function pickUpBao(b) {
  b.fromRoom = whereIs(R.S, b.x, b.floor);
  abort(b); b.climb = null;
  if (b.carriedBy) b.carriedBy = null;
  b.held = true; b.expr = 'wow';
}
export function moveHeld(e, x, h) { e.x = x; e.floor = 0; e.alt = Math.max(0, h); }
export function releaseBao(b) {
  const S = R.S, h = b.alt, f = landFloor(S, b.x, h);
  const [lo, hi] = xBounds(S, f);
  b.x = clamp(b.x, lo, hi); b.floor = f; b.alt = Math.max(0, h - f * FH); b.held = false; b.fall = true; b.vy = 0;
}
function landedBao(S, b) {
  const room = whereIs(S, b.x, b.floor);
  if (b.fromRoom && room !== b.fromRoom && b.kind !== 'baby') log(S, 'moved', { a: b, from: b.fromRoom, room }, { p: 0.55, gap: 120 });
  b.fromRoom = null;
}
export function dropThing(type, x, h) {
  const S = R.S, f = landFloor(S, x, h), [lo, hi] = xBounds(S, f);
  const o = { id: uid(), type, x: clamp(x, lo, hi), floor: f, alt: Math.max(0, h - f * FH), vy: 0, falling: true, t: clock.t, unseen: true };
  if (THINGS[type].uses) o.uses = THINGS[type].uses;
  if (type === 'cake') o.uses = 8;
  if (type === 'plant') o.water = 0.7;
  S.objects.push(o);
  if (S.objects.length > 40) { const old = S.objects.find((q) => !q.heldBy && q !== o); if (old) removeThing(old); }
  return o;
}
export function pickUpThingByHand(o) {
  const S = R.S;
  for (const b of S.baos) if (b.claim === 'obj:' + o.id || (b.carry && b.carry.obj === o)) abort(b);
  o.heldBy = null; o.held = true;
}
export function releaseThing(o) {
  const S = R.S, h = o.alt, f = landFloor(S, o.x, h), [lo, hi] = xBounds(S, f);
  o.x = clamp(o.x, lo, hi); o.floor = f; o.alt = Math.max(0, h - f * FH); o.held = false; o.falling = true; o.vy = 0; o.t = clock.t;
}
function landedThing(S, o) {
  burst('puff', o.x, o.floor * FH + 4, 4, 22); o.sq = 0.3;
  if (o.type === 'cake') { log(S, 'cake', {}, { important: true }); addMark(S, { k: 'photo', what: 'cake' }); }
  if (o.unseen) startleNear(S, o.x, o.floor, 230, o);
}
export function vaporize(b) {
  const S = R.S, room = whereIs(S, b.x, b.floor), x = b.x, h = hOf(b);
  abort(b);
  const baby = babyOf(S); if (baby && baby.carriedBy === b.id) baby.carriedBy = null;
  S.baos.splice(S.baos.indexOf(b), 1);
  for (let i = 0; i < 22; i++) emit('steam', x + rand(-16, 16), h + rand(4, 34), { vx: rand(-22, 22), vy: rand(20, 60), life: rand(1.2, 2.6), s: rand(0.8, 1.8) });
  R.flash = 1;
  startleNear(S, x, b.floor, 220);
  const ad = adults(S);
  if (S.diarist === b.id) { S.diarist = ad.length ? pick(ad).id : null; if (S.diarist) log(S, 'handover', { a: S.baos.find((q) => q.id === S.diarist) }, { important: true }); }
  if (S.diarist) log(S, 'vapor', { a: b.name, room }, { important: true });
  (S.missing = S.missing || []).push({ name: b.name, t: clock.t });
}

// ---------- daily things ----------
export function ensureTray(S) {
  const today = dayKey(clock.t);
  if (S.tray && S.tray.day === today) return;
  let items;
  if (dayKey(S.created) === today) items = ['ball', 'box', 'snacks'];
  else {
    const rnd = seeded(hashStr(today + ':' + S.created)), pool = Object.keys(THINGS); items = [];
    while (items.length < 3) { const k = pool[Math.floor(rnd() * pool.length)]; if (!items.includes(k)) items.push(k); }
  }
  S.tray = { day: today, items: items.map((type) => ({ type, used: false })) };
  if (R.onChange) R.onChange('tray');
}
function arrive(S, live, t) {
  const spec = nextNewcomer(S); if (!spec) return;
  const b = addNewcomer(S, spec, live); initBao(b);
  log(S, 'arrival', { a: b, from: spec.from }, { important: true, t: live ? undefined : t });
  addMark(S, { k: 'photo', what: 'arrival' });
  if (live) {
    b.carry = 'suitcase';
    const r = pick(roomsOf(S, 'living').concat(roomsOf(S, 'kitchen'))) || { f: 0, c: 1 };
    setPlan(b, [go(-36, 0), act(1.6, { pose: 'jump', expr: 'joy', start: (b) => say(b, 'heart') }), go(roomSpot(r), r.f), call((b) => { b.carry = null; }), act(3, { pose: 'idle', expr: 'gaze' })], 'arrive', 'moving in');
    let n = 0;
    for (const o of adults(S)) {
      if (o === b || n >= 2 || o.sleeping || !interruptible(o)) continue;
      setPlan(o, [go(20 + n * 34, 0), act(5, { pose: 'dance', expr: 'joy', face: -1, start: (q) => say(q, 'heart') })], 'greet', 'saying hello'); n++;
    }
  }
}
function newDay(S, t, live) {
  S.day = dayKey(t); S.dayCount = (S.dayCount || 1) + 1;
  for (const m of S.missing || []) if (!m.noted && S.diarist) { m.noted = true; log(S, 'missing', { a: m.name }, { important: true, t: live ? undefined : t + 9 * 3600000 }); }
  const pop = adults(S).length, beds = bedCount(S);
  if (!S.pendingArrival && pop < beds && nextNewcomer(S) && (S.dayCount === 2 || chance(0.75))) {
    const d0 = new Date(t); d0.setHours(0, 0, 0, 0); S.pendingArrival = d0.getTime() + rand(9, 16) * 3600000;
  }
  if (S.outBin > 0.6) { S.outBin = 0; log(S, 'cart', {}, { p: 0.4, t: live ? undefined : t + 7 * 3600000, important: !live && chance(0.3) }); }
}
function crowdCheck(S, t, live) {
  const h = hourOf(t);
  if (S.build || h < 9 || h > 18 || !canGrow(S) || adults(S).length < bedCount(S) || !adults(S).length) return;
  S.build = { p: 0, t };
  log(S, 'build_start', { a: pick(adults(S)) }, { important: true, t: live ? undefined : t });
}
function completeBuild(S, live, t) {
  const row = addFloor(S); S.build = null; R.fx = buildFixtures(S);
  addMark(S, { k: 'photo', what: 'floor' });
  log(S, 'build_done', { r1: an(ROOMS[row[0]].name), r2: an(ROOMS[row[1]].name), r3: an(ROOMS[row[2]].name) }, { important: true, t: live ? undefined : t });
  if (live) for (const b of adults(S)) if (!b.sleeping && interruptible(b)) setPlan(b, [act(3, { pose: 'jump', expr: 'joy', start: (q) => say(q, 'star') })], 'cheer', 'celebrating');
  if (R.onChange) R.onChange('floor');
}

// ---------- the world ticking along ----------
function tickWorld(S, dt) {
  const h = clock.hour(), w = weatherAt(S);
  if (dayKey(clock.t) !== S.day) { newDay(S, clock.t, true); ensureTray(S); }
  if (S.pendingArrival && clock.t >= S.pendingArrival) { S.pendingArrival = 0; arrive(S, true); }
  crowdCheck(S, clock.t, true);
  if (S.fire.fuel > 0) S.fire.fuel = Math.max(0, S.fire.fuel - dt / 380);
  const L = S.laundry;
  if (L.machineEnd && clock.t >= L.machineEnd) { L.machineEnd = 0; L.wet = true; }
  L.basket = Math.min(1, L.basket + dt * 0.0011);
  S.fish = Math.max(0, S.fish - dt * 0.0006);
  for (const o of S.objects) if (o.type === 'plant') o.water = Math.max(0, (o.water ?? 0.6) - dt * 0.0013);
  for (const p of R.fx) if (p.kind === 'planter') S.planters[p.pid] = Math.max(0, (S.planters[p.pid] ?? 0.5) - dt * 0.0009);
  S.snow = clamp(S.snow + (w === 'snow' ? dt / 90 : -dt / 300), 0, 1);
  S.wet = clamp(S.wet + (w === 'rain' ? dt / 50 : -dt / 240), 0, 1);
  if (S.snow <= 0 && S.snowbaos.length) S.snowbaos.length = 0;
  if (S.build && !isNight(h)) { S.build.p += dt / (40 * 3600); if (S.build.p >= 1) completeBuild(S, true); }
  if (S.outBin >= 1) { S.outBin = 0; log(S, 'cart', {}, { p: 0.5 }); }
  if (chance(dt * 0.0016) && adults(S).length) { const r = pick(roomsOf(S, 'bedroom').concat(roomsOf(S, 'living'))); if (r) addMess('sock', roomSpot(r), r.f); }
  for (const f of S.flowers) if (!f.seen && clock.t - f.t > 2 * 86400000) { S.flowers.forEach((q) => { if (clock.t - q.t > 2 * 86400000) q.seen = true; }); if (adults(S).length) log(S, 'bloom', { a: pick(adults(S)) }, { important: true }); break; }
  // things falling and settling
  for (const o of S.objects) {
    if (o.sq) o.sq *= Math.pow(0.003, dt);
    if (o.type === 'balloon' && !o.held && !o.heldBy) { const top = o.floor >= nFloors(S) || roomAt(S, o.x, o.floor) == null ? 150 : 78; o.falling = false; o.alt += ((top + Math.sin(clock.t / 700 + o.x) * 4) - o.alt) * Math.min(1, dt * 2); if (o.unseen && !o.told) { o.told = true; startleNear(S, o.x, o.floor, 230, o); } continue; }
    if (o.falling) { o.vy -= 1500 * dt; o.alt += o.vy * dt; if (o.alt <= 0) { o.alt = 0; o.falling = false; o.vy = 0; landedThing(S, o); } }
  }
  // needs
  const night = isNight(h);
  for (const b of S.baos) {
    const n = b.needs;
    if (b.kind === 'baby') {
      if (!b.sleeping) { n.diaper = Math.min(1, (n.diaper || 0) + dt * 0.0035); n.hunger = Math.max(0, n.hunger - dt * 0.0022); n.energy = Math.max(0, n.energy - dt * (night ? 0.01 : 0.0016)); }
      continue;
    }
    if (b.sleeping) { if (night && b.owl < clock.t && chance(dt * 0.00002)) { b.owl = clock.t + 100000; b.needs.hunger = Math.min(b.needs.hunger, 0.3); abort(b); } continue; }
    n.hunger = Math.max(0, n.hunger - dt * 0.0022 * (b.trait === 'hungry' ? 1.4 : 1));
    n.energy = Math.max(0, n.energy - dt * 0.0009 * (b.trait === 'lazy' ? 1.5 : 1));
    n.fun = Math.max(0, n.fun - dt * 0.004);
    n.social = Math.max(0, n.social - dt * 0.003);
    n.clean = Math.max(0, n.clean - dt * 0.0008);
  }
}

export function tick(dt) {
  const S = R.S;
  tickWorld(S, dt);
  for (const b of S.baos.slice()) runBao(S, b, dt);
}
export function tickParts(dt) {
  for (let i = R.parts.length - 1; i >= 0; i--) {
    const p = R.parts[i]; p.age += dt;
    if (p.age >= p.life) { R.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.h += p.vy * dt;
    if (p.k === 'drop' || p.k === 'spark') p.vy -= 160 * dt; else { p.vx *= Math.pow(0.4, dt); p.x += Math.sin(p.age * 3 + p.r) * 5 * dt; }
  }
  if (R.flash > 0) R.flash = Math.max(0, R.flash - dt * 2.5);
}

// Jump every bao straight to whatever it would be doing, without the walk there.
export function settle() {
  const S = R.S;
  for (const b of S.baos) { endPlan(b); b.climb = null; b.alt = 0; b.fall = false; b.held = false; }
  const baby = babyOf(S), crib = fxs('crib')[0];
  if (baby && crib && isNight()) putBabyToBed(S, baby, crib);
  for (const b of S.baos) {
    if (b.plan) continue;
    choose(S, b);
    let guard = 0;
    while (b.plan && b.si < b.plan.length && guard++ < 12) {
      const st = b.plan[b.si];
      if (st.go) {
        const tg = typeof st.go === 'function' ? st.go(b) : st.go;
        if (!tg) { endPlan(b); break; }
        if (b.kind !== 'baby' || tg.floor === b.floor) { const [lo, hi] = xBounds(S, tg.floor); b.x = clamp(tg.x, lo, hi); b.floor = clamp(tg.floor, 0, roofFloor(S)); }
        b.si++;
      } else if (st.call) { const p = b.plan; st.call(b); if (b.plan !== p) break; b.si++; }
      else { b.st = Math.min(st.act * 0.6, rand(0, st.act)); if (st.sleep) b.st = 0; break; }
    }
  }
}

// While the visitor was away: a coarse version of life, hour by hour.
export function catchUp(S, from, to) {
  const hours = Math.min((to - from) / 3600000, 24 * 14), start = to - hours * 3600000, made = [];
  const push = (e) => { if (e) made.push(e); };
  const before = S.diary.length;
  for (let i = 0; i < hours; i++) {
    const t = start + (i + rand(0.1, 0.9)) * 3600000, h = hourOf(t), awake = h >= 6.5 && h < 22.5;
    if (dayKey(t) !== S.day) newDay(S, t, false);
    if (S.pendingArrival && t >= S.pendingArrival) {
      const hr = hourOf(to);
      if (to - S.pendingArrival < 4 * 3600000 && hr >= 7 && hr < 21) S.pendingArrival = to + rand(25, 70) * 1000; else { arrive(S, false, S.pendingArrival); S.pendingArrival = 0; }
    }
    crowdCheck(S, t, false);
    if (S.build && awake) { S.build.p += 1 / 40; if (S.build.p >= 1) completeBuild(S, false, t); }
    const ad = adults(S); if (!ad.length || !S.diarist) continue;
    if (!chance(awake ? 0.2 : 0.035)) continue;
    const day = dayKey(t); if (S.diary.filter((e) => e.d === day).length >= 5) continue;
    const a = pick(ad), b = pick(ad.filter((x) => x !== a)), w = weatherAt({ weather: null }, t), baby = babyOf(S);
    let types;
    if (!awake) types = ['midnight_snack', 'stargaze', baby && 'baby_cry'];
    else {
      types = ['trash', 'dishes', 'sweep', 'cook', 'bath', 'window', 'nap', 'laundry', 'hang', 'firewood', 'read', b && 'chat', b && 'chat', baby && 'baby_change', baby && 'baby_feed'];
      if (h >= 17) types.push('fire', 'fire'); if (h >= 20) types.push('stargaze', baby && 'baby_sleep');
      if (w === 'rain') types.push('window_rain', 'splash', 'rain_laundry'); if (w === 'snow') types.push('snowbao', 'snowbao');
      if (S.build) types.push('build_haul', 'build_haul');
      if (S.objects.some((o) => o.type === 'plant') || roomsOf(S, 'greenhouse').length) types.push('water');
      for (const [ty, ev] of [['box', 'box'], ['drum', 'drum'], ['radio', 'dance'], ['tv', 'tv'], ['fish', 'fish'], ['mirror', 'mirror']]) if (S.objects.some((o) => o.type === ty)) types.push(ev);
      if (roomsOf(S, 'tearoom').length) types.push('tea'); if (roomsOf(S, 'music').length) types.push('piano');
    }
    types = types.filter(Boolean);
    push(log(S, pick(types), { a, b }, { important: true, t }));
  }
  // leave the house in a believable state
  if (hours > 0.2) {
    S.dishes = randInt(0, 5); S.bin = rand(0.1, 0.95); S.pot = 0; S.fire.fuel = evening(hourOf(to)) && chance(0.6) ? rand(0.3, 1) : 0; S.fire.logs = randInt(0, 4);
    S.laundry.basket = rand(0.1, 1); S.laundry.machineEnd = 0;
    const want = Math.min(5, Math.floor(hours / 5) + randInt(0, 1));
    while (S.mess.length < want) { const f = randInt(0, nFloors(S) - 1); addMess(pick(['crumbs', 'sock', 'crumbs', 'wrapper']), rand(24, W - 24), f); }
    for (const o of S.objects) { if (o.type === 'plant') o.water = Math.max(0, (o.water ?? 0.6) - hours * 0.03); o.unseen = false; }
    for (const k in S.planters) S.planters[k] = Math.max(0.1, S.planters[k] - hours * 0.02);
    for (const b of S.baos) {
      const n = b.needs; n.hunger = rand(0.2, 0.9); n.energy = rand(0.5, 1); n.fun = rand(0.2, 0.9); n.social = rand(0.3, 0.9); n.clean = rand(0.3, 1);
      if (b.kind === 'baby') n.diaper = rand(0.1, 0.85);
      if (b.floor > roofFloor(S)) b.floor = 0;
    }
  }
  return S.diary.slice(before).length ? S.diary.filter((e) => e.t >= start).slice(-40) : [];
}
