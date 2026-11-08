// How many pixels the game view may cost. It starts at the top tier and steps down by itself when
// frames are slow for a couple of seconds (remembering that for next time), like Coaster Doodle.
// The buttons and score are on their own canvas at full sharpness, so a lower tier only softens
// the game view a little. ?q=high|medium|low picks a tier for testing and turns stepping off.
const KEY = 'turbo-quest:quality';
export const ORDER = ['high', 'medium', 'low'];

export const TIERS = {
  high: { name: 'high', scale: 2, particles: 1, layers: 4 },
  medium: { name: 'medium', scale: 1.5, particles: 1, layers: 4 },
  low: { name: 'low', scale: 1.25, particles: 0.5, layers: 3 },
};

const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('q') : null;

function load() {
  if (TIERS[forced]) return forced;
  try {
    const saved = localStorage.getItem(KEY);
    if (TIERS[saved]) return saved;
  } catch {
    /* storage blocked: start at the top */
  }
  return 'high';
}

let current = load();
export const quality = () => TIERS[current];
export const qualityForced = () => !!TIERS[forced];

export function setQuality(name) {
  if (!TIERS[name]) return;
  current = name;
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* not fatal */
  }
}

// One step down. Returns the new tier, or null when already at the bottom or forced.
export function stepDown() {
  const i = ORDER.indexOf(current);
  if (TIERS[forced] || i === ORDER.length - 1) return null;
  setQuality(ORDER[i + 1]);
  return TIERS[current];
}

// Slow for `windowS` seconds in a row (average frame over limitMs) means step down. The first
// seconds after a (re)start are ignored while sprites are painted.
export class FrameWatch {
  constructor(limitMs = 20, windowS = 2) {
    this.limit = limitMs / 1000;
    this.window = windowS;
    this.reset();
  }

  reset() {
    this.sum = 0;
    this.frames = 0;
    this.skip = 1.5;
  }

  add(seconds) {
    if (seconds > 0.25) return false;
    if (this.skip > 0) {
      this.skip -= seconds;
      return false;
    }
    this.sum += seconds;
    this.frames++;
    if (this.sum < this.window) return false;
    const slow = this.sum / this.frames > this.limit;
    this.sum = 0;
    this.frames = 0;
    return slow;
  }
}
