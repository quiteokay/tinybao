// Everything the community builds: porch, garden, patio, courts, basement bowling, lake, boat, trees, stairs.
// Each thing can be drawn part-built: it appears bit by bit, bare wood first, then paint, then lights.
import { FH, W, ROOMW, SLAB, INK, clock, clamp } from './core.js';
import { stairX, minFloor, nFloors, ext } from './world.js';
import { B } from './drawthings.js';

const BARE = '#DCCBB0';
export const LIGHTS = []; // lamps that glow at night, collected each frame
const ln = (c, pts, col = INK, lw = 1.4) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); };
const dot = (c, x, y, r, fill, lw = 1.2) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = fill; c.fill(); if (lw) { c.strokeStyle = INK; c.lineWidth = lw; c.stroke(); } };
function lamp(c, x, y, on) { ln(c, [x, y - 8, x, y - 2], INK, 1); B(c, x - 4, y - 2, 8, 9, 2, on ? '#FFE9A8' : '#cfd4d8', 1.1); if (on) LIGHTS.push({ x, y: y + 3, r: 70 }); }
function flagline(c, x0, x1) {
  for (const x of [x0, x1]) ln(c, [x, 0, x, -16], '#B98A5E', 2.2);
  ln(c, [x0, -14, x1, -14], '#E8604C', 0.9);
  for (let x = x0 + 14; x < x1 - 6; x += 26) { c.beginPath(); c.moveTo(x, -14); c.lineTo(x + 7, -14); c.lineTo(x + 3.5, -8); c.closePath(); c.fillStyle = ['#FFD166', '#7CC6F2', '#FF8FB1'][Math.abs(Math.round(x / 26)) % 3]; c.fill(); }
}
// Draw `fn` as far as it has been built.
function staged(c, S, id, x0, x1, fn, t) {
  const done = S.done[id], P = S.proj && S.proj.id === id ? S.proj : null; if (!done && !P) return;
  const p = done ? 1 : P.p, reveal = done ? 1 : Math.min(1, p / 0.7), painted = done || p >= 0.8;
  if (!done) flagline(c, x0 - 6, x1 + 6);
  c.save();
  if (reveal < 1) { c.beginPath(); c.rect(x0 - 14, -300, (x1 - x0 + 28) * reveal, 600); c.clip(); }
  fn(c, { PT: (col) => (painted ? col : BARE), on: !!done, t, S, p });
  c.restore();
}

const porch = (c, k) => {
  B(c, -54, -7, 48, 7, 1.5, k.PT('#C9A26B')); for (const x of [-42, -30, -18]) ln(c, [x, -7, x, 0], 'rgba(90,60,30,.35)', 1);
  B(c, -60, -3, 8, 3, 1, k.PT('#B98A5E'), 1.1);
  for (const x of [-51, -10]) B(c, x - 2, -78, 4, 72, 1, k.PT('#FFF6E6'), 1.2);
  c.beginPath(); c.moveTo(-62, -76); c.lineTo(-4, -90); c.lineTo(-4, -82); c.lineTo(-62, -68); c.closePath(); c.fillStyle = k.PT('#E8805F'); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  // rocking chair
  c.beginPath(); c.arc(-30, -22, 24, 0.3 * Math.PI, 0.7 * Math.PI); c.strokeStyle = '#8a5a3c'; c.lineWidth = 2.2; c.stroke();
  B(c, -41, -14, 22, 4, 1.5, k.PT('#D9967A'), 1.1); B(c, -42, -36, 4, 24, 1.5, k.PT('#D9967A'), 1.1);
  lamp(c, -30, -66, k.on);
};
const veg = (c, k) => {
  const g = k.S.veg || 0, x0 = W + 252;
  for (let i = 0; i < 3; i++) {
    const x = x0 + i * 34; B(c, x, -8, 28, 8, 2, k.PT('#B98A5E'), 1.2); B(c, x + 2, -10, 24, 4, 2, '#7A5A3C', 0);
    for (let j = 0; j < 3; j++) { const px = x + 6 + j * 8, hgt = 4 + g * (10 + (i * 3 + j) % 4 * 3);
      ln(c, [px, -10, px + Math.sin(k.t * 1.4 + px) * 0.8, -10 - hgt], '#4c8a3f', 1.6);
      c.beginPath(); c.ellipse(px + 2.5, -10 - hgt, 3, 1.8, -0.5, 0, 7); c.fillStyle = '#6DBF62'; c.fill();
      if (g > 0.5 && i === 1) dot(c, px - 1.5, -10 - hgt * 0.6, 2, '#E8604C', 0.7); if (g > 0.6 && i === 2) dot(c, px, -11, 2, '#F2913D', 0.7); }
  }
  ln(c, [x0 - 6, 0, x0 - 6, -14], '#B98A5E', 2); ln(c, [x0 + 104, 0, x0 + 104, -14], '#B98A5E', 2); ln(c, [x0 - 6, -11, x0 + 104, -11], '#B98A5E', 1.4);
};
const patio = (c, k) => {
  const x0 = W + 384;
  for (let i = 0; i < 6; i++) B(c, x0 + i * 16, -3, 15, 4, 1, i % 2 ? '#D8D2C8' : '#C9C2B6', 0.9);
  const cx = x0 + 46;
  ln(c, [cx, -4, cx, -66], '#8a7a6a', 2.2); B(c, cx - 14, -22, 28, 4, 2, k.PT('#fff'), 1.2);
  c.beginPath(); c.moveTo(cx - 36, -58); c.quadraticCurveTo(cx, -86, cx + 36, -58); c.closePath(); c.fillStyle = k.PT('#FF8FB1'); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  if (k.PT('x') === 'x') { c.fillStyle = '#fff'; for (const dx of [-18, 6]) { c.beginPath(); c.moveTo(cx + dx, -60); c.quadraticCurveTo(cx + dx + 6, -76, cx + dx + 12, -60); c.closePath(); c.fill(); } }
  for (const dx of [-24, 24]) B(c, cx + dx - 6, -10, 12, 4, 2, k.PT('#7FB7A6'), 1.1);
  ln(c, [x0 - 2, 0, x0 - 2, -52], '#8a7a6a', 2); ln(c, [x0 + 98, 0, x0 + 98, -52], '#8a7a6a', 2);
  c.beginPath(); c.moveTo(x0 - 2, -50); c.quadraticCurveTo(cx, -40, x0 + 98, -50); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  for (let i = 1; i < 7; i++) { const u = i / 7, x = x0 - 2 + u * 100, y = -50 + Math.sin(u * Math.PI) * 5; dot(c, x, y + 2, 2.2, k.on ? ['#FFD166', '#FF8FB1', '#9AD0EC'][i % 3] : '#d8d8d8', 0.6); if (k.on && i % 2) LIGHTS.push({ x, y: y + 2, r: 34 }); }
};
const court = (c, k) => {
  B(c, -512, -3, 222, 5, 2, k.PT('#EDA765'), 1.2); ln(c, [-400, -3, -400, 2], '#fff', 1.5); ln(c, [-470, -1, -330, -1], 'rgba(255,255,255,.7)', 1);
  ln(c, [-502, 0, -502, -96], '#8a9aa2', 3.4); ln(c, [-502, -90, -490, -90], '#8a9aa2', 2.6);
  B(c, -494, -104, 5, 30, 1, k.PT('#fff'), 1.3); ln(c, [-489, -78, -474, -78], k.PT('#E8604C'), 2.2);
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 0.8; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-488 + i * 4.4, -78); c.lineTo(-486 + i * 3.4, -66); c.stroke(); }
  ln(c, [-294, 0, -294, -104], '#8a9aa2', 2.6); lamp(c, -300, -100, k.on);
};
const tennis = (c, k) => {
  B(c, -802, -3, 254, 5, 2, k.PT('#6FB58A'), 1.2); ln(c, [-790, -1, -560, -1], 'rgba(255,255,255,.8)', 1); for (const x of [-790, -735, -615, -560]) ln(c, [x, -3, x, 2], '#fff', 1.4);
  for (const x of [-677, -673]) ln(c, [x + (x < -675 ? -1 : 1), 0, x + (x < -675 ? -1 : 1), -24], '#8a9aa2', 2);
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-677, -22, 4, 20); ln(c, [-678, -22, -672, -22], '#fff', 1.6);
  ln(c, [-548, 0, -548, -104], '#8a9aa2', 2.6); lamp(c, -554, -100, k.on);
};
function lake(c, S, t) {
  const done = S.done.lake, P = S.proj && S.proj.id === 'lake' ? S.proj : null; if (!done && !P) return;
  const p = done ? 1 : P.p, x0 = W + 512, x1 = W + 892, dug = done ? 1 : Math.min(1, p / 0.85), fill = done ? 1 : clamp((p - 0.85) / 0.15, 0, 1), xr = x0 + (x1 - x0) * dug;
  if (!done) flagline(c, x0 - 8, x1 + 8);
  const basin = () => { c.beginPath(); c.moveTo(x0, -1); c.lineTo(xr, -1); c.quadraticCurveTo(xr - 6, 30, xr - 40 * dug, 34); c.lineTo(x0 + 40 * dug, 34); c.quadraticCurveTo(x0 + 6, 30, x0, -1); c.closePath(); };
  basin(); c.fillStyle = '#9C7A55'; c.fill();
  if (fill > 0) { c.save(); basin(); c.clip(); const top = 34 - 34 * fill; c.fillStyle = '#7CC6F2'; c.fillRect(x0, top, x1 - x0, 40); c.fillStyle = '#A9DDF7'; c.fillRect(x0, top, x1 - x0, 3);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.2; for (let x = x0 + 20; x < x1 - 20; x += 46) { const wx = x + Math.sin(t * 0.8 + x) * 6; c.beginPath(); c.moveTo(wx, top + 9); c.quadraticCurveTo(wx + 7, top + 6, wx + 14, top + 9); c.stroke(); } c.restore(); }
  basin(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
  if (!done && dug < 1) { c.beginPath(); c.ellipse(xr + 22, 0, 20, 9, 0, Math.PI, 0); c.fillStyle = '#9C7A55'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke(); }
  if (done) { for (const [x, s] of [[x1 - 26, 1], [x1 - 12, 0.8], [x0 + 150, 0.9]]) { ln(c, [x, 2, x + Math.sin(t + x) * 1.5, -18 * s], '#5a9a4f', 1.6); B(c, x - 1.5 + Math.sin(t + x) * 1.5, -24 * s, 3, 8 * s, 1.5, '#8a5a3c', 0.7); }
    for (const x of [x0 + 210, x0 + 300]) { c.beginPath(); c.ellipse(x + Math.sin(t * 0.5 + x) * 3, 4, 7, 2.4, 0, 0.3, 6.6); c.fillStyle = '#6DBF62'; c.fill(); } }
}
export function boatShape(c, front) {
  if (!front) { ln(c, [0, -8, 0, -40], '#8a5a3c', 1.8); c.beginPath(); c.moveTo(1, -40); c.lineTo(20, -18); c.lineTo(1, -14); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); }
  c.beginPath(); c.moveTo(-28, -10); c.lineTo(28, -10); c.quadraticCurveTo(24, 6, 14, 6); c.lineTo(-14, 6); c.quadraticCurveTo(-24, 6, -28, -10); c.closePath(); c.fillStyle = '#E8604C'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  ln(c, [-27, -6, 27, -6], '#fff', 1.6);
}
const dock = (c, k) => {
  const x0 = W + 502;
  for (const x of [x0 + 8, x0 + 46]) ln(c, [x, -4, x, 22], '#8a5a3c', 3);
  B(c, x0, -7, 58, 5, 1, k.PT('#C9A26B'), 1.2); for (let x = x0 + 10; x < x0 + 56; x += 10) ln(c, [x, -7, x, -2], 'rgba(90,60,30,.35)', 0.9);
  ln(c, [x0 + 4, -7, x0 + 4, -34], '#8a5a3c', 2.2); lamp(c, x0 + 4, -38, k.on);
  if (k.p >= 0.7 && !k.S.baos.some((b) => b.front === 'boat')) { c.save(); c.translate(W + 574, Math.sin(k.t * 1.3) * 1.2); boatShape(c, false); c.restore(); }
};
function tree(c, x, age, house, t, snow) {
  const s = clamp(0.45 + age / 12, 0.45, 1.05);
  c.save(); c.translate(x, 0); c.scale(s, s);
  B(c, -4, -42, 8, 42, 2, '#9A7352', 1.3);
  c.fillStyle = snow ? '#DCEAEF' : '#74C365'; c.strokeStyle = INK; c.lineWidth = 1.3;
  for (const [dx, dy, r] of [[0, -66, 24], [-17, -50, 17], [17, -50, 17]]) { c.beginPath(); c.arc(dx + Math.sin(t * 0.9 + x + dx) * 0.8, dy, r, 0, 7); c.fill(); c.stroke(); }
  c.beginPath(); c.arc(0, -58, 20, 0, 7); c.fill();
  if (house) { ln(c, [12, -40, 12, -34], INK, 0.9); B(c, 6, -34, 12, 11, 1.5, '#F6C177', 1.1); c.beginPath(); c.moveTo(4, -33); c.lineTo(12, -41); c.lineTo(20, -33); c.closePath(); c.fillStyle = '#E8604C'; c.fill(); c.stroke(); dot(c, 12, -28, 2, '#3a2a22', 0); }
  c.restore();
}

// Everything out in the grounds.
export function drawGrounds(c, S, t) {
  LIGHTS.length = 0;
  const e = ext(S), snow = S.snow > 0.5;
  for (const x of [e.L - 70, e.L - 150, e.L - 196, e.R + 60, e.R + 118, e.R + 204]) tree(c, x, 12, false, t, snow);
  for (const tr of S.trees) tree(c, tr.x, (clock.t - tr.t) / 86400000, tr.house, t, snow);
  const P = S.proj;
  if (P && P.id === 'tree') { c.beginPath(); c.ellipse(P.x, 0, 12, 4, 0, Math.PI, 0); c.fillStyle = '#9C7A55'; c.fill(); if (P.p > 0.4) { ln(c, [P.x, 0, P.x, -16 * P.p], '#9A7352', 2); dot(c, P.x, -18 * P.p, 6 * P.p, '#74C365', 1); } }
  lake(c, S, t);
  staged(c, S, 'boat', W + 500, W + 600, dock, t);
  staged(c, S, 'tennis', -802, -548, tennis, t);
  staged(c, S, 'court', -512, -290, court, t);
  staged(c, S, 'porch', -62, -6, porch, t);
  staged(c, S, 'veg', W + 248, W + 358, veg, t);
  staged(c, S, 'patio', W + 382, W + 484, patio, t);
}

// The basement: earth all round, a cave while it is being dug, then the bowling alley.
export function drawBasement(c, S, t, lit) {
  if (!S.basement) return;
  const P = S.proj && S.proj.id === 'bowling' ? S.proj : null, done = S.done.bowling, p = done ? 1 : P ? P.p : 0;
  const dug = Math.min(1, p / 0.5), xl = W - 30 - dug * (W - 30), top = SLAB + 6;
  c.fillStyle = '#9C7A55'; c.fillRect(-40, top, W + 80, FH + 26 - top);
  c.fillStyle = 'rgba(70,45,25,.25)'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(-30 + (i * 97) % (W + 60), top + 6 + (i * 53) % (FH + 10), 1.6 + (i % 3), 0, 7); c.fill(); }
  const painted = done || p >= 0.85;
  c.fillStyle = p < 0.5 ? '#6F5A45' : painted ? '#4F5486' : '#B9B4AC'; c.beginPath(); c.roundRect(xl, top + 4, W - xl, FH - top - 4, p < 0.5 ? [22, 0, 0, 0] : 0); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  if (p >= 0.5) {
    if (painted) { c.fillStyle = 'rgba(255,255,255,.14)'; for (let x = 20; x < ROOMW; x += 60) { c.beginPath(); c.arc(x, top + 34 + (x % 40), 3, 0, 7); c.fill(); } }
    c.fillStyle = '#EAD7BF'; c.fillRect(0, FH, W, 8); c.strokeRect(0, FH, W, 8);
    const k = clamp((p - 0.5) / 0.3, 0, 1);
    if (k > 0.1) { B(c, 110, FH - 5, 440 * k, 5, 1, '#E8C590', 1.1); B(c, 110, FH - 9, 440 * k, 3, 1, '#8a5a3c', 0.9); }
    if (k >= 1) { B(c, 30, FH - 30, 40, 30, 3, painted ? '#E8604C' : BARE); dot(c, 42, FH - 34, 5, '#6FA8DC'); dot(c, 56, FH - 34, 5, '#7CC96B'); B(c, 548, FH - 44, 22, 44, 2, painted ? '#3a3d66' : BARE); }
    if (painted) { c.font = '900 22px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const on = done, glow = on ? 0.75 + Math.sin(t * 5) * 0.1 : 0.25; c.fillStyle = on ? `rgba(255,140,190,${glow + 0.2})` : '#7b7fa8'; c.fillText('BOWL', 300, top + 34); c.strokeStyle = on ? '#fff' : '#9a9cc0'; c.lineWidth = 0.8; c.strokeText('BOWL', 300, top + 34);
      if (on) LIGHTS.push({ x: 300, y: top + 34, r: 120, col: '255,130,190' }); }
  }
}
export function drawPins(c, S, t) {
  if (!S.done.bowling) return;
  const bowler = S.baos.find((b) => { const st = b.plan && b.plan[b.si]; return st && st.bowl && st.begun; });
  const k = bowler ? bowler.st % 2.6 : 0, down = bowler && k > 1.5;
  for (let i = 0; i < 4; i++) { c.save(); c.translate(522 + i * 6, FH - 9); if (down) { c.translate(i * 3, 2); c.rotate(1.2 + i * 0.3); } B(c, -2, -11, 4, 11, 2, '#fff', 0.9); ln(c, [-2, -8, 2, -8], '#E8604C', 1); c.restore(); }
  if (bowler && k < 1.6) { const x = bowler.x + 22 + Math.min(1, k / 1.5) * (512 - bowler.x - 22); c.save(); c.translate(x, FH - 14); c.rotate(k * 9); dot(c, 0, 0, 5.5, '#3D4270', 1.2); dot(c, 1.5, -1.5, 1, '#fff', 0); c.restore(); }
}
export function drawBallGames(c, S, t) {
  const playing = (flag) => S.baos.filter((b) => { const st = b.plan && b.plan[b.si]; return st && st[flag] && st.begun; });
  for (const b of playing('shoot')) { const T = 1.9, u = (b.st % T) / T, hx = -481, hy = -80;
    let x, y; if (u < 0.7) { const v = u / 0.7; x = b.x - 14 + (hx - b.x + 14) * v; y = -38 + (hy + 38) * v - Math.sin(v * Math.PI) * 46; } else { const v = (u - 0.7) / 0.3; x = hx - v * 6; y = hy + v * 74; }
    c.save(); c.translate(x, y); c.rotate(u * 12); dot(c, 0, 0, 5, '#F2913D', 1.1); ln(c, [-5, 0, 5, 0], INK, 0.7); c.restore(); }
  const pl = playing('rally');
  if (pl.length) { const a = pl[0].x, b2 = pl.length > 1 ? pl[1].x : -675, u = (Math.sin(t * 2.6) + 1) / 2, x = a + (b2 - a) * u + (a < b2 ? 16 : -16) * (1 - 2 * u); dot(c, x, -22 - Math.sin(u * Math.PI) * (pl.length > 1 ? 34 : 14), 2.6, '#D8F26B', 0.8); }
}

// Stairs zig-zag up the stairwell; the last climb to the roof is a ladder.
export function drawStairwell(c, S, nf, wallOf) {
  for (let f = 0; f < nf; f++) { const y0 = -f * FH, top = y0 - FH + SLAB;
    c.fillStyle = S.bare[f + ',2'] != null ? '#E6E0D6' : '#EFE3D0'; c.fillRect(ROOMW, top, W - ROOMW, FH - SLAB);
    c.fillStyle = 'rgba(160,125,90,.28)'; c.fillRect(ROOMW, y0 - 30, W - ROOMW, 30);
    c.fillStyle = '#EAD7BF'; c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.roundRect(ROOMW - 3, top - 1, 6, FH - SLAB - 50, [0, 0, 3, 3]); c.fill(); c.stroke(); }
}
export function drawFlights(c, S, nf) {
  const n = 8;
  for (let f = minFloor(S); f < nf - 1; f++) {
    const xa = stairX(f), xb = stairX(f + 1), ya = -f * FH, dir = Math.sign(xb - xa), run = Math.abs(xb - xa) / n, rise = FH / n;
    c.beginPath(); c.moveTo(xa, ya);
    for (let i = 0; i < n; i++) { c.lineTo(xa + dir * run * i, ya - rise * (i + 1)); c.lineTo(xa + dir * run * (i + 1), ya - rise * (i + 1)); }
    c.lineTo(xb, ya - FH + 12); c.lineTo(xa + dir * 10, ya); c.closePath();
    c.fillStyle = '#D9B98C'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
    c.beginPath(); c.moveTo(xa, ya - 24); c.lineTo(xb, ya - FH - 24); c.strokeStyle = '#8a5a3c'; c.lineWidth = 2.4; c.stroke();
    for (const u of [0, 0.5, 1]) ln(c, [xa + (xb - xa) * u, ya - FH * u, xa + (xb - xa) * u, ya - FH * u - 24], '#8a5a3c', 1.8);
  }
}
