// Drawing the blocks: one instanced mesh for every standing block, one for every loose block.
// Each frame only the instances that changed are uploaded.
import * as THREE from '../../vendor/three.module.min.js';
import { blockMaterial, blockDepthMaterial } from './blockMaterial.js';
import { OpenAir } from '../core/faces.js';

const linear = new Map();
const tmp = new THREE.Color();
// 0xRRGGBB (sRGB) to linear [r, g, b], cached: scenes reuse a few hundred colors.
export function linearRGB(hex) {
  let c = linear.get(hex);
  if (!c) {
    tmp.setHex(hex);
    c = [tmp.r, tmp.g, tmp.b];
    linear.set(hex, c);
  }
  return c;
}

class Dirty {
  constructor() {
    this.lo = Infinity;
    this.hi = -1;
  }
  mark(i) {
    if (i < this.lo) this.lo = i;
    if (i > this.hi) this.hi = i;
  }
  all(n) {
    this.lo = 0;
    this.hi = Math.max(this.hi, n - 1);
  }
  // Uploads the marked range of each attribute (size = floats per instance).
  flush(list) {
    if (this.hi < this.lo) return;
    for (const [attr, size] of list) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(this.lo * size, (this.hi - this.lo + 1) * size);
      attr.needsUpdate = true;
    }
    this.lo = Infinity;
    this.hi = -1;
  }
}

// The standing blocks, drawn as their visible sides only: one instanced square per side that
// touches outside air (see OpenAir), not a whole cube per block. A wall's insides, the sides
// blocks press against each other and the inside of hollow buildings aren't drawn at all until a
// hit opens them up, which is about a fifth of the triangles a cube per block would cost (and
// iPad graphics chips pay for every triangle twice: once for the picture, once for shadows).
// Removing a side moves the last one into its slot, so the draw stays one tight range.
export class StaticVoxels {
  constructor(scene, capacity, gridSize) {
    // capacity is in blocks; sides are counted separately. A scene starts at about 1.5 drawn
    // sides per block, and craters add more.
    this.blocks = capacity;
    this.capacity = capacity * 4;
    const cap = this.capacity;
    const geo = new THREE.InstancedBufferGeometry();
    // One unit square in the xy plane, facing +z, counter-clockwise seen from the front. The
    // shader turns it to face its direction.
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    // Per side: the block's cell (x, y, z) and the direction (0-5: +x, -x, +y, -y, +z, -z).
    this.face = new THREE.InstancedBufferAttribute(new Int16Array(cap * 4), 4);
    this.color = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.build = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    this.heat = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    geo.setAttribute('aFace', this.face);
    geo.setAttribute('color', this.color);
    geo.setAttribute('aBuild', this.build);
    geo.setAttribute('aHeat', this.heat);
    for (const a of [this.face, this.color, this.build, this.heat]) a.setUsage(THREE.DynamicDrawUsage);
    geo.instanceCount = 0;
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, blockMaterial({ isStatic: true }));
    this.mesh.customDepthMaterial = blockDepthMaterial({ isStatic: true });
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    // Each block with a drawn side has a record: the slots of its six sides (-1 = not drawn).
    this.recOf = new Int32Array(gridSize).fill(-1);
    this.recSlots = new Int32Array(capacity * 6).fill(-1);
    this.recFree = new Int32Array(capacity);
    this.nRecFree = 0;
    // Which side lives in each slot: cell * 8 + direction.
    this.owner = new Int32Array(cap);
    this.removed = [];
    this.dirty = new Dirty();
  }

  get count() {
    return this.geo.instanceCount;
  }

  // Loads every visible side of a freshly built scene. delayOf(cell) gives each block's build
  // drop-in delay.
  fill(grid, delayOf) {
    this.grid = grid;
    if (!this.air || this.air.grid !== grid) this.air = new OpenAir(grid);
    // Forget the old scene's records.
    const n0 = this.geo.instanceCount;
    for (let s = 0; s < n0; s++) this.recOf[this.owner[s] >> 3] = -1;
    this.recSlots.fill(-1);
    for (let r = 0; r < this.blocks; r++) this.recFree[r] = this.blocks - 1 - r;
    this.nRecFree = this.blocks;
    this.geo.instanceCount = 0;
    this.removed.length = 0;
    this.air.fill();
    const n = grid.top * grid.layer;
    const { mat } = grid;
    for (let i = 0; i < n; i++) {
      if (!mat[i]) continue;
      let delay = null;
      for (let d = 0; d < 6; d++) {
        if (!this.air.sideOpen(i, d)) continue;
        if (delay === null) delay = delayOf ? delayOf(i) : -10;
        this.addSide(i, d, delay);
      }
    }
    this.dirty.all(this.geo.instanceCount);
  }

  addSide(cell, d, delay = -10) {
    let r = this.recOf[cell];
    if (r < 0) {
      if (!this.nRecFree) return;
      r = this.recFree[--this.nRecFree];
      this.recOf[cell] = r;
    }
    const k = r * 6 + d;
    const n = this.geo.instanceCount;
    if (this.recSlots[k] >= 0 || n >= this.capacity) return;
    const grid = this.grid;
    const f = this.face.array;
    f[n * 4] = grid.cx(cell);
    f[n * 4 + 1] = grid.cy(cell);
    f[n * 4 + 2] = grid.cz(cell);
    f[n * 4 + 3] = d;
    const c = linearRGB(grid.color[cell]);
    const col = this.color.array;
    col[n * 3] = c[0];
    col[n * 3 + 1] = c[1];
    col[n * 3 + 2] = c[2];
    this.build.array[n] = delay;
    // A side that comes into view on a scorched block glows like its other sides.
    let heat = 0;
    for (let e = 0; e < 6; e++) {
      const s = this.recSlots[r * 6 + e];
      if (s >= 0) heat = Math.max(heat, this.heat.array[s]);
    }
    this.heat.array[n] = heat;
    this.recSlots[k] = n;
    this.owner[n] = cell * 8 + d;
    this.geo.instanceCount = n + 1;
    this.dirty.mark(n);
  }

  dropSlot(s) {
    const last = this.geo.instanceCount - 1;
    if (s !== last) {
      this.face.array.copyWithin(s * 4, last * 4, last * 4 + 4);
      this.color.array.copyWithin(s * 3, last * 3, last * 3 + 3);
      this.build.array[s] = this.build.array[last];
      this.heat.array[s] = this.heat.array[last];
      const moved = this.owner[last];
      this.owner[s] = moved;
      this.recSlots[this.recOf[moved >> 3] * 6 + (moved & 7)] = s;
      this.dirty.mark(s);
    }
    this.geo.instanceCount = last;
  }

  // A block left the grid: its sides go now; the blocks around it show their sides toward the
  // hole at the next flush (once the whole hit is carved, so a crater is opened up in one go).
  remove(cell) {
    const r = this.recOf[cell];
    if (r >= 0) {
      for (let d = 0; d < 6; d++) {
        const s = this.recSlots[r * 6 + d];
        if (s < 0) continue;
        this.recSlots[r * 6 + d] = -1;
        this.dropSlot(s);
      }
      this.recOf[cell] = -1;
      this.recFree[this.nRecFree++] = r;
    }
    this.removed.push(cell);
  }

  // Kept for the destruction code: uncovering is handled by remove() and flush() now.
  expose() {}

  // Marks a block as just scorched by the laser (it glows and cools on its own).
  scorch(cell, time) {
    const r = this.recOf[cell];
    if (r < 0) return;
    for (let d = 0; d < 6; d++) {
      const s = this.recSlots[r * 6 + d];
      if (s < 0) continue;
      this.heat.array[s] = time;
      this.dirty.mark(s);
    }
  }

  flush() {
    if (this.removed.length) {
      this.air.open(this.removed, (cell, d) => this.addSide(cell, d));
      this.removed.length = 0;
    }
    this.dirty.flush([
      [this.face, 4],
      [this.color, 3],
      [this.build, 1],
      [this.heat, 1],
    ]);
  }
}

// Every loose block that can be seen (debris and props; blocks buried inside a piece get no slot).
// Slots come from a free list; a body owns a handful of slots and rewrites their matrices while
// it moves.
export class DebrisVoxels {
  constructor(scene, capacity) {
    this.capacity = capacity;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // Which sides of each block are pressed against another block of the same piece (bits, see
    // hiddenFaces): the shader squashes those to nothing, so a big slab draws only its outside.
    this.mask = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    geo.setAttribute('aMask', this.mask);
    this.mesh = new THREE.InstancedMesh(geo, blockMaterial({ isStatic: false }), capacity);
    this.mesh.customDepthMaterial = blockDepthMaterial({ isStatic: false });
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    for (const a of [this.mesh.instanceMatrix, this.mesh.instanceColor, this.mask]) a.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceMatrix.array.fill(0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.free = new Int32Array(capacity);
    this.reset();
    this.dirty = new Dirty();
  }

  reset() {
    // Lowest slots handed out first, so the drawn range stays short.
    for (let i = 0; i < this.capacity; i++) this.free[i] = this.capacity - 1 - i;
    this.nFree = this.capacity;
    this.mesh.instanceMatrix.array.fill(0);
    this.mesh.count = 0;
    this.used = 0;
    if (this.dirty) this.dirty.all(this.capacity);
  }

  get available() {
    return this.nFree;
  }

  // n slots, or null when there aren't enough.
  alloc(n) {
    if (n > this.nFree) return null;
    const out = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const s = this.free[--this.nFree];
      out[i] = s;
      if (s + 1 > this.mesh.count) this.mesh.count = s + 1;
    }
    this.used += n;
    return out;
  }

  release(slots) {
    const m = this.mesh.instanceMatrix.array;
    for (const s of slots) {
      m.fill(0, s * 16, s * 16 + 16);
      this.free[this.nFree++] = s;
      this.dirty.mark(s);
    }
    this.used -= slots.length;
    if (this.used === 0) this.mesh.count = 0;
  }

  // A block's color and its hidden sides (bit mask).
  color(slot, hex, hidden = 0) {
    const c = linearRGB(hex);
    const a = this.mesh.instanceColor.array;
    a[slot * 3] = c[0];
    a[slot * 3 + 1] = c[1];
    a[slot * 3 + 2] = c[2];
    this.mask.array[slot] = hidden;
    this.dirty.mark(slot);
  }

  // One block on its own (a loose single block): position, rotation (quaternion parts), size.
  writeOne(slot, x, y, z, qx, qy, qz, qw, s) {
    const x2 = qx + qx;
    const y2 = qy + qy;
    const z2 = qz + qz;
    const xx = qx * x2;
    const xy = qx * y2;
    const xz = qx * z2;
    const yy = qy * y2;
    const yz = qy * z2;
    const zz = qz * z2;
    const wx = qw * x2;
    const wy = qw * y2;
    const wz = qw * z2;
    const m = this.mesh.instanceMatrix.array;
    const o = slot * 16;
    m[o] = (1 - (yy + zz)) * s;
    m[o + 1] = (xy + wz) * s;
    m[o + 2] = (xz - wy) * s;
    m[o + 3] = 0;
    m[o + 4] = (xy - wz) * s;
    m[o + 5] = (1 - (xx + zz)) * s;
    m[o + 6] = (yz + wx) * s;
    m[o + 7] = 0;
    m[o + 8] = (xz + wy) * s;
    m[o + 9] = (yz - wx) * s;
    m[o + 10] = (1 - (xx + yy)) * s;
    m[o + 11] = 0;
    m[o + 12] = x;
    m[o + 13] = y;
    m[o + 14] = z;
    m[o + 15] = 1;
    this.dirty.mark(slot);
  }

  // Draws nothing in this slot.
  hide(slot) {
    this.mesh.instanceMatrix.array.fill(0, slot * 16, slot * 16 + 16);
    this.dirty.mark(slot);
  }

  // How many slots to draw (the rest are empty).
  setCount(n) {
    this.mesh.count = n;
  }

  // Writes the matrices of a body's blocks: rotation (quaternion q) and position p of the body,
  // each block at its local offset (lx, ly, lz), scaled by s.
  write(slots, lx, ly, lz, p, q, s = 1) {
    const { x, y, z, w } = q;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const r00 = 1 - (yy + zz);
    const r10 = xy + wz;
    const r20 = xz - wy;
    const r01 = xy - wz;
    const r11 = 1 - (xx + zz);
    const r21 = yz + wx;
    const r02 = xz + wy;
    const r12 = yz - wx;
    const r22 = 1 - (xx + yy);
    const m = this.mesh.instanceMatrix.array;
    for (let i = 0; i < slots.length; i++) {
      const o = slots[i] * 16;
      const a = lx[i];
      const b = ly[i];
      const c = lz[i];
      m[o] = r00 * s;
      m[o + 1] = r10 * s;
      m[o + 2] = r20 * s;
      m[o + 3] = 0;
      m[o + 4] = r01 * s;
      m[o + 5] = r11 * s;
      m[o + 6] = r21 * s;
      m[o + 7] = 0;
      m[o + 8] = r02 * s;
      m[o + 9] = r12 * s;
      m[o + 10] = r22 * s;
      m[o + 11] = 0;
      m[o + 12] = p.x + r00 * a + r01 * b + r02 * c;
      m[o + 13] = p.y + r10 * a + r11 * b + r12 * c;
      m[o + 14] = p.z + r20 * a + r21 * b + r22 * c;
      m[o + 15] = 1;
      this.dirty.mark(slots[i]);
    }
  }

  flush() {
    this.dirty.flush([
      [this.mesh.instanceMatrix, 16],
      [this.mesh.instanceColor, 3],
      [this.mask, 1],
    ]);
  }
}
