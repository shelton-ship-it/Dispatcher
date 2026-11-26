// Armazenamento local de imagens (BI, NUIT, fotografia…) em IndexedDB — nada sai do telemóvel.
const DB = 'dd-files'; const STORE = 'kv';
let _db: Promise<IDBDatabase> | null = null;
function open() {
  if (!_db) _db = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return _db;
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => { const r = fn(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
}
export const idbGet = <T = Blob>(k: string) => tx<T | undefined>('readonly', s => s.get(k) as IDBRequest<T | undefined>).catch(() => undefined);
export const idbSet = (k: string, v: Blob | string) => tx('readwrite', s => s.put(v, k)).catch(() => undefined);
export const idbDel = (k: string) => tx('readwrite', s => s.delete(k)).catch(() => undefined);
export async function idbDelPrefix(prefix: string) {
  try {
    const keys = (await tx<IDBValidKey[]>('readonly', s => s.getAllKeys())) as string[];
    await Promise.all(keys.filter(k => String(k).startsWith(prefix)).map(k => idbDel(String(k))));
  } catch { /* ignore */ }
}
export async function idbClear() { try { await tx('readwrite', s => s.clear()); } catch { /* ignore */ } }
