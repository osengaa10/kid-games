// Cheers in a row: the chain, the score and the TURBO meter. No DOM.
// A cheer within 2 s of the last one adds to the chain; stomps and bounces add 2 (they're the
// skillful way). Points are 100 × chain (chain capped at ×10). The TURBO meter fills the same way.
import { POINTS, POWERUPS } from '../content/powerups.js';

export class Combo {
  constructor(mode = 'kid') {
    this.mode = mode;
    this.meterMax = POWERUPS.turbo.meter[mode] || 8;
    this.reset();
    this.score = 0;
    this.meter = 0;
    this.best = 0;
    this.cheers = 0;
  }

  reset() {
    this.chain = 0;
    this.timer = 0;
  }

  // how: 'shot' | 'stomp' | 'bounce' | 'pop' | 'turbo' | 'giant'. Returns the points earned.
  cheer(how) {
    const weight = how === 'stomp' || how === 'bounce' ? 2 : 1;
    this.chain = this.timer > 0 ? this.chain + weight : weight;
    this.timer = POINTS.chainTime;
    this.best = Math.max(this.best, this.chain);
    this.cheers++;
    const pts = POINTS.cheer * Math.min(POINTS.maxChain, this.chain);
    this.score += pts;
    this.meter = Math.min(this.meterMax, this.meter + weight);
    return pts;
  }

  // A bounce off a balloon keeps the chain going without a new cheer.
  bounce() {
    if (this.timer > 0) this.timer = POINTS.chainTime;
  }

  add(points) {
    this.score += points;
  }

  get full() {
    return this.meter >= this.meterMax;
  }

  spendMeter() {
    this.meter = 0;
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.reset();
    }
  }
}

// The medal for a Dad Mode score: 0 none, 1 bronze, 2 silver, 3 gold.
export function medalFor(score, medals) {
  if (!medals) return 0;
  let m = 0;
  medals.forEach((t, i) => {
    if (score >= t) m = i + 1;
  });
  return m;
}
