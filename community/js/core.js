// Shared constants, helpers and the clock.
export const RW = 190;      // room width (world units)
export const FH = 120;      // floor height
export const COLS = 3;
export const W = RW * COLS; // building width
export const SLAB = 10;
export const BAO = 42;      // adult bao width
export const OUT = 250;     // how far the garden extends either side
export const MAXF = 10;     // tallest the building gets
export const LCOL = [1, 0, 2]; // which column the ladder of each floor sits in
export const INK = '#3a2a22';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n) => String(n).padStart(2, '0');
export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function hourOf(t) {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

// The world runs on the visitor's real clock. `speed` and `skew` exist only for testing.
export const clock = {
  t: Date.now(),
  speed: 1,
  advance(realSeconds) { this.t += realSeconds * 1000 * this.speed; },
  hour() { return hourOf(this.t); },
};
export const isNight = (h = clock.hour()) => h >= 22.5 || h < 6.5;
// 0 in full daylight, 1 in the middle of the night
export function darkness(h = clock.hour()) {
  if (h >= 7 && h <= 18) return 0;
  if (h > 18 && h < 21) return (h - 18) / 3;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 1;
}
let idc = 0;
export const uid = () => (Date.now().toString(36) + (idc++).toString(36) + Math.floor(Math.random() * 1296).toString(36));
