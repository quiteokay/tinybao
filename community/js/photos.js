// Things too big for the everyday save live in IndexedDB: full-size photos, and diary days older
// than the last couple of months (the diary keeps every day; nothing in it is ever thrown away).
let dbp = null, NAME = 'tinybao-photos';
export function usePhotoStore(suffix) { NAME = 'tinybao-photos' + suffix; dbp = null; }
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(NAME, 2);
      r.onupgradeneeded = () => { const d = r.result; for (const s of ['full', 'diary']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); };
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await db(); if (!d) return null;
  return new Promise((res) => {
    try { const t = d.transaction(store, mode), st = t.objectStore(store), r = fn(st); t.oncomplete = () => res(r && 'result' in r ? r.result : true); t.onerror = () => res(null); t.onabort = () => res(null); }
    catch (e) { res(null); }
  });
}
export const putFull = (id, data) => tx('full', 'readwrite', (st) => st.put(data, id));
export const getFull = (id) => tx('full', 'readonly', (st) => st.get(id));
export const delFull = (id) => tx('full', 'readwrite', (st) => st.delete(id));

// ---- the diary archive: one record per day, keyed "YYYY-MM-DD" ----
// Adds entries to their days (merging with what is there); resolves true only once it is safely written.
export async function putDays(entries) {
  const byDay = {}; for (const e of entries) (byDay[e.d] = byDay[e.d] || []).push(e);
  const d = await db(); if (!d) return false;
  return new Promise((res) => {
    try {
      const t = d.transaction('diary', 'readwrite'), st = t.objectStore('diary');
      for (const [day, list] of Object.entries(byDay)) {
        const g = st.get(day);
        g.onsuccess = () => { const have = g.result || [], seen = new Set(have.map((e) => e.t + '|' + e.text)); st.put(have.concat(list.filter((e) => !seen.has(e.t + '|' + e.text))).sort((a, b) => a.t - b.t), day); };
      }
      t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false);
    } catch (e) { res(false); }
  });
}
export async function daysFrom(fromDay) { const r = await tx('diary', 'readonly', (st) => st.getAll(IDBKeyRange.lowerBound(fromDay))); return r ? r.flat() : []; }
export async function oldestDay() { const r = await tx('diary', 'readonly', (st) => st.getAllKeys()); return r && r.length ? r[0] : null; }
export async function allDays() { const r = await tx('diary', 'readonly', (st) => st.getAll()); return r ? r.flat() : []; }
export const clearDays = () => tx('diary', 'readwrite', (st) => st.clear());
// one archived day, and the list of every archived day, without loading the whole archive
export async function dayEntries(key) { const r = await tx('diary', 'readonly', (st) => st.get(key)); return Array.isArray(r) ? r : []; }
export async function dayKeys() { const r = await tx('diary', 'readonly', (st) => st.getAllKeys()); return r || []; }
