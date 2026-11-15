// Which sides of each block can be seen. Pure data, no three.js, so it runs in node tests.
//
// Face directions, in this order everywhere: +x, -x, +y, -y, +z, -z. As bits: 1, 2, 4, 8, 16, 32.
export const DIRS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
export const ALL_HIDDEN = 63;

// For the blocks of one loose piece (integer coordinates, any range): which of each block's
// sides are pressed against another block of the same piece, as a bit mask (ALL_HIDDEN = buried).
// Those sides are never drawn.
export function hiddenFaces(xs, ys, zs) {
  const n = xs.length;
  const out = new Uint8Array(n);
  if (n < 2) return out;
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    x0 = Math.min(x0, xs[i]);
    y0 = Math.min(y0, ys[i]);
    z0 = Math.min(z0, zs[i]);
    x1 = Math.max(x1, xs[i]);
    y1 = Math.max(y1, ys[i]);
    z1 = Math.max(z1, zs[i]);
  }
  // A padded box around the piece, so neighbors of edge blocks are always inside it.
  const W = x1 - x0 + 3;
  const H = y1 - y0 + 3;
  const D = z1 - z0 + 3;
  const has = new Uint8Array(W * H * D);
  const at = (i) => xs[i] - x0 + 1 + W * (zs[i] - z0 + 1 + D * (ys[i] - y0 + 1));
  for (let i = 0; i < n; i++) has[at(i)] = 1;
  const step = [1, -1, W * D, -W * D, W, -W];
  for (let i = 0; i < n; i++) {
    const c = at(i);
    let m = 0;
    for (let d = 0; d < 6; d++) if (has[c + step[d]]) m |= 1 << d;
    out[i] = m;
  }
  return out;
}

// Air that can be seen from outside, for the standing blocks. A block side is drawn only when the
// cell next to it is such air (or off the grid's sides or top; never the ground under y = 0), so
// the walls between blocks and the insides of hollow buildings cost nothing until a hit opens
// them up.
//
// Everything above the highest block of a column is open sky. colTop is fixed when a scene is
// built: blocks only ever go during play, so "above the old top" stays sky. Below the tops, air
// is marked outside by flooding in from the sky, and again (open()) whenever blocks are removed.
export class OpenAir {
  constructor(grid) {
    this.grid = grid;
    this.outside = new Uint8Array(grid.size);
    this.colTop = new Uint8Array(grid.layer);
  }

  // After a scene is built. Returns nothing; isOpen() then answers for any cell.
  fill() {
    const { mat, sx, sz, layer, top } = this.grid;
    const { colTop, outside } = this;
    colTop.fill(0);
    outside.fill(0, 0, top * layer);
    for (let y = 0; y < top; y++) {
      const base = y * layer;
      for (let col = 0; col < layer; col++) if (mat[base + col]) colTop[col] = y + 1;
    }
    // Seeds: air under a column's top with open sky (or the grid's edge) right beside it.
    const queue = [];
    for (let col = 0; col < layer; col++) {
      const h = colTop[col];
      if (!h) continue;
      const x = col % sx;
      const z = (col - x) / sx;
      for (let y = 0; y < h; y++) {
        const i = y * layer + col;
        if (mat[i]) continue;
        if (x === 0 || x === sx - 1 || z === 0 || z === sz - 1 || colTop[col - 1] <= y || colTop[col + 1] <= y || colTop[col - sx] <= y || colTop[col + sx] <= y) {
          outside[i] = 1;
          queue.push(i);
        }
      }
    }
    this.flood(queue, null);
  }

  // Is cell i air that can be seen from outside?
  isOpen(i) {
    const { mat, layer } = this.grid;
    if (mat[i]) return false;
    return this.outside[i] === 1 || Math.floor(i / layer) >= this.colTop[i % layer];
  }

  // Can side d of filled cell i be seen?
  sideOpen(i, d) {
    const { sx, sy, sz, layer } = this.grid;
    const x = i % sx;
    const z = Math.floor(i / sx) % sz;
    const y = Math.floor(i / layer);
    const [dx, dy, dz] = DIRS[d];
    const ny = y + dy;
    if (ny < 0) return false;
    const nx = x + dx;
    const nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= sx || nz >= sz || ny >= sy) return true;
    return this.isOpen(i + dx + dz * sx + dy * layer);
  }

  // Blocks were removed (cells): any that now touch outside air let it in, and it spreads through
  // whatever empty space it reaches (a hollow room, a crater). onSide(cell, d) is called for every
  // block side that comes into view.
  open(cells, onSide) {
    const queue = [];
    const { mat } = this.grid;
    for (const c of cells) {
      if (mat[c] || this.outside[c] || this.isOpen(c)) continue;
      for (let d = 0; d < 6; d++) {
        const n = this.neighbor(c, d);
        if (n === -2 || (n >= 0 && this.isOpen(n))) {
          this.outside[c] = 1;
          queue.push(c);
          break;
        }
      }
    }
    this.flood(queue, onSide);
  }

  // Neighbor of cell i in direction d: its index, -1 under the ground, -2 off the grid's sides or
  // top (open air).
  neighbor(i, d) {
    const { sx, sy, sz, layer } = this.grid;
    const x = i % sx;
    const z = Math.floor(i / sx) % sz;
    const y = Math.floor(i / layer);
    const [dx, dy, dz] = DIRS[d];
    if (y + dy < 0) return -1;
    if (x + dx < 0 || z + dz < 0 || x + dx >= sx || z + dz >= sz || y + dy >= sy) return -2;
    return i + dx + dz * sx + dy * layer;
  }

  flood(queue, onSide) {
    const { mat, layer } = this.grid;
    const { outside, colTop } = this;
    for (let h = 0; h < queue.length; h++) {
      const a = queue[h];
      for (let d = 0; d < 6; d++) {
        const n = this.neighbor(a, d);
        if (n < 0) continue;
        if (mat[n]) {
          // The block's side facing back toward a (d ^ 1 flips the direction).
          if (onSide) onSide(n, d ^ 1);
        } else if (!outside[n] && Math.floor(n / layer) < colTop[n % layer]) {
          outside[n] = 1;
          queue.push(n);
        }
      }
    }
  }
}
