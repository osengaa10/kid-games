// Camera shake from "trauma" (squared, so small hits barely wiggle and big ones really rumble,
// but never more than a capped amount), plus game-time effects: hit-stop (a split-second freeze
// on a big hit) and slow motion for huge chain reactions.
export class Shake {
  constructor() {
    this.trauma = 0;
    this.calm = false;
    this.t = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.roll = 0;
  }

  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount * (this.calm ? 0.35 : 1));
  }

  update(dt) {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    const k = this.trauma * this.trauma;
    const t = this.t * 22;
    // Smooth wobble from a few sines, not white noise: punchy without jitter.
    this.x = k * 0.9 * (Math.sin(t * 1.1) + 0.5 * Math.sin(t * 2.3 + 1.7));
    this.y = k * 0.7 * (Math.sin(t * 1.3 + 0.5) + 0.5 * Math.sin(t * 2.9 + 2.1));
    this.z = k * 0.9 * (Math.sin(t * 0.9 + 2.5) + 0.5 * Math.sin(t * 2.1 + 0.3));
    this.roll = k * 0.025 * Math.sin(t * 0.8 + 1.2);
  }
}

export class TimeScale {
  constructor() {
    this.stopUntil = 0;
    this.slowUntil = 0;
    this.slowScale = 1;
    this.real = 0;
  }

  // Freezes game time almost completely for `seconds` of real time.
  hitStop(seconds) {
    this.stopUntil = Math.max(this.stopUntil, this.real + seconds);
  }

  slowMo(seconds, scale = 0.45) {
    this.slowUntil = this.real + seconds;
    this.slowScale = scale;
  }

  // Takes a real frame time, returns the game frame time.
  scale(dtReal) {
    this.real += dtReal;
    if (this.real < this.stopUntil) return dtReal * 0.08;
    if (this.real < this.slowUntil) {
      // Ease back to full speed over the last third.
      const left = (this.slowUntil - this.real) / 0.3;
      return dtReal * (left < 1 ? this.slowScale + (1 - this.slowScale) * (1 - left) : this.slowScale);
    }
    return dtReal;
  }
}
