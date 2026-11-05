// Saving. The case he's working on is kept in localStorage, so closing the app never loses it.
// Finished cases go on the shelf, in IndexedDB (a growing shelf would soon fill localStorage).
// Storage can be missing or blocked, so every access is guarded; without IndexedDB the shelf
// still works, it just lasts until the app closes.
import { encode, decode } from './design.js';

const CURRENT = 'gadget-glam:current';
const DB = 'gadget-glam';
const STORE = 'cases';

export function loadCurrent() {
  try {
    const raw = JSON.parse(localStorage.getItem(CURRENT) || 'null');
    const design = raw && decode(raw.design);
    if (design) return { id: raw.id ?? null, design, finished: !!raw.finished };
  } catch {
    // fall through
  }
  return null;
}

export function saveCurrent({ id, design, finished = false }) {
  try {
    localStorage.setItem(CURRENT, JSON.stringify({ id, finished, design: encode(design) }));
  } catch {
    // not fatal: it just won't be remembered
  }
}

export function clearCurrent() {
  try {
    localStorage.removeItem(CURRENT);
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------------------------- the shelf

const memory = new Map();
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbp;
}

function run(mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(undefined);
        try {
          const tx = d.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(req?.result);
          tx.onerror = () => resolve(undefined);
          tx.onabort = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export const newId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

// Newest first. Each entry: { id, t, design, thumb (a PNG data URL) }.
export async function listCases() {
  const rows = (await run('readonly', (s) => s.getAll())) ?? [...memory.values()];
  return rows
    .map((r) => ({ ...r, design: decode(r.design) }))
    .filter((r) => r.design)
    .sort((a, b) => b.t - a.t);
}

export async function putCase({ id, design, thumb }) {
  const row = { id, t: Date.now(), design: encode(design), thumb };
  memory.set(id, row);
  await run('readwrite', (s) => s.put(row));
}

export async function deleteCase(id) {
  memory.delete(id);
  await run('readwrite', (s) => s.delete(id));
}
