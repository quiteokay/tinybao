// Furniture and objects, all drawn in code. Origin is the thing's spot on the floor; up is negative y.
import { INK, clock, clamp } from './core.js';
import { drawBaoShape } from './drawbao.js';

export function B(c, x, y, w, h, r, fill, lw = 1.4) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
}
function circ(c, x, y, r, fill, lw = 1.4) { c.beginPath(); c.arc(x, y, r, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
function line(c, pts, col = INK, lw = 1.4) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.stroke(); }
function flame(c, x, y, s, t, k = 0) {
  for (const [col, m] of [['#FF8A3D', 1], ['#FFD166', 0.55]]) {
    const w = Math.sin(t * 9 + k) * 2 * s;
    c.beginPath(); c.moveTo(x - 7 * s * m, y);
    c.quadraticCurveTo(x - 8 * s * m, y - 9 * s * m, x + w * m, y - 20 * s * m - Math.sin(t * 13 + k) * 2);
    c.quadraticCurveTo(x + 8 * s * m, y - 9 * s * m, x + 7 * s * m, y); c.closePath(); c.fillStyle = col; c.fill();
  }
}
const BOOKS = ['#E8604C', '#6FA8DC', '#7CC96B', '#FFD166', '#B58BD9', '#F2A65A', '#4FB0A5'];

export const FX = {
  fridge(c) { B(c, -13, -58, 26, 58, 4, '#EEF6F9'); line(c, [-13, -38, 13, -38]); line(c, [8, -52, 8, -43], '#9bb', 2); line(c, [8, -33, 8, -20], '#9bb', 2); },
  stove(c, f, S, t) {
    B(c, -16, -32, 32, 32, 3, '#DDD6D0'); B(c, -11, -22, 22, 14, 2, '#5a4a44'); for (const x of [-9, -3, 3, 9]) circ(c, x, -27.5, 1.3, '#8a7a72', 0);
    B(c, -10, -44, 20, 12, [2, 2, 5, 5], S.pot > 0 ? '#E8604C' : '#9aa3a8'); line(c, [-12, -44, 12, -44], INK, 2); circ(c, 0, -46.5, 1.8, '#3a2a22', 0);
  },
  sink(c, f, S) {
    B(c, -17, -30, 34, 30, 3, '#CFE7F1'); B(c, -12, -32, 16, 6, 2, '#fff'); line(c, [-4, -34, -4, -42, 2, -42, 2, -39], '#8a9aa2', 2);
    const n = Math.min(S.dishes, 7);
    for (let i = 0; i < n; i++) { c.beginPath(); c.ellipse(10, -32 - i * 2.4, 6.5, 2, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); }
  },
  table(c) { B(c, -22, -24, 44, 5, 2, '#D29A64'); line(c, [-17, -19, -17, 0], '#8a5a3c', 3); line(c, [17, -19, 17, 0], '#8a5a3c', 3); },
  kbin(c, f, S) {
    if (S.bin > 0.7) { circ(c, 0, -22, 7, '#7b8794'); }
    B(c, -8, -19, 16, 19, 3, '#8FBBA9'); B(c, -9.5, -22, 19, 4, 2, '#7AA896');
  },
  fireplace(c, f, S, t) {
    B(c, -15, -112, 30, 50, 0, '#D9967A'); B(c, -25, -62, 50, 62, 4, '#CF7F62');
    for (let r = 0; r < 4; r++) line(c, [-25, -50 + r * 13, 25, -50 + r * 13], 'rgba(90,40,30,.25)', 1);
    B(c, -15, -36, 30, 36, [12, 12, 0, 0], '#3a2620'); B(c, -28, -66, 56, 7, 2, '#8a5a3c');
    if (S.fire.fuel > 0) {
      B(c, -10, -5, 20, 5, 2, '#5a3a2a', 1); const s = 0.5 + S.fire.fuel * 0.6;
      flame(c, -4, -4, s, t, 0); flame(c, 4, -4, s * 0.8, t, 2);
    } else if (S.fire.fuel <= 0) { B(c, -9, -4, 18, 4, 2, '#4a3a34', 0); }
  },
  logbasket(c, f, S) {
    const n = Math.min(S.fire.logs, 5);
    for (let i = 0; i < n; i++) circ(c, -6 + (i % 3) * 6, -15 - Math.floor(i / 3) * 6, 3.4, '#C28E5C', 1);
    B(c, -11, -13, 22, 13, [2, 2, 6, 6], '#D7B378'); line(c, [-11, -8, 11, -8], 'rgba(90,60,30,.4)', 1);
  },
  sofa(c) { B(c, -30, -37, 60, 28, 9, '#E58F7B'); B(c, -34, -24, 10, 22, 5, '#D97D69'); B(c, 24, -24, 10, 22, 5, '#D97D69'); B(c, -27, -17, 54, 13, 5, '#F2A893'); line(c, [-24, -3, -24, 0], INK, 3); line(c, [24, -3, 24, 0], INK, 3); },
  armchair(c) { B(c, -17, -38, 34, 28, 9, '#7FB7A6'); B(c, -21, -24, 9, 22, 4, '#6BA493'); B(c, 12, -24, 9, 22, 4, '#6BA493'); B(c, -14, -17, 28, 13, 5, '#97CCBB'); },
  washer(c, f, S, t) {
    const run = S.laundry.machineEnd > 0; c.save(); if (run) c.translate(Math.sin(t * 40) * 0.7, 0);
    B(c, -15, -38, 30, 38, 4, '#F4F4F4'); line(c, [-15, -30, 15, -30]); circ(c, 9, -34, 1.6, '#E8604C', 0);
    circ(c, 0, -15, 10, run ? '#9AD0EC' : S.laundry.wet ? '#F7C6D9' : '#cfdbe0');
    if (run) { c.save(); c.translate(0, -15); c.rotate(t * 7); line(c, [-6, 0, 6, 0], '#fff', 2.5); line(c, [0, -6, 0, 6], '#F7C6D9', 2.5); c.restore(); }
    c.restore();
  },
  lbasket(c, f, S) {
    const k = S.laundry.basket;
    if (k > 0.15) { c.beginPath(); c.ellipse(0, -15, 10, 3 + k * 9, 0, Math.PI, 0); c.fillStyle = '#F7C6D9'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); if (k > 0.6) circ(c, 4, -18 - k * 4, 3.5, '#9AD0EC', 1); }
    B(c, -12, -15, 24, 15, [2, 2, 6, 6], '#fff'); for (const x of [-6, 0, 6]) line(c, [x, -12, x, -3], '#cdd', 1.2);
  },
  ironing(c) { B(c, -20, -27, 40, 5, 3, '#B9D7E8'); line(c, [-12, -22, 10, 0], '#889', 2); line(c, [12, -22, -10, 0], '#889', 2); B(c, -3, -34, 14, 7, [5, 2, 2, 2], '#E8604C', 1.2);
    B(c, -22, -82, 44, 4, 1, '#B98A5E'); B(c, -17, -92, 7, 10, 2, '#7CC6F2', 1.1); B(c, -6, -94, 7, 12, 2, '#FFD166', 1.1); B(c, 6, -90, 9, 8, 2, '#F7C6D9', 1.1); },
  tub(c, f, S, t, front) {
    if (!front) { line(c, [26, -28, 26, -46, 18, -46], '#8a9aa2', 2.2); }
    B(c, -32, -28, 64, 24, [5, 5, 16, 16], '#fff'); B(c, -35, -31, 70, 6, 3, '#fff');
    circ(c, -22, -3, 3, '#D9B45A', 1.2); circ(c, 22, -3, 3, '#D9B45A', 1.2);
    if (front) for (let i = 0; i < 6; i++) circ(c, -24 + i * 9.5 + Math.sin(t * 2 + i) * 1.5, -31 - (i % 2) * 3, 4.5 + (i % 3), '#fff', 0.9);
  },
  bsink(c) { B(c, -5, -24, 10, 24, 2, '#fff'); B(c, -12, -32, 24, 10, [3, 3, 8, 8], '#fff'); line(c, [0, -34, 0, -40, 5, -40], '#8a9aa2', 2);
    B(c, -11, -80, 22, 28, 9, '#BFE6F5'); line(c, [-5, -72, 0, -77], '#fff', 2); },
  crib(c, f, S, t, front) {
    if (!front) { B(c, -24, -16, 48, 9, 3, '#fff'); B(c, -25, -40, 4, 40, 2, '#F2D9A0'); B(c, 21, -40, 4, 40, 2, '#F2D9A0'); }
    for (let x = -18; x <= 18; x += 6) line(c, [x, -34, x, -8], '#D9B45A', 1.6);
    line(c, [-23, -35, 23, -35], '#D9B45A', 3); line(c, [-23, -8, 23, -8], '#D9B45A', 3);
  },
  changer(c) { B(c, -18, -30, 36, 6, 2, '#F7C6D9'); line(c, [-14, -24, -14, 0], '#B98A5E', 3); line(c, [14, -24, 14, 0], '#B98A5E', 3); B(c, -15, -12, 30, 3, 1, '#D7B378', 1); for (const x of [-10, -3, 4]) B(c, x, -18, 6, 6, 1.5, '#fff', 1); },
  toybox(c) { circ(c, -5, -20, 5, '#FFD166', 1.2); B(c, 2, -26, 7, 10, 1, '#7CC96B', 1.2); B(c, -14, -18, 28, 18, 3, '#7CC6F2'); c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.2 : 5, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, -9 + Math.sin(a) * r); } c.fill(); },
  bedframe(c) { B(c, -29, -32, 6, 32, 3, '#B98A5E'); B(c, -26, -13, 54, 11, 4, '#fff'); B(c, -22, -19, 16, 8, 4, '#FDF3D0'); line(c, [-23, -2, -23, 0], INK, 3); line(c, [25, -2, 25, 0], INK, 3); },
  bunkframe(c) {
    line(c, [-29, -92, -29, 0], '#B98A5E', 4.5); line(c, [29, -92, 29, 0], '#B98A5E', 4.5);
    line(c, [-29, -92, -29, 0], INK, 0.01);
    for (const y of [-13, -59]) { B(c, -27, y, 54, 11, 4, '#fff'); B(c, -23, y - 6, 16, 8, 4, '#FDF3D0'); }
    for (const y of [-20, -32, -44]) line(c, [29, y, 36, y], '#B98A5E', 2.5); line(c, [36, -52, 36, 0], '#B98A5E', 2.5);
  },
  wardrobe(c) { B(c, -15, -74, 30, 74, 3, '#C39468'); line(c, [0, -72, 0, -4], INK, 1.2); circ(c, -3, -38, 1.6, '#FFD166', 1); circ(c, 3, -38, 1.6, '#FFD166', 1); },
  shelf(c, f) {
    B(c, -14, -86, 28, 86, 2, '#B58355');
    for (let r = 0; r < 4; r++) { const y = -8 - r * 20; B(c, -12, y - 14, 24, 15, 0, '#8a5d3a', 0); let x = -11; let i = (r * 3 + Math.round(f.x)) % 7;
      while (x < 9) { const w = 3 + (i % 3), h = 10 + (i * 5 % 4); B(c, x, y - h, w, h, 0.8, BOOKS[i % 7], 0.8); x += w + 0.6; i++; } }
  },
  desk(c) { B(c, -18, -27, 36, 5, 2, '#C39468'); line(c, [-14, -22, -14, 0], '#8a5a3c', 3); line(c, [14, -22, 14, 0], '#8a5a3c', 3); B(c, -8, -30, 12, 3, 1, '#fff', 1); line(c, [10, -27, 10, -40, 5, -44], '#667', 2); circ(c, 4, -45, 3.5, '#FFD166', 1.2); },
  blocks(c) { B(c, -14, -11, 11, 11, 2, '#E8604C'); B(c, -2, -11, 11, 11, 2, '#6FA8DC'); B(c, -8, -22, 11, 11, 2, '#FFD166'); c.beginPath(); c.moveTo(11, 0); c.lineTo(17, -11); c.lineTo(23, 0); c.closePath(); c.fillStyle = '#7CC96B'; c.fill(); c.stroke(); },
  horse(c, f, S, t) { c.beginPath(); c.arc(0, -26, 28, 0.22 * Math.PI, 0.78 * Math.PI); c.strokeStyle = '#B98A5E'; c.lineWidth = 4; c.stroke(); B(c, -14, -16, 28, 9, 4, '#F2A65A'); B(c, 10, -27, 9, 14, 4, '#F2A65A'); circ(c, 16, -22, 1.2, INK, 0); },
  planter(c, f, S, t) {
    const w = S.planters[f.pid] ?? 0.5, droop = w < 0.35 ? 0.9 : 0;
    for (const [dx, hgt, col] of [[-9, 30, '#6DBF62'], [0, 40, '#57A84F'], [9, 26, '#7CC96B']]) {
      c.strokeStyle = '#4c8a3f'; c.lineWidth = 2; c.beginPath(); c.moveTo(dx, -14); c.quadraticCurveTo(dx + droop * 6, -14 - hgt * 0.6, dx + droop * 12, -14 - hgt * (1 - droop * 0.45)); c.stroke();
      c.beginPath(); c.ellipse(dx + droop * 12, -14 - hgt * (1 - droop * 0.45), 6, 4, droop, 0, 7); c.fillStyle = droop ? '#B9B36A' : col; c.fill(); c.lineWidth = 1.1; c.strokeStyle = INK; c.stroke();
    }
    B(c, -16, -15, 32, 15, 3, '#D9967A'); B(c, -18, -17, 36, 5, 2, '#C9785A');
  },
  piano(c) { B(c, -28, -52, 56, 52, 3, '#6a4a3c'); B(c, -30, -30, 60, 7, 2, '#fff'); for (let x = -26; x < 28; x += 5) line(c, [x, -30, x, -24], INK, 0.8); B(c, -8, -46, 16, 10, 1, '#fff', 1); B(c, 34, -14, 14, 4, 2, '#E58F7B'); line(c, [41, -10, 41, 0], INK, 2.5); },
  gramophone(c, f, S, t) { B(c, -12, -24, 24, 24, 3, '#B98A5E'); circ(c, 0, -26, 8, '#2b2320', 1); c.beginPath(); c.moveTo(4, -28); c.lineTo(20, -58); c.lineTo(6, -52); c.closePath(); c.fillStyle = '#FFD166'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke(); },
  easel(c) { line(c, [-12, 0, 0, -62], '#B98A5E', 3); line(c, [12, 0, 0, -62], '#B98A5E', 3); B(c, -14, -54, 28, 30, 1.5, '#fff'); circ(c, -5, -42, 5, '#FF8FB1', 0); circ(c, 5, -36, 4, '#7CC6F2', 0); circ(c, 2, -46, 3, '#FFD166', 0); },
  paints(c) { B(c, -14, -20, 28, 4, 1, '#C39468'); line(c, [-10, -16, -10, 0], '#8a5a3c', 2.5); line(c, [10, -16, 10, 0], '#8a5a3c', 2.5); for (const [x, col] of [[-10, '#E8604C'], [-2, '#6FA8DC'], [6, '#FFD166']]) B(c, x, -28, 7, 8, 1.5, col, 1.1); },
  teatable(c) { B(c, -22, -15, 44, 5, 2, '#B58355'); line(c, [-16, -10, -16, 0], '#8a5a3c', 3); line(c, [16, -10, 16, 0], '#8a5a3c', 3); B(c, -7, -26, 14, 11, 5, '#fff'); line(c, [7, -22, 12, -25], INK, 1.6); B(c, 12, -20, 6, 5, 2, '#fff', 1.1); B(c, -19, -20, 6, 5, 2, '#fff', 1.1); },
  outbin(c, f, S) { for (const [x, col] of [[-12, '#7B9E87'], [12, '#8696A7']]) { B(c, x - 10, -28, 20, 28, 3, col); B(c, x - 12, -32, 24, 5, 2, col); line(c, [x - 5, -22, x - 5, -6], 'rgba(0,0,0,.18)', 1.5); line(c, [x + 5, -22, x + 5, -6], 'rgba(0,0,0,.18)', 1.5); }
    if (S.outBin > 0.4) circ(c, -12, -36, 6, '#7b8794'); if (S.outBin > 0.75) circ(c, 13, -36, 5.5, '#7b8794'); },
  woodpile(c) { for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) { const x = -18 + i * 9 + r * 4.5, y = -5 - r * 8; circ(c, x, y, 4.6, '#C28E5C', 1.2); circ(c, x, y, 2, '#E3BE8E', 0); } },
  mailbox(c) { line(c, [0, 0, 0, -30], '#8a5a3c', 3.5); B(c, -10, -44, 20, 14, [7, 7, 2, 2], '#E8604C'); line(c, [10, -40, 14, -40, 14, -47], '#FFD166', 2); },
  line(c, f, S, t) {
    line(c, [-40, 0, -40, -64], '#B98A5E', 3); line(c, [40, 0, 40, -64], '#B98A5E', 3);
    c.beginPath(); c.moveTo(-40, -62); c.quadraticCurveTo(0, -54, 40, -62); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    const cols = ['#F7C6D9', '#9AD0EC', '#FFD166', '#fff', '#B9E3A8'];
    for (let i = 0; i < S.laundry.line; i++) { const x = -30 + i * 15, y = -58 + Math.sin((x + 40) / 80 * Math.PI) * 3.5, sw = Math.sin(t * 2 + i) * 0.08;
      c.save(); c.translate(x, y); c.rotate(sw); if (i % 2) B(c, -5, 0, 10, 14, 2, cols[i % 5], 1.1); else { B(c, -3, 0, 6, 13, [1, 1, 3, 3], cols[i % 5], 1.1); } c.restore(); }
  },
  planks(c, f, S) { if (!S.proj) return; for (let i = 0; i < 5; i++) B(c, -24 + (i % 2) * 4, -6 - i * 5, 46, 5, 1, i % 2 ? '#E3BE8E' : '#D7AC78', 1.1); },
  patch(c, f, S, t) {
    c.beginPath(); c.ellipse(0, 0, 56, 7, 0, Math.PI, 0); c.fillStyle = '#9C7A55'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
    for (const fl of S.flowers) {
      const age = (clock.t - fl.t) / 86400000, x = fl.x - f.x, hgt = clamp(age / 2, 0.15, 1) * 24, sw = Math.sin(t * 1.5 + fl.x) * 1.5;
      line(c, [x, -3, x + sw, -3 - hgt], '#4c8a3f', 1.8);
      if (age < 1) { c.beginPath(); c.ellipse(x + sw + 3, -3 - hgt, 3.5, 2, -0.5, 0, 7); c.fillStyle = '#7CC96B'; c.fill(); }
      else if (age < 2) circ(c, x + sw, -4 - hgt, 2.6, `hsl(${fl.hue} 70% 75%)`, 1);
      else { c.fillStyle = `hsl(${fl.hue} 85% 68%)`; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + sw + Math.cos(i * 1.257) * 3.6, -4 - hgt + Math.sin(i * 1.257) * 3.6, 2.8, 0, 7); c.fill(); } circ(c, x + sw, -4 - hgt, 2, '#FFD166', 0.8); }
    }
  },
  scaffold(c, f, S) {
    if (!S.proj || S.proj.id !== 'floor' || S.proj.p >= 0.6) return; const p = S.proj.p / 0.6, n = 5;
    for (let i = 0; i < n; i++) { const x = -280 + i * 140, k = clamp(p * n * 1.2 - i * 0.2, 0, 1); if (k <= 0) continue; line(c, [x, 0, x, -100 * k], '#C9A26B', 4); line(c, [x, 0, x, -100 * k], INK, 0.6); }
    if (p > 0.3) line(c, [-280, -50, -280 + 560 * clamp((p - 0.3) / 0.3, 0, 1), -50], '#C9A26B', 3.5);
    if (p > 0.6) line(c, [-280, -100, -280 + 560 * clamp((p - 0.6) / 0.3, 0, 1), -100], '#C9A26B', 3.5);
    if (p > 0.15) { c.globalAlpha = 0.5; B(c, -284, -100 * clamp(p * 1.1, 0, 1), 568 * clamp(p * 1.3, 0, 1), 100 * clamp(p * 1.1, 0, 1), 0, null, 0); c.globalAlpha = 1; }
  },
};

export const TH = {
  basketball(c, o) { c.save(); c.translate(0, -6.5); c.rotate(((o && o.x) || 0) / 6.5); circ(c, 0, 0, 6.5, '#F2913D', 1.2); c.clip();
    c.beginPath(); c.moveTo(-7, 0); c.lineTo(7, 0); c.moveTo(0, -7); c.lineTo(0, 7); c.arc(-9.5, 0, 6.5, -0.8, 0.8); c.moveTo(9.5 - 6.5 * Math.cos(0.8), -6.5 * Math.sin(0.8)); c.arc(9.5, 0, 6.5, Math.PI + 0.8, Math.PI - 0.8, true);
    c.strokeStyle = 'rgba(58,42,34,.75)'; c.lineWidth = 0.8; c.stroke(); c.restore(); },
  ball(c) { circ(c, 0, -8, 8, '#E8604C'); c.beginPath(); c.arc(0, -8, 8, -0.6, 0.6); c.lineTo(0, -8); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(0, -8, 8, Math.PI - 0.6, Math.PI + 0.6); c.lineTo(0, -8); c.closePath(); c.fill(); circ(c, 0, -8, 8, null); },
  plant(c, o, S, t) {
    const dr = (o.water ?? 0.7) < 0.35 ? 1 : 0;
    for (const a of [-0.9, -0.3, 0.3, 0.9]) { c.save(); c.translate(0, -16); c.rotate(a * (1 + dr * 0.7) + Math.sin(t * 1.3 + a) * 0.03); c.beginPath(); c.ellipse(0, -13, 4.5, 13, 0, 0, 7); c.fillStyle = dr ? '#B9B36A' : a * a > 0.5 ? '#57A84F' : '#6DBF62'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); c.restore(); }
    c.beginPath(); c.moveTo(-10, -17); c.lineTo(10, -17); c.lineTo(7, 0); c.lineTo(-7, 0); c.closePath(); c.fillStyle = '#D9967A'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); B(c, -11, -19, 22, 4, 1.5, '#C9785A');
  },
  snacks(c, o) { c.beginPath(); c.moveTo(-9, 0); c.lineTo(-10, -20); c.lineTo(-6, -23); c.lineTo(-2, -20); c.lineTo(2, -23); c.lineTo(6, -20); c.lineTo(10, -22); c.lineTo(9, 0); c.closePath(); c.fillStyle = '#FFD166'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); circ(c, 0, -10, 4.5, '#E8604C', 1); },
  drum(c, o, S, t) { const hit = clock.t - (o.on || 0) < 300 ? Math.abs(Math.sin(t * 20)) : 0; B(c, -13, -18 + hit, 26, 18 - hit, 3, '#E8604C'); line(c, [-13, -14, -6, -4, 0, -14, 6, -4, 13, -14], '#FFD166', 1.3); c.beginPath(); c.ellipse(0, -18 + hit, 13, 4, 0, 0, 7); c.fillStyle = '#FFF6E0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke(); },
  tv(c, o, S, t) {
    const on = clock.t - (o.on || 0) < 600; line(c, [-5, -40, -11, -52], INK, 1.5); line(c, [5, -40, 11, -52], INK, 1.5);
    B(c, -18, -40, 36, 28, 5, '#8B6F5E'); B(c, -14, -36, 22, 20, 4, on ? `hsl(${(t * 80) % 360} 70% 78%)` : '#3d4a4f'); circ(c, 13, -32, 1.8, '#FFD166', 0.8); circ(c, 13, -25, 1.8, '#ddd', 0.8);
    line(c, [-10, -12, -13, 0], INK, 2.5); line(c, [10, -12, 13, 0], INK, 2.5);
  },
  rug(c) { c.beginPath(); c.ellipse(0, -2, 30, 4.5, 0, 0, 7); c.fillStyle = '#B58BD9'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.ellipse(0, -2, 19, 2.6, 0, 0, 7); c.strokeStyle = '#FFD166'; c.stroke(); },
  lamp(c, o) { line(c, [0, 0, 0, -44], '#8a7a6a', 2.5); B(c, -7, -3, 14, 3, 1.5, '#8a7a6a', 1); c.beginPath(); c.moveTo(-6, -58); c.lineTo(6, -58); c.lineTo(11, -42); c.lineTo(-11, -42); c.closePath(); c.fillStyle = o && o.off ? '#DDD6C8' : '#FFE9A8'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); },
  duck(c) { c.beginPath(); c.ellipse(0, -6, 10, 6.5, 0, 0, 7); c.fillStyle = '#FFD84D'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke(); circ(c, 6, -14, 5.5, '#FFD84D', 1.3); c.beginPath(); c.moveTo(10.5, -14.5); c.lineTo(15.5, -13); c.lineTo(10.5, -11.5); c.closePath(); c.fillStyle = '#F2913D'; c.fill(); c.stroke(); circ(c, 7.5, -15.5, 0.9, INK, 0); },
  wood(c) { for (const [x, y] of [[-6, -5], [6, -5], [0, -13]]) { circ(c, x, y, 5.5, '#C28E5C', 1.3); circ(c, x, y, 2.3, '#E3BE8E', 0); } line(c, [-11, -8, 11, -8], '#E8604C', 1.8); },
  books(c) { [['#6FA8DC', -11, 22, 0], ['#E8604C', -9, 19, 5], ['#7CC96B', -10, 21, 10], ['#FFD166', -8, 17, 15]].forEach(([col, x, w, y]) => B(c, x, -y - 5, w, 5, 1, col, 1.1)); },
  radio(c, o, S, t) { line(c, [8, -18, 14, -32], INK, 1.4); B(c, -14, -18, 28, 18, 4, '#7FB7A6'); circ(c, -6, -9, 5, '#fff', 1.1); circ(c, -6, -9, 2, '#8aa', 0); B(c, 3, -14, 8, 3, 1, '#fff', 0.9); circ(c, 7, -6, 1.8, '#FFD166', 0.8); },
  balloon(c, o, S, t) { c.beginPath(); c.moveTo(0, -1); c.quadraticCurveTo(4, 14, -1, 30); c.strokeStyle = '#8a7a72'; c.lineWidth = 1; c.stroke(); c.beginPath(); c.ellipse(0, -15, 11, 14, 0, 0, 7); c.fillStyle = '#FF7C9C'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.ellipse(-4, -20, 2.4, 4, 0.4, 0, 7); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); },
  box(c, o, S, t, front) {
    if (!front) { B(c, -18, -20, 36, 20, 1.5, '#B8915E'); c.beginPath(); c.moveTo(-18, -20); c.lineTo(-26, -29); c.lineTo(-14, -27); c.closePath(); c.fillStyle = '#D9B683'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(18, -20); c.lineTo(26, -29); c.lineTo(14, -27); c.closePath(); c.fill(); c.stroke(); }
    B(c, -18, -18, 36, 18, 1.5, '#CBA574'); line(c, [-3, -18, -3, -11, 3, -11, 3, -18], 'rgba(90,60,30,.35)', 1.1);
  },
  teddy(c) { circ(c, -6, -22, 3.2, '#B07A4E', 1.2); circ(c, 6, -22, 3.2, '#B07A4E', 1.2); c.beginPath(); c.ellipse(0, -7, 8, 8, 0, 0, 7); c.fillStyle = '#C08A5C'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke(); circ(c, 0, -18, 7, '#C08A5C', 1.3); circ(c, 0, -16, 2.8, '#E8CBA8', 0); circ(c, -2.6, -19.5, 0.9, INK, 0); circ(c, 2.6, -19.5, 0.9, INK, 0); circ(c, 0, -16.5, 0.9, INK, 0); circ(c, -8, -3, 3, '#B07A4E', 1.1); circ(c, 8, -3, 3, '#B07A4E', 1.1); },
  cake(c, o, S, t) { B(c, -16, -3, 32, 3, 1.5, '#fff', 1.1); B(c, -13, -16, 26, 13, 3, '#F7C6D9'); c.beginPath(); c.moveTo(-13, -13); for (let x = -13; x < 13; x += 6.5) c.quadraticCurveTo(x + 3.25, -6, x + 6.5, -13); c.lineTo(13, -16); c.lineTo(-13, -16); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke(); for (const x of [-7, 0, 7]) { line(c, [x, -16, x, -22], '#6FA8DC', 1.8); flame(c, x, -22, 0.22, t, x); } },
  mirror(c) { line(c, [-9, 0, -4, -14], '#B98A5E', 2.5); line(c, [9, 0, 4, -14], '#B98A5E', 2.5); c.beginPath(); c.ellipse(0, -34, 12, 22, 0, 0, 7); c.fillStyle = '#CFEFFA'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#D9B45A'; c.stroke(); c.lineWidth = 1; c.strokeStyle = INK; c.beginPath(); c.ellipse(0, -34, 13.5, 23.5, 0, 0, 7); c.stroke(); line(c, [-5, -44, 1, -50], '#fff', 2); },
  fish(c, o, S, t) { B(c, -10, -3, 20, 3, 1.5, '#B98A5E', 1); c.beginPath(); c.arc(0, -15, 12, -1.15, Math.PI + 1.15); c.closePath(); c.fillStyle = '#D6F1FA'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
    const fx = Math.sin(t * 1.2) * 5, d = Math.cos(t * 1.2) > 0 ? 1 : -1; c.fillStyle = '#F2913D'; c.beginPath(); c.ellipse(fx, -13, 3.6, 2.3, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(fx - d * 3, -13); c.lineTo(fx - d * 7, -16); c.lineTo(fx - d * 7, -10); c.closePath(); c.fill(); },
  telescope(c) { line(c, [0, -22, -9, 0], INK, 2); line(c, [0, -22, 9, 0], INK, 2); line(c, [0, -22, 0, 0], INK, 2); c.save(); c.translate(0, -24); c.rotate(-0.6); B(c, -14, -4, 30, 8, 2, '#6F7FB5'); B(c, 14, -5.5, 6, 11, 1.5, '#FFD166', 1.2); c.restore(); },
  seeds(c) { B(c, -8, -18, 16, 18, 1.5, '#F5F0E8'); B(c, -8, -18, 16, 5, 1.5, '#7CC96B', 1.1); c.fillStyle = '#FF8FB1'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(Math.cos(i * 1.257) * 2.6, -7 + Math.sin(i * 1.257) * 2.6, 2, 0, 7); c.fill(); } circ(c, 0, -7, 1.4, '#FFD166', 0); },
  party(c) { c.save(); c.rotate(-0.35); c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(2, -24); c.lineTo(-2, -24); c.closePath(); c.fillStyle = '#FF8FB1'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke();
    for (const [y, col] of [[-6, '#FFD166'], [-13, '#7CC6F2'], [-19, '#7CC96B']]) line(c, [-4.5 + (-y) * 0.1, y, 4.5 - (-y) * 0.1, y], col, 2);
    for (const [dx, col] of [[-5, '#FFD166'], [0, '#7CC6F2'], [5, '#FF8FB1']]) { c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(dx * 2, -32, dx * 1.6, -38); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke(); } c.restore(); },
  treats(c) { c.beginPath(); c.moveTo(-10, 0); c.lineTo(-12, -18); c.quadraticCurveTo(0, -24, 12, -18); c.lineTo(10, 0); c.closePath(); c.fillStyle = '#F6E3C0'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
    B(c, -6, -22, 12, 5, 2, '#E8604C', 1.1); for (const [x, y, col] of [[-4, -10, '#FF8FB1'], [3, -7, '#7CC6F2'], [0, -14, '#FFD166']]) circ(c, x, y, 2.2, col, 0.8); },
  treat(c, o) { const col = `hsl(${o.hue ?? 340} 75% 68%)`; c.save(); c.translate(0, -4); c.beginPath(); c.ellipse(0, 0, 4.2, 3.2, 0, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4, 0); c.lineTo(s * 8, -3); c.lineTo(s * 8, 3); c.closePath(); c.fillStyle = col; c.fill(); c.stroke(); } circ(c, -1.2, -1, 0.9, 'rgba(255,255,255,.8)', 0); c.restore(); },
  paint(c) { B(c, -10, -16, 20, 16, 2, '#C9D2D8'); B(c, -11, -18, 22, 4, 2, '#FF8FB1'); c.beginPath(); c.moveTo(-6, -15); c.quadraticCurveTo(-5, -5, -3, -9); c.lineTo(-3, -15); c.closePath(); c.fillStyle = '#FF8FB1'; c.fill(); c.beginPath(); c.arc(0, -17, 10, Math.PI * 1.15, Math.PI * 1.85); c.strokeStyle = '#778'; c.lineWidth = 1.2; c.stroke(); },
};

// Things carried on the head, and tools held beside the bao.
export function drawCarry(c, kind, t) {
  if (kind === 'bowl') { c.beginPath(); c.arc(0, -7, 8, 0, Math.PI); c.closePath(); c.fillStyle = '#F6C177'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke(); }
  else if (kind === 'bag') { c.beginPath(); c.ellipse(0, -9, 11, 10, 0, 0, 7); c.fillStyle = '#7b8794'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.moveTo(-3, -18); c.lineTo(0, -24); c.lineTo(3, -18); c.closePath(); c.fill(); c.stroke(); }
  else if (kind === 'log') { B(c, -14, -9, 28, 9, 4, '#C28E5C'); circ(c, 11, -4.5, 2.5, '#E3BE8E', 0.8); }
  else if (kind === 'book') B(c, -8, -6, 16, 6, 1, '#6FA8DC', 1.2);
  else if (kind === 'basket') { c.beginPath(); c.ellipse(0, -12, 10, 6, 0, Math.PI, 0); c.fillStyle = '#F7C6D9'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); B(c, -12, -12, 24, 12, [2, 2, 6, 6], '#fff'); }
  else if (kind === 'plank') B(c, -26, -5, 52, 5, 1, '#E3BE8E', 1.2);
  else if (kind === 'bottle') { B(c, -4, -13, 8, 13, 3, '#fff', 1.2); B(c, -2.5, -17, 5, 5, 2, '#F2A65A', 1); }
  else if (kind === 'suitcase') { B(c, -13, -17, 26, 17, 3, '#B5654A'); line(c, [-13, -9, 13, -9], '#FFD166', 1.5); c.beginPath(); c.arc(0, -17, 5, Math.PI, 0); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(); }
}
export function drawProp(c, kind, t, w) {
  const bob = Math.sin(t * 9);
  c.save(); c.translate(w * 0.58, -w * 0.32);
  switch (kind) {
    case 'broom': c.rotate(0.25 + bob * 0.18); line(c, [0, -26, 0, 10], '#B98A5E', 2.2); B(c, -6, 8, 12, 9, 2, '#FFD166', 1.1); break;
    case 'mop': c.rotate(0.25 + bob * 0.18); line(c, [0, -26, 0, 10], '#B98A5E', 2.2); B(c, -7, 8, 14, 7, 3, '#9AD0EC', 1.1); break;
    case 'spoon': c.rotate(-0.3 + bob * 0.25); line(c, [0, -14, 0, 4], '#B98A5E', 2.2); c.beginPath(); c.ellipse(0, -17, 3.5, 5, 0, 0, 7); c.fillStyle = '#C9A26B'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); break;
    case 'cloth': c.translate(bob * 3, -4); B(c, -5, -5, 10, 9, 2, '#F7C6D9', 1.1); break;
    case 'can': c.rotate(0.35 + bob * 0.05); B(c, -7, -8, 13, 12, 2, '#7CC6F2', 1.2); line(c, [6, -3, 14, -9], '#5aa', 2.2); break;
    case 'book': c.translate(-w * 0.58, 6); B(c, -9, -8, 9, 11, 1, '#6FA8DC', 1.1); B(c, 0, -8, 9, 11, 1, '#fff', 1.1); break;
    case 'hammer': c.rotate(-0.6 + Math.abs(bob) * 1.1); line(c, [0, 6, 0, -14], '#B98A5E', 2.4); B(c, -6, -19, 12, 6, 1.5, '#8a9aa2', 1.1); break;
    case 'bottle': c.rotate(0.9); B(c, -3.5, -12, 7, 12, 3, '#fff', 1.1); B(c, -2.2, -15, 4.4, 4, 2, '#F2A65A', 0.9); break;
    case 'match': c.rotate(-0.2 + bob * 0.1); line(c, [0, 4, 0, -10], '#C9A26B', 1.8); flame(c, 0, -10, 0.25, t, 1); break;
    case 'log': c.translate(-2, 2); B(c, -9, -4, 18, 8, 3.5, '#C28E5C', 1.1); break;
    case 'sticks': c.rotate(0.4 + bob * 0.5); line(c, [0, 4, 4, -14], '#B98A5E', 2); c.rotate(-0.7 - bob); line(c, [-4, 4, -8, -14], '#B98A5E', 2); break;
    case 'brush': c.rotate(-0.5 + bob * 0.3); line(c, [0, 8, 0, -8], '#B98A5E', 2.2); B(c, -3, -15, 6, 8, 1.5, '#FF8FB1', 1); break;
    case 'crayon': c.rotate(1.1 + bob * 0.2); B(c, -2, -10, 4, 13, 1, '#E8604C', 0.9); break;
    case 'pen': c.rotate(0.9 + bob * 0.15); line(c, [0, 6, 0, -8], '#2d3f6b', 2); break;
    case 'needles': c.translate(-w * 0.58, 6); circ(c, 0, 4, 5, '#E58F7B', 1.1); c.rotate(bob * 0.15); line(c, [-8, 4, 5, -9], '#aab', 1.6); line(c, [8, 4, -5, -9], '#aab', 1.6); break;
    case 'cup': c.translate(-2, 2); B(c, -4, -5, 8, 7, 2.5, '#fff', 1.1); break;
    case 'shovel': c.rotate(0.3 + bob * 0.35); line(c, [0, -22, 0, 8], '#B98A5E', 2.2); B(c, -5, 8, 10, 10, [1, 1, 5, 5], '#9aa3a8', 1.1); break;
    case 'hoe': c.rotate(0.35 + bob * 0.3); line(c, [0, -22, 0, 12], '#B98A5E', 2.2); B(c, -1, 10, 9, 4, 1, '#9aa3a8', 1.1); break;
    case 'driver': c.rotate(-0.9 + bob * 0.25); line(c, [0, 0, 0, -12], '#8a9aa2', 1.8); B(c, -2.5, 0, 5, 9, 2, '#E8604C', 1); break;
    case 'racket': c.rotate(0.5 + bob * 0.6); line(c, [0, 8, 0, -4], '#B98A5E', 2.4); c.beginPath(); c.ellipse(0, -12, 6.5, 8.5, 0, 0, 7); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); c.strokeStyle = '#E8604C'; c.lineWidth = 1.8; c.stroke(); break;
    case 'rod': c.rotate(0.75); line(c, [0, 6, 0, -40], '#8a5a3c', 1.8); c.rotate(-0.75); line(c, [27, -30, 27 + Math.sin(t * 1.5) * 1.5, 10], 'rgba(60,60,60,.6)', 0.8); c.beginPath(); c.arc(27, 12 + Math.sin(t * 2) * 1.5, 2.2, 0, 7); c.fillStyle = '#E8604C'; c.fill(); break;
    case 'bowl': c.translate(-w * 0.58, 12); c.beginPath(); c.arc(0, -6, 8, 0, Math.PI); c.closePath(); c.fillStyle = '#F6C177'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = INK; c.stroke(); break;
  }
  c.restore();
}

export function thingIcon(canvas, type) {
  const dpr = Math.min(3, window.devicePixelRatio || 1), s = 52;
  canvas.width = s * dpr; canvas.height = s * dpr; canvas.style.width = canvas.style.height = s + 'px';
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, s, s);
  c.lineJoin = 'round';
  const tall = { lamp: 0.72, mirror: 0.72, tv: 0.8, plant: 0.9, balloon: 0.85, telescope: 1.05, rug: 0.75, box: 0.95, party: 1.05 }[type] || 1.25;
  c.translate(s / 2, type === 'balloon' ? s * 0.62 : s * 0.84); c.scale(tall, tall);
  TH[type](c, { water: 1 }, null, 0, false);
}
export { drawBaoShape };
