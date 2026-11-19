// "Bao Morning": an original little piece in G major, played live by the browser.
// 6/8 at a gentle lilt. Shape: intro, theme A (G), bridge, theme B (D), a wander through
// E minor, theme A again, theme B brought home to G, and a short coda. About two minutes, then it loops.

const BPM = 80;                 // dotted crotchets per minute
const E8 = 60 / BPM / 3;         // one quaver, in seconds
const BAR = E8 * 6;

// Melodies: "note:quavers", r = rest. Each bar adds up to 6.
const A_THEME = [
  'B4:3 A4:1 B4:1 D5:1', 'E5:3 D5:2 C5:1', 'B4:2 G4:1 D4:2 G4:1', 'A4:6',
  'B4:3 A4:1 B4:1 D5:1', 'E5:2 G5:1 G5:2 E5:1', 'D5:2 C5:1 B4:2 A4:1', 'G4:6',
  'B4:2 E5:1 E5:2 F#5:1', 'G5:3 E5:3', 'C5:2 E5:1 A5:2 G5:1', 'F#5:6',
  'G5:2 D5:1 B4:2 D5:1', 'E5:2 C5:1 A4:2 C5:1', 'B4:2 D5:1 A4:2 F#4:1', 'G4:6',
];
const A_CHORDS = 'G C G D G C D G Em C Am D G C D G'.split(' ');
const BRIDGE = ['E5:2 F#5:1 G5:2 E5:1', 'C#5:3 E5:3', 'A5:2 G5:1 E5:2 C#5:1', 'D5:6'];
const BRIDGE_CHORDS = 'Em A A7 D'.split(' ');
const B_THEME = [
  'F#5:4 E5:1 D5:1', 'E5:3 C#5:3', 'D5:2 B4:1 F#5:3', 'G5:4 F#5:1 E5:1',
  'F#5:3 A5:3', 'G5:2 F#5:1 E5:3', 'E5:2 D5:1 C#5:2 E5:1', 'D5:6',
  'B5:3 A5:2 F#5:1', 'A5:3 C#5:3', 'B4:2 D5:1 G5:2 F#5:1', 'F#5:3 D5:3',
  'E5:2 G5:1 B5:2 G5:1', 'A5:2 E5:1 C#5:2 A4:1', 'D5:2 F#5:1 A5:2 F#5:1', 'D5:6',
];
const B_CHORDS = 'D A Bm G D Em A D Bm F#m G D Em A D D'.split(' ');
const DEV = [
  'B4:3 A4:1 B4:1 E5:1', 'G5:3 E5:2 F#5:1', 'E5:3 D5:1 E5:1 G5:1', 'C5:6',
  'C5:3 E5:1 C5:1 A4:1', 'A5:3 G5:2 E5:1', 'F#5:2 E5:1 D5:2 C5:1', 'A4:6',
  'D5:2 F#5:1 B5:3', 'G5:2 B5:1 E5:3', 'C5:2 E5:1 A5:3', 'F#5:2 A5:1 D5:3',
  'B4:2 D5:1 G5:3', 'E5:2 G5:1 B5:3', 'A5:2 G5:1 E5:2 C5:1', 'D5:3 r:3',
];
const DEV_CHORDS = 'Em Em C C Am Am D D Bm Em Am D G Em C D7'.split(' ');
const CODA = ['E5:3 D5:2 C5:1', 'B4:3 G4:3', 'A4:2 B4:1 C5:2 A4:1', 'B4:6', 'C5:2 E5:1 G5:2 E5:1', 'F#5:2 E5:1 D5:2 A4:1', 'G4:6', 'r:6'];
const CODA_CHORDS = 'C G D G C D G G'.split(' ');
const INTRO_CHORDS = 'G G C D'.split(' ');

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n) => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CH = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10] };
function chord(name, shift = 0) { const m = /^([A-G])(#|b)?(m|7)?$/.exec(name); const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + shift; return { root: ((root % 12) + 12) % 12, tones: CH[m[3] || ''] }; }

// Build the whole loop once as a list of bars: { mel: [[midi|null, quavers]], chord, voice }
function buildScore() {
  const bars = [];
  const add = (mel, chords, voice, shift = 0) => mel.forEach((line, i) => bars.push({
    mel: line.split(' ').map((tok) => { const [n, d] = tok.split(':'); return [n === 'r' ? null : midi(n) + shift, +d]; }), chord: chord(chords[i], shift), voice }));
  INTRO_CHORDS.forEach((c) => bars.push({ mel: [], chord: chord(c), voice: 'pluck' }));
  add(A_THEME, A_CHORDS, 'pluck');
  add(BRIDGE, BRIDGE_CHORDS, 'pluck');
  add(B_THEME, B_CHORDS, 'recorder');
  add(DEV, DEV_CHORDS, 'both');
  add(A_THEME, A_CHORDS, 'pluck');
  add(B_THEME.slice(0, 8), B_CHORDS.slice(0, 8), 'recorder', -7); // the second tune comes home to G
  add(CODA, CODA_CHORDS, 'pluck');
  return bars;
}
export const SCORE = buildScore();
export const LOOP_SECONDS = SCORE.length * BAR;

let ctx = null, out = null, verb = null, playing = false, timer = null, nextBar = 0, nextTime = 0;
let on = false;
try { on = localStorage.getItem('tinybao.music') === 'on'; } catch (e) { /* default off */ }
export const isOn = () => on;

function setup() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  // a little room: two short feedback echoes, very soft
  verb = ctx.createGain(); verb.gain.value = 0.18;
  const d1 = ctx.createDelay(), d2 = ctx.createDelay(), fb = ctx.createGain(); d1.delayTime.value = 0.19; d2.delayTime.value = 0.31; fb.gain.value = 0.32;
  verb.connect(d1); d1.connect(d2); d2.connect(fb); fb.connect(d1); d1.connect(lp); d2.connect(lp);
  out.connect(lp); out.connect(verb); lp.connect(ctx.destination);
}
function env(t, dur, peak, attack, release) {
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur - release), release / 3); g.connect(out); return g;
}
// a nylon-guitar-ish pluck
function pluck(m, t, dur, vol) {
  const f = hz(m), g = env(t, Math.min(dur, 1.6), vol, 0.004, 0.9);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.5); lp.connect(g);
  for (const [type, mul, v] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sawtooth', 1, 0.12]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = v; o.connect(og); og.connect(lp); o.start(t); o.stop(t + Math.min(dur, 1.6) + 0.6); }
}
// a soft recorder: sine with breath and a slow vibrato
function recorder(m, t, dur, vol) {
  const f = hz(m), g = env(t, dur, vol, 0.06, 0.12);
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2; g2.gain.value = 0.12;
  vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.4, dur)); vib.connect(vg); vg.connect(o.frequency);
  o.connect(g); o2.connect(g2); g2.connect(g);
  for (const x of [o, o2, vib]) { x.start(t); x.stop(t + dur + 0.4); }
}
function bass(m, t, dur, vol) { const g = env(t, dur, vol, 0.01, 0.25), o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m); o.connect(g); o.start(t); o.stop(t + dur + 0.3); }
let noiseBuf = null;
function shaker(t, vol) {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = env(t, 0.06, vol, 0.004, 0.05); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6500; s.connect(f); f.connect(g); s.start(t);
}

function playBar(i, t) {
  const bar = SCORE[i % SCORE.length], ch = bar.chord;
  // accompaniment: bass on 1 and 4, rolling quavers above
  const root = 36 + ch.root + (ch.root < 5 ? 12 : 0); // F2 to E3
  bass(root, t, E8 * 3, 0.32); bass(root + 7, t + E8 * 3, E8 * 3, 0.22);
  const third = ch.tones[1], up = [0, 7, 12, third, 7, 12].map((x) => root + 12 + x); // e.g. G3 D4 G4 B3 D4 G4
  up.forEach((m, k) => pluck(m, t + k * E8, E8 * 2.2, k === 0 || k === 3 ? 0.085 : 0.06));
  for (let k = 0; k < 6; k++) shaker(t + k * E8, k === 0 || k === 3 ? 0.035 : 0.018);
  // the tune
  let at = 0;
  for (const [m, d] of bar.mel) {
    const tt = t + at * E8, dur = d * E8; at += d; if (m == null) continue;
    if (bar.voice === 'pluck') pluck(m, tt, dur, 0.17);
    else if (bar.voice === 'recorder') recorder(m, tt, dur * 0.95, 0.12);
    else { recorder(m, tt, dur * 0.95, 0.08); pluck(m - 12, tt, dur, 0.09); }
  }
}
function schedule() {
  while (nextTime < ctx.currentTime + 0.6) { playBar(nextBar, nextTime); nextBar = (nextBar + 1) % SCORE.length; nextTime += BAR; }
}
function start() {
  setup(); if (!ctx || playing) return;
  if (ctx.state === 'suspended') ctx.resume();
  playing = true; nextBar = 0; nextTime = ctx.currentTime + 0.15;
  out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setValueAtTime(out.gain.value, ctx.currentTime); out.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2.5);
  schedule(); timer = setInterval(schedule, 120);
}
function stop() {
  if (!ctx || !playing) return; playing = false; clearInterval(timer);
  const now = ctx.currentTime; out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(out.gain.value, now); out.gain.linearRampToValueAtTime(0.0001, now + 0.8);
  setTimeout(() => { if (!playing && ctx.state === 'running') ctx.suspend(); }, 1000);
}
export function setOn(v) { on = v; try { localStorage.setItem('tinybao.music', v ? 'on' : 'off'); } catch (e) { /* ignore */ } if (v) start(); else stop(); }
// Browsers only allow sound after a tap, so a remembered "on" waits for the first one.
export function resumeIfOn() { if (on && !playing && !document.hidden) start(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else resumeIfOn(); });
export const isPlaying = () => playing;
