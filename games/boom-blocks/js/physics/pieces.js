// Loose pieces: every chunk of blocks that is flying, tumbling or lying in the rubble. Each is
// one Rapier body (a few merged boxes) and a handful of instances in the debris mesh.
//
// A piece keeps its blocks as integer coordinates in its own frame (for a piece cut from the
// grid, grid coordinates). Its body sits at the blocks' centroid c; block k is drawn at
// body position + rotation * (block center - c) · BLOCK. Splitting a piece keeps the frame, so the
// halves line up exactly where the whole was.
import { boundedBoxes, greedyBoxes, innerBoxes } from '../core/boxes.js';
import { MATERIALS } from '../core/materials.js';
import { OX, OZ, BLOCK } from '../core/grid.js';
import { evictions, tidy } from '../core/budget.js';
import { hiddenFaces, ALL_HIDDEN } from '../core/faces.js';

// Old-size blocks per little block, and how big a piece must be to count as a "section" that
// only breaks when it actually lands on the ground.
const PER = Math.round(1 / (BLOCK * BLOCK * BLOCK));
const SECTION = 150;
import { ISLAND } from './world.js';

let nextId = 1;
// Collider count is what physics time grows with, so even a huge falling section gets at most
// this many boxes (a slightly blockier outline than its real shape).
const MAX_BOXES = 24;
const SMALL = 24;
const MAX_SPEED = 45;
// Rubble that has lain still this long becomes fixed scenery: it costs the physics nothing and a
// rubble pile no longer wakes up as a whole when something bumps it. It turns back into a
// moving piece when a blast or a heavy hit reaches it, or the blocks under it break.
const FREEZE_AFTER = 1.2;
const MAX_SPIN = 25;
const MEDIUM = 160;

// A box pulled in by `by` blocks on every side (but never thinner than a block).
function shrink(b, by) {
  const s = (lo, hi) => {
    const m = (lo + hi) / 2;
    const h = Math.max(0.5, (hi - lo) / 2 - by);
    return [m - h, m + h];
  };
  const [x0, x1] = s(b.x0, b.x1);
  const [y0, y1] = s(b.y0, b.y1);
  const [z0, z1] = s(b.z0, b.z1);
  return { x0, y0, z0, x1, y1, z1 };
}

// The box around a set of blocks.
function bounds(xs, ys, zs) {
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < x0) x0 = xs[i];
    if (ys[i] < y0) y0 = ys[i];
    if (zs[i] < z0) z0 = zs[i];
    if (xs[i] > x1) x1 = xs[i];
    if (ys[i] > y1) y1 = ys[i];
    if (zs[i] > z1) z1 = zs[i];
  }
  return { x0, y0, z0, x1: x1 + 1, y1: y1 + 1, z1: z1 + 1 };
}

export class Pieces {
  constructor(physics, debris, budget) {
    this.physics = physics;
    this.R = physics.R;
    this.debris = debris;
    this.budget = budget;
    this.list = [];
    this.byHandle = new Map();
    // Set by the destruction code: called when pieces land hard, shatter, fall in the water or
    // get tidied away.
    this.on = { shatter() {}, land() {}, splash() {}, poof() {}, knocked() {}, crumble() {} };
    this.now = 0;
    this.awakeCount = 0;
  }

  // Room for this many more moving pieces right now.
  get awakeRoom() {
    return this.budget.awake - this.awakeCount;
  }

  // Lowest point of a piece in the world (from its bounding box's corners).
  lowest(p) {
    const q = p.body.rotation();
    const t = p.body.translation();
    const b = p.box;
    let low = Infinity;
    for (let k = 0; k < 8; k++) {
      const [, y] = rotate(q, b[k & 1 ? 3 : 0], b[k & 2 ? 4 : 1], b[k & 4 ? 5 : 2]);
      if (y < low) low = y;
    }
    return t.y + low;
  }

  get count() {
    return this.list.length;
  }

  // Makes a piece. b: { xs, ys, zs, mats, colors } (typed or plain arrays, one entry per block),
  // pose: world position of the blocks' centroid (px, py, pz) and rotation q,
  // motion: linear (vx, vy, vz) and angular (ax, ay, az) velocity. Returns the piece, or null if
  // there's no room left to draw it.
  // inner: the piece broke off together with neighbors, so its collision shape must not stick out
  // past its blocks (see innerBoxes).
  spawn(b, pose, motion, { gen = 0, kind = 'debris', ccd = false, asleep = false, inner = false } = {}) {
    const n = b.xs.length;
    if (!n) return null;
    const xs = Int16Array.from(b.xs);
    const ys = Int16Array.from(b.ys);
    const zs = Int16Array.from(b.zs);
    // Only blocks with a side showing are drawn (a piece never changes shape, so this holds for
    // its whole life); their sides against each other are squashed in the shader.
    const hidden = hiddenFaces(xs, ys, zs);
    let shown = 0;
    for (let i = 0; i < n; i++) if (hidden[i] !== ALL_HIDDEN) shown++;
    let slots = this.debris.alloc(shown);
    if (!slots) {
      this.makeRoom(shown);
      slots = this.debris.alloc(shown);
      if (!slots) return null;
    }
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let density = 0;
    let restitution = 0;
    let friction = 0;
    const tally = new Map();
    for (let i = 0; i < n; i++) {
      cx += xs[i] + 0.5;
      cy += ys[i] + 0.5;
      cz += zs[i] + 0.5;
      const m = MATERIALS[b.mats[i]];
      density += m.density;
      restitution += m.restitution;
      friction += m.friction;
      tally.set(m.id, (tally.get(m.id) || 0) + 1);
    }
    cx /= n;
    cy /= n;
    cz /= n;
    density /= n;
    restitution /= n;
    friction /= n;
    let main = 0;
    let best = 0;
    for (const [id, k] of tally)
      if (k > best) {
        best = k;
        main = id;
      }
    const lx = new Float32Array(n);
    const ly = new Float32Array(n);
    const lz = new Float32Array(n);
    // The piece's own bounding box (around its center), for finding its lowest point cheaply.
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    // Local offsets of the drawn blocks (the same arrays when every block shows).
    const dx = shown === n ? lx : new Float32Array(shown);
    const dy = shown === n ? ly : new Float32Array(shown);
    const dz = shown === n ? lz : new Float32Array(shown);
    for (let i = 0, j = 0; i < n; i++) {
      lx[i] = (xs[i] + 0.5 - cx) * BLOCK;
      ly[i] = (ys[i] + 0.5 - cy) * BLOCK;
      lz[i] = (zs[i] + 0.5 - cz) * BLOCK;
      if (hidden[i] !== ALL_HIDDEN) {
        if (shown !== n) {
          dx[j] = lx[i];
          dy[j] = ly[i];
          dz[j] = lz[i];
        }
        this.debris.color(slots[j++], b.colors[i], hidden[i]);
      }
      box[0] = Math.min(box[0], lx[i]);
      box[1] = Math.min(box[1], ly[i]);
      box[2] = Math.min(box[2], lz[i]);
      box[3] = Math.max(box[3], lx[i]);
      box[4] = Math.max(box[4], ly[i]);
      box[5] = Math.max(box[5], lz[i]);
    }
    for (let k = 0; k < 3; k++) {
      box[k] -= BLOCK / 2;
      box[k + 3] += BLOCK / 2;
    }
    const R = this.R;
    const desc = R.RigidBodyDesc.dynamic()
      .setTranslation(pose.px, pose.py, pose.pz)
      .setRotation(pose.q || { x: 0, y: 0, z: 0, w: 1 })
      .setLinvel(motion.vx || 0, motion.vy || 0, motion.vz || 0)
      .setAngvel({ x: motion.ax || 0, y: motion.ay || 0, z: motion.az || 0 })
      .setLinearDamping(0.06)
      // Big pieces swing freely so towers topple with gusto; little ones settle quickly.
      .setAngularDamping(n > 60 ? 0.02 : 0.3)
      .setCcdEnabled(ccd)
      .setSleeping(asleep);
    const body = this.physics.world.createRigidBody(desc);
    // Mass in world units (what Rapier sees), so thresholds don't depend on block size.
    const mass = n * density * BLOCK * BLOCK * BLOCK;
    // Little chunks collide as their exact shape if that's a few boxes, otherwise as one box a bit
    // smaller than the box around them (so neighbors that broke off together don't start inside
    // each other and fly apart); medium ones as a few boxes, big sections up to MAX_BOXES.
    let shape;
    if (inner) shape = innerBoxes(xs, ys, zs, n <= SMALL ? 4 : n <= MEDIUM ? 8 : 40);
    else if (n <= SMALL) {
      shape = greedyBoxes(xs, ys, zs);
      if (shape.length > 4) shape = [shrink(bounds(xs, ys, zs), 0.3)];
    } else shape = boundedBoxes(xs, ys, zs, n <= MEDIUM ? 6 : MAX_BOXES);
    for (const box of shape) {
      const hx = (box.x1 - box.x0) / 2;
      const hy = (box.y1 - box.y0) / 2;
      const hz = (box.z1 - box.z0) / 2;
      const col = R.ColliderDesc.cuboid(hx * BLOCK - 0.01, hy * BLOCK - 0.01, hz * BLOCK - 0.01)
        .setTranslation((box.x0 + hx - cx) * BLOCK, (box.y0 + hy - cy) * BLOCK, (box.z0 + hz - cz) * BLOCK)
        .setDensity(density)
        .setFriction(friction)
        .setRestitution(restitution)
        // Hard-hit reports (for breaking and chain smashes) only from pieces big enough to do
        // either: tiny bits would just flood the event queue.
        .setActiveEvents(n >= 10 ? R.ActiveEvents.CONTACT_FORCE_EVENTS : R.ActiveEvents.NONE)
        .setContactForceEventThreshold(mass * 260);
      this.physics.world.createCollider(col, body);
    }
    // Attaching colliders wakes a body, so a prop is put to sleep only now.
    if (asleep) body.sleep();
    const piece = {
      id: nextId++,
      body,
      handle: body.handle,
      n,
      xs,
      ys,
      zs,
      lx,
      ly,
      lz,
      dx,
      dy,
      dz,
      cx,
      cy,
      cz,
      mats: Uint8Array.from(b.mats),
      colors: Uint32Array.from(b.colors),
      main,
      mass,
      slots,
      gen,
      kind,
      born: this.now,
      asleepSince: -1,
      pvx: motion.vx || 0,
      pvy: motion.vy || 0,
      pvz: motion.vz || 0,
      speed: 0,
      lastLand: -1,
      lastChain: -1,
      // When and where it last hit the ground, standing blocks or another piece (set by the
      // destruction code from contact events).
      hitAt: -1,
      stillSince: -1,
      hitX: 0,
      hitY: 0,
      hitZ: 0,
      box,
      fresh: true,
      dead: false,
    };
    this.list.push(piece);
    this.byHandle.set(body.handle, piece);
    this.awakeCount++;
    if (this.list.length > this.budget.pieces) this.makeRoom(0);
    return piece;
  }

  // A piece from grid cells (all still in the grid's frame, no rotation).
  fromGrid(grid, cells, motion, opts) {
    const n = cells.length;
    const xs = new Int16Array(n);
    const ys = new Int16Array(n);
    const zs = new Int16Array(n);
    const mats = new Uint8Array(n);
    const colors = new Uint32Array(n);
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < n; i++) {
      const c = cells[i];
      xs[i] = grid.cx(c);
      ys[i] = grid.cy(c);
      zs[i] = grid.cz(c);
      mats[i] = grid.mat[c];
      colors[i] = grid.color[c];
      cx += xs[i] + 0.5;
      cy += ys[i] + 0.5;
      cz += zs[i] + 0.5;
    }
    return this.spawn({ xs, ys, zs, mats, colors }, { px: OX + (cx / n) * BLOCK, py: (cy / n) * BLOCK, pz: OZ + (cz / n) * BLOCK }, motion, opts);
  }

  // A new piece from some of another piece's blocks (by index), keeping its pose and spin.
  // `kick` adds to the inherited velocity; `lift` raises it (out of the ground).
  fromPiece(src, idx, kick, opts = {}) {
    const n = idx.length;
    const xs = new Int16Array(n);
    const ys = new Int16Array(n);
    const zs = new Int16Array(n);
    const mats = new Uint8Array(n);
    const colors = new Uint32Array(n);
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (let i = 0; i < n; i++) {
      const k = idx[i];
      xs[i] = src.xs[k];
      ys[i] = src.ys[k];
      zs[i] = src.zs[k];
      mats[i] = src.mats[k];
      colors[i] = src.colors[k];
      mx += src.lx[k];
      my += src.ly[k];
      mz += src.lz[k];
    }
    mx /= n;
    my /= n;
    mz /= n;
    const p = src.body.translation();
    const q = src.body.rotation();
    const v = src.body.linvel();
    const w = src.body.angvel();
    const [ox, oy, oz] = rotate(q, mx, my, mz);
    // Velocity of that spot on the spinning parent: v + w × r.
    const vx = v.x + (w.y * oz - w.z * oy) + (kick.vx || 0);
    const vy = v.y + (w.z * ox - w.x * oz) + (kick.vy || 0);
    const vz = v.z + (w.x * oy - w.y * ox) + (kick.vz || 0);
    return this.spawn({ xs, ys, zs, mats, colors }, { px: p.x + ox, py: p.y + oy + (opts.lift || 0), pz: p.z + oz, q }, { vx, vy, vz, ax: w.x + (kick.ax || 0), ay: w.y + (kick.ay || 0), az: w.z + (kick.az || 0) }, opts);
  }

  // World position of each block of a piece: calls f(x, y, z, k).
  eachBlock(piece, f) {
    const p = piece.body.translation();
    const q = piece.body.rotation();
    for (let k = 0; k < piece.n; k++) {
      const [x, y, z] = rotate(q, piece.lx[k], piece.ly[k], piece.lz[k]);
      f(p.x + x, p.y + y, p.z + z, k);
    }
  }

  // World position of one block of a piece.
  eachBlockOne(piece, k, f) {
    const p = piece.body.translation();
    const [x, y, z] = rotate(piece.body.rotation(), piece.lx[k], piece.ly[k], piece.lz[k]);
    f(p.x + x, p.y + y, p.z + z);
  }

  remove(piece) {
    if (piece.dead) return;
    piece.dead = true;
    this.physics.world.removeRigidBody(piece.body);
    this.debris.release(piece.slots);
    this.byHandle.delete(piece.handle);
    const i = this.list.indexOf(piece);
    if (i >= 0) this.list.splice(i, 1);
  }

  clear() {
    for (const p of [...this.list]) this.remove(p);
    this.debris.reset();
    this.awakeCount = 0;
  }

  // After the physics world is replaced: forget every piece without touching the old world.
  forget(physics) {
    this.physics = physics;
    this.list = [];
    this.byHandle.clear();
    this.debris.reset();
    this.awakeCount = 0;
  }

  // Frees up room for `need` more blocks (and keeps the total under budget) by tidying away
  // pieces that have been lying still the longest. Never a piece that's moving.
  makeRoom(need) {
    const overBodies = this.list.length - this.budget.pieces;
    const overBlocks = need - this.debris.available;
    if (overBodies <= 0 && overBlocks <= 0) return;
    // Props nobody has touched yet (dominoes waiting their turn) are never tidied away.
    const info = this.list.filter((p) => p.kind !== 'prop' || p.moved).map((p) => ({ id: p.id, blocks: p.n, asleepFor: p.asleepSince >= 0 ? this.now - p.asleepSince : 0, age: this.now - p.born, p }));
    const byId = new Map(info.map((i) => [i.id, i.p]));
    let freed = 0;
    let removed = 0;
    for (const id of evictions(info, info.length)) {
      if (removed >= overBodies && freed >= overBlocks) break;
      const p = byId.get(id);
      this.on.poof(p);
      freed += p.slots.length;
      removed++;
      this.remove(p);
    }
  }

  // Bookkeeping after each physics step: sleep times, hard landings, shatters, tidying.
  update(now) {
    this.now = now;
    let awake = 0;
    const movers = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.dead) continue;
      const body = p.body;
      if (p.frozen) {
        if (p.kind === 'debris' && tidy({ blocks: p.n, asleepFor: now - p.asleepSince })) {
          this.on.poof(p);
          this.remove(p);
        }
        continue;
      }
      if (body.isSleeping()) {
        if (p.asleepSince < 0) p.asleepSince = now;
        if (p.stillSince < 0) p.stillSince = now;
        if (now - p.stillSince > FREEZE_AFTER && (p.kind !== 'prop' || p.moved)) this.freeze(p);
        continue;
      }
      p.asleepSince = -1;
      awake++;
      const v = body.linvel();
      // (A stack of props settling by a hair in its first moments doesn't count as knocked.)
      if (!p.moved && now - p.born > 0.5 && v.x * v.x + v.y * v.y + v.z * v.z > 6) {
        p.moved = true;
        if (p.kind === 'prop') this.on.knocked(p);
      }
      const dvx = v.x - p.pvx;
      const dvy = v.y - p.pvy;
      const dvz = v.z - p.pvz;
      const dv = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
      const before = Math.sqrt(p.pvx * p.pvx + p.pvy * p.pvy + p.pvz * p.pvz);
      p.speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      movers.push(p);
      // A safety cap: nothing in a toy box flies faster than this or spins like a drill.
      if (p.speed > MAX_SPEED) {
        const k = MAX_SPEED / p.speed;
        body.setLinvel({ x: v.x * k, y: v.y * k, z: v.z * k }, true);
      }
      const w = body.angvel();
      const spin = Math.hypot(w.x, w.y, w.z);
      if (spin > MAX_SPIN) body.setAngvel({ x: (w.x * MAX_SPIN) / spin, y: (w.y * MAX_SPIN) / spin, z: (w.z * MAX_SPIN) / spin }, true);
      // Settle quickly: a piece that has all but stopped for a moment freezes into scenery.
      // Rapier wakes a whole rubble pile whenever anything touches it, so this goes by how still
      // the piece really is, not by whether Rapier thinks it's asleep. Sooner when lots of pieces
      // are moving. (Never force a single piece to sleep: inside an awake pile Rapier then stops
      // its contacts but keeps its gravity, and it sinks through the ground.)
      const crowded = this.awakeCount > this.budget.awake;
      const slow = crowded ? p.speed < 1.5 && spin < 1.5 : p.speed < 0.6 && spin < 0.8;
      if (!slow) p.stillSince = -1;
      else {
        if (p.stillSince < 0) p.stillSince = now;
        if (now - p.stillSince > (crowded ? 0.5 : FREEZE_AFTER) && (p.kind !== 'prop' || p.moved)) {
          if (p.asleepSince < 0) p.asleepSince = now;
          this.freeze(p);
          continue;
        }
      }
      p.pvyBefore = p.pvy;
      p.pvx = v.x;
      p.pvy = v.y;
      p.pvz = v.z;
      // A sudden stop is a landing; a hard one breaks the piece apart. It has to have really hit
      // something this step (not just been shoved), and a big section (a toppling tower) only
      // breaks when it comes down on the ground: scraping over its stump or a neighbor on the
      // way down, it keeps falling in one piece.
      if (dv > 5 && before > 5) {
        const hit = now - p.hitAt < 0.05;
        const section = p.n / PER > SECTION;
        const landed = !section || (p.pvyBefore < -4 && this.lowest(p) < 1.6);
        if (hit && landed && p.n >= 10 && dv > 10 + p.gen * 4 && p.gen < 3) {
          this.on.shatter(p, dv);
          continue;
        }
        if (now - p.lastLand > 0.12) {
          p.lastLand = now;
          this.on.land(p, dv);
        }
      }
      const t = body.translation();
      if (t.y < -5 || Math.abs(t.x) > ISLAND + 30 || Math.abs(t.z) > ISLAND + 30) {
        this.on.splash(p);
        this.remove(p);
      }
    }
    this.awakeCount = awake - this.holdTo(this.budget.awake, movers, now);
  }

  // Keeps the number of moving pieces at `cap` (physics time grows with it): the slowest pieces
  // that are resting on something freeze into scenery at once, and if that's not enough, small
  // flying bits turn into crumbs. Returns how many stopped moving.
  holdTo(cap, movers, now) {
    let over = movers.length - cap;
    if (over <= 0) return 0;
    movers.sort((a, b) => a.speed - b.speed || a.n - b.n);
    let stopped = 0;
    for (const p of movers) {
      if (over <= 0) break;
      if (p.dead || p.frozen || (p.kind === 'prop' && !p.moved)) continue;
      if (p.speed < 3 && (now - p.hitAt < 0.5 || this.lowest(p) < 0.8)) {
        if (p.asleepSince < 0) p.asleepSince = now;
        this.freeze(p);
      } else if (p.n <= 24) {
        this.on.crumble(p);
        this.remove(p);
      } else continue;
      over--;
      stopped++;
    }
    return stopped;
  }

  freeze(p) {
    p.frozen = true;
    p.body.setBodyType(this.R.RigidBodyType.Fixed, false);
  }

  // Back to a moving piece (and awake).
  thaw(p) {
    if (!p.frozen || p.dead) return;
    p.frozen = false;
    p.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
    p.asleepSince = -1;
    p.stillSince = -1;
    p.pvx = p.pvy = p.pvz = 0;
  }

  // Thaws rubble around a spot (the ground or blocks under it may be about to go).
  thawNear(x, y, z, radius) {
    for (const p of this.list) {
      if (!p.frozen) continue;
      const t = p.body.translation();
      if (Math.hypot(t.x - x, t.y - y, t.z - z) < radius + Math.max(p.box[3] - p.box[0], p.box[4] - p.box[1], p.box[5] - p.box[2]) / 2) this.thaw(p);
    }
  }

  // Writes the moving pieces' blocks into the debris mesh.
  sync() {
    for (const p of this.list) {
      if (!p.fresh && (p.frozen || p.body.isSleeping())) continue;
      p.fresh = false;
      this.debris.write(p.slots, p.dx, p.dy, p.dz, p.body.translation(), p.body.rotation(), BLOCK);
    }
    this.debris.flush();
  }

  // Shoves the pieces near a blast: outward, a little upward, weaker with distance, with a
  // tumble. Only the nearest ones, as many as there's room for to move (plus a few): a blast
  // in a big rubble pile would otherwise wake hundreds of pieces at once.
  blast(x, y, z, radius, strength, lift = 0.5) {
    const near = [];
    for (const p of this.list) {
      const t = p.body.translation();
      const dx = t.x - x;
      const dy = t.y - y;
      const dz = t.z - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d <= radius) near.push([d, p, dx, dy, dz]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const room = Math.max(24, this.budget.awake - this.awakeCount + 24);
    for (const [d, p, dx, dy, dz] of near.slice(0, room)) {
      this.thaw(p);
      const k = 1 - d / radius;
      const f = strength * k * Math.min(p.mass, 40);
      const inv = 1 / Math.max(d, 0.5);
      p.body.applyImpulse({ x: dx * inv * f, y: (dy * inv + lift) * f, z: dz * inv * f }, true);
      // Tumble: set straight on the spin, so tiny pieces don't spin like drills.
      const w = p.body.angvel();
      const s = 8 * k;
      p.body.setAngvel({ x: w.x + (Math.random() - 0.5) * s, y: w.y + (Math.random() - 0.5) * s, z: w.z + (Math.random() - 0.5) * s }, true);
    }
  }

}

// Rotates (x, y, z) by quaternion q.
export function rotate(q, x, y, z) {
  const ix = q.w * x + q.y * z - q.z * y;
  const iy = q.w * y + q.z * x - q.x * z;
  const iz = q.w * z + q.x * y - q.y * x;
  const iw = -q.x * x - q.y * y - q.z * z;
  return [ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y, iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z, iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x];
}
