// Saving, entirely on the device. One JSON blob in localStorage, versioned and migrated, with a
// backup written at every level finish. Two players ("profiles"): his and yours, each with its
// own mode, controls, stars, stickers, best results and a mid-level checkpoint to resume from.
// The storage is passed in, so the tests run it in node.
import { ORDER } from '../content/levels/index.js';

export const KEY = 'turbo-quest:v1';
export const VERSION = 1;

export function profileDefaults(id) {
  return {
    id,
    mode: id === 'dad' ? 'dad' : 'kid',
    autoGo: false,
    autoFire: false,
    aimAssist: true,
    leftHanded: false,
    bigButtons: false,
    stars: 0, // all-time stars collected (never spent)
    stickers: {}, // Grumbly kind → times cheered
    unlocked: [ORDER[0]],
    levels: {}, // id → { done, gems: [bool×3], best: { kid: {...}, dad: {...} } }
    resume: null, // a checkpoint to come back to
  };
}

export function defaultSave() {
  return {
    v: VERSION,
    lastProfile: null,
    settings: { music: 0.6, sfx: 1, voice: 1, reducedMotion: null, reduceFlash: false, debug: false },
    profiles: { kid: profileDefaults('kid'), dad: profileDefaults('dad') },
  };
}

// Brings any older or partial save up to date, keeping everything it can.
export function migrate(data) {
  const base = defaultSave();
  if (!data || typeof data !== 'object') return base;
  const out = { ...base, ...data, v: VERSION };
  out.settings = { ...base.settings, ...(data.settings || {}) };
  out.profiles = {};
  for (const id of ['kid', 'dad']) {
    const p = (data.profiles && data.profiles[id]) || {};
    out.profiles[id] = { ...profileDefaults(id), ...p, stickers: { ...(p.stickers || {}) }, levels: { ...(p.levels || {}) } };
    if (!Array.isArray(out.profiles[id].unlocked) || !out.profiles[id].unlocked.length) out.profiles[id].unlocked = [ORDER[0]];
  }
  if (out.lastProfile !== 'kid' && out.lastProfile !== 'dad') out.lastProfile = null;
  return out;
}

function safeStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export class Store {
  constructor(storage = safeStorage()) {
    this.storage = storage;
    this.timer = null;
    this.data = this.load();
  }

  load() {
    const s = this.storage;
    if (!s) return defaultSave();
    let raw = null;
    try {
      raw = s.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch {
      // Unreadable: keep a copy for a grown-up to look at, then try the backup.
      try {
        if (raw) s.setItem(`${KEY}:corrupt`, raw);
        const b = s.getItem(`${KEY}:backup`);
        if (b) return migrate(JSON.parse(b));
      } catch {
        /* fall through to a fresh save */
      }
    }
    return defaultSave();
  }

  // Saves a moment later (several changes in a row are one write).
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: the game still works */
    }
  }

  profile(id = this.data.lastProfile || 'kid') {
    return this.data.profiles[id];
  }

  choose(id) {
    this.data.lastProfile = id;
    this.save();
  }

  setResume(id, r) {
    this.profile(id).resume = r;
    this.save();
  }

  // A level finished: best results per mode, gems kept from any run, stars added to the
  // all-time count, stickers for each kind cheered, the next level unlocked.
  recordResult(id, res) {
    const p = this.profile(id);
    const prev = p.levels[res.level] || { done: false, gems: [false, false, false], best: {} };
    const gems = prev.gems.map((g, i) => g || !!res.gems[i]);
    const best = { ...prev.best };
    const old = best[res.mode];
    const newBest = !old || (res.mode === 'dad' ? res.score > old.score : res.stars > old.stars);
    if (newBest) best[res.mode] = { stars: res.stars, time: res.time, score: res.score, medal: res.medal, noHit: res.noHit };
    else best[res.mode] = { ...old, time: Math.min(old.time, res.time), medal: Math.max(old.medal || 0, res.medal || 0), noHit: old.noHit || res.noHit };
    p.levels[res.level] = { done: true, gems, best };
    p.stars += res.stars;
    const firstStickers = [];
    for (const k of res.kinds) {
      if (!p.stickers[k]) firstStickers.push(k);
      p.stickers[k] = (p.stickers[k] || 0) + 1;
    }
    const i = ORDER.indexOf(res.level);
    if (i >= 0 && i + 1 < ORDER.length && !p.unlocked.includes(ORDER[i + 1])) p.unlocked.push(ORDER[i + 1]);
    p.resume = null;
    this.flush();
    try {
      this.storage?.setItem(`${KEY}:backup`, JSON.stringify(this.data));
    } catch {
      /* not fatal */
    }
    return { newBest, firstStickers, gems };
  }

  resetProfile(id) {
    this.data.profiles[id] = profileDefaults(id);
    this.flush();
  }
}
