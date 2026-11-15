// Greedy box merge: covers a set of blocks with a few big boxes (exactly, no overlap), so a falling
// piece of 500 blocks collides as a couple of dozen boxes instead of 500.
// Input: integer block coordinates. Output: [{ x0, y0, z0, x1, y1, z1 }] with x1 etc. exclusive.

export function greedyBoxes(xs, ys, zs) {
  const n = xs.length;
  if (!n) return [];
  let mx = Infinity;
  let my = Infinity;
  let mz = Infinity;
  let Mx = -Infinity;
  let My = -Infinity;
  let Mz = -Infinity;
  for (let i = 0; i < n; i++) {
    mx = Math.min(mx, xs[i]);
    my = Math.min(my, ys[i]);
    mz = Math.min(mz, zs[i]);
    Mx = Math.max(Mx, xs[i]);
    My = Math.max(My, ys[i]);
    Mz = Math.max(Mz, zs[i]);
  }
  const W = Mx - mx + 1;
  const H = My - my + 1;
  const D = Mz - mz + 1;
  const at = (x, y, z) => x + W * (z + D * y);
  const solid = new Uint8Array(W * H * D);
  for (let i = 0; i < n; i++) solid[at(xs[i] - mx, ys[i] - my, zs[i] - mz)] = 1;
  const free = (x, y, z) => solid[at(x, y, z)] === 1;
  const boxes = [];
  for (let y = 0; y < H; y++)
    for (let z = 0; z < D; z++)
      for (let x = 0; x < W; x++) {
        if (!free(x, y, z)) continue;
        let x1 = x + 1;
        while (x1 < W && free(x1, y, z)) x1++;
        let z1 = z + 1;
        grow: while (z1 < D) {
          for (let k = x; k < x1; k++) if (!free(k, y, z1)) break grow;
          z1++;
        }
        let y1 = y + 1;
        grow: while (y1 < H) {
          for (let c = z; c < z1; c++) for (let k = x; k < x1; k++) if (!free(k, y1, c)) break grow;
          y1++;
        }
        for (let a = y; a < y1; a++) for (let c = z; c < z1; c++) for (let k = x; k < x1; k++) solid[at(k, a, c)] = 2;
        boxes.push({ x0: x + mx, y0: y + my, z0: z + mz, x1: x1 + mx, y1: y1 + my, z1: z1 + mz });
      }
  return boxes;
}

// The `max` biggest boxes of the exact cover: a slightly-too-small collision shape that never
// sticks out past the blocks. Pieces that break off together use this, so they never start out
// inside each other (the physics would shove them apart and fling them sky-high).
export function innerBoxes(xs, ys, zs, max = 8) {
  const boxes = greedyBoxes(xs, ys, zs);
  if (boxes.length <= max) return boxes;
  const vol = (b) => (b.x1 - b.x0) * (b.y1 - b.y0) * (b.z1 - b.z0);
  return boxes.sort((a, b) => vol(b) - vol(a)).slice(0, max);
}

// Like greedyBoxes, but never more than `max` boxes: if the exact cover has too many, it covers
// the blocks with coarser cells (2×2×2, then 4×4×4), which may fill in a few gaps inside the
// piece's bounds. Good enough for a falling piece that is about to shatter anyway.
export function boundedBoxes(xs, ys, zs, max = 40) {
  let boxes = greedyBoxes(xs, ys, zs);
  if (boxes.length <= max) return boxes;
  // Coarse cells start at the piece's own corner and boxes are clipped to its bounds, so they
  // never poke out below a piece resting on a stump.
  let mx = Infinity;
  let my = Infinity;
  let mz = Infinity;
  let Mx = -Infinity;
  let My = -Infinity;
  let Mz = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    mx = Math.min(mx, xs[i]);
    my = Math.min(my, ys[i]);
    mz = Math.min(mz, zs[i]);
    Mx = Math.max(Mx, xs[i] + 1);
    My = Math.max(My, ys[i] + 1);
    Mz = Math.max(Mz, zs[i] + 1);
  }
  for (let s = 2; boxes.length > max && s <= 8; s *= 2) {
    const seen = new Set();
    const cx = [];
    const cy = [];
    const cz = [];
    for (let i = 0; i < xs.length; i++) {
      const a = Math.floor((xs[i] - mx) / s);
      const b = Math.floor((ys[i] - my) / s);
      const c = Math.floor((zs[i] - mz) / s);
      const k = a + b * 1024 + c * 1048576;
      if (seen.has(k)) continue;
      seen.add(k);
      cx.push(a);
      cy.push(b);
      cz.push(c);
    }
    boxes = greedyBoxes(cx, cy, cz).map((b) => ({
      x0: mx + b.x0 * s,
      y0: my + b.y0 * s,
      z0: mz + b.z0 * s,
      x1: Math.min(Mx, mx + b.x1 * s),
      y1: Math.min(My, my + b.y1 * s),
      z1: Math.min(Mz, mz + b.z1 * s),
    }));
  }
  return boxes;
}
