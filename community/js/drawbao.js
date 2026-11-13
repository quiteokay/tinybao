// Draws a bao in code, in the style of the original tiny bao picture:
// cream bun, thick dark outline, soft pleats, big glossy eyes, pink cheeks.
import { BAO, INK } from './core.js';

export const FLAVORS = {
  plain:   { fill: '#FCF5E5', shade: '#F1E4C9', pleat: '#E7D4B3' },
  custard: { fill: '#FFF3C9', shade: '#F7E19F', pleat: '#ECCD80' },
  taro:    { fill: '#F1E6F7', shade: '#DFCFEA', pleat: '#CBB6DC' },
  matcha:  { fill: '#ECF5DA', shade: '#D8E7BB', pleat: '#BFD39B' },
  rosy:    { fill: '#FFECE7', shade: '#F8D6CF', pleat: '#EEBDB4' },
  wheat:   { fill: '#F3E2C6', shade: '#E4CCA5', pleat: '#D2B588' },
  sesame:  { fill: '#FCF5E5', shade: '#F1E4C9', pleat: '#E7D4B3', seeds: true },
};

const EXPR = {
  normal:  ['open', 'smile'],
  sleep:   ['closed', 'tiny'],
  joy:     ['happy', 'open'],
  wow:     ['wide', 'o'],
  effort:  ['squint', 'flat'],
  content: ['happy', 'smile'],
  grump:   ['brow', 'flat'],
  dizzy:   ['x', 'wavy'],
  cry:     ['squint', 'cry'],
  gaze:    ['up', 'smile'],
  chew:    ['happy', 'chew'],
};

export function bunPath(c, w, h) {
  const hw = w / 2;
  c.beginPath();
  c.moveTo(0, -h);
  c.bezierCurveTo(hw * 0.08, -h * 0.99, hw * 0.1, -h * 0.92, hw * 0.2, -h * 0.89);
  c.bezierCurveTo(hw * 0.62, -h * 0.82, hw * 1.0, -h * 0.62, hw * 1.0, -h * 0.34);
  c.bezierCurveTo(hw * 1.0, -h * 0.1, hw * 0.8, 0, hw * 0.5, 0);
  c.lineTo(-hw * 0.5, 0);
  c.bezierCurveTo(-hw * 0.8, 0, -hw * 1.0, -h * 0.1, -hw * 1.0, -h * 0.34);
  c.bezierCurveTo(-hw * 1.0, -h * 0.62, -hw * 0.62, -h * 0.82, -hw * 0.2, -h * 0.89);
  c.bezierCurveTo(-hw * 0.1, -h * 0.92, -hw * 0.08, -h * 0.99, 0, -h);
  c.closePath();
}

function eye(c, x, y, r, kind, t, blink) {
  c.lineCap = 'round';
  if (blink && (kind === 'open' || kind === 'up' || kind === 'brow')) kind = 'closedline';
  if (kind === 'open' || kind === 'wide' || kind === 'up' || kind === 'brow') {
    const rr = kind === 'wide' ? r * 1.2 : r;
    c.fillStyle = '#1d1512';
    c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill();
    c.fillStyle = '#fff';
    const oy = kind === 'up' ? -rr * 0.5 : -rr * 0.32;
    c.beginPath(); c.arc(x + rr * 0.34, y + oy, rr * 0.36, 0, 7); c.fill();
    if (kind === 'brow') {
      c.strokeStyle = INK; c.lineWidth = r * 0.45;
      c.beginPath(); c.moveTo(x - r * 1.2 * Math.sign(x), y - r * 1.9); c.lineTo(x + r * 1.0 * Math.sign(x), y - r * 1.35); c.stroke();
    }
    return;
  }
  c.strokeStyle = '#1d1512'; c.lineWidth = r * 0.5;
  c.beginPath();
  if (kind === 'closed') c.arc(x, y - r * 0.5, r, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (kind === 'closedline') { c.moveTo(x - r, y); c.lineTo(x + r, y); }
  else if (kind === 'happy') c.arc(x, y + r * 0.5, r, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (kind === 'squint') {
    const s = Math.sign(x) || 1;
    c.moveTo(x - r * s, y - r * 0.7); c.lineTo(x + r * 0.5 * s, y); c.lineTo(x - r * s, y + r * 0.7);
  } else if (kind === 'x') {
    c.moveTo(x - r * 0.8, y - r * 0.8); c.lineTo(x + r * 0.8, y + r * 0.8);
    c.moveTo(x + r * 0.8, y - r * 0.8); c.lineTo(x - r * 0.8, y + r * 0.8);
  }
  c.stroke();
}

function mouth(c, y, w, kind, t) {
  c.strokeStyle = '#1d1512'; c.lineWidth = w * 0.03; c.lineCap = 'round';
  const m = w * 0.055;
  c.beginPath();
  if (kind === 'smile') c.arc(0, y - m * 0.5, m, 0.12 * Math.PI, 0.88 * Math.PI);
  else if (kind === 'tiny') c.arc(0, y, m * 0.3, 0, 7);
  else if (kind === 'flat') { c.moveTo(-m * 0.8, y); c.lineTo(m * 0.8, y); }
  else if (kind === 'wavy') { c.moveTo(-m, y); c.quadraticCurveTo(-m * 0.5, y - m * 0.7, 0, y); c.quadraticCurveTo(m * 0.5, y + m * 0.7, m, y); }
  else if (kind === 'o') { c.ellipse(0, y + m * 0.2, m * 0.5, m * 0.65, 0, 0, 7); c.fillStyle = '#7a3b3b'; c.fill(); }
  else if (kind === 'open') { c.moveTo(-m, y - m * 0.4); c.quadraticCurveTo(0, y + m * 1.6, m, y - m * 0.4); c.closePath(); c.fillStyle = '#c9545a'; c.fill(); }
  else if (kind === 'cry') { c.ellipse(0, y + m * 0.4, m * 0.9, m * 0.9, 0, 0, 7); c.fillStyle = '#c9545a'; c.fill(); }
  else if (kind === 'chew') { const k = Math.sin(t * 14) * 0.5 + 0.5; c.ellipse(0, y, m * (0.5 + 0.3 * k), m * (0.25 + 0.3 * (1 - k)), 0, 0, 7); }
  c.stroke();
}

function accessory(c, acc, w, h, b) {
  c.lineWidth = w * 0.035; c.strokeStyle = INK; c.lineJoin = 'round';
  if (acc === 'bow') {
    c.save(); c.translate(-w * 0.2, -h * 0.84); c.rotate(-0.35);
    c.fillStyle = '#FF8FB1';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * w * 0.15, -w * 0.09); c.lineTo(s * w * 0.15, w * 0.09); c.closePath(); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, 0, w * 0.04, 0, 7); c.fill(); c.stroke(); c.restore();
  } else if (acc === 'sprout') {
    c.strokeStyle = '#4c8a3f'; c.lineWidth = w * 0.035;
    c.beginPath(); c.moveTo(0, -h); c.lineTo(0, -h - w * 0.12); c.stroke();
    c.strokeStyle = INK; c.lineWidth = w * 0.03; c.fillStyle = '#7CC96B';
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * w * 0.08, -h - w * 0.15, w * 0.09, w * 0.045, s * -0.5, 0, 7); c.fill(); c.stroke(); }
  } else if (acc === 'glasses' || acc === 'granny') {
    c.lineWidth = w * 0.03; c.strokeStyle = acc === 'granny' ? '#8a6a3a' : '#2d3f6b';
    const ey = -h * 0.4, ex = w * 0.2, r = w * 0.115;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * ex, ey, r, 0, 7); c.stroke(); }
    c.beginPath(); c.moveTo(-ex + r, ey); c.lineTo(ex - r, ey); c.stroke();
    if (acc === 'granny') {
      c.fillStyle = '#D9D4DE'; c.strokeStyle = INK; c.lineWidth = w * 0.035;
      c.beginPath(); c.arc(0, -h - w * 0.02, w * 0.11, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#b06a8a'; c.lineWidth = w * 0.02;
      c.beginPath(); c.moveTo(-w * 0.12, -h - w * 0.1); c.lineTo(w * 0.12, -h + w * 0.05); c.stroke();
    }
  } else if (acc === 'scarf') {
    c.fillStyle = '#E8604C';
    c.beginPath(); c.moveTo(-w * 0.47, -h * 0.2); c.quadraticCurveTo(0, -h * 0.06, w * 0.47, -h * 0.2);
    c.lineTo(w * 0.48, -h * 0.09); c.quadraticCurveTo(0, h * 0.06, -w * 0.48, -h * 0.09); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(w * 0.2, -h * 0.1, w * 0.11, h * 0.2, 2); c.fill(); c.stroke();
  } else if (acc === 'cap') {
    c.fillStyle = '#6FA8DC';
    c.beginPath(); c.moveTo(-w * 0.24, -h * 0.84); c.quadraticCurveTo(0, -h * 1.3, w * 0.3, -h * 1.02);
    c.quadraticCurveTo(w * 0.1, -h * 0.98, w * 0.24, -h * 0.84); c.quadraticCurveTo(0, -h * 0.95, -w * 0.24, -h * 0.84); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w * 0.31, -h * 1.02, w * 0.05, 0, 7); c.fill(); c.stroke();
  } else if (acc === 'flower') {
    c.save(); c.translate(w * 0.22, -h * 0.82);
    c.fillStyle = '#FFD166';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(Math.cos(i * 1.257) * w * 0.06, Math.sin(i * 1.257) * w * 0.06, w * 0.045, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = '#F4845F'; c.beginPath(); c.arc(0, 0, w * 0.04, 0, 7); c.fill(); c.restore();
  } else if (acc === 'band') {
    c.strokeStyle = '#4FB0A5'; c.lineWidth = w * 0.06;
    c.beginPath(); c.moveTo(-w * 0.36, -h * 0.68); c.quadraticCurveTo(0, -h * 0.8, w * 0.36, -h * 0.68); c.stroke();
  } else if (acc === 'beanie') {
    c.fillStyle = '#F2A65A';
    c.beginPath(); c.moveTo(-w * 0.3, -h * 0.8); c.quadraticCurveTo(0, -h * 1.25, w * 0.3, -h * 0.8); c.quadraticCurveTo(0, -h * 0.9, -w * 0.3, -h * 0.8); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -h * 1.04, w * 0.055, 0, 7); c.fill(); c.stroke();
  } else if (acc === 'bowtie') {
    c.save(); c.translate(0, -h * 0.12); c.fillStyle = '#5B7DB1';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * w * 0.12, -w * 0.07); c.lineTo(s * w * 0.12, w * 0.07); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
  } else if (acc === 'curl') {
    c.strokeStyle = INK; c.lineWidth = w * 0.045; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -h); c.bezierCurveTo(w * 0.02, -h - w * 0.2, w * 0.2, -h - w * 0.16, w * 0.11, -h - w * 0.06); c.stroke();
  }
}

// Draws one bao with its feet at the origin. `o` describes how it looks right now.
export function drawBaoShape(c, o, t = 0) {
  const w = BAO * (o.size || 1), h = w * 0.84;
  const fl = FLAVORS[o.flavor] || FLAVORS.plain;
  const sq = o.squash || 0;
  c.save();
  if (o.rot) { c.translate(0, -h * 0.4); c.rotate(o.rot); c.translate(0, h * 0.4); }
  c.scale(1 + sq, 1 - sq);
  c.lineJoin = 'round';
  // body
  bunPath(c, w, h);
  c.fillStyle = fl.fill; c.fill();
  c.save(); c.clip();
  c.fillStyle = fl.shade;
  c.beginPath(); c.ellipse(0, h * 0.2, w * 0.62, h * 0.3, 0, 0, 7); c.fill();
  // pleats
  c.strokeStyle = fl.pleat; c.lineCap = 'round';
  const pl = [[-0.27, -0.66, -0.12], [-0.09, -0.62, -0.05], [0.09, -0.62, 0.05], [0.27, -0.66, 0.12]];
  for (const [ex, ey, cx] of pl) {
    c.lineWidth = w * 0.035;
    c.beginPath(); c.moveTo(ex * 0.2 * w, -h * 0.88); c.quadraticCurveTo(cx * w, -h * 0.8, ex * w, ey * h); c.stroke();
  }
  if (fl.seeds) {
    c.fillStyle = '#2b2320';
    for (const [sx, sy, r] of [[-0.12, -0.8, 0.3], [0.06, -0.84, -0.4], [0.17, -0.74, 0.5], [-0.02, -0.72, 0.1], [-0.22, -0.7, -0.3]]) {
      c.beginPath(); c.ellipse(sx * w, sy * h, w * 0.022, w * 0.012, r, 0, 7); c.fill();
    }
  }
  c.restore();
  bunPath(c, w, h);
  c.strokeStyle = INK; c.lineWidth = w * 0.044; c.stroke();
  // face
  const [ek, mk] = EXPR[o.expr] || EXPR.normal;
  const look = (o.facing || 0) * w * 0.035;
  c.save(); c.translate(look, 0);
  c.fillStyle = 'rgba(255,150,170,0.75)';
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * w * 0.3, -h * 0.28, w * 0.065, w * 0.048, 0, 0, 7); c.fill(); }
  const er = w * 0.068;
  eye(c, -w * 0.2, -h * 0.4, er, ek, t, o.blink);
  eye(c, w * 0.2, -h * 0.4, er, ek, t, o.blink);
  mouth(c, -h * 0.3, w, mk, t);
  if (o.pacifier) {
    c.fillStyle = '#8FD3F4'; c.strokeStyle = INK; c.lineWidth = w * 0.035;
    c.beginPath(); c.arc(0, -h * 0.27, w * 0.075, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -h * 0.27, w * 0.03, 0, 7); c.fill();
  }
  c.restore();
  if (o.acc) accessory(c, o.acc, w, h, o);
  c.restore();
  return { w, h };
}

// Small thought-bubble pictures, drawn in code so they look the same everywhere.
export function icon(c, name, x, y, s) {
  c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = s * 0.12;
  const F = (col) => { c.fillStyle = col; c.fill(); };
  switch (name) {
    case 'heart':
      c.beginPath(); c.moveTo(0, s * 0.35); c.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.4, -s * 0.8, 0, -s * 0.3);
      c.bezierCurveTo(s * 0.4, -s * 0.8, s * 0.9, -s * 0.2, 0, s * 0.35); F('#FF6F91'); break;
    case 'zzz':
      c.strokeStyle = '#5a6bb0'; c.lineWidth = s * 0.14;
      c.beginPath(); c.moveTo(-s * 0.35, -s * 0.3); c.lineTo(s * 0.3, -s * 0.3); c.lineTo(-s * 0.35, s * 0.35); c.lineTo(s * 0.3, s * 0.35); c.stroke(); break;
    case 'note':
      c.fillStyle = '#6a4fb3'; c.strokeStyle = '#6a4fb3';
      c.beginPath(); c.ellipse(-s * 0.15, s * 0.3, s * 0.24, s * 0.18, -0.3, 0, 7); c.fill();
      c.lineWidth = s * 0.12; c.beginPath(); c.moveTo(s * 0.07, s * 0.28); c.lineTo(s * 0.07, -s * 0.45); c.lineTo(s * 0.4, -s * 0.3); c.stroke(); break;
    case 'q': case 'ex': case 'dots': {
      c.fillStyle = name === 'ex' ? '#E8604C' : '#5b4a42';
      c.font = `900 ${s * 1.3}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(name === 'q' ? '?' : name === 'ex' ? '!' : '…', 0, name === 'dots' ? -s * 0.2 : s * 0.05); break;
    }
    case 'food':
      c.beginPath(); c.arc(0, -s * 0.05, s * 0.45, 0, Math.PI); c.closePath(); F('#F6C177'); c.stroke();
      c.strokeStyle = '#b9b0aa'; c.lineWidth = s * 0.09;
      for (const dx of [-0.2, 0.15]) { c.beginPath(); c.moveTo(dx * s, -s * 0.2); c.quadraticCurveTo(dx * s + s * 0.15, -s * 0.4, dx * s, -s * 0.6); c.stroke(); } break;
    case 'star':
      c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.22 : s * 0.5, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); F('#FFD166'); c.stroke(); break;
    case 'drop':
      c.beginPath(); c.moveTo(0, -s * 0.5); c.quadraticCurveTo(s * 0.5, s * 0.1, 0, s * 0.45); c.quadraticCurveTo(-s * 0.5, s * 0.1, 0, -s * 0.5); F('#7CC6F2'); c.stroke(); break;
    case 'flame':
      c.beginPath(); c.moveTo(0, -s * 0.55); c.quadraticCurveTo(s * 0.55, 0, 0, s * 0.45); c.quadraticCurveTo(-s * 0.55, 0, 0, -s * 0.55); F('#FF9F45'); c.stroke(); break;
    case 'grump':
      c.strokeStyle = '#5b4a42'; c.lineWidth = s * 0.13; c.beginPath();
      for (let i = 0; i < 9; i++) { const a = i * 1.1, r = s * (0.1 + i * 0.045); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); break;
    case 'sun':
      c.beginPath(); c.arc(0, 0, s * 0.28, 0, 7); F('#FFD166'); c.stroke();
      c.strokeStyle = '#F2A541'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4); c.lineTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55); c.stroke(); } break;
    case 'bao':
      c.scale(s / BAO * 1.1, s / BAO * 1.1); c.translate(0, BAO * 0.42); drawBaoShape(c, {}, 0); break;
  }
  c.restore();
}

export function bubble(c, x, y, ic, a = 1) {
  c.save(); c.globalAlpha = a; c.translate(x, y);
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.4;
  c.beginPath(); c.arc(-5, 9, 2.2, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.arc(-8.5, 14, 1.3, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-12, -14, 24, 21, 9); c.fill(); c.stroke();
  icon(c, ic, 0, -3.5, 12);
  c.restore();
}
