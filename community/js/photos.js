// Full-size photos live in IndexedDB, which has room for them; the save keeps only small previews.
let dbp = null, NAME = 'tinybao-photos';
export function usePhotoStore(suffix) { NAME = 'tinybao-photos' + suffix; dbp = null; }
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('full');
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db(); if (!d) return null;
  return new Promise((res) => {
    try { const t = d.transaction('full', mode), st = t.objectStore('full'), r = fn(st); t.oncomplete = () => res(r && 'result' in r ? r.result : true); t.onerror = () => res(null); t.onabort = () => res(null); }
    catch (e) { res(null); }
  });
}
export const putFull = (id, data) => tx('readwrite', (st) => st.put(data, id));
export const getFull = (id) => tx('readonly', (st) => st.get(id));
export const delFull = (id) => tx('readwrite', (st) => st.delete(id));
