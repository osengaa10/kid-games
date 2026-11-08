// The game runs in fixed 1/60 s steps whatever the screen does: 60 Hz, 30 Hz (Low Power Mode
// slows Safari's frames) or 120 Hz. A jump is the same height and length on every iPad.

export const STEP = 1 / 60;

export class Stepper {
  constructor({ dt = STEP, maxSteps = 4, maxGap = 0.25 } = {}) {
    this.dt = dt;
    this.maxSteps = maxSteps;
    this.maxGap = maxGap;
    this.acc = 0;
  }

  // Seconds since the last frame → how many steps to run now.
  advance(elapsed) {
    if (!(elapsed > 0)) return 0;
    // A long gap (the app was in the background, or a big hitch): don't fast-forward.
    if (elapsed > this.maxGap) {
      this.acc = 0;
      return 0;
    }
    // Frames come a little early or late; snap to whole steps so 60 Hz never alternates 0 and 2.
    const k = Math.round(elapsed / this.dt);
    if (k >= 1 && Math.abs(elapsed - k * this.dt) < 0.002) elapsed = k * this.dt;
    this.acc += elapsed;
    let n = Math.floor(this.acc / this.dt + 1e-6);
    if (n > this.maxSteps) {
      n = this.maxSteps;
      this.acc = 0;
    } else {
      this.acc = Math.max(0, this.acc - n * this.dt);
    }
    return n;
  }

  reset() {
    this.acc = 0;
  }
}

// Calls onFrame(nowMs, elapsedSeconds) every animation frame.
export function runFrames(onFrame) {
  let last = performance.now();
  const tick = (now) => {
    const elapsed = (now - last) / 1000;
    last = now;
    onFrame(now, elapsed);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
