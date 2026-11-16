// How much the look may cost. Starts at the best tier and steps down by itself when frames get
// slow (remembering that for next time), so an older iPad stays smooth. Within a tier, the
// effects governor trims particle counts smoothly before a whole step is needed.
// ?q=high|medium|low forces a tier for testing.
const KEY = 'boom-blocks:quality';
const ORDER = ['high', 'medium', 'low'];

// pixelRatio: drawn pixels per screen point (an iPad's screen has 2); reflections: the studio
// sheen on the plastic (an environment map: the costliest thing per pixel; on an A16 iPad the
// castle at 2x takes 27 ms a frame with it and 18 without, and Medium with it ran at 44 fps in
// the stress test against Low's 55 without); awake: moving pieces the physics may juggle at once (what costs physics time); pieces:
// loose pieces in all, moving or lying in the rubble (lying still costs almost nothing); spray:
// loose single blocks out at once (a hit's spray and the rubble it piles into), sprayHit: how
// many a frame's hits may throw; crumbs etc.: particle field sizes; wobble: shockwave jiggle on
// standing blocks.
export const TIERS = {
  high: { name: 'high', pixelRatio: 2, reflections: true, shadows: 2048, softShadows: true, awake: 160, pieces: 400, spray: 6000, sprayHit: 2000, crumbs: 9000, sparks: 1500, glow: 900, dust: 220, confetti: 1500, wobble: true },
  medium: { name: 'medium', pixelRatio: 1.5, reflections: false, shadows: 1024, softShadows: true, awake: 110, pieces: 300, spray: 4000, sprayHit: 1400, crumbs: 6000, sparks: 1000, glow: 600, dust: 140, confetti: 900, wobble: true },
  low: { name: 'low', pixelRatio: 1.25, reflections: false, shadows: 1024, softShadows: false, awake: 70, pieces: 220, spray: 2500, sprayHit: 900, crumbs: 3500, sparks: 600, glow: 350, dust: 80, confetti: 500, wobble: false },
};

export const forcedTier = () => {
  try {
    const q = new URLSearchParams(location.search).get('q');
    return TIERS[q] ? q : null;
  } catch {
    return null;
  }
};

function load(storage) {
  const f = forcedTier();
  if (f) return f;
  try {
    const saved = storage?.getItem(KEY);
    if (TIERS[saved]) return saved;
  } catch {
    // storage blocked
  }
  return 'high';
}

export class Quality {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.name = load(storage);
    this.locked = !!forcedTier();
  }
  get tier() {
    return TIERS[this.name];
  }
  set(name, lock = false) {
    if (!TIERS[name]) return;
    this.name = name;
    this.locked = lock;
    try {
      this.storage?.setItem(KEY, name);
    } catch {
      // not fatal
    }
  }
  // One step down. Returns the new tier, or null at the bottom (or when locked).
  stepDown() {
    const i = ORDER.indexOf(this.name);
    if (this.locked || i === ORDER.length - 1) return null;
    this.set(ORDER[i + 1]);
    return this.tier;
  }
}

// Watches frame times: slow on average over a couple of seconds means step down. Ignores the
// first moments (shaders compile) and huge gaps (the app was in the background).
export class FrameWatch {
  constructor(limitMs = 20, windowS = 2, skipS = 1.5) {
    this.limit = limitMs / 1000;
    this.window = windowS;
    this.skipS = skipS;
    this.reset();
  }
  reset() {
    this.sum = 0;
    this.frames = 0;
    this.skip = this.skipS;
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

// Smoothly trims effect counts (0.45..1) when recent frames run long, and lets them grow back
// slowly when there's room again.
export class Governor {
  constructor() {
    this.intensity = 1;
    this.avg = 1 / 60;
  }
  add(seconds) {
    if (seconds > 0.25) return this.intensity;
    this.avg += (seconds - this.avg) * 0.08;
    if (this.avg > 0.0185) this.intensity = Math.max(0.45, this.intensity - 0.02);
    else if (this.avg < 0.0172) this.intensity = Math.min(1, this.intensity + 0.004);
    return this.intensity;
  }
}

// Frame-time log for the stats overlay and the stress test: average, 95th percentile, worst.
export class FrameStats {
  constructor(size = 600) {
    this.buf = new Float32Array(size);
    this.n = 0;
    this.i = 0;
  }
  add(ms) {
    this.buf[this.i] = ms;
    this.i = (this.i + 1) % this.buf.length;
    this.n = Math.min(this.n + 1, this.buf.length);
  }
  reset() {
    this.n = 0;
    this.i = 0;
  }
  summary() {
    if (!this.n) return { frames: 0, fps: 0, avg: 0, p95: 0, worst: 0, good: 0 };
    const s = Array.from(this.buf.subarray(0, this.n)).sort((a, b) => a - b);
    const sum = s.reduce((a, b) => a + b, 0);
    const avg = sum / s.length;
    return { frames: s.length, fps: 1000 / avg, avg, p95: s[Math.floor(s.length * 0.95)], worst: s[s.length - 1], good: s.filter((x) => x <= 17.5).length / s.length };
  }
}
