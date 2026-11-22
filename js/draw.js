// Puts the whole scene on the canvas: sky, garden, building, baos, lighting.
import { RW, FH, COLS, W, ROOMW, SLAB, BAO, OUT, INK, clock, clamp, lerp, darkness, seeded } from './core.js';
import { ROOMS, roofFloor, nFloors, weatherAt, roomAt, ext, walled, WALLWIN } from './world.js';
import { drawGrounds, drawBasement, drawPins, drawBallGames, drawFlights, boatShape, LIGHTS } from './drawsites.js';
import { drawBaoShape, bubble, icon } from './drawbao.js';
import { FX, TH, B, drawCarry, drawProp } from './drawthings.js';
import { R } from './sim.js';

const SKY = [
  [0, [10, 14, 44], [26, 34, 82]], [5, [14, 18, 54], [40, 44, 98]], [6.2, [70, 80, 150], [250, 170, 130]], [7.5, [120, 200, 240], [253, 232, 204]],
  [10, [112, 212, 241], [190, 236, 255]], [16, [112, 212, 241], [190, 236, 255]], [18, [104, 170, 226], [255, 214, 160]],
  [19.5, [70, 58, 130], [255, 150, 110]], [21, [20, 24, 66], [60, 56, 120]], [24, [10, 14, 44], [26, 34, 82]],
];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (a, al = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`;
function skyAt(h, w) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  let top = mix(a[1], b[1], t), bot = mix(a[2], b[2], t);
  const g = w === 'rain' || w === 'snow' ? 0.5 : w === 'cloud' ? 0.22 : 0, d = darkness(h);
  if (g) { const grey = mix([150, 165, 182], [40, 46, 70], d); top = mix(top, grey, g); bot = mix(bot, mix([196, 206, 216], [56, 60, 90], d), g); }
  return [top, bot];
}
const starRnd = seeded(77), STARS = Array.from({ length: 90 }, () => [starRnd(), starRnd() * 0.75, starRnd()]);
const CLOUDS = Array.from({ length: 7 }, (_, i) => ({ x: starRnd(), y: 0.06 + starRnd() * 0.42, s: 0.7 + starRnd() * 0.9, v: 0.004 + starRnd() * 0.006 }));

function cloud(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath();
  c.arc(x - 26 * s, y, 16 * s, 0, 7); c.arc(x - 6 * s, y - 10 * s, 22 * s, 0, 7); c.arc(x + 20 * s, y - 2 * s, 18 * s, 0, 7); c.rect(x - 26 * s, y, 46 * s, 16 * s);
  c.fill(); c.beginPath(); c.roundRect(x - 42 * s, y, 80 * s, 16 * s, 8 * s); c.fill();
}

// Rain and snow. Each drop and flake has its own random place, speed, size and timing (none of them
// share a rhythm), so they never fall into step. Raindrops end in a little splash on the grass.
const rr = seeded(4242);
const DROPS = Array.from({ length: 130 }, () => ({ x: rr(), ph: rr(), v: 430 + rr() * 330, len: 8 + rr() * 9, slant: 0.12 + rr() * 0.16, land: rr(), a: 0.35 + rr() * 0.4, w: 1.1 + rr() * 0.8 }));
const FLAKES = Array.from({ length: 95 }, () => ({ x: rr(), ph: rr(), v: 18 + rr() * 30, r: 1.1 + rr() * 2.3, sw: 6 + rr() * 16, sf: 0.4 + rr() * 0.9, sp: rr() * 7, a: 0.65 + rr() * 0.35 }));
function drawRain(c, V, t, d) {
  const ground = V.gy + V.cy * V.s, col = d > 0.5 ? '210,230,255' : '90,130,190', gust = Math.sin(t * 0.23) * 10 + Math.sin(t * 0.61 + 1) * 5;
  c.lineCap = 'round';
  for (const k of DROPS) {
    const landY = Math.max(ground + 4, V.vh * 0.25) + k.land * Math.max(20, V.vh - ground), span = landY + 40, fall = span / k.v;
    const u = ((t / fall + k.ph) % 1), y = u * span - 40, x = ((k.x * (V.vw + 80) + gust - (y + 40) * k.slant) % (V.vw + 80) + V.vw + 80) % (V.vw + 80) - 40;
    const left = (1 - u) * fall; // seconds until it lands
    if (left < 0.16 && landY < V.vh + 10) { // splash
      const s = 1 - left / 0.16; c.strokeStyle = `rgba(${col},${0.5 * (1 - s)})`; c.lineWidth = 1;
      c.beginPath(); c.ellipse(x, landY, 2 + s * 7, 1 + s * 2, 0, Math.PI, 0); c.stroke();
      c.fillStyle = `rgba(${col},${0.6 * (1 - s)})`; for (const dx of [-1, 1]) { c.beginPath(); c.arc(x + dx * (2 + s * 6), landY - Math.sin(s * Math.PI) * 6, 1, 0, 7); c.fill(); }
      continue;
    }
    c.strokeStyle = `rgba(${col},${k.a})`; c.lineWidth = k.w;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - k.len * k.slant, y + k.len); c.stroke();
  }
}
function drawSnow(c, V, t) {
  for (const k of FLAKES) {
    const span = V.vh + 30, y = ((t * k.v / span + k.ph) % 1) * span - 15, x = ((k.x * (V.vw + 40) + Math.sin(t * k.sf + k.sp) * k.sw) % (V.vw + 40) + V.vw + 40) % (V.vw + 40) - 20;
    c.fillStyle = `rgba(255,255,255,${k.a})`; c.beginPath(); c.arc(x, y, k.r, 0, 7); c.fill();
  }
}
function drawSky(c, V, S, t, h, w) {
  const [top, bot] = skyAt(h, w), d = darkness(h);
  const g = c.createLinearGradient(0, 0, 0, V.vh); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
  c.fillStyle = g; c.fillRect(0, 0, V.vw, V.vh);
  const par = V.cy * V.s * 0.25;
  if (d > 0.05 && w !== 'rain' && w !== 'snow') for (const [sx, sy, sp] of STARS) {
    c.globalAlpha = d * (0.45 + 0.55 * Math.abs(Math.sin(t * (0.5 + sp) + sp * 20))) * (w === 'cloud' ? 0.4 : 1);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * V.vw, sy * V.vh + par * 0.3, 0.8 + sp * 1.1, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  const arc = (p) => [V.vw * (0.12 + 0.76 * p), V.vh * 0.5 - Math.sin(Math.PI * p) * V.vh * 0.4 + par * 0.4];
  if (h > 5.5 && h < 19) { const [x, y] = arc((h - 5.5) / 13.5), bad = w === 'rain' || w === 'snow';
    c.globalAlpha = bad ? 0.25 : 1; const gl = c.createRadialGradient(x, y, 4, x, y, 70); gl.addColorStop(0, 'rgba(255,240,180,.7)'); gl.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = gl; c.fillRect(x - 70, y - 70, 140, 140);
    c.fillStyle = '#FFE58A'; c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill(); c.globalAlpha = 1; }
  if (h >= 18.5 || h < 6.5) { const [x, y] = arc(((h + 24 - 18.5) % 24) / 12); c.globalAlpha = (w === 'rain' || w === 'snow' ? 0.3 : 1) * clamp(d * 1.5, 0, 1);
    c.fillStyle = '#FDF6D8'; c.beginPath(); c.arc(x, y, 17, 0, 7); c.fill(); c.fillStyle = rgb(top); c.beginPath(); c.arc(x + 7, y - 4, 14, 0, 7); c.fill(); c.globalAlpha = 1; }
  const n = w === 'sun' ? 3 : w === 'cloud' ? 6 : 7, cc = mix(w === 'rain' || w === 'snow' ? [205, 212, 222] : [255, 255, 255], [70, 76, 120], d * 0.85);
  for (let i = 0; i < n; i++) { const cl = CLOUDS[i], x = ((cl.x + t * cl.v) % 1.3 - 0.15) * V.vw; c.globalAlpha = w === 'sun' ? 0.85 : 0.95; cloud(c, x, cl.y * V.vh + par, cl.s * (V.vw < 600 ? 0.75 : 1.1), rgb(cc)); }
  c.globalAlpha = 1;
  if (w === 'rain') drawRain(c, V, t, d);
  if (w === 'snow') drawSnow(c, V, t);
}

function drawGround(c, V, S, t, d) {
  const L = V.wx0 - 50, Rr = V.wx1 + 50;
  // far hills
  c.fillStyle = S.snow > 0.5 ? '#E4EEF2' : '#A8DC9A';
  c.beginPath(); c.moveTo(L, 10);
  for (let x = Math.floor(L / 40) * 40; x <= Rr + 40; x += 40) c.lineTo(x, -34 - Math.sin(x / 210) * 22 - Math.sin(x / 83 + 2) * 8);
  c.lineTo(Rr, 10); c.closePath(); c.fill();
  c.fillStyle = '#8FD07F'; c.fillRect(L, 0, Rr - L, 600);
  c.fillStyle = '#7CC26C'; c.fillRect(L, 0, Rr - L, 5);
  if (S.snow > 0.02) { c.globalAlpha = S.snow; c.fillStyle = '#F6FBFD'; c.fillRect(L, -2 * S.snow, Rr - L, 600); c.globalAlpha = 1; }
  else { c.strokeStyle = '#6BB25C'; c.lineWidth = 1.4; c.beginPath(); for (let x = Math.floor(L / 46) * 46; x < Rr; x += 46) { if (x > -14 && x < W + 14) continue; c.moveTo(x, 0); c.lineTo(x - 3, -6); c.moveTo(x + 2, 0); c.lineTo(x + 5, -5); } c.stroke(); }
  // path to the door
  c.fillStyle = S.snow > 0.5 ? '#E9E4DC' : '#E3CFA8'; c.beginPath(); c.roundRect(L - 100, 1, -L + 100, 7, 3); c.fill();
  if (S.wet > 0.15 && S.snow < 0.1) { c.fillStyle = `rgba(150,200,235,${0.5 * S.wet})`; for (const px of [-190, -110, W + 150, W + 215]) { c.beginPath(); c.ellipse(px, 3, 22 * S.wet + 6, 3, 0, 0, 7); c.fill(); } }
  drawGrounds(c, S, t);
  for (const sb of S.snowbaos) { c.save(); c.translate(sb.x, 0); c.fillStyle = '#fff'; c.strokeStyle = '#b9c8d2'; c.lineWidth = 1.5; drawBaoShape(c, { flavor: 'plain', acc: sb.acc, expr: 'content', size: 0.9 }, t); c.restore(); }
}

function drawWindow(c, x, y, sky, d, dado) {
  B(c, x - 19, y - 44, 38, 42, 5, '#fff');
  c.fillStyle = sky; c.beginPath(); c.roundRect(x - 15, y - 40, 30, 34, 3); c.fill();
  if (d > 0.6) { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x - 6, y - 30, 1, 0, 7); c.arc(x + 7, y - 20, 0.8, 0, 7); c.fill(); }
  c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x, y - 6); c.moveTo(x - 15, y - 23); c.lineTo(x + 15, y - 23); c.stroke();
  c.fillStyle = dado; c.strokeStyle = INK; c.lineWidth = 1;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * 20, y - 46); c.lineTo(x + s * 8, y - 46); c.quadraticCurveTo(x + s * 15, y - 30, x + s * 20, y - 18); c.closePath(); c.fill(); c.stroke(); }
  B(c, x - 22, y - 49, 44, 4, 2, '#B98A5E', 1);
}

// Photos are stored as small JPEG data; each is turned into an image once and kept.
const IMG = new Map();
export function photoImg(p) { let im = IMG.get(p.id); if (!im) { im = new Image(); im.src = p.d; IMG.set(p.id, im); } return im.complete && im.naturalWidth ? im : null; }
function drawMarks(c, S, f, col, x0, y0, type, t) {
  for (const m of S.marks) {
    if (m.k === 'photo') continue;
    if (m.f !== f || (m.c !== col && m.k !== 'stain')) continue;
    if (m.k === 'drawing') { const x = x0 + m.x, y = y0 - m.y, r = seeded(m.seed); B(c, x - 9, y - 8, 18, 15, 1.5, '#fff', 1.2);
      for (let i = 0; i < 4; i++) { c.fillStyle = `hsl(${(m.hue + i * 70) % 360} 75% 68%)`; c.beginPath(); c.arc(x - 5 + r() * 10, y - 4 + r() * 8, 1.5 + r() * 2.5, 0, 7); c.fill(); } }
    else if (m.k === 'scribble') { const r = seeded(m.seed), x = x0 + m.x; c.strokeStyle = `hsl(${m.hue} 70% 62%)`; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 8, y0 - 22);
      for (let i = 0; i < 7; i++) c.lineTo(x - 8 + i * 2.6 + r() * 3, y0 - 16 - r() * 16); c.stroke(); }
    else if (m.k === 'stain' && roomAt(S, m.x, f) && Math.floor(m.x / RW) === col) { c.fillStyle = 'rgba(160,95,50,.4)'; c.beginPath(); c.ellipse(m.x, y0 - 1, 15, 2.6, 0, 0, 7); c.ellipse(m.x + 12, y0 - 0.5, 5, 1.5, 0, 0, 7); c.fill(); }
  }
  if (type === 'living') {
    const slots = [[66, 100], [84, 100], [66, 82], [84, 82], [148, 100], [164, 100], [148, 82], [164, 82]];
    // real photos the visitor took come first, then the little drawn keepsakes
    const real = (S.photos || []).slice(-8).reverse();
    real.forEach((p, i) => { const sl = slots[i], x = x0 + sl[0], y = y0 - sl[1], im = photoImg(p);
      c.save(); c.translate(x, y); c.rotate(((i * 37) % 7 - 3) * 0.02);
      B(c, -8, -7, 16, 14.5, 0.8, '#FFFDF6', 1.2); if (im) c.drawImage(im, -6.5, -5.5, 13, 9.75); else { c.fillStyle = '#cfe6f2'; c.fillRect(-6.5, -5.5, 13, 9.75); }
      c.restore(); });
    S.marks.filter((m) => m.k === 'photo').slice(-(8 - real.length)).forEach((m, j) => { const i = real.length + j; if (i >= 8) return; const sl = slots[i], x = x0 + sl[0], y = y0 - sl[1];
      B(c, x - 7, y - 6, 14, 12, 1, '#FFF8E7', 1.3); c.strokeStyle = '#B98A5E'; c.lineWidth = 1.6; c.strokeRect(x - 7, y - 6, 14, 12);
      c.save(); c.translate(x, y + 4.5); c.scale(0.13, 0.13);
      if (m.what === 'cake') TH.cake(c, {}, S, 0); else { c.translate(-26, 0); drawBaoShape(c, {}, 0); c.translate(52, 0); drawBaoShape(c, { flavor: m.what === 'floor' ? 'matcha' : 'custard', expr: 'joy' }, 0); }
      c.restore(); });
  }
}


function poseOf(b, t) {
  const ph = (b.ph ??= Math.random() * 6), sz = b.size || 1;
  let yo = 0, sq = b.squash || 0, rot = 0, expr = b.expr, facing = b.facing, dx = 0;
  switch (b.pose) {
    case 'hop': yo = Math.sin(b.hop * Math.PI) * 7 * sz; sq += b.hop < 0.14 || b.hop > 0.86 ? 0.08 : -0.05; break;
    case 'climb': rot = Math.sin(t * 9 + ph) * 0.13; facing = 0; expr = expr || 'effort'; break;
    case 'sleep': sq += 0.06 + Math.sin(t * 1.5 + ph) * 0.03; facing = 0; break;
    case 'sit': sq += 0.05 + Math.sin(t * 2 + ph) * 0.012; break;
    case 'work': yo = Math.abs(Math.sin(t * 8 + ph)) * 2.5; rot = (facing || 1) * 0.08; break;
    case 'eat': sq += Math.sin(t * 12) * 0.03; break;
    case 'jump': yo = Math.abs(Math.sin(t * 5.5 + ph)) * 18 * sz; sq -= 0.05; break;
    case 'dance': rot = Math.sin(t * 7 + ph) * 0.18; yo = Math.abs(Math.sin(t * 7 + ph)) * 4; break;
    case 'chat': sq += Math.sin(t * 5 + ph) * 0.025; break;
    case 'bath': yo = Math.sin(t * 2 + ph) * 1.2; facing = 0; break;
    case 'held': rot = Math.sin(t * 13) * 0.13; sq -= 0.08; expr = 'wow'; facing = 0; break;
    case 'dizzy': rot = Math.sin(t * 9) * 0.16; expr = 'dizzy'; facing = 0; break;
    case 'roll': rot = Math.sin(t * 5 + ph) * 0.9; yo = Math.abs(Math.sin(t * 5 + ph)) * 3; sq += 0.05; break;
    case 'cry': dx = Math.sin(t * 30) * 0.8; sq += Math.sin(t * 10) * 0.04; break;
    default: sq += Math.sin(t * 2 + ph) * 0.014;
  }
  if (b.joyT > 0 && !['sleep', 'cry', 'dizzy'].includes(expr)) expr = 'joy';
  return { yo, sq, rot, expr, facing, dx };
}

function drawBao(c, S, b, t) {
  const p = poseOf(b, t), X = b.x + p.dx, floorY = -b.floor * FH, Y = floorY - b.alt - p.yo, sz = b.size || 1;
  if (!b.held && !b.carriedBy && b.alt < 3 && !b.climb) { c.fillStyle = 'rgba(40,30,20,.13)'; c.beginPath(); c.ellipse(b.x, floorY, BAO * sz * (0.42 - p.yo * 0.004), 3.2, 0, 0, 7); c.fill(); }
  c.save(); c.translate(X, Y);
  const { w, h } = drawBaoShape(c, { flavor: b.flavor, acc: b.acc, size: sz, expr: p.expr, facing: p.facing, blink: b.blink > 0, squash: p.sq, rot: p.rot, pacifier: b.kind === 'baby' && !['cry', 'joy', 'chew'].includes(p.expr) }, t);
  if (b.carry) { c.save(); c.translate(0, -h + 2); if (b.carry.obj) TH[b.carry.obj.type](c, b.carry.obj, S, t, false); else drawCarry(c, b.carry, t); c.restore(); }
  if (b.prop) { c.save(); if ((b.facing || 1) < 0) c.scale(-1, 1); drawProp(c, b.prop, t, w); c.restore(); }
  c.restore();
  // things drawn in front of a bao that is in something
  if (b.front === 'blanket') { c.save(); c.translate(b.x, floorY - b.alt); B(c, -27, -21, 52, 22, [8, 8, 4, 4], `hsl(${(b.ph * 60) | 0} 60% 80%)`); c.restore(); }
  else if (b.front === 'tub') { c.save(); c.translate(b.x, floorY); FX.tub(c, null, S, t, true); c.restore(); }
  else if (b.front === 'crib') { c.save(); c.translate(b.x, floorY); FX.crib(c, null, S, t, true); c.restore(); }
  else if (b.front === 'boat') { c.save(); c.translate(b.x, floorY + Math.sin(t * 1.3) * 1.2); boatShape(c, true); c.restore(); }
  else if (b.front === 'box') { c.save(); c.translate(b.x, floorY); TH.box(c, null, S, t, true); c.restore(); }
  if (b.bubble) { const a = clamp(Math.min(b.bubble.t, b.bubble.T - b.bubble.t) * 5, 0, 1); bubble(c, X + 17 * sz, Y - h - 14, b.bubble.ic, a); }
}

function drawParts(c) {
  for (const p of R.parts) {
    const a = clamp(1 - p.age / p.life, 0, 1), x = p.x, y = -p.h;
    c.globalAlpha = Math.min(1, a * 2);
    if (p.k === 'heart') icon(c, 'heart', x, y, 9 * p.s);
    else if (p.k === 'note') icon(c, 'note', x, y, 10 * p.s);
    else if (p.k === 'zzz') icon(c, 'zzz', x, y, 7 + p.age * 3);
    else if (p.k === 'spark') icon(c, 'star', x, y, 7 * p.s);
    else if (p.k === 'steam') { c.globalAlpha = a * 0.75; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, (4 + p.age * 7) * p.s, 0, 7); c.fill(); }
    else if (p.k === 'puff') { c.globalAlpha = a * 0.6; c.fillStyle = '#E9DFD2'; c.beginPath(); c.arc(x, y, (3 + p.age * 8) * p.s, 0, 7); c.fill(); }
    else if (p.k === 'soap') { c.strokeStyle = 'rgba(255,255,255,.95)'; c.fillStyle = 'rgba(200,235,255,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 2.5 + p.r % 3, 0, 7); c.fill(); c.stroke(); }
    else if (p.k === 'confetti') { c.save(); c.translate(x, y); c.rotate(p.age * 7 + p.r); c.fillStyle = ['#FF8FB1', '#FFD166', '#7CC6F2', '#7CC96B', '#B58BD9'][Math.floor(p.r * 10) % 5]; c.fillRect(-2.5, -1.5, 5, 3); c.restore(); }
    else if (p.k === 'drop') { c.fillStyle = '#8CCBF0'; c.beginPath(); c.arc(x, y, 2 * p.s, 0, 7); c.fill(); }
  }
  c.globalAlpha = 1;
}

// Party streamers and bunting, up until the end of the day.
function drawDecor(c, S, t) {
  const D = S.decor; if (!D || D.day !== S.day) return;
  const top = D.outside ? -96 : -(D.f + 1) * FH + SLAB + 4, y0 = -D.f * FH, w = D.x1 - D.x0, n = Math.max(4, Math.floor(w / 16));
  if (D.outside) for (const x of [D.x0, D.x1]) { c.strokeStyle = '#B98A5E'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, top); c.stroke(); }
  for (const [dy, sag] of [[0, 14], [7, 22]]) {
    c.strokeStyle = 'rgba(58,42,34,.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(D.x0 + 4, y0 + top - y0 + dy);
    c.quadraticCurveTo((D.x0 + D.x1) / 2, top + dy + sag * 2, D.x1 - 4, top + dy); c.stroke();
    for (let i = 1; i < n; i++) { const u = i / n, x = D.x0 + 4 + u * (w - 8), y = top + dy + sag * 4 * u * (1 - u) * 1 + Math.sin(t * 2 + i) * 0.6;
      if (dy === 0) { c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.lineTo(x, y + 7); c.closePath(); c.fillStyle = ['#FF8FB1', '#FFD166', '#7CC6F2', '#7CC96B', '#B58BD9'][i % 5]; c.fill(); }
      else if (i % 3 === 0) { c.strokeStyle = ['#FF8FB1', '#7CC6F2', '#FFD166'][i % 3 === 0 ? (i / 3) % 3 : 0]; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y + 9, x - 1, y + 16 + Math.sin(t * 3 + i) * 2); c.stroke(); } }
  }
}
export function render(c, V, S, t) {
  const h = clock.hour(), w = weatherAt(S), d = darkness(h);
  c.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  drawSky(c, V, S, t, h, w);
  c.setTransform(V.dpr * V.s, 0, 0, V.dpr * V.s, V.dpr * (V.vw / 2 - V.cx * V.s), V.dpr * (V.gy + V.cy * V.s));
  c.lineJoin = 'round'; c.lineCap = 'round';
  const nf = nFloors(S), topY = -nf * FH, [skT, skB] = skyAt(h, w), skyCol = rgb(mix(skT, skB, 0.5));
  drawGround(c, V, S, t, d);
  for (const f of R.fx) if (f.floor === 0 && (f.x < 0 || f.x > W) && FX[f.kind]) { c.save(); c.translate(f.x, 0); FX[f.kind](c, f, S, t); c.restore(); }

  // which rooms have somebody awake in them (their lights are on, if the floor is wired up)
  const lit = new Set();
  for (const b of S.baos) if (!b.sleeping) { const r = roomAt(S, b.x, b.floor); if (r && !S.nopower[r.f]) lit.add(r.f + ',' + r.c); if (b.floor < 0) lit.add('base'); }
  for (const o of S.objects) if (o.type === 'lamp' || (o.type === 'tv' && clock.t - (o.on || 0) < 600)) { const r = roomAt(S, o.x, o.floor); if (r) lit.add(r.f + ',' + r.c); }
  if (S.fire.fuel > 0) lit.add('0,1');
  drawBasement(c, S, t, lit);

  // rooms
  for (let f = 0; f < nf; f++) for (let col = 0; col < COLS; col++) {
    const type = S.floors[f][col], Rm = ROOMS[type], x0 = col * RW, y0 = -f * FH, top = y0 - FH + SLAB, bare = S.bare[f + ',' + col] != null;
    c.fillStyle = bare ? '#E6E0D6' : S.paint[f + ',' + col] || Rm.wall; c.fillRect(x0, top, RW, FH - SLAB);
    if (bare) {
      // fresh plaster: trowel marks, a stepladder and a paint pot waiting
      c.strokeStyle = 'rgba(120,110,100,.18)'; c.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const px = x0 + 14 + i * 26, py = top + 18 + (i * 37) % 60; c.beginPath(); c.arc(px, py, 9, 0.3, 2.2); c.stroke(); }
      c.strokeStyle = '#B98A5E'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x0 + 118, y0); c.lineTo(x0 + 130, y0 - 44); c.lineTo(x0 + 142, y0); c.moveTo(x0 + 122, y0 - 14); c.lineTo(x0 + 138, y0 - 14); c.moveTo(x0 + 126, y0 - 28); c.lineTo(x0 + 134, y0 - 28); c.stroke();
      B(c, x0 + 150, y0 - 11, 12, 11, 2, '#C9D2D8', 1.1); B(c, x0 + 149, y0 - 13, 14, 3, 1, Rm.wall, 1);
    } else {
      c.fillStyle = 'rgba(255,255,255,.2)';
      if ((f + col) % 2) for (let x = x0 + 12; x < x0 + RW; x += 24) c.fillRect(x, top, 7, FH - SLAB - 30);
      else for (let yy = top + 14; yy < y0 - 36; yy += 18) for (let x = x0 + 10 + ((yy / 18) & 1) * 10; x < x0 + RW - 4; x += 20) { c.beginPath(); c.arc(x, yy, 2.2, 0, 7); c.fill(); }
      c.fillStyle = Rm.dado; c.fillRect(x0, y0 - 30, RW, 30); c.fillStyle = 'rgba(58,42,34,.35)'; c.fillRect(x0, y0 - 31, RW, 1.4);
    }
    c.fillStyle = 'rgba(90,60,40,.16)'; c.fillRect(x0, y0 - 3, RW, 3);
    drawWindow(c, x0 + Rm.win, y0 - 46, skyCol, d, bare ? '#D8D2C8' : Rm.dado);
    if (!bare) drawMarks(c, S, f, col, x0, y0, type, t);
    // the light: a bare wire until the floor is wired up
    const lx = x0 + (Rm.win > 95 ? 44 : 150);
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(lx, top); c.lineTo(lx, top + (S.nopower[f] ? 8 : 12)); c.stroke();
    if (S.nopower[f]) { c.beginPath(); c.moveTo(lx, top + 8); c.quadraticCurveTo(lx + 5, top + 12, lx + 2, top + 16); c.stroke(); }
    else { const on = d > 0.25 && lit.has(f + ',' + col); c.beginPath(); c.moveTo(lx - 7, top + 20); c.lineTo(lx - 4, top + 12); c.lineTo(lx + 4, top + 12); c.lineTo(lx + 7, top + 20); c.closePath(); c.fillStyle = on ? '#FFE9A8' : '#E4DCCB'; c.fill(); c.lineWidth = 1.2; c.stroke(); if (on) LIGHTS.push({ x: lx, y: top + 22, r: 60 }); }
    if (col > 0) { c.fillStyle = '#EAD7BF'; c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.roundRect(x0 - 3, top - 1, 6, FH - SLAB - 50, [0, 0, 3, 3]); c.fill(); c.stroke(); }
  }
  // floor slabs, outer walls, roof
  c.fillStyle = '#E9D5BC'; c.strokeStyle = INK; c.lineWidth = 1.6;
  for (let f = 0; f <= nf; f++) { c.fillStyle = '#EAD7BF'; c.beginPath(); c.rect(-8, -f * FH, W + 16, SLAB); c.fill(); c.stroke(); }
  for (const x of [-8, W]) { c.fillStyle = '#F2C9A4'; c.beginPath(); c.rect(x, topY, 8, nf * FH - 52); c.fill(); c.stroke(); B(c, x - 1, -56, 10, 6, 2, '#B98A5E', 1.3); }
  c.fillStyle = '#C8B49A'; c.beginPath(); c.rect(-12, SLAB - 2, W + 24, 7); c.fill(); c.stroke();
  // roof edge, chimney
  B(c, -14, topY - 6, W + 28, 8, 3, '#E8805F'); B(c, -12, topY - 20, 6, 16, 2, '#F2C9A4'); B(c, W + 6, topY - 20, 6, 16, 2, '#F2C9A4');
  const chx = RW + 38; B(c, chx - 12, topY - 46, 24, 42, 2, '#CF7F62'); B(c, chx - 15, topY - 50, 30, 7, 2, '#B56A50');
  if (S.fire.fuel > 0) for (let i = 0; i < 4; i++) { const k = (t * 0.35 + i * 0.25) % 1; c.globalAlpha = (1 - k) * 0.55; c.fillStyle = '#F4F1EC'; c.beginPath(); c.arc(chx + Math.sin(k * 5 + i) * 8 + k * 14, topY - 54 - k * 60, 6 + k * 12, 0, 7); c.fill(); } c.globalAlpha = 1;
  if (S.snow > 0.05) { c.globalAlpha = S.snow; B(c, -14, topY - 10, W + 28, 6, 3, '#fff', 0); B(c, chx - 15, topY - 54, 30, 5, 2, '#fff', 0); c.globalAlpha = 1; }

  // ladders, furniture
  drawFlights(c, S, nf);
  drawPins(c, S, t);
  const drag = R.drag;
  for (const f of R.fx) if (FX[f.kind] && !(f.floor === 0 && (f.x < 0 || f.x > W)) && !(drag && f.mid === drag.mid)) { c.save(); c.translate(f.x, -f.floor * FH); FX[f.kind](c, f, S, t); c.restore(); }
  for (const m of S.mess) { const y = -m.floor * FH;
    if (m.kind === 'crumbs') { c.fillStyle = '#C99A5B'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(m.x - 8 + i * 3.2 + (i % 2), y - 1.5 - (i % 3) * 0.8, 1.3, 0, 7); c.fill(); } }
    else if (m.kind === 'puddle') { c.fillStyle = 'rgba(140,200,240,.75)'; c.beginPath(); c.ellipse(m.x, y - 1, 13, 2.6, 0, 0, 7); c.fill(); }
    else if (m.kind === 'sock') { c.save(); c.translate(m.x, y - 2); B(c, -5, -5, 5, 7, 2, '#F7C6D9', 1.1); B(c, -5, 0, 10, 4, 2, '#F7C6D9', 1.1); c.restore(); }
    else { c.save(); c.translate(m.x, y); c.rotate(0.3); B(c, -7, -5, 14, 5, 1, '#FFD166', 1.1); c.restore(); } }

  // objects, then baos
  const drawObj = (o) => { c.save(); c.translate(o.x, -o.floor * FH - (o.alt || 0)); if (o.sq) c.scale(1 + o.sq, 1 - o.sq); TH[o.type](c, o, S, t, false); c.restore(); };
  for (const o of S.objects) if (!o.heldBy && !o.held && o.type === 'rug') drawObj(o);
  for (const o of S.objects) if (!o.heldBy && !o.held && o.type !== 'rug') drawObj(o);
  const order = S.baos.filter((b) => !b.held).sort((a, b2) => (a.carriedBy ? 1 : 0) - (b2.carriedBy ? 1 : 0) || (a.front ? 0 : 1) - (b2.front ? 0 : 1));
  for (const b of order) drawBao(c, S, b, t);
  drawBallGames(c, S, t);
  drawDecor(c, S, t);
  // rooms with a front wall: only the window shows what is inside
  for (let f = 0; f < nf; f++) for (let col = 0; col < COLS; col++) if (walled(S, f, col) && S.bare[f + ',' + col] == null) {
    const [wl, wr] = WALLWIN[S.floors[f][col]], x0 = col * RW, y0 = -f * FH, top = y0 - FH + SLAB, sill = y0 - 9, wt = y0 - 94;
    c.beginPath(); c.rect(x0, top, RW, FH - SLAB); c.roundRect(x0 + wl, wt, wr - wl, sill - wt, 6); c.fillStyle = '#F2C9A4'; c.fill('evenodd');
    c.strokeStyle = 'rgba(160,110,70,.3)'; c.lineWidth = 1; for (let yy = top + 12; yy < y0; yy += 12) { c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + wl, yy); c.moveTo(x0 + wr, yy); c.lineTo(x0 + RW, yy); if (yy < wt || yy > sill) { c.moveTo(x0 + wl, yy); c.lineTo(x0 + wr, yy); } c.stroke(); }
    c.fillStyle = 'rgba(190,230,255,.13)'; c.fillRect(x0 + wl, wt, wr - wl, sill - wt);
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.roundRect(x0 + wl, wt, wr - wl, sill - wt, 6); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0 + (wl + wr) / 2, wt); c.lineTo(x0 + (wl + wr) / 2, sill); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.roundRect(x0 + wl - 2.5, wt - 2.5, wr - wl + 5, sill - wt + 5, 7); c.stroke();
    B(c, x0 + wl - 6, sill + 1, wr - wl + 12, 5, 2, '#fff', 1.2);
    if (S.floors[f][col] === 'bathroom') { B(c, x0 + wl + 6, sill + 5, 40, 8, 2, '#C9785A', 1.1); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x0 + wl + 12 + i * 9, sill + 3, 3.4, 0, 7); c.fillStyle = ['#FF8FB1', '#FFD166', '#FF8FB1', '#B58BD9'][i]; c.fill(); } }
  }

  // night: unlit rooms go dark, the garden dims
  if (d > 0.02) {
    const dk = (al) => `rgba(16,20,58,${al})`;
    // the structure and every unlit room
    c.beginPath(); c.rect(-9, topY - 7, W + 18, nf * FH + SLAB + 12);
    for (let f = 0; f < nf; f++) for (let col = 0; col < COLS; col++) if (lit.has(f + ',' + col)) c.rect(col * RW, -(f + 1) * FH + SLAB, RW, FH - SLAB);
    c.fillStyle = dk(d * 0.3); c.fill('evenodd');
    for (let f = 0; f < nf; f++) for (let col = 0; col < COLS; col++) { c.fillStyle = dk(d * (lit.has(f + ',' + col) ? 0.08 : 0.34)); c.fillRect(col * RW, -(f + 1) * FH + SLAB, RW, FH - SLAB); }
    // the garden and the roof fade into the night sky
    const fade = (y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, dk(0)); g.addColorStop(1, dk(d * 0.5)); return g; };
    c.fillStyle = fade(-110, -30);
    c.fillRect(V.wx0 - 60, -110, -9 - (V.wx0 - 60), 80); c.fillRect(W + 9, -110, V.wx1 + 60 - (W + 9), 80);
    c.fillStyle = dk(d * 0.5);
    c.fillRect(V.wx0 - 60, -30, -9 - (V.wx0 - 60), 900); c.fillRect(W + 9, -30, V.wx1 + 60 - (W + 9), 900);
    if (S.basement) { c.fillStyle = dk(d * (lit.has('base') ? 0.1 : 0.5)); c.fillRect(-9, SLAB + 5, W + 18, FH + 4); c.fillStyle = dk(d * 0.5); c.fillRect(-9, FH + SLAB + 9, W + 18, 900); } else c.fillRect(-9, SLAB + 5, W + 18, 900);
    c.fillStyle = fade(topY - 90, topY - 20); c.fillRect(-16, topY - 90, W + 32, 70);
    c.fillStyle = dk(d * 0.5); c.fillRect(-16, topY - 20, W + 32, 13);
    c.globalCompositeOperation = 'lighter';
    if (S.fire.fuel > 0) { const fp = R.fx.find((f) => f.kind === 'fireplace'); if (fp) { const fl = 0.8 + Math.sin(t * 11) * 0.08, g = c.createRadialGradient(fp.x, -18, 4, fp.x, -18, 120); g.addColorStop(0, `rgba(255,150,60,${0.38 * d * fl})`); g.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g; c.fillRect(RW, -FH + SLAB, RW, FH - SLAB); } }
    for (const L of LIGHTS) { const g = c.createRadialGradient(L.x, L.y, 2, L.x, L.y, L.r); g.addColorStop(0, `rgba(${L.col || '255,225,150'},${0.42 * d})`); g.addColorStop(1, `rgba(${L.col || '255,225,150'},0)`); c.fillStyle = g; c.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
    for (const o of S.objects) if (o.type === 'lamp' && !o.held && !o.off) { const y = -o.floor * FH - 50, g = c.createRadialGradient(o.x, y, 3, o.x, y, 80); g.addColorStop(0, `rgba(255,225,150,${0.4 * d})`); g.addColorStop(1, 'rgba(255,225,150,0)'); c.fillStyle = g; c.fillRect(o.x - 80, y - 80, 160, 160); }
    c.globalCompositeOperation = 'source-over';
  }
  // whatever the visitor is holding is drawn on top of everything
  if (drag) for (const f of R.fx) if (f.mid === drag.mid && FX[f.kind]) { c.save(); c.translate(drag.x, -drag.h); c.rotate(Math.sin(t * 9) * 0.03); FX[f.kind](c, f, S, t); c.restore(); }
  for (const o of S.objects) if (o.held) drawObj(o);
  for (const b of S.baos) if (b.held) drawBao(c, S, b, t);
  drawParts(c);
  if (R.flash > 0) { c.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); c.fillStyle = `rgba(255,255,255,${R.flash * 0.6})`; c.fillRect(0, 0, V.vw, V.vh); }
}
