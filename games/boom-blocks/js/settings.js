// Grown-up settings that stick between visits (sound on/off, calm mode, stats overlay), in one
// JSON blob in localStorage. Storage can be blocked; then settings just last until the app closes.
const KEY = 'boom-blocks:settings';
let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    cache = {};
  }
  return cache;
}

export function setting(name, fallback) {
  const v = load()[name];
  return v === undefined ? fallback : v;
}

export function setSetting(name, value) {
  load()[name] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // not fatal
  }
}
