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

// Cracks a big section into about `parts` lengths along jittered, slightly tilted planes across its
// longest side (a tower breaks into stacked lengths, a bridge into spans), then into connected
// bits (a plane through a hollow ring can leave two arcs). seam: the share of the blocks where two
// lengths meet that crumble out instead (at most seamMax), so the cracks look ragged. Returns
// { parts: arrays of input indices, biggest first; seam: the crumbled indices }. Every block is in
// exactly one part or the seam.
export function crackSection(xs, ys, zs, parts, rand, { seam = 0, seamMax = 0 } = {}) {
  const n = xs.length;
  if (n < parts * 2) parts = 1;
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
  // Which length each block falls in.
  const group = new Uint8Array(n);
  if (parts > 1) {
    const ext = [Mx - mx, My - my, Mz - mz];
    const long = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2;
    // The cut planes' facing: along the long side, tipped a little at random.
    const nrm = [0, 1, 2].map((a) => (a === long ? 1 : (rand() - 0.5) * 0.7));
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = xs[i] * nrm[0] + ys[i] * nrm[1] + zs[i] * nrm[2];
    const sorted = Float32Array.from(s).sort();
    const cuts = [];
    for (let k = 1; k < parts; k++) {
      const q = (k + (rand() - 0.5) * 0.3) / parts;
      cuts.push(sorted[Math.min(n - 1, Math.max(0, Math.floor(q * n)))]);
    }
    for (let i = 0; i < n; i++) {
      let g = 0;
      while (g < cuts.length && s[i] > cuts[g]) g++;
      group[i] = g;
    }
  }
  // A dense lookup over the bounding box: which block is at a spot (-1 = none).
  const W = Mx - mx + 1;
  const H = My - my + 1;
  const D = Mz - mz + 1;
  const WD = W * D;
  const table = new Int32Array(W * H * D).fill(-1);
  const key = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    key[i] = xs[i] - mx + W * (zs[i] - mz) + WD * (ys[i] - my);
    table[key[i]] = i;
  }
  // Calls f(j) for each 6-neighbour j of block i.
  const around = (i, f) => {
    const k = key[i];
    const x = xs[i] - mx;
    const y = ys[i] - my;
    const z = zs[i] - mz;
    if (x > 0 && table[k - 1] >= 0) f(table[k - 1]);
    if (x < W - 1 && table[k + 1] >= 0) f(table[k + 1]);
    if (z > 0 && table[k - W] >= 0) f(table[k - W]);
    if (z < D - 1 && table[k + W] >= 0) f(table[k + W]);
    if (y > 0 && table[k - WD] >= 0) f(table[k - WD]);
    if (y < H - 1 && table[k + WD] >= 0) f(table[k + WD]);
  };
  // The seam: blocks touching another length.
  const out = [];
  const gone = new Uint8Array(n);
  if (parts > 1 && seam > 0) {
    for (let i = 0; i < n && out.length < seamMax; i++) {
      let edge = false;
      around(i, (j) => {
        if (group[j] !== group[i]) edge = true;
      });
      if (edge && rand() < seam) {
        gone[i] = 1;
        out.push(i);
      }
    }
  }
  // Connected bits of each length (a flood fill through the table).
  const seen = gone.slice();
  const queue = new Int32Array(n);
  const result = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (seen[s0]) continue;
    seen[s0] = 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = s0;
    const g = group[s0];
    while (head < tail) {
      const i = queue[head++];
      around(i, (j) => {
        if (!seen[j] && group[j] === g) {
          seen[j] = 1;
          queue[tail++] = j;
        }
      });
    }
    result.push(Array.from(queue.subarray(0, tail)));
  }
  result.sort((a, b) => b.length - a.length);
  return { parts: result, seam: out };
}

// crackSection without the crumbling seam: just the parts.
export function splitSection(xs, ys, zs, parts, rand) {
  return crackSection(xs, ys, zs, parts, rand).parts;
}
