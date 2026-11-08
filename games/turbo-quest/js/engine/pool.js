// A fixed-size pool of reusable objects, so busy moments (confetti, sparks) make no garbage
// for Safari to collect mid-jump. Live items are items[0..count-1]; removing swaps in the last one.

export class Pool {
  constructor(make, size) {
    this.items = Array.from({ length: size }, make);
    this.count = 0;
  }

  // A free item, or null when the pool is full (the effect is simply skipped).
  alloc() {
    return this.count < this.items.length ? this.items[this.count++] : null;
  }

  // Removes items[i]. Walk the pool backwards when removing during a loop.
  free(i) {
    const last = --this.count;
    if (i !== last) {
      const t = this.items[i];
      this.items[i] = this.items[last];
      this.items[last] = t;
    }
  }

  clear() {
    this.count = 0;
  }
}
