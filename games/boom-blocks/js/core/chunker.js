// Splits a set of blocks into connected clumps of roughly a target size: the loose ring around a
// hit becomes a handful of chunks, and a big falling piece shatters into smaller ones.
// Input: integer block coordinates (xs, ys, zs) and optional group ids (blocks only clump with
// blocks of the same group, so glass never sticks to stone). Output: arrays of input indices.

export function clumps(xs, ys, zs, sizeMin, sizeMax, rand, groups = null) {
  const n = xs.length;
  // Block lookup by position: a dense table over the blocks' bounding box (-1 = no block).
  let mx = Infinity;
  let my = Infinity;
  let mz = Infinity;
  let Mx = -Infinity;
  let My = -Infinity;
  let Mz = -Infinity;
  for (let i = 0; i < n; i++) {
    if (xs[i] < mx) mx = xs[i];
    if (ys[i] < my) my = ys[i];
    if (zs[i] < mz) mz = zs[i];
    if (xs[i] > Mx) Mx = xs[i];
    if (ys[i] > My) My = ys[i];
    if (zs[i] > Mz) Mz = zs[i];
  }
  const W = Mx - mx + 1;
  const H = My - my + 1;
  const D = Mz - mz + 1;
  const table = new Int32Array(W * H * D).fill(-1);
  for (let i = 0; i < n; i++) table[xs[i] - mx + W * (zs[i] - mz + D * (ys[i] - my))] = i;
  const at = {
    get(x, y, z) {
      if (x < mx || y < my || z < mz || x > Mx || y > My || z > Mz) return undefined;
      const j = table[x - mx + W * (z - mz + D * (y - my))];
      return j < 0 ? undefined : j;
    },
  };
  const taken = new Uint8Array(n);
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  // Shuffled seeds, so the clumps come out a different shape every time.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  const out = [];
  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const frontier = [];
  for (let s = 0; s < n; s++) {
    const seed = order[s];
    if (taken[seed]) continue;
    const want = sizeMin + Math.floor(rand() * (sizeMax - sizeMin + 1));
    const clump = [seed];
    taken[seed] = 1;
    // Grow from a random spot on the clump's edge each step, so clumps come out blobby, not
    // long lines. Each block joins the edge list once, so this stays fast for big clumps.
    frontier.length = 0;
    frontier.push(seed);
    while (clump.length < want && frontier.length) {
      const f = Math.floor(rand() * frontier.length);
      const c = frontier[f];
      const d0 = Math.floor(rand() * 6);
      let grew = false;
      for (let d = 0; d < 6; d++) {
        const [dx, dy, dz] = dirs[(d0 + d) % 6];
        const j = at.get(xs[c] + dx, ys[c] + dy, zs[c] + dz);
        if (j === undefined || taken[j] || (groups && groups[j] !== groups[seed])) continue;
        taken[j] = 1;
        clump.push(j);
        frontier.push(j);
        grew = true;
        break;
      }
      // A block with no free neighbors left drops off the edge list.
      if (!grew) {
        frontier[f] = frontier[frontier.length - 1];
        frontier.pop();
      }
    }
    out.push(clump);
  }
  return out;
}
