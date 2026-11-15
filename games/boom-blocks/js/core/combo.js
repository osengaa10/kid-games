// Counts blocks smashed in one burst of chaos. The burst keeps going while blocks keep breaking
// (each break refreshes a short window), and passing a tier sets off a bigger celebration.
// In little blocks (a meteor knocks out about a thousand).
export const COMBO_TIERS = [600, 1800, 3600, 6000, 12000];

export class Combo {
  constructor(window = 1.5) {
    this.window = window;
    this.count = 0;
    this.last = -Infinity;
    this.tier = 0;
    // Blocks broken in the last second, for "huge chain" slow-motion.
    this.recent = [];
  }

  // n blocks broke at time t. Returns the tier just reached (1-based) or 0.
  add(n, t) {
    if (n <= 0) return 0;
    if (t - this.last > this.window) {
      this.count = 0;
      this.tier = 0;
    }
    this.count += n;
    this.last = t;
    this.recent.push([t, n]);
    let reached = 0;
    while (this.tier < COMBO_TIERS.length && this.count >= COMBO_TIERS[this.tier]) reached = ++this.tier;
    return reached;
  }

  // Blocks broken within the last `span` seconds.
  rate(t, span = 1) {
    while (this.recent.length && t - this.recent[0][0] > span) this.recent.shift();
    let n = 0;
    for (const [, k] of this.recent) n += k;
    return n;
  }

  // True while a burst is still going at time t.
  live(t) {
    return this.count > 0 && t - this.last <= this.window;
  }

  reset() {
    this.count = 0;
    this.tier = 0;
    this.last = -Infinity;
    this.recent.length = 0;
  }
}
