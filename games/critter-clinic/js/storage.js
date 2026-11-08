// Saving, entirely on the device: one small JSON record in localStorage, versioned and checked on
// the way in so a damaged save can't break the game. It holds the sticker book, how often each
// patient has been seen (for picking who waits next), and a check-up left unfinished (with what
// that patient is sick with).
// The storage is passed in, so the tests run this in node.
import { ORDER } from './patients.js';
import { STEPS } from './checklist.js';
import { AILMENT_IDS } from './sickness.js';

export const KEY = 'critter-clinic:v1';
export const VERSION = 1;
export const BOOK_MAX = 300;
const SHOT_STAGES = ['wipe', 'needle', 'bandage', 'done'];

export function defaultSave() {
  return { v: VERSION, book: [], seen: {}, visit: null };
}

function cleanVisit(v) {
  if (!v || typeof v !== 'object' || !ORDER.includes(v.p)) return null;
  const done = Array.isArray(v.done) ? [...new Set(v.done.filter((s) => STEPS.includes(s)))] : [];
  let shot = v.shot && typeof v.shot === 'object' ? { stage: v.shot.stage, bandage: typeof v.shot.bandage === 'string' ? v.shot.bandage : null } : null;
  // half-way through pushing comes back as "needle in the hand again"
  if (shot && shot.stage === 'push') shot.stage = 'needle';
  if (shot && !SHOT_STAGES.includes(shot.stage)) shot = null;
  if (done.includes('shot')) shot = { stage: 'done', bandage: shot?.bandage || 'stars' };
  const out = { p: v.p, done, shot };
  if (AILMENT_IDS.includes(v.ail)) out.ail = v.ail; // what they're sick with
  return out;
}

// Brings any older, partial or damaged save up to date, keeping everything it can.
export function migrate(data) {
  const out = defaultSave();
  if (!data || typeof data !== 'object') return out;
  if (Array.isArray(data.book)) {
    out.book = data.book
      .filter((b) => b && typeof b.e === 'string' && b.e.length <= 16 && typeof b.p === 'string')
      .map((b) => ({ e: b.e, p: b.p, t: Number.isFinite(b.t) ? b.t : 0 }))
      .slice(0, BOOK_MAX);
  }
  if (data.seen && typeof data.seen === 'object') {
    for (const id of ORDER) if (Number.isFinite(data.seen[id]) && data.seen[id] > 0) out.seen[id] = Math.floor(data.seen[id]);
  }
  out.visit = cleanVisit(data.visit);
  return out;
}

export function load(storage) {
  try {
    const raw = storage ? storage.getItem(KEY) : null;
    return migrate(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultSave();
  }
}

export function store(storage, data) {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// The check-up in progress (or null when there isn't one).
export function withVisit(data, visit) {
  return { ...data, visit: visit ? cleanVisit(visit) : null };
}

// A check-up finished: the sticker goes in the book (newest first), the patient counts as seen.
export function finishVisit(data, p, e, t = Date.now()) {
  return {
    ...data,
    book: [{ e, p, t }, ...data.book].slice(0, BOOK_MAX),
    seen: { ...data.seen, [p]: (data.seen[p] || 0) + 1 },
    visit: null,
  };
}

export function browserStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
