// Small sound effects made in the browser, so there are no audio files to download.
let ctx = null, master = null, muted = false, quiet = false;
const lastPlayed = {};
try { muted = localStorage.getItem('tinybao.sound') === 'off'; } catch (e) { /* no storage: sound stays on */ }

export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem('tinybao.sound', m ? 'off' : 'on'); } catch (e) { /* ignore */ } }
// Used while catching up on time away, when lots happens at once.
export function setQuiet(q) { quiet = q; }

// Browsers only allow sound after the visitor has touched the page.
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(f0, f1, dur, { type = 'sine', vol = 0.3, at = 0, attack = 0.008 } = {}) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, { vol = 0.2, at = 0, freq = 1200, q = 0.8, type = 'bandpass', sweep = 0 } = {}) {
  const t = ctx.currentTime + at, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur); f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

const SOUNDS = {
  // something new lands in the house: a soft bounce and a little sparkle
  land() { tone(260, 90, 0.18, { vol: 0.5 }); noise(0.09, { vol: 0.14, freq: 500 }); tone(190, 120, 0.1, { vol: 0.22, at: 0.17 }); tone(1320, 1320, 0.14, { type: 'triangle', vol: 0.1, at: 0.06 }); tone(1760, 1760, 0.2, { type: 'triangle', vol: 0.08, at: 0.14 }); },
  thud() { tone(200, 80, 0.14, { vol: 0.4 }); noise(0.07, { vol: 0.1, freq: 400 }); },
  whoosh() { noise(0.28, { vol: 0.12, freq: 2400, sweep: 500, q: 1.2 }); tone(900, 300, 0.26, { vol: 0.06 }); },
  pet() { tone(660, 720, 0.09, { type: 'triangle', vol: 0.2 }); tone(880, 990, 0.14, { type: 'triangle', vol: 0.2, at: 0.08 }); },
  pick() { tone(380, 760, 0.12, { type: 'triangle', vol: 0.18 }); },
  blip() { tone(1050, 1250, 0.07, { type: 'triangle', vol: 0.12 }); },
  pop() { noise(0.09, { vol: 0.5, freq: 1800, q: 0.5 }); tone(500, 150, 0.08, { vol: 0.25 }); },
  drum() { for (const [at, f] of [[0, 150], [0.22, 150], [0.44, 190], [0.58, 150]]) { tone(f, 70, 0.16, { vol: 0.45, at }); noise(0.05, { vol: 0.1, freq: 900, at }); } },
  steam() { noise(1.1, { vol: 0.3, freq: 5000, sweep: 1200, q: 0.4, type: 'highpass' }); tone(520, 110, 0.7, { vol: 0.12 }); },
  charge() { tone(180, 520, 1.6, { type: 'sawtooth', vol: 0.05, attack: 0.3 }); },
  arrive() { [523, 659, 784].forEach((f, i) => tone(f, f, 0.2, { type: 'triangle', vol: 0.2, at: i * 0.13 })); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, i === 5 ? 0.5 : 0.16, { type: 'triangle', vol: 0.22, at: i * 0.14 })); },
  tick() { tone(700, 700, 0.04, { type: 'triangle', vol: 0.1 }); },
  page() { noise(0.16, { vol: 0.08, freq: 3000, sweep: 1500, q: 1 }); },
};

export function play(name) {
  if (muted || quiet || !ctx || ctx.state !== 'running' || !SOUNDS[name] || document.hidden) return;
  const now = ctx.currentTime; if (now - (lastPlayed[name] ?? -1) < 0.09) return; lastPlayed[name] = now;
  try { SOUNDS[name](); } catch (e) { /* sound is a nicety; never let it break the page */ }
}
