// The heart of the game: what happens when something hits the blocks.
//
//   impact()  carves the hit: the middle is blown to dust and crumbs, and the rest of the hole
//             flies off as the building's own blocks (loose single blocks, see physics/spray.js),
//             fast from the middle and tumbling off the rim, with a few small chunks that are
//             real physics pieces.
//   update()  then, once a frame, checks the structure: anything no longer connected to the
//             ground falls, and anything hanging on by a thin neck comes loose and topples. A big
//             section sheds blocks where it broke and cracks into a few lengths as it goes.
//   Pieces that land hard burst: loose blocks where they hit, small chunks further along, and
//   slabs that break again when they land. Pieces that slam into standing blocks smash those too
//   (chain reactions), TNT blocks go off, and gift blocks pop open with a surprise.
import { carveSphere, carveCapsule, carveColumn } from './core/carve.js';
import { clumps, crackSection } from './core/chunker.js';
import { shatterPlan } from './core/budget.js';
import { MATERIALS, MAT } from './core/materials.js';
import { BLOCK, cellX, cellY, cellZ, gridX, gridY, gridZ } from './core/grid.js';

// Block counts scale with volume: one old-size block is this many little ones.
const PER = Math.round(1 / (BLOCK * BLOCK * BLOCK));
import * as sfx from './sfx.js';

const MAX_REGIONS_PER_FRAME = 3;
const MAX_SHATTERS_PER_FRAME = 2;
const MAX_CHAINS_PER_FRAME = 4;
// New physics pieces per frame: a big blast throws a few dozen real chunks and turns the rest to
// crumbs (cheap particles), so one hit never costs the iPad a long frame.
const MAX_NEW_PIECES_PER_FRAME = 70;
// Small chunks (real physics pieces) a hit knocks off its rim: the rest of it flies as loose
// single blocks.
const CHUNKS_PER_HIT = 12;
// A falling section bigger than this (little blocks) cracks into a few lengths.
const CRACK_OVER = 600;
// Bits of a cracked section smaller than this fall as loose single blocks.
const BIT = 30;

export class Destruction {
  constructor(game) {
    this.g = game;
    this.seeds = [];
    this.regions = [];
    this.shatters = [];
    this.chains = [];
    this.timers = [];
    this.tntQueue = [];
    this.smashedTotal = 0;
    this.startBlocks = 1;
    this.celebrated = false;
    this.spawned = 0;
    // Loose single blocks thrown this frame (a hit throws at most budget.sprayHit a frame).
    this.sprayed = 0;
  }

  reset(blocks) {
    this.seeds.length = 0;
    this.regions.length = 0;
    this.shatters.length = 0;
    this.chains.length = 0;
    this.timers.length = 0;
    this.tntQueue.length = 0;
    this.smashedTotal = 0;
    this.startBlocks = Math.max(1, blocks);
    this.celebrated = false;
  }

  // Share of the scene's blocks no longer standing.
  get wrecked() {
    return 1 - this.g.grid.count / this.startBlocks;
  }

  // A hit at world (x, y, z). Sizes are in world units.
  //   shape 'sphere' (radius), 'capsule' (to {x,y,z}), 'column' (half-width hw, depth)
  //   power: how hard pieces fly (1 = meteor). dir: a push direction for the chunks.
  //   quiet: a chain hit (fewer effects).
  // Returns how many (little) blocks broke.
  impact({ x, y, z, radius = 3, power = 1, shape = 'sphere', to = null, hw = 2, depth = 6, dir = null, quiet = false, shellChance, heat = false, chunky = 1, bite = null }) {
    const { grid, rand } = this.g;
    // Rubble and fallen sections caught in the hit get chewed up too, not just shoved.
    if (!quiet && !heat) {
      const b = bite || { x, y, z, radius };
      this.biteLoose(b.x, b.y, b.z, b.radius, power);
    }
    const gx = gridX(x);
    const gy = gridY(y);
    const gz = gridZ(z);
    const gr = radius / BLOCK;
    let cut;
    const seed = Math.floor(rand() * 1e9);
    if (shape === 'capsule') cut = carveCapsule(grid, gx, gy, gz, gridX(to.x), gridY(to.y), gridZ(to.z), gr, rand, { seed, shellChance: shellChance ?? 0.7 });
    else if (shape === 'column') cut = carveColumn(grid, gx, gz, hw / BLOCK, depth / BLOCK, rand, { seed });
    else cut = carveSphere(grid, gx, gy, gz, gr, rand, { seed, shellChance: shellChance ?? 0.85 });
    const { core, shell } = cut;
    if (!core.length && !shell.length) return 0;

    // Glass never flies off whole: it shatters.
    const loose = [];
    for (const c of shell) (MATERIALS[grid.mat[c]].pulverize ? core : loose).push(c);
    // Rubble lying around the hit (maybe on the very blocks being knocked out) can move again.
    this.g.pieces.thawNear(x, y, z, radius * 1.6 + 2);
    // Ragged bits left hanging on by one side around the hole drop off too.
    if (!heat) this.dangling(core, loose, gx, gy, gz, gr * (shape === 'column' ? 2 : 1.9) + 1);
    const removed = core.concat(loose);
    // The middle of a blast is blown to dust (and anything a laser melts); the rest of the hole
    // flies off as its own blocks.
    const dust = [];
    const fly = [];
    const inner = (gr * 0.45) ** 2;
    for (const c of core) {
      let gone = heat || MATERIALS[grid.mat[c]].pulverize;
      if (!gone) {
        if (shape === 'sphere') {
          const dx = grid.cx(c) + 0.5 - gx;
          const dy = grid.cy(c) + 0.5 - gy;
          const dz = grid.cz(c) + 0.5 - gz;
          gone = dx * dx + dy * dy + dz * dz < inner;
        } else gone = rand() < 0.25;
      }
      (gone ? dust : fly).push(c);
    }
    // A few small chunks from the rim; the rest of the rim flies as single blocks too.
    for (const c of this.chunks(loose, x, y, z, power, dir, chunky)) fly.push(c);
    for (const c of this.sprayCells(fly, x, y, z, radius, power, dir)) dust.push(c);
    this.smash(dust, x, y, z, power, { quiet, heat });
    const n = removed.length;
    this.noteRegion(removed);
    this.g.onBroke(n, x, y, z, quiet);
    return n;
  }

  // Pulverizes cells: crumbs, dust and a crunch.
  smash(cells, x, y, z, power, { quiet = false, heat = false } = {}) {
    if (!cells.length) return 0;
    const { grid, fx } = this.g;
    const tally = new Map();
    let dustAmount = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const c of cells) {
      const m = grid.mat[c];
      if (!m) continue;
      const mat = MATERIALS[m];
      const cx = cellX(grid.cx(c));
      const cy = cellY(grid.cy(c));
      const cz = cellZ(grid.cz(c));
      fx.crumble(cx, cy, cz, grid.color[c], m, x, y, z, power * (quiet ? 0.6 : 1));
      tally.set(mat.sound, (tally.get(mat.sound) || 0) + 1);
      dustAmount += mat.dust;
      sumX += cx;
      sumY += cy;
      sumZ += cz;
      this.remove(c);
    }
    const n = cells.length;
    const dust = dustAmount / PER;
    if (dust > 0.5 && !heat) fx.dustCloud(sumX / n, sumY / n, sumZ / n, Math.min(20, 2 + dust * 0.35), 3 + Math.sqrt(n / PER) * 0.5, grid.color[cells[0]] || 0xddcbb0, { rise: 1.5, size: 2.2, life: 2.2 });
    const pan = this.g.panOf(x, y, z);
    for (const [family, k] of tally) sfx.crunch(k / PER, family, pan);
    return n;
  }

  // Around a hole (grid center gx, gy, gz, radius r in cells), blocks left holding on by just one
  // side, or by nothing but a corner, get knocked loose with the rest: no ragged needles left.
  dangling(core, loose, gx, gy, gz, r) {
    const { grid } = this.g;
    const taken = new Set(core);
    for (const c of loose) taken.add(c);
    const x0 = Math.max(0, Math.floor(gx - r));
    const x1 = Math.min(grid.sx - 1, Math.ceil(gx + r));
    const y0 = Math.max(0, Math.floor(gy - r));
    const y1 = Math.min(grid.sy - 1, Math.ceil(gy + r));
    const z0 = Math.max(0, Math.floor(gz - r));
    const z1 = Math.min(grid.sz - 1, Math.ceil(gz + r));
    const { mat, sx, layer } = grid;
    const alive = (i) => mat[i] && !taken.has(i);
    for (let pass = 0; pass < 2; pass++) {
      const found = [];
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++)
          for (let x = x0; x <= x1; x++) {
            const i = grid.index(x, y, z);
            if (!alive(i) || MATERIALS[mat[i]].special) continue;
            let n = y === 0 ? 1 : 0;
            if (x > 0 && alive(i - 1)) n++;
            if (x + 1 < grid.sx && alive(i + 1)) n++;
            if (z > 0 && alive(i - sx)) n++;
            if (z + 1 < grid.sz && alive(i + sx)) n++;
            if (y > 0 && alive(i - layer)) n++;
            if (y + 1 < grid.sy && alive(i + layer)) n++;
            if (n <= 1) found.push(i);
          }
      for (const i of found) {
        taken.add(i);
        loose.push(i);
      }
      if (!found.length) break;
    }
  }

  // A few small chunks (real physics pieces: they tumble and knock into things) from cells knocked
  // loose, thrown away from (x, y, z). Returns the cells left over.
  chunks(cells, x, y, z, power, dir, chunky = 1) {
    if (!cells.length) return cells;
    const { grid, pieces, rand } = this.g;
    const n = cells.length;
    const xs = new Int16Array(n);
    const ys = new Int16Array(n);
    const zs = new Int16Array(n);
    const groups = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = grid.cx(cells[i]);
      ys[i] = grid.cy(cells[i]);
      zs[i] = grid.cz(cells[i]);
      groups[i] = grid.mat[cells[i]];
    }
    // Chunks of 2 to 6 little blocks.
    const lo = Math.max(2, Math.round(2 * chunky));
    const hi = Math.max(lo, Math.round(6 * chunky));
    const groupsOut = clumps(xs, ys, zs, lo, hi, rand, groups);
    const room = Math.min(pieces.awakeRoom, MAX_NEW_PIECES_PER_FRAME - this.spawned, Math.round(CHUNKS_PER_HIT * chunky));
    // The biggest clumps become pieces; the rest is left over.
    groupsOut.sort((a, b) => b.length - a.length);
    const left = [];
    for (let k = 0; k < groupsOut.length; k++) {
      const idx = groupsOut[k];
      const part = idx.map((i) => cells[i]);
      if (k >= room) {
        for (const c of part) left.push(c);
        continue;
      }
      let px = 0;
      let py = 0;
      let pz = 0;
      for (const c of part) {
        px += cellX(grid.cx(c));
        py += cellY(grid.cy(c));
        pz += cellZ(grid.cz(c));
      }
      px /= part.length;
      py /= part.length;
      pz /= part.length;
      let ax = px - x;
      let ay = py - y;
      let az = pz - z;
      const d = Math.hypot(ax, ay, az) || 1;
      ax /= d;
      ay /= d;
      az /= d;
      const speed = power * (9 + rand() * 9) * Math.max(0.35, 1.3 - d * 0.08);
      let vx = ax * speed;
      let vy = (ay * 0.6 + 0.45) * speed;
      let vz = az * speed;
      if (dir) {
        vx = vx * 0.45 + dir.x * speed * 0.9;
        vy = vy * 0.6 + (dir.y + 0.25) * speed * 0.6;
        vz = vz * 0.45 + dir.z * speed * 0.9;
      }
      const spin = 7 * power;
      const piece = pieces.fromGrid(grid, part, { vx, vy, vz, ax: (rand() - 0.5) * spin, ay: (rand() - 0.5) * spin, az: (rand() - 0.5) * spin }, { inner: true });
      if (!piece) {
        for (const c of part) left.push(c);
        continue;
      }
      this.spawned++;
      for (const c of part) this.remove(c, true);
    }
    return left;
  }

  // Throws standing cells off as loose single blocks, flying out from (x, y, z): fast from the
  // middle of the hit, slow at its edge (so the rim slumps and tumbles off), pushed along `dir`
  // when the hit has one. As many as this frame's allowance and the pool allow; returns the rest.
  sprayCells(cells, x, y, z, radius, power, dir) {
    if (!cells.length) return cells;
    const { grid, spray, rand, budget, fx } = this.g;
    let room = Math.max(0, Math.round(budget.sprayHit * fx.intensity) - this.sprayed);
    // Not room for all: take them from all over the hole.
    if (cells.length > room) {
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = cells[i];
        cells[i] = cells[j];
        cells[j] = t;
      }
    }
    const left = [];
    const reach = radius * 1.6;
    const tally = new Map();
    let dust = 0;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let k = 0;
    for (const c of cells) {
      const m = grid.mat[c];
      if (!m) continue;
      if (room <= 0) {
        left.push(c);
        continue;
      }
      const px = cellX(grid.cx(c));
      const py = cellY(grid.cy(c));
      const pz = cellZ(grid.cz(c));
      let ax = px - x;
      let ay = py - y;
      let az = pz - z;
      const d = Math.hypot(ax, ay, az) || 1;
      ax /= d;
      ay /= d;
      az /= d;
      const f = Math.min(1, d / reach);
      const speed = power * ((9 + rand() * 9) * (1 - f) + (2 + rand() * 3) * f);
      let vx = (ax + (rand() - 0.5) * 0.7) * speed;
      let vy = (ay * 0.6 + 0.5 + (rand() - 0.5) * 0.5) * speed;
      let vz = (az + (rand() - 0.5) * 0.7) * speed;
      if (dir) {
        vx = vx * 0.5 + dir.x * speed * 0.8;
        vy = vy * 0.6 + (dir.y + 0.3) * speed * 0.5;
        vz = vz * 0.5 + dir.z * speed * 0.8;
      }
      if (!spray.emit(px, py, pz, vx, vy, vz, grid.color[c], m, null, 3 + 10 * power * (1 - f * 0.6))) {
        left.push(c);
        room = 0;
        continue;
      }
      room--;
      this.sprayed++;
      const mat = MATERIALS[m];
      tally.set(mat.sound, (tally.get(mat.sound) || 0) + 1);
      dust += mat.dust;
      sx += px;
      sy += py;
      sz += pz;
      k++;
      this.remove(c);
    }
    if (k) {
      const pan = this.g.panOf(x, y, z);
      for (const [family, n] of tally) sfx.crunch(n / PER, family, pan);
      const amount = (dust / PER) * 0.5;
      if (amount > 0.5) fx.dustCloud(sx / k, sy / k, sz / k, Math.min(14, 2 + amount * 0.3), 3 + Math.sqrt(k / PER) * 0.5, grid.color[cells[0]] || 0xddcbb0, { rise: 1.5, size: 2.2, life: 2.2 });
    }
    return left;
  }

  // Throws blocks of a piece off as loose single blocks (k: block indices, world positions in
  // wx/wy/wz): each keeps the piece's turn and the speed of its spot on the piece, plus a kick
  // away from (hx, hy, hz). Returns the indices there wasn't room for.
  sprayPiece(p, ks, wx, wy, wz, hx, hy, hz, kick) {
    const { spray, rand, budget, fx } = this.g;
    let room = Math.max(0, Math.round(budget.sprayHit * fx.intensity) - this.sprayed);
    const left = [];
    const t = p.body.translation();
    const q = p.body.rotation();
    const v = p.body.linvel();
    const w = p.body.angvel();
    for (const k of ks) {
      if (room <= 0) {
        left.push(k);
        continue;
      }
      const rx = wx[k] - t.x;
      const ry = wy[k] - t.y;
      const rz = wz[k] - t.z;
      let ox = wx[k] - hx;
      let oy = wy[k] - hy;
      let oz = wz[k] - hz;
      const d = Math.hypot(ox, oy, oz) || 1;
      ox /= d;
      oy /= d;
      oz /= d;
      const s = kick * (0.4 + 0.6 * rand());
      const vx = v.x + (w.y * rz - w.z * ry) + (ox + (rand() - 0.5) * 0.6) * s;
      const vy = v.y + (w.z * rx - w.x * rz) + (Math.max(0, oy) * 0.5 + 0.4 + rand() * 0.4) * s;
      const vz = v.z + (w.x * ry - w.y * rx) + (oz + (rand() - 0.5) * 0.6) * s;
      if (!spray.emit(wx[k], wy[k], wz[k], vx, vy, vz, p.colors[k], p.mats[k], q, 3 + kick * 0.6)) {
        left.push(k);
        room = 0;
        continue;
      }
      room--;
      this.sprayed++;
    }
    return left;
  }

  // Takes one block out of the standing structure everywhere it lives: the grid, the drawn
  // blocks and the physics. Its neighbors become seeds for the next structure check.
  remove(c, keepSpecial = false) {
    const { grid, statics, physics } = this.g;
    const m = grid.mat[c];
    if (!m) return;
    const x = grid.cx(c);
    const y = grid.cy(c);
    const z = grid.cz(c);
    if (!keepSpecial) this.special(m, cellX(x), cellY(y), cellZ(z));
    grid.remove(c);
    statics.remove(c);
    physics.removeCell(x, y, z);
    // Loose blocks lying on it fall.
    this.g.spray.groundChanged();
    const { sx, sz, sy, layer, mat } = grid;
    // Neighbors become seeds for the structure check, and any that were buried come into view.
    const near = (n) => {
      if (!mat[n]) return;
      this.seeds.push(n);
      statics.expose(n);
    };
    if (x + 1 < sx) near(c + 1);
    if (x > 0) near(c - 1);
    if (z + 1 < sz) near(c + sx);
    if (z > 0) near(c - sx);
    if (y + 1 < sy) near(c + layer);
    if (y > 0) near(c - layer);
  }

  // TNT goes off a moment after it's hit (blocks hit together make one bigger bang); a gift
  // pops open.
  special(m, x, y, z) {
    const s = MATERIALS[m].special;
    if (s === 'tnt') this.tntQueue.push([x, y, z]);
    else if (s === 'gift') this.g.surprise(x, y, z);
  }

  // Groups this frame's lit TNT blocks into crates and lights one fuse per crate.
  lightFuses() {
    const q = this.tntQueue;
    this.tntQueue = [];
    const crates = [];
    for (const [x, y, z] of q) {
      const c = crates.find((k) => Math.hypot(k.x / k.n - x, k.y / k.n - y, k.z / k.n - z) < 3.5);
      if (c) {
        c.x += x;
        c.y += y;
        c.z += z;
        c.n++;
      } else crates.push({ x, y, z, n: 1 });
    }
    for (const c of crates) {
      const at = this.g.time + 0.25 + this.g.rand() * 0.2;
      this.timers.push({ at, run: () => this.g.tnt(c.x / c.n, c.y / c.n, c.z / c.n, c.n) });
      this.g.fuse(c.x / c.n, c.y / c.n, c.z / c.n, at - this.g.time);
    }
  }

  noteRegion(cells) {
    if (!cells.length) return;
    const { grid } = this.g;
    let x0 = Infinity;
    let y0 = Infinity;
    let z0 = Infinity;
    let x1 = -1;
    let y1 = -1;
    let z1 = -1;
    for (const c of cells) {
      const x = grid.cx(c);
      const y = grid.cy(c);
      const z = grid.cz(c);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (z < z0) z0 = z;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      if (z > z1) z1 = z;
    }
    // Merge with an overlapping pending region, so a laser sweep is one region, not hundreds.
    for (const r of this.regions) {
      if (x0 <= r.x1 + 2 && x1 >= r.x0 - 2 && y0 <= r.y1 + 2 && y1 >= r.y0 - 2 && z0 <= r.z1 + 2 && z1 >= r.z0 - 2) {
        r.x0 = Math.min(r.x0, x0);
        r.y0 = Math.min(r.y0, y0);
        r.z0 = Math.min(r.z0, z0);
        r.x1 = Math.max(r.x1, x1);
        r.y1 = Math.max(r.y1, y1);
        r.z1 = Math.max(r.z1, z1);
        return;
      }
    }
    this.regions.push({ x0, y0, z0, x1, y1, z1 });
  }

  // Cuts a set of still-standing cells loose: it falls. topple: the damaged region, so it leans
  // toward the side that lost its support. Where it broke it crumbles (blocks next to the damage
  // fall off on their own), and a big section cracks into a few lengths that all start falling
  // as one and come apart as they go.
  detach(cells, topple = null) {
    const { grid, pieces, rand } = this.g;
    let motion = { vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0 };
    if (topple) {
      // Tip it over toward the damage, pivoting on its base edge on that side: the spin and the
      // sideways speed have to match that pivot, or the base just grinds into the stump.
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let base = Infinity;
      for (const c of cells) {
        cx += grid.cx(c) + 0.5;
        cy += grid.cy(c) + 0.5;
        cz += grid.cz(c) + 0.5;
        base = Math.min(base, grid.cy(c));
      }
      // (All in grid cells until the end, where distances become world units.)
      cx /= cells.length;
      cy /= cells.length;
      cz /= cells.length;
      const hx = (topple.x0 + topple.x1 + 1) / 2;
      const hz = (topple.z0 + topple.z1 + 1) / 2;
      let dx = hx - cx;
      let dz = hz - cz;
      const d = Math.hypot(dx, dz);
      if (d < 0.01) {
        const a = this.g.rand() * Math.PI * 2;
        dx = Math.cos(a);
        dz = Math.sin(a);
      } else {
        dx /= d;
        dz /= d;
      }
      // The pivot: the edge, toward d, of the blocks still resting on something.
      let edge = -Infinity;
      for (const c of cells) {
        if (grid.cy(c) !== base || !grid.mat[c - grid.layer]) continue;
        edge = Math.max(edge, (grid.cx(c) + 0.5 - cx) * dx + (grid.cz(c) + 0.5 - cz) * dz);
      }
      const reach = (Number.isFinite(edge) ? edge : 0) * BLOCK;
      const h = Math.max(1, (cy - base) * BLOCK);
      // Cartoon physics: a good shove so it goes over right away instead of creaking.
      const k = Math.min(1.4, 0.55 + 6 / h);
      // ω about the axis up × d; COM velocity = ω × (COM - pivot).
      const ax = dz * k;
      const az = -dx * k;
      const rx = -dx * reach;
      const ry = h;
      const rz = -dz * reach;
      motion = { vx: -az * ry, vy: az * rx - ax * rz, vz: ax * ry, ax, ay: 0, az };
    }
    // How a spot on the falling section moves: its centre's speed plus the turn.
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (const c of cells) {
      mx += cellX(grid.cx(c));
      my += cellY(grid.cy(c));
      mz += cellZ(grid.cz(c));
    }
    mx /= cells.length;
    my /= cells.length;
    mz /= cells.length;
    const wx = motion.ax || 0;
    const wy = motion.ay || 0;
    const wz = motion.az || 0;
    const velAt = (px, py, pz) => {
      const rx = px - mx;
      const ry = py - my;
      const rz = pz - mz;
      return [motion.vx + (wy * rz - wz * ry), motion.vy + (wz * rx - wx * rz), motion.vz + (wx * ry - wy * rx)];
    };
    // Shed: next to the damage it crumbles.
    let keep = cells;
    const loose = [];
    if (topple) {
      keep = [];
      const m = 2;
      const limit = Math.min(500, Math.floor(cells.length * 0.25));
      for (const c of cells) {
        const x = grid.cx(c);
        const y = grid.cy(c);
        const z = grid.cz(c);
        const near = x >= topple.x0 - m && x <= topple.x1 + m && y >= topple.y0 - m && y <= topple.y1 + m && z >= topple.z0 - m && z <= topple.z1 + m;
        if (near && loose.length < limit && rand() < 0.75) loose.push(c);
        else keep.push(c);
      }
    }
    // Crack: a few lengths if it's big and there's room for them to move; bits left on their own
    // (shedding can leave some) fall as single blocks.
    // What's left falls as one piece (or a few, if shedding cut it in two); bits left on their
    // own fall as single blocks. A big one cracks into lengths a moment later (crack()).
    const n = keep.length;
    const xs = new Int16Array(n);
    const ys = new Int16Array(n);
    const zs = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = grid.cx(keep[i]);
      ys[i] = grid.cy(keep[i]);
      zs[i] = grid.cz(keep[i]);
    }
    const parts = loose.length ? crackSection(xs, ys, zs, 1, rand).parts : [Array.from({ length: n }, (_, i) => i)];
    const split = parts.length > 1 || loose.length > 0;
    let main = null;
    for (const part of parts) {
      const pc = part.map((i) => keep[i]);
      if (split && pc.length < BIT) {
        for (const c of pc) loose.push(c);
        continue;
      }
      let px = 0;
      let py = 0;
      let pz = 0;
      for (const c of pc) {
        px += cellX(grid.cx(c));
        py += cellY(grid.cy(c));
        pz += cellZ(grid.cz(c));
      }
      const [vx, vy, vz] = velAt(px / pc.length, py / pc.length, pz / pc.length);
      const piece = pieces.fromGrid(grid, pc, { vx, vy, vz, ax: wx, ay: wy, az: wz }, { gen: 0, inner: split });
      if (!piece) {
        for (const c of pc) loose.push(c);
        continue;
      }
      this.spawned++;
      main ||= piece;
      for (const c of pc) this.remove(c, true);
      if (pc.length > CRACK_OVER) {
        piece.crackAt = this.g.time + 0.12 + rand() * 0.08;
        piece.crackParts = Math.min(4, 2 + Math.floor(pc.length / 4000));
        piece.crackLag = !!topple;
      }
    }
    if (loose.length) {
      const left = this.sprayFalling(loose, velAt);
      if (left.length) {
        // No room to show them at all: they crumble.
        const c = left[0];
        this.smash(left.slice(0, 1500), cellX(grid.cx(c)), cellY(grid.cy(c)), cellZ(grid.cz(c)), 0.5, { quiet: true });
        for (const c2 of left) this.remove(c2);
      }
    }
    const family = MATERIALS[main ? main.main : grid.mat[cells[0]] || MAT.PLASTIC]?.sound || 'plastic';
    sfx.crunch(Math.min(30, cells.length / PER / 6), family, this.g.panOf(mx, my, mz));
  }

  // A falling section cracks into a few lengths, a moment after it came loose: each length
  // carries on with the speed of its spot on the section, and on a toppling tower the higher ones
  // lag behind the turn (they can't keep up), so it visibly comes apart at the cracks. Some
  // blocks along the cracks crumble out as single blocks.
  crack(p) {
    p.crackAt = 0;
    const { pieces, rand } = this.g;
    const room = Math.min(p.crackParts, Math.max(0, pieces.awakeRoom) + 1, MAX_NEW_PIECES_PER_FRAME - this.spawned);
    if (room < 2) return;
    const { parts, seam } = crackSection(p.xs, p.ys, p.zs, room, rand, { seam: 0.6, seamMax: 400 });
    if (parts.length < 2) return;
    const n = p.n;
    const wx = new Float32Array(n);
    const wy = new Float32Array(n);
    const wz = new Float32Array(n);
    pieces.eachBlock(p, (x, y, z, k) => {
      wx[k] = x;
      wy[k] = y;
      wz[k] = z;
    });
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < n; k++) {
      if (p.ys[k] < y0) y0 = p.ys[k];
      if (p.ys[k] > y1) y1 = p.ys[k];
    }
    const t = p.body.translation();
    const v = p.body.linvel();
    const w = p.body.angvel();
    const bits = [...seam];
    let made = 0;
    for (const part of parts) {
      if (part.length < BIT || made >= room) {
        for (const k of part) bits.push(k);
        continue;
      }
      let rx = 0;
      let ry = 0;
      let rz = 0;
      let ly = 0;
      for (const k of part) {
        rx += wx[k];
        ry += wy[k];
        rz += wz[k];
        ly += p.ys[k];
      }
      const m = part.length;
      rx = rx / m - t.x;
      ry = ry / m - t.y;
      rz = rz / m - t.z;
      // This spot's speed on the turning section, and how much of it the length keeps.
      const vx = v.x + (w.y * rz - w.z * ry);
      const vy = v.y + (w.z * rx - w.x * rz);
      const vz = v.z + (w.x * ry - w.y * rx);
      const up = (ly / m - y0) / Math.max(1, y1 - y0);
      const lose = p.crackLag ? 0.3 * up : 0;
      const kick = { vx: -lose * vx + (rand() - 0.5) * 0.8, vy: -lose * vy, vz: -lose * vz + (rand() - 0.5) * 0.8, ax: -lose * w.x, ay: -lose * w.y, az: -lose * w.z };
      if (pieces.fromPiece(p, part, kick, { gen: p.gen, inner: true })) {
        made++;
        this.spawned++;
      } else for (const k of part) bits.push(k);
    }
    const left = this.sprayPiece(p, bits, wx, wy, wz, t.x, t.y, t.z, 1.5);
    for (const k of left) this.g.fx.crumble(wx[k], wy[k], wz[k], p.colors[k], p.mats[k], t.x, t.y, t.z, 0.3);
    sfx.crunch(Math.min(20, n / PER / 8), MATERIALS[p.main].sound, this.g.panOf(t));
    pieces.remove(p);
  }

  // Standing cells that fall off with a moving section, as loose single blocks moving with it
  // (velAt gives the section's speed at a spot) plus a little jostle. Returns the ones there's
  // no room for.
  sprayFalling(cells, velAt) {
    const { grid, spray, rand, budget, fx } = this.g;
    let room = Math.max(0, Math.round(budget.sprayHit * fx.intensity) - this.sprayed);
    const left = [];
    for (const c of cells) {
      const m = grid.mat[c];
      if (!m) continue;
      if (room <= 0) {
        left.push(c);
        continue;
      }
      const px = cellX(grid.cx(c));
      const py = cellY(grid.cy(c));
      const pz = cellZ(grid.cz(c));
      const [vx, vy, vz] = velAt(px, py, pz);
      if (!spray.emit(px, py, pz, vx + (rand() - 0.5) * 1.6, vy + rand() * 0.8, vz + (rand() - 0.5) * 1.6, grid.color[c], m, null, 3)) {
        left.push(c);
        room = 0;
        continue;
      }
      room--;
      this.sprayed++;
      this.remove(c);
    }
    return left;
  }

  // A piece hit something hard enough to break apart. It breaks where it hit: its own blocks
  // burst off loose right at the impact, small chunks a little further along, and the far end
  // breaks into slabs that carry on falling and break again when they land themselves. So a
  // toppling tower bursts along its length as it comes down. No block is ever thrown away: when
  // there's little room, the pieces just come out bigger.
  // opts (for bites): point = where it was hit, near/mid = zone sizes, vaporize = the near zone
  // turns to crumbs (or, with spray, to loose blocks), keepGen = the new pieces can still break
  // on landing.
  shatter(p, dv, opts = {}) {
    if (p.dead) return;
    const { pieces, rand, fx, time } = this.g;
    const n = p.n;
    const eq = n / PER;
    const t = p.body.translation();
    const pan = this.g.panOf(t);
    // Every block's world position.
    const wx = new Float32Array(n);
    const wy = new Float32Array(n);
    const wz = new Float32Array(n);
    let low = 0;
    pieces.eachBlock(p, (x, y, z, k) => {
      wx[k] = x;
      wy[k] = y;
      wz[k] = z;
      if (y < wy[low]) low = k;
    });
    // If it broke while sunk into the ground, its pieces start lifted clear (or the physics
    // would shove them out of the ground and send them flying).
    const lift = Math.max(0, 0.03 - (wy[low] - BLOCK / 2));
    // Where it hit: the contact point from the physics, or else its lowest block.
    const recent = time - p.hitAt < 0.2;
    const at = opts.point;
    const hx = at ? at.x : recent ? p.hitX : wx[low];
    const hy = at ? at.y : recent ? p.hitY : wy[low];
    const hz = at ? at.z : recent ? p.hitZ : wz[low];
    const dist = new Float32Array(n);
    for (let k = 0; k < n; k++) dist[k] = Math.hypot(wx[k] - hx, wy[k] - hy, wz[k] - hz);
    let room = Math.max(1, Math.min(pieces.awakeRoom + 1, MAX_NEW_PIECES_PER_FRAME - this.spawned));
    // A fallen section's first landing always breaks it into a few slabs at least, even when
    // lots is moving already (the moving-pieces cap then freezes the slowest to make up).
    const section = p.gen === 0 && eq > 150;
    if (section) room = Math.max(room, 5);
    // (A section bursts over more of its length.)
    const near = opts.near ?? (section ? Math.min(9, 4.5 + Math.sqrt(eq) * 0.12) : Math.min(8, 3.5 + Math.sqrt(eq) * 0.08));
    const crumbsOnly = opts.vaporize && !opts.spray;
    const plan = shatterPlan(dist, room, { near, mid: opts.mid ?? near + 4, eq: opts.near ? Infinity : eq, sprayNear: !crumbsOnly });
    // Clump each zone on its own.
    const zones = [[], [], []];
    for (let k = 0; k < n; k++) zones[plan.zone[k]].push(k);
    const parts = [];
    zones.forEach((idx, z) => {
      if (!idx.length) return;
      const [lo, hi] = plan.sizes[z];
      const sub = (arr) => idx.map((k) => arr[k]);
      for (const c of clumps(sub(p.xs), sub(p.ys), sub(p.zs), lo, hi, rand, sub(p.mats))) parts.push({ idx: c.map((j) => idx[j]), zone: z });
    });
    // Right at the impact it bursts into its own blocks, flying loose (a laser's bite melts to
    // crumbs instead, as many as can be shown this frame). Any there's no room for stay small
    // chunks.
    const crumbRoom = Math.floor(fx.crumbBudget * 0.7);
    const dust = [];
    const kept = [];
    const burst = [];
    for (const part of parts) {
      if (crumbsOnly && part.zone === 0) {
        if (dust.length + part.idx.length <= crumbRoom) dust.push(...part.idx);
        else kept.push(part);
      } else if (!crumbsOnly && (part.zone === 0 || part.idx.length <= 2)) burst.push(...part.idx);
      else kept.push(part);
    }
    // A TNT block in the piece goes off as it breaks.
    let tnt = false;
    for (let k = 0; k < n; k++) if (p.mats[k] === MAT.TNT) tnt = [wx[k], wy[k], wz[k]];
    for (const k of dust) fx.crumble(wx[k], wy[k], wz[k], p.colors[k], p.mats[k], hx, hy - 1, hz, 0.55);
    // Dust where it hit, and along the part that came down (zone 0 and 1).
    const landed = zones[0].length ? zones[0].concat(zones[1]) : zones[1].length ? zones[1] : zones[2];
    const puffs = opts.vaporize ? 1 : Math.min(16, 2 + Math.round(Math.sqrt(landed.length / PER)));
    for (let i = 0; i < puffs; i++) {
      const k = landed[Math.floor(rand() * landed.length)];
      fx.dustCloud(wx[k], Math.max(0.3, wy[k] - 0.5), wz[k], 2, 3.5, p.colors[k], { ring: true, rise: 1.5, size: 2.4, life: 2.4 });
    }
    if (eq > 100 && !opts.vaporize) {
      fx.bursts.ring(hx, 0.1, hz, 8 + Math.sqrt(eq) * 0.2, { color: 0xffffff, life: 0.55, width: 0.22, alpha: 0.6 });
      fx.shake.add(Math.min(0.45, 0.12 + eq / 5000));
      this.g.wave(hx, hz, Math.min(1.2, eq / 1500));
    }
    // A big landing jolts the loose blocks lying around it.
    if (eq > 20 && !opts.vaporize) this.g.spray.blast(hx, hy, hz, 2 + Math.sqrt(eq) * 0.3, Math.min(8, 2 + dv * 0.15), 0.7);
    if (burst.length) {
      const kick = opts.vaporize ? 3 + dv * 0.1 : Math.min(9, 2 + dv * 0.25);
      const missed = this.sprayPiece(p, burst, wx, wy, wz, hx, hy, hz, kick);
      if (missed.length) {
        const sub = (arr) => missed.map((k) => arr[k]);
        for (const c of clumps(sub(p.xs), sub(p.ys), sub(p.zs), 6, 24, rand, sub(p.mats))) kept.push({ idx: c.map((j) => missed[j]), zone: 0 });
      }
    }
    // New pieces keep the motion of the spot they came from (so the far end keeps swinging
    // down); the ones at the impact also get knocked outward.
    for (const part of kept) {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const k of part.idx) {
        cx += wx[k];
        cy += wy[k];
        cz += wz[k];
      }
      const m = part.idx.length;
      let ox = cx / m - hx;
      let oy = cy / m - hy;
      let oz = cz / m - hz;
      const d = Math.hypot(ox, oy, oz) || 1;
      ox /= d;
      oy /= d;
      oz /= d;
      // (The far slabs get a nudge apart too, so they come to rest as separate lumps.)
      const kick = part.zone === 0 ? Math.min(9, 2 + dv * 0.25) : part.zone === 1 ? Math.min(4, 1 + dv * 0.1) : Math.min(2, dv * 0.06);
      const spin = part.zone === 0 ? 4 : part.zone === 1 ? 1.5 : 0.6;
      const motion = { vx: ox * kick * (0.6 + 0.4 * rand()), vy: kick * (0.3 + 0.5 * rand()) + Math.max(0, oy) * kick * 0.3, vz: oz * kick * (0.6 + 0.4 * rand()), ax: (rand() - 0.5) * spin, ay: (rand() - 0.5) * spin, az: (rand() - 0.5) * spin };
      if (pieces.fromPiece(p, part.idx, motion, { gen: opts.keepGen ? p.gen : p.gen + 1, lift, inner: true })) this.spawned++;
      else for (const k of part.idx) fx.crumble(wx[k], wy[k], wz[k], p.colors[k], p.mats[k], hx, hy, hz, 0.4);
    }
    if (opts.vaporize) sfx.crunch(Math.min(20, dust.length / PER + 1), MATERIALS[p.main].sound, pan);
    else {
      fx.landing(hx, hy, hz, eq, p.colors[0]);
      sfx.land(eq, MATERIALS[p.main].sound, pan, 1);
      sfx.crunch(Math.min(60, eq / 3), MATERIALS[p.main].sound, pan);
    }
    pieces.remove(p);
    this.g.onBroke(dust.length + Math.round(n * 0.1), hx, hy, hz, true);
    if (tnt) this.tntQueue.push(tnt);
  }

  // Takes a bite out of a loose piece (rubble, a fallen tower, frozen or not) at `point`: little
  // pieces come apart, bigger ones lose the blocks within `radius` and the rest carries on as
  // pieces. spray: what comes off flies as loose blocks (a blast); otherwise it turns to crumbs
  // (the laser). This is how tools chew through rubble instead of just pushing it.
  bite(p, point, radius, power = 0.5, { spray = false } = {}) {
    if (!p || p.dead) return false;
    const { pieces, time, fx } = this.g;
    if (time - (p.lastBite ?? -1) < 0.15) return false;
    p.lastBite = time;
    pieces.thaw(p);
    if (p.n <= 24) {
      let tnt = null;
      const wx = new Float32Array(p.n);
      const wy = new Float32Array(p.n);
      const wz = new Float32Array(p.n);
      pieces.eachBlock(p, (x, y, z, k) => {
        wx[k] = x;
        wy[k] = y;
        wz[k] = z;
        if (p.mats[k] === MAT.TNT) tnt = [x, y, z];
      });
      const all = Array.from({ length: p.n }, (_, k) => k);
      const left = spray ? this.sprayPiece(p, all, wx, wy, wz, point.x, point.y, point.z, 3 + power * 6) : all;
      for (const k of left) fx.crumble(wx[k], wy[k], wz[k], p.colors[k], p.mats[k], point.x, point.y, point.z, 0.4 + power * 0.4);
      sfx.crunch(p.n / PER + 1, MATERIALS[p.main].sound, this.g.panOf(point));
      pieces.remove(p);
      this.g.onBroke(p.n, point.x, point.y, point.z, true);
      if (tnt) this.tntQueue.push(tnt);
      return true;
    }
    this.shatter(p, 12 + power * 6, { point, near: radius, mid: radius * 2.5, vaporize: true, keepGen: true, spray });
    return true;
  }

  // Bites every loose piece with a block within `radius` of (x, y, z): nearest first, at most
  // `max` of them.
  biteLoose(x, y, z, radius, power, max = 4) {
    const { pieces } = this.g;
    const hits = [];
    for (const p of pieces.list) {
      if (p.dead) continue;
      const t = p.body.translation();
      const b = p.box;
      const reach = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2;
      if (Math.hypot(t.x - x, t.y - y, t.z - z) > radius + reach) continue;
      let best = Infinity;
      pieces.eachBlock(p, (bx, by, bz) => {
        const d = Math.hypot(bx - x, by - y, bz - z);
        if (d < best) best = d;
      });
      if (best <= radius) hits.push([best, p]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [, p] of hits.slice(0, max)) this.bite(p, { x, y, z }, radius, power, { spray: true });
  }

  // Once a frame: structure checks, queued shatters and chain hits, fuses.
  update() {
    const { structure, time } = this.g;
    this.spawned = 0;
    this.sprayed = 0;
    if (this.seeds.length) {
      const seeds = this.seeds;
      this.seeds = [];
      for (const comp of structure.floating(seeds)) this.detach(comp);
    }
    for (let k = 0; k < MAX_REGIONS_PER_FRAME && this.regions.length; k++) {
      const region = this.regions.shift();
      for (const weak of structure.weakNecks(region, { step: 2, minMass: 40 })) {
        if (weak.cells.every((c) => this.g.grid.mat[c])) this.detach(weak.cells, region);
      }
    }
    // At most one section cracks a frame (it's a lot of work).
    for (const p of this.g.pieces.list) {
      if (p.crackAt && time >= p.crackAt && !p.dead) {
        this.crack(p);
        break;
      }
    }
    for (let k = 0; k < MAX_SHATTERS_PER_FRAME && this.shatters.length; k++) {
      const [p, dv] = this.shatters.shift();
      this.shatter(p, dv);
      // A big section breaking up is a lot of work: one of those per frame.
      if (p.n / PER > 150) break;
    }
    for (let k = 0; k < MAX_CHAINS_PER_FRAME && this.chains.length; k++) this.chainHit(this.chains.shift());
    this.chains.length = 0;
    if (this.tntQueue.length) this.lightFuses();
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= time);
      this.timers = this.timers.filter((t) => t.at > time);
      for (const t of due) t.run();
    }
  }

  // A flying piece slammed into standing blocks: they break too.
  chainHit({ p, x, y, z, speed }) {
    if (p.dead) return;
    const radius = Math.min(2.4, 0.7 + Math.cbrt(p.mass) * 0.35 * (speed / 18));
    const n = this.impact({ x, y, z, radius, power: 0.55, quiet: true, chunky: 0.8 });
    if (n > 0) {
      // The piece loses some of its speed punching through.
      const v = p.body.linvel();
      const keep = Math.max(0.5, 1 - (n / PER) * 0.04);
      p.body.setLinvel({ x: v.x * keep, y: v.y * keep, z: v.z * keep }, true);
    }
  }

  // Contact events from the physics step (only hard hits make them). Every piece involved notes
  // that it hit something and where, which is what lets it break; and a flying piece that
  // slams into standing blocks smashes them too.
  contact(ev) {
    const { physics, pieces, time } = this.g;
    const world = physics.world;
    const a = world.getCollider(ev.collider1());
    const b = world.getCollider(ev.collider2());
    if (!a || !b) return;
    const pieceOf = (c) => {
      const body = c.parent();
      const p = body && pieces.byHandle.get(body.handle);
      return p && !p.dead ? p : null;
    };
    const pa = pieceOf(a);
    const pb = pieceOf(b);
    if (!pa && !pb) return;
    let point = null;
    world.contactPair(a, b, (m) => {
      if (!point && m.numSolverContacts() > 0) point = m.solverContactPoint(0);
    });
    // Something heavy and fast hitting frozen rubble knocks it loose again.
    for (const [still, other] of [
      [pa, pb],
      [pb, pa],
    ]) {
      if (!still?.frozen || !other || other.frozen) continue;
      const speed = Math.hypot(other.pvx, other.pvy, other.pvz);
      if (speed > 6 && other.mass * speed * speed > still.mass * 60) pieces.thaw(still);
    }
    for (const p of [pa, pb]) {
      if (!p) continue;
      p.hitAt = time;
      if (point) {
        p.hitX = point.x;
        p.hitY = point.y;
        p.hitZ = point.z;
      } else {
        const t = p.body.translation();
        p.hitX = t.x;
        p.hitY = t.y;
        p.hitZ = t.z;
      }
    }
    // Chain hits: a piece slamming into standing blocks.
    const p = physics.isStatic(a) ? pb : physics.isStatic(b) ? pa : null;
    if (!p || !point || time - p.lastChain < 0.25) return;
    const speed = Math.hypot(p.pvx, p.pvy, p.pvz);
    if (speed < 11 || p.mass * speed * speed < 600) return;
    p.lastChain = time;
    this.chains.push({ p, x: point.x, y: point.y, z: point.z, speed });
  }
}
