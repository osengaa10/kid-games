// Loose single blocks: the spray a hit throws off, and the rubble it piles into.
//
// There can be thousands, so they don't go to the physics engine. Each is a point with a spin: it
// flies under gravity, bounces off the standing blocks (the voxel grid), the ground and the
// island's rim, tumbles, and comes to rest lying flat on a face. Resting blocks pile up (each
// grid column remembers how high its rubble reaches, so later blocks land on top) and cost
// nothing until a blast kicks them or what they lie on goes. When the pool runs low, the oldest
// rubble shrinks away. Loose blocks don't push the physics pieces or each other.
//
// Pure logic, no three.js: drawing goes to `sink` (a DebrisVoxels), so this runs in node tests.
import { BLOCK, OX, OZ } from '../core/grid.js';
import { MATERIALS } from '../core/materials.js';
import { GRAVITY, ISLAND, RIM } from './world.js';

const FREE = 0;
const FLY = 1;
const SETTLE = 2;
const REST = 3;
const SHRINK = 4;

const HALF = BLOCK / 2;
// The sea's surface: a block that falls past the island's edge splashes in here.
const SEA = -3;
const MAX_SPEED = 40;
// Friction in a bounce: a hard landing scrubs off sideways speed in proportion to how hard it
// hit, so blocks land and tumble to a stop near where they come down instead of skipping on.
const MU = 0.5;
const MAX_SPIN = 30;
// Slow and lying on something this long: it settles onto its nearest face, over SETTLE_TIME.
const STILL = 0.12;
const SETTLE_TIME = 0.16;
const SHRINK_TIME = 0.3;
// Keep this share of the pool free: when it gets tighter, the oldest rubble starts shrinking away,
// so a new hit nearly always has room for its spray.
const HEADROOM = 0.12;
// What a resting block lies on.
const ON_GROUND = -1;
const ON_CELL = -2;

export class BlockSpray {
  constructor(grid, sink, capacity) {
    this.grid = grid;
    this.sink = sink;
    this.capacity = capacity;
    // How many may be out at once (a lower quality tier lowers it; never above capacity).
    this.limit = capacity;
    const n = capacity;
    const f = () => new Float32Array(n);
    this.px = f();
    this.py = f();
    this.pz = f();
    this.vx = f();
    this.vy = f();
    this.vz = f();
    this.qx = f();
    this.qy = f();
    this.qz = f();
    this.qw = f();
    this.wx = f();
    this.wy = f();
    this.wz = f();
    // Seconds: slow-and-supported time while flying, progress while settling or shrinking.
    this.t = f();
    // Where it settles: the height of its centre and the orientation it eases to.
    this.ry = f();
    this.tx = f();
    this.ty = f();
    this.tz = f();
    this.tw = f();
    this.state = new Uint8Array(n);
    this.mat = new Uint8Array(n);
    // What a resting block lies on: ON_GROUND, ON_CELL (cell index in onCell), or another block
    // (its index, and its rest number in onSeq, so a block that has moved on isn't mistaken).
    this.on = new Int32Array(n);
    this.onCell = new Int32Array(n);
    this.onSeq = new Uint32Array(n);
    // Counts up every time a block comes to rest.
    this.seq = new Uint32Array(n);
    // The rubble column a resting block tops (or -1).
    this.col = new Int32Array(n);
    // Needs its drawing updated this frame (it just came to rest).
    this.touched = new Uint8Array(n);
    // Per grid column: how high the rubble reaches, and which block is on top.
    this.pile = new Float32Array(grid.sx * grid.sz);
    this.pileTop = new Int32Array(grid.sx * grid.sz);
    this.free = new Int32Array(n);
    // Resting blocks, oldest first (index and rest number; stale entries are skipped).
    this.restI = [];
    this.restS = [];
    this.restHead = 0;
    // Callbacks: clatter(count, mat, x, y, z) when blocks bounce, splash(x, z) when one goes in
    // the sea.
    this.events = { clatter() {}, splash() {} };
    this.clear();
  }

  // Everything gone (a new playground).
  clear() {
    const n = this.capacity;
    for (let i = 0; i < n; i++) this.free[i] = n - 1 - i;
    this.nFree = n;
    this.state.fill(FREE);
    this.col.fill(-1);
    this.touched.fill(0);
    this.pile.fill(0);
    this.pileTop.fill(-1);
    this.restI.length = 0;
    this.restS.length = 0;
    this.restHead = 0;
    // Slots at or above `hi` are all free.
    this.hi = 0;
    this.resting = 0;
    this.shrinking = 0;
    this.recheck = false;
    for (let i = 0; i < n; i++) this.sink.hide(i);
    this.sink.setCount(0);
  }

  // Blocks out right now (flying, resting or shrinking away).
  get count() {
    return this.capacity - this.nFree;
  }

  // Blocks moving (not resting).
  get moving() {
    return this.count - this.resting;
  }

  // Throws one block from (x, y, z) at (vx, vy, vz). q: its starting rotation ({ x, y, z, w },
  // default square to the world); spin: how fast it may tumble (rad/s). Returns false if there's
  // no room (the caller turns it into crumbs instead).
  emit(x, y, z, vx, vy, vz, hex, mat, q = null, spin = 8) {
    let i = -1;
    if (this.count < this.limit && this.nFree > 0) i = this.free[--this.nFree];
    else {
      // Full: the oldest rubble makes way at once.
      i = this.oldestResting();
      if (i < 0) return false;
      this.unrest(i);
      this.sink.hide(i);
    }
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
    if (q) {
      this.qx[i] = q.x;
      this.qy[i] = q.y;
      this.qz[i] = q.z;
      this.qw[i] = q.w;
    } else {
      this.qx[i] = this.qy[i] = this.qz[i] = 0;
      this.qw[i] = 1;
    }
    this.wx[i] = (Math.random() - 0.5) * 2 * spin;
    this.wy[i] = (Math.random() - 0.5) * 2 * spin;
    this.wz[i] = (Math.random() - 0.5) * 2 * spin;
    this.t[i] = 0;
    this.mat[i] = mat;
    this.state[i] = FLY;
    this.col[i] = -1;
    this.sink.color(i, hex, 0);
    if (i + 1 > this.hi) this.hi = i + 1;
    return true;
  }

  // Standing blocks were removed: anything lying on them (or on blocks lying on them) falls.
  groundChanged() {
    this.recheck = true;
  }

  // Kicks the blocks near a blast: outward, a little upward, weaker with distance, with a tumble.
  blast(x, y, z, radius, strength, lift = 0.5) {
    const { px, py, pz, state } = this;
    for (let i = 0; i < this.hi; i++) {
      const s = state[i];
      if (s === FREE || s === SHRINK) continue;
      const dx = px[i] - x;
      const dy = py[i] - y;
      const dz = pz[i] - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      if (s === REST) this.unrest(i);
      this.state[i] = FLY;
      this.t[i] = 0;
      const k = (1 - d / radius) * strength;
      const inv = 1 / Math.max(d, 0.5);
      this.vx[i] += dx * inv * k;
      this.vy[i] += (dy * inv + lift) * k;
      this.vz[i] += dz * inv * k;
      const w = 1.2 * k;
      this.wx[i] += (Math.random() - 0.5) * w;
      this.wy[i] += (Math.random() - 0.5) * w;
      this.wz[i] += (Math.random() - 0.5) * w;
    }
  }

  // One frame.
  update(dt) {
    if (dt <= 0) return;
    if (this.recheck) {
      this.recheck = false;
      this.checkSupport();
    }
    // Make room ahead of the next hit.
    const want = Math.floor(this.limit * HEADROOM);
    while (this.limit - this.count + this.shrinking < want) {
      const i = this.oldestResting();
      if (i < 0) break;
      this.unrest(i);
      this.state[i] = SHRINK;
      this.t[i] = 0;
      this.shrinking++;
    }
    let clatter = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let cm = 0;
    for (let i = 0; i < this.hi; i++) {
      const s = this.state[i];
      if (s === FLY) {
        const hits = this.fly(i, dt);
        if (hits) {
          clatter += hits;
          cx = this.px[i];
          cy = this.py[i];
          cz = this.pz[i];
          cm = this.mat[i];
        }
      } else if (s === SETTLE) this.settle(i, dt);
      else if (s === SHRINK) {
        this.t[i] += dt;
        if (this.t[i] >= SHRINK_TIME) {
          this.shrinking--;
          this.release(i);
        }
      }
    }
    if (clatter) this.events.clatter(clatter, cm, cx, cy, cz);
  }

  // Writes the moving blocks into the sink.
  sync() {
    const { sink, state } = this;
    for (let i = 0; i < this.hi; i++) {
      const s = state[i];
      if (s === FLY || s === SETTLE || s === SHRINK || this.touched[i]) {
        this.touched[i] = 0;
        if (s === FREE) continue;
        const scale = s === SHRINK ? BLOCK * Math.max(0, 1 - this.t[i] / SHRINK_TIME) : BLOCK;
        sink.writeOne(i, this.px[i], this.py[i], this.pz[i], this.qx[i], this.qy[i], this.qz[i], this.qw[i], scale);
      }
    }
    sink.setCount(this.hi);
    sink.flush();
  }

  // ----- inside -----

  // Is the world point inside something solid: a standing block or the island's rim?
  solid(x, y, z) {
    const ax = Math.abs(x);
    const az = Math.abs(z);
    if (ax < ISLAND && az < ISLAND) {
      if (y < 0) return true;
      if (y < RIM.height && (ax > ISLAND - RIM.width || az > ISLAND - RIM.width)) return true;
    }
    return this.cellAt(x, y, z) >= 0;
  }

  // The filled grid cell at a world point, or -1.
  cellAt(x, y, z) {
    const g = this.grid;
    const gx = Math.floor((x - OX) / BLOCK);
    const gy = Math.floor(y / BLOCK);
    const gz = Math.floor((z - OZ) / BLOCK);
    if (gx < 0 || gy < 0 || gz < 0 || gx >= g.sx || gy >= g.sy || gz >= g.sz) return -1;
    const i = gx + g.sx * (gz + g.sz * gy);
    return g.mat[i] ? i : -1;
  }

  // The rubble column (grid x, z) under a world point, or -1 off the grid.
  column(x, z) {
    const g = this.grid;
    const gx = Math.floor((x - OX) / BLOCK);
    const gz = Math.floor((z - OZ) / BLOCK);
    if (gx < 0 || gz < 0 || gx >= g.sx || gz >= g.sz) return -1;
    return gx + g.sx * gz;
  }

  // Moves a flying block one frame (in short steps when it's fast, so it can't pass through a
  // wall). Returns how many hard bounces it made.
  fly(i, dt) {
    let x = this.px[i];
    let y = this.py[i];
    let z = this.pz[i];
    let vx = this.vx[i];
    let vy = this.vy[i];
    let vz = this.vz[i];
    let speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (speed > MAX_SPEED) {
      const k = MAX_SPEED / speed;
      vx *= k;
      vy *= k;
      vz *= k;
      speed = MAX_SPEED;
    }
    // Bounciness: jelly is bouncy, but not a pogo stick that never settles.
    const e = Math.min(0.55, MATERIALS[this.mat[i]].restitution + 0.12);
    const steps = Math.min(4, Math.max(1, Math.ceil((speed * dt) / (HALF * 0.9))));
    const h = dt / steps;
    let hits = 0;
    let lying = false;
    let w = 0;
    for (let k = 0; k < steps; k++) {
      vy += GRAVITY * h;
      // Sideways, one axis at a time: the leading face meeting something solid bounces back.
      const nx = x + vx * h;
      if (vx !== 0 && this.solid(nx + Math.sign(vx) * HALF * 0.9, y, z)) {
        if (Math.abs(vx) > 3) hits++;
        const scrub = Math.max(0, 1 - (MU * (1 + e) * Math.abs(vx)) / (Math.hypot(vy, vz) || 1));
        vy *= scrub;
        vz *= scrub;
        vx = -vx * e;
        w += Math.abs(vx);
      } else x = nx;
      const nz = z + vz * h;
      if (vz !== 0 && this.solid(x, y, nz + Math.sign(vz) * HALF * 0.9)) {
        if (Math.abs(vz) > 3) hits++;
        const scrub = Math.max(0, 1 - (MU * (1 + e) * Math.abs(vz)) / (Math.hypot(vx, vy) || 1));
        vx *= scrub;
        vy *= scrub;
        vz = -vz * e;
        w += Math.abs(vz);
      } else z = nz;
      const ny = y + vy * h;
      if (vy > 0) {
        if (this.solid(x, ny + HALF * 0.9, z)) vy = -vy * e * 0.5;
        else y = ny;
        continue;
      }
      // Coming down: onto a standing block, the rubble, the ground or the rim.
      const floor = this.floorUnder(x, y, z, ny);
      if (ny - HALF <= floor) {
        y = floor + HALF;
        if (vy < -2.5) {
          hits++;
          // The sideways speed the hit scrubs off goes partly into tumbling.
          const side = Math.hypot(vx, vz) || 1;
          const scrub = Math.max(0, 1 - (MU * (1 + e) * -vy) / side);
          w += side * (1 - scrub) * 0.8;
          vx *= scrub;
          vz *= scrub;
          vy = -vy * e;
          w += Math.abs(vy) * 0.6;
        } else vy = 0;
        // Rolling and sliding on whatever it hit.
        const grip = Math.max(0, 1 - 7 * h);
        vx *= grip;
        vz *= grip;
        lying = true;
      } else y = ny;
    }
    // Tumbling: hits add a roll in the direction of travel; lying on something slows it.
    let ax = this.wx[i];
    let ay = this.wy[i];
    let az = this.wz[i];
    if (w > 0) {
      ax += vz * 1.6 + (Math.random() - 0.5) * w;
      az += -vx * 1.6 + (Math.random() - 0.5) * w;
      ay += (Math.random() - 0.5) * w * 0.5;
    }
    if (lying) {
      const k = Math.max(0, 1 - 6 * dt);
      ax *= k;
      ay *= k;
      az *= k;
    }
    const spin = Math.sqrt(ax * ax + ay * ay + az * az);
    if (spin > MAX_SPIN) {
      const k = MAX_SPIN / spin;
      ax *= k;
      ay *= k;
      az *= k;
    }
    this.wx[i] = ax;
    this.wy[i] = ay;
    this.wz[i] = az;
    this.turn(i, ax * dt, ay * dt, az * dt);
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
    // In the sea, or somehow far away: gone.
    if (y < SEA || Math.abs(x) > ISLAND + 60 || Math.abs(z) > ISLAND + 60) {
      if (y < SEA) this.events.splash(x, z);
      this.release(i);
      return hits;
    }
    // Slow and lying on something for a moment: settle.
    if (lying && vx * vx + vy * vy + vz * vz < 2) {
      this.t[i] += dt;
      if (this.t[i] > STILL) this.startSettle(i);
    } else this.t[i] = 0;
    return hits;
  }

  // The highest surface under a block falling from y to ny: a standing block, the rubble, the
  // ground or the rim top (or -Infinity past the island's edge).
  floorUnder(x, y, z, ny) {
    const bottom = ny - HALF;
    const c = this.cellAt(x, bottom, z);
    if (c >= 0) return (Math.floor(c / this.grid.layer) + 1) * BLOCK;
    const ax = Math.abs(x);
    const az = Math.abs(z);
    if (ax >= ISLAND || az >= ISLAND) return -Infinity;
    let floor = ax > ISLAND - RIM.width || az > ISLAND - RIM.width ? RIM.height : 0;
    const col = this.column(x, z);
    // Rubble only counts from above: a block already below a pile's top (beside it) isn't on it.
    if (col >= 0 && this.pile[col] > floor && y - HALF >= this.pile[col] - 0.05) floor = this.pile[col];
    return floor;
  }

  // Rotates block i by the small angle (ax, ay, az) (world axes).
  turn(i, ax, ay, az) {
    const x = this.qx[i];
    const y = this.qy[i];
    const z = this.qz[i];
    const w = this.qw[i];
    const hx = ax * 0.5;
    const hy = ay * 0.5;
    const hz = az * 0.5;
    let nx = x + (hx * w + hy * z - hz * y);
    let ny = y + (-hx * z + hy * w + hz * x);
    let nz = z + (hx * y - hy * x + hz * w);
    let nw = w - (hx * x + hy * y + hz * z);
    const l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
    nx *= l;
    ny *= l;
    nz *= l;
    nw *= l;
    this.qx[i] = nx;
    this.qy[i] = ny;
    this.qz[i] = nz;
    this.qw[i] = nw;
  }

  // Starts easing onto its nearest face: the side pointing most nearly up turns to face straight
  // up (its heading stays as it was, so rubble lies at all angles), and it sits flat on what's
  // under it.
  startSettle(i) {
    const x = this.qx[i];
    const y = this.qy[i];
    const z = this.qz[i];
    const w = this.qw[i];
    // The world directions of the block's own x, y and z axes: their up (y) parts.
    const ux = 2 * (x * y + w * z);
    const uy = 1 - 2 * (x * x + z * z);
    const uz = 2 * (y * z - w * x);
    let a;
    if (Math.abs(ux) >= Math.abs(uy) && Math.abs(ux) >= Math.abs(uz)) a = [1 - 2 * (y * y + z * z), ux, 2 * (x * z - w * y)];
    else if (Math.abs(uy) >= Math.abs(uz)) a = [2 * (x * y - w * z), uy, 2 * (y * z + w * x)];
    else a = [2 * (x * z + w * y), uz, 1 - 2 * (x * x + y * y)];
    if (a[1] < 0) a = [-a[0], -a[1], -a[2]];
    // The shortest turn taking a onto straight up: axis a × up, by the angle between them.
    let rx = -a[2];
    let rz = a[0];
    let rw = 1 + a[1];
    const l = 1 / Math.sqrt(rx * rx + rz * rz + rw * rw);
    rx *= l;
    rz *= l;
    rw *= l;
    // target = r ⊗ q (r has no y part).
    this.tx[i] = rw * x + rx * w - rz * y;
    this.ty[i] = rw * y + rz * x - rx * z;
    this.tz[i] = rw * z + rx * y + rz * w;
    this.tw[i] = rw * w - rx * x - rz * z;
    const floor = this.floorUnder(this.px[i], this.py[i], this.pz[i], this.py[i] - 0.05);
    this.ry[i] = (Number.isFinite(floor) ? floor : 0) + HALF;
    this.state[i] = SETTLE;
    this.t[i] = 0;
  }

  settle(i, dt) {
    this.t[i] += dt;
    const k = Math.min(1, this.t[i] / SETTLE_TIME);
    const e = k * k * (3 - 2 * k);
    let x = this.qx[i] + (this.tx[i] - this.qx[i]) * e;
    let y = this.qy[i] + (this.ty[i] - this.qy[i]) * e;
    let z = this.qz[i] + (this.tz[i] - this.qz[i]) * e;
    let w = this.qw[i] + (this.tw[i] - this.qw[i]) * e;
    const l = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
    this.qx[i] = x * l;
    this.qy[i] = y * l;
    this.qz[i] = z * l;
    this.qw[i] = w * l;
    this.py[i] += (this.ry[i] - this.py[i]) * e;
    if (k >= 1) this.rest(i);
  }

  // Lies still: on the pile of its column, remembering what holds it up.
  rest(i) {
    this.qx[i] = this.tx[i];
    this.qy[i] = this.ty[i];
    this.qz[i] = this.tz[i];
    this.qw[i] = this.tw[i];
    const y = this.ry[i];
    this.py[i] = y;
    this.vx[i] = this.vy[i] = this.vz[i] = 0;
    this.wx[i] = this.wy[i] = this.wz[i] = 0;
    const x = this.px[i];
    const z = this.pz[i];
    const bottom = y - HALF;
    const cell = this.cellAt(x, bottom - 0.05, z);
    const col = this.column(x, z);
    if (cell >= 0) {
      this.on[i] = ON_CELL;
      this.onCell[i] = cell;
    } else {
      const top = col >= 0 ? this.pileTop[col] : -1;
      if (top >= 0 && top !== i && this.state[top] === REST && Math.abs(this.pile[col] - bottom) < 0.1) {
        this.on[i] = top;
        this.onSeq[i] = this.seq[top];
      } else this.on[i] = ON_GROUND;
    }
    if (col >= 0 && y + HALF > this.pile[col]) {
      this.pile[col] = y + HALF;
      this.pileTop[col] = i;
      this.col[i] = col;
    } else this.col[i] = -1;
    this.state[i] = REST;
    this.seq[i]++;
    this.restI.push(i);
    this.restS.push(this.seq[i]);
    this.resting++;
    this.touched[i] = 1;
  }

  // Stops lying still (it's about to move or go): its column's pile drops back to what's under it.
  unrest(i) {
    if (this.state[i] !== REST) return;
    this.resting--;
    const col = this.col[i];
    if (col >= 0 && this.pileTop[col] === i) this.lowerPile(col, i);
    this.col[i] = -1;
    // Whatever was lying on it may need to fall.
    this.recheck = true;
    this.state[i] = FLY;
    this.t[i] = 0;
  }

  // The top of column col's pile is going: the pile drops to the highest block still lying under
  // it (following what each lay on, past any that have already moved), or to the standing block
  // or ground at its foot.
  lowerPile(col, i) {
    let k = i;
    for (let guard = 0; guard < 64; guard++) {
      const under = this.on[k];
      if (under >= 0) {
        if (this.state[under] === REST && this.seq[under] === this.onSeq[k]) {
          this.pile[col] = this.py[under] + HALF;
          this.pileTop[col] = under;
          return;
        }
        // That one has moved on too. If it hasn't come to rest anywhere since, what it was lying
        // on still tells what's under the pile.
        if (this.seq[under] !== this.onSeq[k]) break;
        k = under;
        continue;
      }
      if (under === ON_CELL && this.grid.mat[this.onCell[k]]) {
        this.pile[col] = (Math.floor(this.onCell[k] / this.grid.layer) + 1) * BLOCK;
        this.pileTop[col] = -1;
        return;
      }
      break;
    }
    this.pile[col] = 0;
    this.pileTop[col] = -1;
  }

  // Wakes every resting block whose support is gone (it falls; the ones on top of it follow over
  // the next frames).
  checkSupport() {
    const { mat } = this.grid;
    for (let i = 0; i < this.hi; i++) {
      if (this.state[i] !== REST) continue;
      const on = this.on[i];
      let held = true;
      if (on === ON_CELL) held = mat[this.onCell[i]] !== 0;
      else if (on >= 0) held = this.state[on] === REST && this.seq[on] === this.onSeq[i];
      if (held) continue;
      this.unrest(i);
      this.vx[i] = (Math.random() - 0.5) * 0.6;
      this.vz[i] = (Math.random() - 0.5) * 0.6;
      this.vy[i] = 0;
    }
  }

  // The resting block that has lain longest (taken off the list), or -1.
  oldestResting() {
    while (this.restHead < this.restI.length) {
      const i = this.restI[this.restHead];
      const s = this.restS[this.restHead];
      this.restHead++;
      if (this.state[i] === REST && this.seq[i] === s) {
        this.compact();
        return i;
      }
    }
    this.compact();
    return -1;
  }

  // Drops the used-up front of the rest list now and then.
  compact() {
    if (this.restHead > 4096 && this.restHead * 2 > this.restI.length) {
      this.restI = this.restI.slice(this.restHead);
      this.restS = this.restS.slice(this.restHead);
      this.restHead = 0;
    }
  }

  release(i) {
    if (this.state[i] === REST) this.unrest(i);
    this.state[i] = FREE;
    this.col[i] = -1;
    this.touched[i] = 0;
    this.sink.hide(i);
    this.free[this.nFree++] = i;
    while (this.hi > 0 && this.state[this.hi - 1] === FREE) this.hi--;
  }
}
