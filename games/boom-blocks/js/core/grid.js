// The standing blocks: one dense grid. Each cell is empty (0) or holds a material id and a color.
// Blocks are BLOCK world units across (half a "scene unit": scenes are laid out in whole units and
// every unit is 2×2×2 little blocks, so there's lots to smash). Cell (x, y, z) fills the world box
// [OX + x·BLOCK, OX + (x+1)·BLOCK] × [y·BLOCK, (y+1)·BLOCK] × [OZ + z·BLOCK, …], so y = 0 sits on the
// ground. Pure data, no three.js, so it runs in node tests.
export const BLOCK = 0.5;
// Little blocks per scene unit.
export const RES = Math.round(1 / BLOCK);
// 80 × 52 × 80 world units.
export const GX = 160;
export const GY = 104;
export const GZ = 160;
export const OX = -(GX * BLOCK) / 2;
export const OZ = -(GZ * BLOCK) / 2;

export class Grid {
  constructor(sx = GX, sy = GY, sz = GZ) {
    this.sx = sx;
    this.sy = sy;
    this.sz = sz;
    this.layer = sx * sz;
    this.size = sx * sy * sz;
    this.mat = new Uint8Array(this.size);
    this.color = new Uint32Array(this.size);
    // 1 where a cell had a block (or the ground) right under it when it was built. The weak-neck
    // check compares today's support with this.
    this.base = new Uint8Array(this.size);
    // The material each cell had when the scene was built (0 = empty), so the collapse check can
    // compare what's left of a layer with what that layer was.
    this.built = new Uint8Array(this.size);
    this.count = 0;
    // Highest filled layer + 1, so whole-grid scans can stop early.
    this.top = 0;
  }

  index(x, y, z) {
    return x + this.sx * (z + this.sz * y);
  }
  cx(i) {
    return i % this.sx;
  }
  cz(i) {
    return Math.floor(i / this.sx) % this.sz;
  }
  cy(i) {
    return Math.floor(i / this.layer);
  }
  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }
  get(x, y, z) {
    return this.inside(x, y, z) ? this.mat[this.index(x, y, z)] : 0;
  }

  set(x, y, z, mat, color = 0xffffff) {
    if (!this.inside(x, y, z)) return false;
    const i = this.index(x, y, z);
    if (!this.mat[i] && mat) this.count++;
    else if (this.mat[i] && !mat) this.count--;
    this.mat[i] = mat;
    this.color[i] = mat ? color : 0;
    if (mat && y >= this.top) this.top = y + 1;
    return true;
  }

  // Empties one cell by index. Returns its material (0 if it was already empty).
  remove(i) {
    const m = this.mat[i];
    if (m) {
      this.mat[i] = 0;
      this.count--;
    }
    return m;
  }

  reset() {
    const n = this.top * this.layer;
    this.mat.fill(0, 0, n);
    this.color.fill(0, 0, n);
    this.base.fill(0, 0, n);
    this.built.fill(0, 0, n);
    this.count = 0;
    this.top = 0;
  }

  // Remembers which cells were resting on something when the scene was built.
  markSupport() {
    const { mat, base, built, layer } = this;
    const n = this.top * layer;
    for (let i = 0; i < n; i++) {
      base[i] = mat[i] && (i < layer || mat[i - layer]) ? 1 : 0;
      built[i] = mat[i];
    }
  }

  // Every filled cell's index, bottom layer first.
  filled() {
    const out = [];
    const { mat } = this;
    const n = this.top * this.layer;
    for (let i = 0; i < n; i++) if (mat[i]) out.push(i);
    return out;
  }

  // How many of a cell's 6 neighbors are filled.
  neighbors(i) {
    const { mat, sx, sz, sy, layer } = this;
    const x = i % sx;
    const z = Math.floor(i / sx) % sz;
    const y = Math.floor(i / layer);
    let n = 0;
    if (x > 0 && mat[i - 1]) n++;
    if (x + 1 < sx && mat[i + 1]) n++;
    if (z > 0 && mat[i - sx]) n++;
    if (z + 1 < sz && mat[i + sx]) n++;
    if (y > 0 ? mat[i - layer] : true) n++;
    if (y + 1 < sy && mat[i + layer]) n++;
    return n;
  }
}

// World position of a cell's center, and the cell a world point falls in.
export const cellX = (x) => OX + (x + 0.5) * BLOCK;
export const cellY = (y) => (y + 0.5) * BLOCK;
export const cellZ = (z) => OZ + (z + 0.5) * BLOCK;
export const toCellX = (wx) => Math.floor((wx - OX) / BLOCK);
export const toCellY = (wy) => Math.floor(wy / BLOCK);
export const toCellZ = (wz) => Math.floor((wz - OZ) / BLOCK);
// World point to (fractional) grid coordinates.
export const gridX = (wx) => (wx - OX) / BLOCK;
export const gridY = (wy) => wy / BLOCK;
export const gridZ = (wz) => (wz - OZ) / BLOCK;
