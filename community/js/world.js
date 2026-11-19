// The building: what rooms exist, where the furniture is, how it grows.
import { RW, FH, COLS, W, ROOMW, OUT, MAXF, clamp, rand, pick, chance, uid, clock, dayKey, seeded, hashStr } from './core.js';

// Each room type: wall colour, window position, and furniture as [kind, x within room].
export const ROOMS = {
  kitchen:    { name: 'kitchen',      wall: '#FFE9C4', dado: '#F8CF94', win: 116, fx: [['fridge', 24], ['stove', 62], ['sink', 100], ['table', 138], ['kbin', 168]] },
  living:     { name: 'living room',  wall: '#F8DCC6', dado: '#E9B99A', win: 118, fx: [['fireplace', 38], ['logbasket', 76], ['sofa', 120]] },
  laundry:    { name: 'laundry',      wall: '#D8EDF4', dado: '#A9D3E3', win: 112, fx: [['washer', 30], ['lbasket', 66], ['ironing', 112]] },
  bathroom:   { name: 'bathroom',     wall: '#D2EEE7', dado: '#9FD6CB', win: 52,  fx: [['tub', 52], ['bsink', 116]] },
  nursery:    { name: 'nursery',      wall: '#FBE4EC', dado: '#F3BDD0', win: 92,  fx: [['crib', 38], ['changer', 90], ['toybox', 132]] },
  bedroom:    { name: 'bedroom',      wall: '#DFDBF4', dado: '#B9B2E2', win: 100, fx: [['bunk', 38], ['bed', 100], ['wardrobe', 144]] },
  library:    { name: 'library',      wall: '#E8DCC8', dado: '#C9AE86', win: 108, fx: [['shelf', 26], ['shelf', 58], ['armchair', 108], ['desk', 146]] },
  spare:      { name: 'spare room',   wall: '#F0EADF', dado: '#D9CDB8', win: 95,  fx: [] },
  playroom:   { name: 'playroom',     wall: '#FFF2BD', dado: '#F6D36B', win: 95,  fx: [['blocks', 36], ['horse', 86], ['toybox', 134]] },
  greenhouse: { name: 'greenhouse',   wall: '#E0F3D6', dado: '#A9D694', win: 95,  fx: [['planter', 32], ['planter', 76], ['planter', 120]] },
  music:      { name: 'music room',   wall: '#F4D9E6', dado: '#D99ABB', win: 120, fx: [['piano', 52], ['gramophone', 126]] },
  art:        { name: 'art room',     wall: '#F5F0E8', dado: '#CFC5B4', win: 120, fx: [['easel', 46], ['paints', 100]] },
  tearoom:    { name: 'tea room',     wall: '#EAE3C9', dado: '#C2B98A', win: 95,  fx: [['teatable', 80]] },
};
const GROW_POOL = ['playroom', 'greenhouse', 'music', 'art', 'tearoom', 'spare', 'library'];
// Plumbed in or built in, so the visitor cannot move these. Everything else indoors can be picked up.
const FIXED = new Set(['stove', 'sink', 'tub', 'bsink', 'washer', 'fireplace']);
export const PAINTS = ['#FFD6E0', '#CDEBFF', '#D9F5C8', '#FFE7A8', '#E3D5FF', '#FFD9BF', '#C8F1EA'];

export const nFloors = (S) => S.floors.length;
export const roofFloor = (S) => S.floors.length;
// Every floor has one staircase and one ladder up to the next floor, each inside a room,
// in different columns that shift from floor to floor. A link runs from xa on floor f to xb on floor f + 1.
const STAIR_COL = [0, 2, 1], LADDER_COL = [1, 0, 2], m3 = (f) => ((f % 3) + 3) % 3;
export function links(f) {
  const sx = STAIR_COL[m3(f)] * RW, lx = LADDER_COL[m3(f)] * RW + 172;
  return [{ xa: sx + 34, xb: sx + 144, ladder: false }, { xa: lx, xb: lx, ladder: true }];
}
export const minFloor = (S) => (S.basement ? -1 : 0);
// How far the grounds reach right now.
export function ext(S) {
  const has = (id) => S.done[id] || (S.proj && S.proj.id === id);
  let L = -OUT, R = W + OUT;
  if (has('court')) L = -530; if (has('tennis')) L = -820; if (S.trees.some((t) => t.x < -800)) L = -900;
  if (has('veg')) R = W + 370; if (has('patio')) R = W + 490; if (has('lake') || has('boat')) R = W + 910; if (S.trees.some((t) => t.x > W + 900)) R = W + 990;
  return { L, R };
}
export function xBounds(S, floor) { if (floor !== 0) return [16, W - 16]; const e = ext(S); return [e.L + 20, e.R - 20]; }
export function roomAt(S, x, floor) {
  if (floor < 0 || floor >= S.floors.length || x < 0 || x >= ROOMW) return null;
  const c = clamp(Math.floor(x / RW), 0, COLS - 1);
  return { f: floor, c, type: S.floors[floor][c] };
}
export function roomName(S, x, floor) {
  if (floor >= S.floors.length) return 'roof';
  if (floor < 0) return 'basement';
  const r = roomAt(S, x, floor);
  return r ? ROOMS[r.type].name : 'garden';
}
// "in the kitchen", "on the roof", "in the garden"
export function whereIs(S, x, floor) { const n = roomName(S, x, floor); return (n === 'roof' || n === 'stairs' ? 'on the ' : 'in the ') + n; }
export function roomsOf(S, type) {
  const out = [];
  S.floors.forEach((row, f) => row.forEach((t, c) => { if (t === type) out.push({ f, c }); }));
  return out;
}
// A clear bit of floor in a room (keeps away from the ladder side).
export const roomSpot = (r) => r.c * RW + rand(22, 148);

// Work out where every usable thing is. Rebuilt whenever the building changes.
export function buildFixtures(S) {
  const fx = [];
  const add = (kind, x, floor, extra = {}) => { const o = { kind, x, floor, alt: 0, key: `${kind}:${floor}:${Math.round(x)}:${extra.alt || 0}`, ...extra }; fx.push(o); return o; };
  S.floors.forEach((row, f) => row.forEach((type, c) => {
    const x0 = c * RW, R = ROOMS[type];
    add('window', x0 + R.win, f, { cap: 2 });
    if (S.bare[f + ',' + c] != null) return; // not painted and furnished yet
    for (const [kind, dx] of R.fx) {
      // furniture the visitor has moved keeps its new place; mid ties the parts of one piece together
      const mid = FIXED.has(kind) ? null : `${f}:${c}:${kind}:${dx}`, mv = mid && S.furn && S.furn[mid];
      const x = mv ? mv.x : x0 + dx, fl = mv ? mv.floor : f, m = { mid };
      if (kind === 'bunk') { add('bed', x, fl, { alt: 12, bunk: 0, ...m }); add('bed', x, fl, { alt: 58, bunk: 1, ...m }); add('bunkframe', x, fl, m); }
      else if (kind === 'bed') { add('bed', x, fl, { alt: 12, ...m }); add('bedframe', x, fl, m); }
      else if (kind === 'sofa') add('sofa', x, fl, { alt: 13, cap: 2, ...m });
      else if (kind === 'armchair') add('armchair', x, fl, { alt: 13, ...m });
      else if (kind === 'tub') add('tub', x, fl, { alt: 7 });
      else if (kind === 'crib') add('crib', x, fl, { alt: 12, ...m });
      else if (kind === 'changer') add('changer', x, fl, { alt: 30, ...m });
      else if (kind === 'table') add('table', x, fl, { cap: 2, ...m });
      else if (kind === 'fireplace') add('fireplace', x, fl, { cap: 3 });
      else if (kind === 'teatable') add('teatable', x, fl, { cap: 3, ...m });
      else if (kind === 'planter') add('planter', x, fl, { pid: `${f}:${c}:${dx}`, ...m });
      else add(kind, x, fl, m);
    }
  }));
  // garden
  add('outbin', -100, 0); add('woodpile', -152, 0); add('mailbox', -230, 0);
  add('line', W + 62, 0); add('planks', W + 128, 0); add('patch', W + 190, 0, { cap: 2 });
  add('gardenspot', -196, 0, { cap: 2 }); add('gardenspot', W + 150, 0, { cap: 2 });
  // things the community has built
  const D = S.done;
  if (D.porch) add('porch', -30, 0, { alt: 7 });
  if (D.veg) add('veg', W + 300, 0, { cap: 2 });
  if (D.patio) add('patio', W + 430, 0, { cap: 2 });
  if (D.court) add('hoop', -400, 0, { cap: 2 });
  if (D.bowling) add('lane', 84, -1);
  if (D.tennis) { add('tennis', -760, 0, { end: 0 }); add('tennis', -590, 0, { end: 1 }); }
  if (D.lake) add('shore', W + 540, 0);
  if (D.boat) add('boat', W + 572, 0);
  // roof
  const rf = roofFloor(S);
  add('roofspot', 60, rf, { cap: 2 }); add('roofspot', 330, rf, { cap: 2 }); add('roofspot', 470, rf, { cap: 2 });
  add('scaffold', 300, rf, { cap: 3 });
  return fx;
}

export function bedCount(S) { return roomsOf(S, 'bedroom').filter((r) => S.bare[r.f + ',' + r.c] == null).length * 3; }
export const adults = (S) => S.baos.filter((b) => b.kind !== 'baby');
export const babyOf = (S) => S.baos.find((b) => b.kind === 'baby');

// ---------- residents ----------
const STARTERS = [
  { name: 'Mochi',  flavor: 'plain',   acc: 'bow',     trait: 'tidy' },
  { name: 'Pim',    flavor: 'custard', acc: 'sprout',  trait: 'mischief' },
  { name: 'Nori',   flavor: 'matcha',  acc: 'cap',     trait: 'lazy' },
  { name: 'Sesame', flavor: 'sesame',  acc: 'glasses', trait: 'nosy' },
  { name: 'Taro',   flavor: 'taro',    acc: 'scarf',   trait: 'doting' },
];
const NEWCOMERS = [
  { name: 'Grandma Po', flavor: 'plain', acc: 'granny', trait: 'elder', kind: 'elder', from: 'from far away, with one very heavy suitcase' },
  { name: 'Biscuit', flavor: 'wheat',   acc: 'beanie', trait: 'sporty',  from: 'from the house down the hill' },
  { name: 'Yuzu',    flavor: 'custard', acc: 'flower', trait: 'green',   from: 'with a suitcase full of seeds' },
  { name: 'Miso',    flavor: 'rosy',    acc: 'band',   trait: 'musical', from: 'humming all the way up the path' },
  { name: 'Pudding', flavor: 'custard', acc: 'bowtie', trait: 'hungry',  from: 'and asked about lunch straight away' },
  { name: 'Momo',    flavor: 'rosy',    acc: 'bow',    trait: 'dreamy',  from: 'after getting lost twice on the way' },
  { name: 'Chive',   flavor: 'matcha',  acc: 'scarf',  trait: 'tidy',    from: 'and wiped the doormat before coming in' },
  { name: 'Peanut',  flavor: 'wheat',   acc: 'sprout', trait: 'mischief', from: 'and nobody is sure who invited Peanut' },
  { name: 'Tofu',    flavor: 'plain',   acc: 'band',   trait: 'lazy',    from: 'and went straight to sleep' },
  { name: 'Ginger',  flavor: 'wheat',   acc: 'flower', trait: 'nosy',    from: 'with a lot of questions' },
  { name: 'Pickle',  flavor: 'matcha',  acc: 'bowtie', trait: 'sporty',  from: 'by rolling most of the way' },
  { name: 'Soy',     flavor: 'taro',    acc: 'cap',    trait: 'dreamy',  from: 'on a very foggy morning' },
  { name: 'Dot',     flavor: 'sesame',  acc: 'beanie', trait: 'doting',  from: 'carrying a pie' },
  { name: 'Mantou',  flavor: 'plain',   acc: 'bowtie', trait: 'hungry',  from: 'following the smell of cooking' },
  { name: 'Plum',    flavor: 'taro',    acc: 'flower', trait: 'musical', from: 'with a tiny trumpet' },
  { name: 'Bean',    flavor: 'matcha',  acc: 'glasses', trait: 'green',  from: 'with muddy feet' },
  { name: 'Honey',   flavor: 'custard', acc: 'bow',    trait: 'doting',  from: 'on the first warm day' },
  { name: 'Clove',   flavor: 'wheat',   acc: 'glasses', trait: 'tidy',   from: 'with a label on every bag' },
  { name: 'Udon',    flavor: 'plain',   acc: 'scarf',  trait: 'lazy',    from: 'eventually' },
  { name: 'Fig',     flavor: 'taro',    acc: 'beanie', trait: 'mischief', from: 'through the window, for some reason' },
  { name: 'Olive',   flavor: 'matcha',  acc: 'band',   trait: 'nosy',    from: 'and already knew everyone’s name' },
  { name: 'Rice',    flavor: 'plain',   acc: 'sprout', trait: 'dreamy',  from: 'in the rain, quite happily' },
  { name: 'Nutmeg',  flavor: 'wheat',   acc: 'bow',    trait: 'hungry',  from: 'with snacks for the journey, all eaten' },
  { name: 'Pepper',  flavor: 'sesame',  acc: 'scarf',  trait: 'sporty',  from: 'at a run' },
  { name: 'Basil',   flavor: 'matcha',  acc: 'flower', trait: 'green',   from: 'with a plant under each arm, so to speak' },
  { name: 'Custard', flavor: 'custard', acc: 'cap',    trait: 'musical', from: 'singing' },
];

function makeBao(spec, x, floor) {
  return {
    id: uid(), name: spec.name, kind: spec.kind || 'adult', flavor: spec.flavor, acc: spec.acc, trait: spec.trait,
    x, floor, arrived: clock.t,
    needs: { hunger: rand(0.5, 0.9), energy: rand(0.6, 1), fun: rand(0.3, 0.8), social: rand(0.4, 0.9), clean: rand(0.5, 1) },
  };
}
// Baos the visitor can add, one a day. Thirty are ready with their own name and look;
// seven flavours and nine accessories never line up the same way twice in that run.
const ADD_NAMES = ['Wonton', 'Boba', 'Sago', 'Lychee', 'Mango', 'Dango', 'Jelly', 'Waffle', 'Noodle', 'Muffin', 'Toffee', 'Truffle', 'Crumpet', 'Pretzel', 'Radish',
  'Turnip', 'Maple', 'Cocoa', 'Almond', 'Butter', 'Pumpkin', 'Walnut', 'Apricot', 'Raisin', 'Fennel', 'Dill', 'Congee', 'Pesto', 'Clem', 'Moon'];
const ADD_FLAVORS = ['rosy', 'matcha', 'custard', 'taro', 'wheat', 'sesame', 'plain'], ADD_ACCS = ['beanie', 'flower', 'bowtie', 'cap', 'band', 'scarf', 'sprout', 'glasses', 'bow'];
const ADD_TRAITS = ['sporty', 'dreamy', 'hungry', 'green', 'musical', 'tidy', 'mischief', 'nosy', 'doting', 'lazy'];
export const ADDED = ADD_NAMES.map((name, i) => ({ name, flavor: ADD_FLAVORS[i % 7], acc: ADD_ACCS[i % 9], trait: ADD_TRAITS[i % 10] }));
export const MAX_BAOS = 60;
export function nextAdded(S) {
  if (S.baos.length >= MAX_BAOS) return null;
  const used = new Set([...S.everNames, ...(S.usedAdded || [])]), ready = ADDED.find((n) => !used.has(n.name)); if (ready) return ready;
  // past the first thirty: make one up, the same one each time until it is used
  const rnd = seeded(hashStr('extra:' + S.everNames.length)), A = ['Mi', 'Po', 'Tu', 'La', 'Ki', 'Bo', 'Nu', 'Zi', 'Pa', 'Mo', 'Lu', 'Shu'], B = ['mo', 'ki', 'bun', 'li', 'ro', 'pa', 'chi', 'do', 'mi', 'nu'];
  let name; for (let i = 0; i < 40; i++) { name = A[Math.floor(rnd() * A.length)] + B[Math.floor(rnd() * B.length)]; if (!used.has(name)) break; name += ' ' + (S.everNames.length + 1); }
  return { name, flavor: ADD_FLAVORS[Math.floor(rnd() * 7)], acc: ADD_ACCS[Math.floor(rnd() * 9)], trait: ADD_TRAITS[Math.floor(rnd() * 10)] };
}
export function nextNewcomer(S) {
  const used = new Set(S.everNames);
  return NEWCOMERS.find((n) => !used.has(n.name)) || null;
}
export function addNewcomer(S, spec, walkingIn) {
  const b = makeBao(spec, walkingIn ? ext(S).L - 30 : rand(200, 340), 0);
  b.from = spec.from;
  S.baos.push(b); S.everNames.push(spec.name);
  return b;
}

export function newState() {
  const S = {
    v: 1, created: clock.t, lastSeen: clock.t, day: dayKey(clock.t), dayCount: 1,
    floors: [['kitchen', 'living', 'laundry'], ['bathroom', 'nursery', 'bedroom'], ['library', 'spare', 'bedroom']],
    paint: {}, baos: [], everNames: [], objects: [], mess: [], marks: [],
    dishes: 1, bin: 0.3, outBin: 0.1, pot: 0,
    fire: { fuel: 0, logs: 2 },
    laundry: { basket: 0.4, machineEnd: 0, wet: false, line: 0, lineAt: 0 },
    planters: {}, flowers: [], snowbaos: [], snow: 0, wet: 0,
    geo: 2, furn: {}, proj: null, projIdx: 0, done: {}, bare: {}, nopower: {}, trees: [], basement: false, veg: 0,
    weather: null, tray: null, diary: [], diarist: null,
    fish: 1,
  };
  const spots = [[60, 0], [300, 0], [470, 0], [250, 1], [90, 2]];
  STARTERS.forEach((sp, i) => { S.baos.push(makeBao(sp, spots[i][0], spots[i][1])); S.everNames.push(sp.name); });
  const baby = makeBao({ name: 'Pea', flavor: 'matcha', acc: 'curl', trait: 'baby', kind: 'baby' }, 240, 1);
  baby.needs.diaper = 0.3;
  S.baos.push(baby); S.everNames.push('Pea');
  S.diarist = S.baos[3].id;
  return S;
}

// ---------- growth ----------
export function addFloor(S) {
  const old = roofFloor(S);
  const recent = S.floors.slice(-2).flat();
  const pool = GROW_POOL.filter((t) => !recent.includes(t));
  const a = pick(pool), b = pick(pool.filter((t) => t !== a));
  const row = [a, b];
  row.splice(Math.floor(rand(3)), 0, 'bedroom');
  S.floors.push(row);
  row.forEach((_, c) => { S.bare[old + ',' + c] = 0; }); S.nopower[old] = true; // goes up as bare plaster with no wiring
  // anything that was up on the roof rides up with it
  for (const list of [S.baos, S.objects, S.mess]) for (const e of list) if (e.floor === old) e.floor = old + 1;
  return row;
}
export const canGrow = (S) => nFloors(S) < MAXF;

// ---------- weather ----------
export function weatherAt(S, t = clock.t) {
  if (S.weather) return S.weather;
  const d = new Date(t);
  const r = seeded(hashStr(dayKey(t) + ':' + Math.floor(d.getHours() / 6)))();
  if (r < 0.55) return 'sun';
  if (r < 0.8) return 'cloud';
  const m = d.getMonth();
  return (m === 11 || m <= 1) && r > 0.88 ? 'snow' : 'rain';
}

// ---------- marks the building keeps ----------
export function addMark(S, m) {
  m.t = clock.t; m.seed = Math.floor(rand(1e6));
  const same = S.marks.filter((k) => k.k === m.k);
  const cap = { drawing: 24, photo: 8, stain: 5, scribble: 10 }[m.k] || 10;
  if (same.length >= cap) S.marks.splice(S.marks.indexOf(same[0]), 1);
  S.marks.push(m);
}
export function wallSpot(S, type) {
  const rs = type ? roomsOf(S, type) : [];
  const r = rs.length ? pick(rs) : { f: Math.floor(rand(nFloors(S))), c: Math.floor(rand(COLS)) };
  return { f: r.f, c: r.c, x: rand(18, 150), y: rand(52, 92) };
}

// ---------- what the community builds, in order ----------
export const PROJ = {
  porch:     { name: 'a porch', short: 'the porch', hours: 10, x: -30 },
  veg:       { name: 'a vegetable garden', short: 'the vegetable garden', hours: 10, x: W + 300 },
  floor:     { name: 'another floor', short: 'the new floor', hours: 24 },
  patio:     { name: 'a patio', short: 'the patio', hours: 12, x: W + 430 },
  court:     { name: 'a basketball court', short: 'the basketball court', hours: 22, x: -400 },
  bowling:   { name: 'a bowling alley in the basement', short: 'the bowling alley', hours: 50 },
  tennis:    { name: 'a tennis court', short: 'the tennis court', hours: 34, x: -675 },
  lake:      { name: 'a lake', short: 'the lake', hours: 120, x: W + 700 },
  boat:      { name: 'a dock and a boat', short: 'the dock', hours: 26, x: W + 540 },
  tree:      { name: 'a tree', short: 'the new tree', hours: 14 },
  birdhouse: { name: 'a birdhouse', short: 'the birdhouse', hours: 10 },
  flowers:   { name: 'more flowers', short: 'the flower bed', hours: 10, x: W + 190 },
  repaint:   { name: 'a fresh coat of paint', short: 'the painting', hours: 14 },
};
export const ORDER = ['porch', 'veg', 'floor', 'patio', 'court', 'floor', 'bowling', 'tennis', 'floor', 'lake', 'boat', 'floor', 'floor', 'floor', 'floor'];
export const TREE_SLOTS = [-256, W + 364, -516, -846, W + 932, -878, W + 966];

// Rooms with a solid front wall: you only see in through the window. [left, right] edges of the window within the room.
export const WALLWIN = { bathroom: [24, 152], bedroom: [12, 134] };
export function walled(S, f, c) { const t = S.floors[f] && S.floors[f][c]; return t === 'bathroom' || (t === 'bedroom' && f === 2 && c === 2); }
