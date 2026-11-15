// Structural checks after blocks are removed:
//   floating(): pieces no longer connected to the ground (they fall).
//   weakNecks(): pieces still connected, but only through a thin neck compared with how they were
//     built (a tower whose base is mostly cut away). Those come loose too and topple, which makes
//     cutting one side of a tower tip it that way.
// Neighbors are the 6 face neighbors. Pure data, no three.js.
import { MATERIALS } from './materials.js';

// How much each block of height (mass per block of base) raises the share of base a piece needs.
export const SLENDER = 0.0018;
// How far around the damage the weak-neck check looks (little blocks).
export const WINDOW = 14;
// A link leaving that window holds up this much of a block: thick walls still prop a tower up a
// bit, but nothing like solid ground, so towers joined to walls still come down.
export const ANCHOR = 0.4;

export class Structure {
  constructor(grid) {
    this.grid = grid;
    // Each search stamps the cells it reaches with its own number, so a search can tell its own
    // cells from cells an earlier search this round already reached.
    this.visit = new Uint32Array(grid.size);
    this.counter = 0;
    this.stack = new Int32Array(grid.size);
    // Which columns (x, z) a search has already listed.
    this.colMark = new Uint32Array(grid.sx * grid.sz);
  }

  round() {
    if (this.counter > 4e9) {
      this.visit.fill(0);
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

  // region: grid box { x0, y0, z0, x1, y1, z1 } that was just damaged. For each cut plane
  // between layer y and y + 1 across it, find each piece of structure *above* the plane that
  // touches the damage. Its support is the blocks at the plane still resting on something; what
  // it wants is what that same layer had when the scene was built, in the columns the piece
  // stands in (blocks a crater has since knocked out still count: they were holding it up),
  // scaled by the material's `neck`. Comparing with its widest layer instead would make every
  // tower look too thin to hold up a roof wider than itself.
  // Only blocks within WINDOW of the damage are looked at. Where the piece carries on outside
  // the window (a bridge to the next tower, a long wall), each block-to-block link that leaves
  // the window counts as one block of support: a thick wall holds a tower up, a thin bridge
  // doesn't, and a tower joined to its neighbor by a bridge falls on its own, snapping the
  // bridge, instead of dragging the neighbor down with it.
  // Returns [{ cells, support, wanted, mass }] for the pieces that are too weak. maxMass skips
  // pieces too big to matter.
  // step: check every `step`-th cut plane (planes one little block apart are nearly the same).
  weakNecks(region, { maxMass = 60000, minMass = 10, step = 1 } = {}) {
    const { grid, visit, stack, colMark } = this;
    const { mat, base, built, sx, sy, sz, layer } = grid;
    const out = [];
    const xa = Math.max(0, region.x0 - 1);
    const xb = Math.min(sx - 1, region.x1 + 1);
    const za = Math.max(0, region.z0 - 1);
    const zb = Math.min(sz - 1, region.z1 + 1);
    const ya = Math.max(0, region.y0 - 1);
    const yb = Math.min(sy - 2, region.y1);
    const wx0 = Math.max(0, region.x0 - WINDOW);
    const wx1 = Math.min(sx - 1, region.x1 + WINDOW);
    const wz0 = Math.max(0, region.z0 - WINDOW);
    const wz1 = Math.min(sz - 1, region.z1 + WINDOW);
    const taken = new Set();
    const nb = [0, 0, 0, 0, 0, 0];
    const cols = [];
    for (let y = ya; y <= yb; y += step) {
      const start = this.round();
      const floorY = y + 1;
      for (let z = za; z <= zb; z++)
        for (let x = xa; x <= xb; x++) {
          const seed = grid.index(x, floorY, z);
          if (!mat[seed] || visit[seed] >= start || taken.has(seed)) continue;
          const id = ++this.counter;
          let top = 0;
          stack[top++] = seed;
          visit[seed] = id;
          const cells = [];
          let support = 0;
          let anchors = 0;
          let tooBig = false;
          cols.length = 0;
          while (top > 0) {
            const c = stack[--top];
            if (!tooBig) {
              cells.push(c);
              if (cells.length > maxMass) tooBig = true;
            }
            const cy = Math.floor(c / layer);
            if (cy === floorY && mat[c - layer]) support++;
            const cx = c % sx;
            const cz = Math.floor(c / sx) % sz;
            const col = cx + sx * cz;
            if (colMark[col] !== id) {
              colMark[col] = id;
              cols.push(col);
            }
            // Sideways links leaving the window are anchors, not part of the piece.
            nb[0] = cx + 1 < sx ? (cx + 1 <= wx1 ? c + 1 : -2) : -1;
            nb[1] = cx > 0 ? (cx - 1 >= wx0 ? c - 1 : -3) : -1;
            nb[2] = cz + 1 < sz ? (cz + 1 <= wz1 ? c + sx : -4) : -1;
            nb[3] = cz > 0 ? (cz - 1 >= wz0 ? c - sx : -5) : -1;
            nb[4] = cy + 1 < sy ? c + layer : -1;
            nb[5] = cy > floorY ? c - layer : -1;
            for (let k = 0; k < 6; k++) {
              let n = nb[k];
              if (n < -1) {
                const out = n === -2 ? c + 1 : n === -3 ? c - 1 : n === -4 ? c + sx : c - sx;
                if (mat[out]) anchors++;
                continue;
              }
              if (n < 0 || !mat[n] || visit[n] >= start) continue;
              visit[n] = id;
              stack[top++] = n;
            }
          }
          support += anchors * ANCHOR;
          if (tooBig || cells.length < minMass || support === 0) continue;
          // What this layer had under the piece when it was built (in the columns the piece
          // stands in): a tower holding up a wider roof is judged by its own walls, not the roof.
          let wanted = 0;
          let neck = 0;
          for (const col of cols) {
            const c = col + floorY * layer;
            if (built[c] && base[c]) {
              wanted++;
              neck += MATERIALS[built[c]].neck;
            }
          }
          if (!wanted) continue;
          // Tall, top-heavy pieces need more of their base: a tower falls sooner than a shed.
          const share = Math.min(0.85, neck / wanted + SLENDER * (cells.length / wanted));
          if (support < Math.max(2, wanted * share) && support < wanted) {
            for (const c of cells) taken.add(c);
            out.push({ cells, support, wanted, mass: cells.length });
          }
        }
    }
    return out;
  }
}
