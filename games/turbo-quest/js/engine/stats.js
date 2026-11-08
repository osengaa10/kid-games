// Frame-time statistics over the last few seconds, for the ?debug overlay and the iPad
// performance check: the bar is 95 % of frames within 17.5 ms and none over 50 ms.

export class FrameStats {
  constructor(size = 600) {
    this.ms = new Float32Array(size);
    this.n = 0;
    this.i = 0;
    this.sorted = new Float32Array(size);
  }

  add(seconds) {
    this.ms[this.i] = seconds * 1000;
    this.i = (this.i + 1) % this.ms.length;
    if (this.n < this.ms.length) this.n++;
  }

  reset() {
    this.n = 0;
    this.i = 0;
  }

  summary() {
    const n = this.n;
    if (!n) return { frames: 0, fps: 0, avg: 0, p95: 0, worst: 0, good: 1 };
    let sum = 0;
    let worst = 0;
    let good = 0;
    for (let k = 0; k < n; k++) {
      const v = this.ms[k];
      this.sorted[k] = v;
      sum += v;
      if (v > worst) worst = v;
      if (v <= 17.5) good++;
    }
    const s = this.sorted.subarray(0, n).sort();
    const avg = sum / n;
    return { frames: n, fps: 1000 / avg, avg, p95: s[Math.min(n - 1, Math.floor(n * 0.95))], worst, good: good / n };
  }
}
