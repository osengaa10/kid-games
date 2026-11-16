// Structural checks after blocks are removed:
//   floating(): pieces no longer connected to the ground (they fall).
//   weakNecks() / checkPlane(): pieces still connected, but with their weight now well off to one
//     side of what's left holding them up (a tower cut most of the way through from one side), or
//     standing on a sliver of what they were built on. Those come loose too and topple, which
//     makes cutting one side of a tower tip it that way.
// Neighbors are the 6 face neighbors. Pure data, no three.js.
import { MATERIALS } from './materials.js';

// How far off-centre a piece's weight may get before it tips: the distance from the middle of
// what holds it up to its centre of mass, as a share of how far that support reaches that way
// (0 = right over the middle, 1 = right over the edge). Real stacked blocks tip at 1; this tips
// sooner, a bit like the middle-third rule for walls. A tower stands after a crater takes a
// quarter of its base from one side; at 0.75 a laser cut has to get about 90% of the way across,
// or a row of craters most of the way along one side.
export const OFF_CENTRE = 0.75;
// Even balanced, a piece needs this share of what the `neck` rule asks for (the material's
// neck, plus SLENDER for tall pieces), so it doesn't stay up on a couple of slivers.
export const SHARE = 0.55;
// How much each block of height (mass per block of base) raises the share of base a piece needs.
export const SLENDER = 0.0018;
// How far around the damage (and around all the support a piece has lost) the weak-neck check
// looks (little blocks).
export const WINDOW = 14;
// A link leaving that window holds up this much of a block: thick walls still prop a tower up a
// bit, but nothing like solid ground, so towers joined to walls still come down.
export const ANCHOR = 0.4;
// ...and only this many links per column outside count: a wall joining the piece is as strong as
// it is thick, not as tall, so a tall body sliced by the window's edge is never a foundation.
export const ANCHOR_DEPTH = 4;
// Held sideways by anchors worth more than this share of its base, a piece doesn't tip on its own.
export const HOLD = 0.15;
// How many times one check widens its window to take in more of the piece's lost support.
const MAX_GROW = 4;

export class Structure {
  constructor(grid) {
    this.grid = grid;
    // Each search stamps the cells it reaches with its own number, so a search can tell its own
    // cells from cells an earlier search this round already reached.
    this.visit = new Uint32Array(grid.size);
    this.counter = 0;
    this.stack = new Int32Array(grid.size);
    const cols = grid.sx * grid.sz;
    // Which columns (x, z) a search has already listed, and the list.
    this.colMark = new Uint32Array(cols);
    this.colList = new Int32Array(cols);
    // Links counted so far into each outside column (anchors), per search.
    this.anchorMark = new Uint32Array(cols);
    this.anchorLinks = new Uint8Array(cols);
    // The cells of the last search (grows as needed).
    this.cellBuf = new Int32Array(4096);
    // The columns of the last search's support (still holding it up) and what it was built on.
    this.supList = new Int32Array(cols);
    this.builtList = new Int32Array(cols);
    // What the last search found (reused, so a check allocates nothing per cell).
    this.res = { id: 0, n: 0, cols: 0, support: 0, anchors: 0, sumX: 0, sumZ: 0 };
    this.lost = { n: 0, x0: 0, z0: 0, x1: 0, z1: 0, sumX: 0, sumZ: 0, wanted: 0, neck: 0, held: 0 };
  }

  round() {
    if (this.counter > 4e9) {
      this.visit.fill(0);
      this.colMark.fill(0);
      this.anchorMark.fill(0);
      this.counter = 0;
    }
    return this.counter + 1;
  }

  // seeds: filled cells next to blocks that were just removed. Returns the pieces that no longer
  // reach the ground, each a list of cell indices. Searches try downward first and stop as soon
  // as they touch the ground (or a cell an earlier, grounded search reached), so a building
  // that still stands costs little.
  floating(seeds) {
    const { grid, visit, stack } = this;
    const { mat, sx, sy, sz, layer } = grid;
    const start = this.round();
    const out = [];
    const nb = [0, 0, 0, 0, 0, 0];
    for (const seed of seeds) {
      if (!mat[seed] || visit[seed] >= start) continue;
      const id = ++this.counter;
      let top = 0;
      stack[top++] = seed;
      visit[seed] = id;
      const comp = [];
      let grounded = false;
      search: while (top > 0) {
        const c = stack[--top];
        comp.push(c);
        const y = Math.floor(c / layer);
        if (y === 0) {
          grounded = true;
          break;
        }
        const x = c % sx;
        const z = Math.floor(c / sx) % sz;
        // The last one pushed is searched first, so down goes last.
        nb[0] = y + 1 < sy ? c + layer : -1;
        nb[1] = z + 1 < sz ? c + sx : -1;
        nb[2] = z > 0 ? c - sx : -1;
        nb[3] = x + 1 < sx ? c + 1 : -1;
        nb[4] = x > 0 ? c - 1 : -1;
        nb[5] = c - layer;
        for (let k = 0; k < 6; k++) {
          const n = nb[k];
          if (n < 0 || !mat[n]) continue;
          const v = visit[n];
          if (v === id) continue;
          if (v >= start) {
            grounded = true;
            break search;
          }
          visit[n] = id;
          stack[top++] = n;
        }
      }
      if (!grounded) out.push(comp);
    }
    return out;
  }

  // The cut planes to check for a damaged region (grid box { x0, y0, z0, x1, y1, z1 }), as the
  // layer each piece would stand on (floorY: the plane is between floorY - 1 and floorY). Every
  // `step`-th plane across the damage (planes one little block apart are nearly the same), and
  // always the top of the hole: a piece left hanging by a few blocks at its rim shows there.
  planesFor(region, step = 1) {
    const sy = this.grid.sy;
    const lo = Math.max(0, region.y0 - 1) + 1;
    const hi = Math.min(sy - 2, region.y1) + 1;
    const out = [];
    for (let f = lo; f <= hi; f += step) out.push(f);
    for (const f of [region.y1, region.y1 + 1]) if (f >= lo && f <= hi && !out.includes(f)) out.push(f);
    return out.sort((a, b) => a - b);
  }

  // Whether the region's own footprint lost any support at this plane. If it didn't, nothing
  // standing on the plane is worse off than before this hit, so the plane needn't be checked.
  lostUnder(region, floorY) {
    const { mat, base, built, sx, sz, layer } = this.grid;
    const x0 = Math.max(0, region.x0 - 1);
    const x1 = Math.min(sx - 1, region.x1 + 1);
    const z0 = Math.max(0, region.z0 - 1);
    const z1 = Math.min(sz - 1, region.z1 + 1);
    for (let z = z0; z <= z1; z++) {
      let c = x0 + sx * z + floorY * layer;
      for (let x = x0; x <= x1; x++, c++) if (built[c] && base[c] && !(mat[c] && mat[c - layer])) return true;
    }
    return false;
  }

  // Region: grid box { x0, y0, z0, x1, y1, z1 } that was just damaged. For each cut plane across
  // it, finds each piece of structure *above* the plane that touches the damage and returns the
  // ones too weak to stand: [{ cells, support, wanted, mass, plane, lost }]. (The game runs the
  // planes one at a time with checkPlane, a few per frame; this does them all at once.)
  // maxMass skips pieces too big to matter. step: check every `step`-th plane.
  weakNecks(region, { maxMass = 60000, minMass = 10, step = 1 } = {}) {
    const taken = new Set();
    const out = [];
    for (const floorY of this.planesFor(region, step)) for (const w of this.checkPlane(region, floorY, taken, { maxMass, minMass })) out.push(w);
    return out;
  }

  // The weak pieces standing on one cut plane (floorY) around a damaged region.
  // A piece's support is its blocks at the plane still resting on something. It tips when its
  // centre of mass has moved OFF_CENTRE further off-centre over that support than it was over
  // what it was built on (so a tower cut from one side leans out over the cut, while a flag or a
  // balcony built hanging out doesn't drop at a nick). And it needs SHARE of what the `neck`
  // rule wants: what that same layer had when the scene was built, in the columns the piece stands
  // in (blocks a crater has since knocked out still count: they were holding it up), scaled by
  // the material's `neck`. Comparing with its widest layer instead would make every tower look
  // too thin to hold up a roof wider than itself.
  // Blocks are looked at within WINDOW of the damage, and of all the support the piece has lost
  // at this plane (a laser sweep across a tower is judged as one cut, not one beam at a time).
  // Where the piece carries on outside the window (a bridge to the next tower, a long wall), each
  // block-to-block link leaving the window holds up ANCHOR of a block (at most ANCHOR_DEPTH links
  // per column): a thick wall holds a tower up a little, a thin bridge doesn't, and a tower
  // joined to its neighbor by a bridge falls on its own, snapping the bridge, instead of dragging
  // the neighbor down with it.
  // taken: cells already found weak by an earlier plane (shared across one region's planes).
  checkPlane(region, floorY, taken, { maxMass = 60000, minMass = 10 } = {}) {
    const { grid, visit } = this;
    const { mat, sx, sz } = grid;
    const out = [];
    if (floorY < 1 || floorY >= grid.sy || !this.lostUnder(region, floorY)) return out;
    const start = this.round();
    const w0 = this.windowAround(region.x0, region.z0, region.x1, region.z1, null);
    const za = Math.max(0, region.z0 - 1);
    const zb = Math.min(sz - 1, region.z1 + 1);
    const xa = Math.max(0, region.x0 - 1);
    const xb = Math.min(sx - 1, region.x1 + 1);
    for (let z = za; z <= zb; z++)
      for (let x = xa; x <= xb; x++) {
        const seed = grid.index(x, floorY, z);
        if (!mat[seed] || visit[seed] >= start || taken.has(seed)) continue;
        let w = w0;
        const res = this.res;
        const lost = this.lost;
        for (let grow = 0; ; grow++) {
          this.flood(seed, floorY, w, grow ? this.round() : start, maxMass);
          this.measure(floorY);
          // The piece carries on past the window and has lost support near its edge: look wider,
          // until the window takes in all the support it lost (and WINDOW around that).
          if (!res.anchors || !lost.n || grow >= MAX_GROW) break;
          const nw = this.windowAround(lost.x0, lost.z0, lost.x1, lost.z1, w);
          if (nw.x0 === w.x0 && nw.x1 === w.x1 && nw.z0 === w.z0 && nw.z1 === w.z1) break;
          w = nw;
        }
        const wanted = lost.wanted;
        const support = res.support + res.anchors * ANCHOR;
        if (res.n > maxMass || res.n < minMass || support === 0 || !wanted) continue;
        // Tall, top-heavy pieces need more of their base: a tower falls sooner than a shed.
        const share = SHARE * Math.min(0.85, lost.neck / wanted + SLENDER * (res.n / wanted));
        let weak = support < Math.max(2, wanted * share) && support < wanted;
        // Its weight off to one side of what's left: it tips over. Unless it's held sideways by
        // more than a little (a thin bridge doesn't stop a tower tipping; walls all round do), and
        // only if it was built balanced over its base (centre of mass within reach).
        if (!weak && res.anchors * ANCHOR <= HOLD * wanted && res.support < wanted) {
          const mx = res.sumX / res.n + 0.5;
          const mz = res.sumZ / res.n + 0.5;
          const was = this.offCentre(this.builtList, wanted, mx, mz);
          weak = was <= 1 && this.offCentre(this.supList, lost.held, mx, mz) > was + OFF_CENTRE;
        }
        if (!weak) continue;
        const cells = Array.from(this.cellBuf.subarray(0, res.n));
        for (const c of cells) taken.add(c);
        out.push({
          cells,
          support,
          wanted,
          mass: res.n,
          plane: floorY,
          // Where it lost its support (grid cells; cx, cz its middle): it leans that way.
          lost: lost.n ? { n: lost.n, x0: lost.x0, z0: lost.z0, x1: lost.x1, z1: lost.z1, cx: lost.sumX / lost.n + 0.5, cz: lost.sumZ / lost.n + 0.5 } : null,
        });
      }
    return out;
  }

  // The window WINDOW around a box of columns, joined with `around` if given, inside the grid.
  windowAround(x0, z0, x1, z1, around) {
    const { sx, sz } = this.grid;
    const w = { x0: Math.max(0, x0 - WINDOW), z0: Math.max(0, z0 - WINDOW), x1: Math.min(sx - 1, x1 + WINDOW), z1: Math.min(sz - 1, z1 + WINDOW) };
    if (around) {
      w.x0 = Math.min(w.x0, around.x0);
      w.z0 = Math.min(w.z0, around.z0);
      w.x1 = Math.max(w.x1, around.x1);
      w.z1 = Math.max(w.z1, around.z1);
    }
    return w;
  }

  // Floods the piece standing on the plane under floorY from `seed`, never going below floorY
  // and never leaving window w sideways (links leaving it are counted as anchors). Cells stamped
  // `stamp` or later belong to searches already done. Results go in this.res and this.cellBuf.
  flood(seed, floorY, w, stamp, maxMass) {
    const { grid, visit, stack, colMark, colList } = this;
    const { mat, sx, sy, sz, layer } = grid;
    const id = ++this.counter;
    let buf = this.cellBuf;
    let top = 0;
    stack[top++] = seed;
    visit[seed] = id;
    let n = 0;
    let nCols = 0;
    let support = 0;
    let anchors = 0;
    let sumX = 0;
    let sumZ = 0;
    const wx0 = w.x0;
    const wx1 = w.x1;
    const wz0 = w.z0;
    const wz1 = w.z1;
    const yTop = sy - 1;
    while (top > 0) {
      const c = stack[--top];
      if (n <= maxMass) {
        if (n === buf.length) {
          const bigger = new Int32Array(Math.min(maxMass + 1, n * 2));
          bigger.set(buf);
          this.cellBuf = buf = bigger;
        }
        buf[n] = c;
      }
      n++;
      const y = (c / layer) | 0;
      const r = c - y * layer;
      const z = (r / sx) | 0;
      const x = r - z * sx;
      sumX += x;
      sumZ += z;
      if (colMark[r] !== id) {
        colMark[r] = id;
        colList[nCols++] = r;
      }
      if (y === floorY && mat[c - layer]) support++;
      // Sideways: inside the window it's more of the piece, a link leaving it is an anchor.
      if (x + 1 < sx && mat[c + 1]) {
        if (x + 1 > wx1) anchors += this.link(r + 1, id);
        else if (visit[c + 1] < stamp) {
          visit[c + 1] = id;
          stack[top++] = c + 1;
        }
      }
      if (x > 0 && mat[c - 1]) {
        if (x - 1 < wx0) anchors += this.link(r - 1, id);
        else if (visit[c - 1] < stamp) {
          visit[c - 1] = id;
          stack[top++] = c - 1;
        }
      }
      if (z + 1 < sz && mat[c + sx]) {
        if (z + 1 > wz1) anchors += this.link(r + sx, id);
        else if (visit[c + sx] < stamp) {
          visit[c + sx] = id;
          stack[top++] = c + sx;
        }
      }
      if (z > 0 && mat[c - sx]) {
        if (z - 1 < wz0) anchors += this.link(r - sx, id);
        else if (visit[c - sx] < stamp) {
          visit[c - sx] = id;
          stack[top++] = c - sx;
        }
      }
      if (y < yTop && mat[c + layer] && visit[c + layer] < stamp) {
        visit[c + layer] = id;
        stack[top++] = c + layer;
      }
      if (y > floorY && mat[c - layer] && visit[c - layer] < stamp) {
        visit[c - layer] = id;
        stack[top++] = c - layer;
      }
    }
    const res = this.res;
    res.id = id;
    res.n = n;
    res.cols = nCols;
    res.support = support;
    res.anchors = anchors;
    res.sumX = sumX;
    res.sumZ = sumZ;
  }

  // One more link into an outside column: counts as an anchor unless that column already gave
  // ANCHOR_DEPTH of them to this search.
  link(col, id) {
    if (this.anchorMark[col] !== id) {
      this.anchorMark[col] = id;
      this.anchorLinks[col] = 0;
    }
    if (this.anchorLinks[col] >= ANCHOR_DEPTH) return 0;
    this.anchorLinks[col]++;
    return 1;
  }

  // For the last flood: what the plane had under the piece when the scene was built (wanted,
  // neck; its columns in builtList), which of that still holds it up (held; supList) and which
  // it has lost since. Results go in this.lost.
  measure(floorY) {
    const { mat, base, built, sx, layer } = this.grid;
    const { colList, supList, builtList, visit } = this;
    const { cols: nCols, id } = this.res;
    let wanted = 0;
    let neck = 0;
    let n = 0;
    let held = 0;
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -1;
    let z1 = -1;
    let sumX = 0;
    let sumZ = 0;
    const off = floorY * layer;
    for (let i = 0; i < nCols; i++) {
      const col = colList[i];
      const c = col + off;
      const b = built[c];
      if (!b || !base[c]) continue;
      builtList[wanted++] = col;
      neck += MATERIALS[b].neck;
      if (mat[c] && mat[c - layer]) {
        // (Still standing, and part of this piece rather than something else under it.)
        if (visit[c] === id) supList[held++] = col;
        continue;
      }
      const z = (col / sx) | 0;
      const x = col - z * sx;
      n++;
      sumX += x;
      sumZ += z;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    const lost = this.lost;
    lost.n = n;
    lost.x0 = x0;
    lost.z0 = z0;
    lost.x1 = x1;
    lost.z1 = z1;
    lost.sumX = sumX;
    lost.sumZ = sumZ;
    lost.wanted = wanted;
    lost.neck = neck;
    lost.held = held;
  }

  // How far off-centre a centre of mass (mx, mz, in grid units) sits over the columns list[0..n):
  // its distance from their middle, as a share of how far they reach in that direction (0 right
  // over the middle, 1 over the far edge, more past it). Infinity over nothing.
  offCentre(list, n, mx, mz) {
    if (!n) return Infinity;
    const sx = this.grid.sx;
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < n; i++) {
      const z = (list[i] / sx) | 0;
      cx += list[i] - z * sx;
      cz += z;
    }
    cx = cx / n + 0.5;
    cz = cz / n + 0.5;
    const ex = mx - cx;
    const ez = mz - cz;
    const e = Math.hypot(ex, ez);
    if (e < 1e-6) return 0;
    let reach = -Infinity;
    for (let i = 0; i < n; i++) {
      const z = (list[i] / sx) | 0;
      const d = ((list[i] - z * sx + 0.5 - cx) * ex + (z + 0.5 - cz) * ez) / e;
      if (d > reach) reach = d;
    }
    // (+0.5: to the far side of the last column, not its middle.)
    return e / Math.max(0.5, reach + 0.5);
  }
}
