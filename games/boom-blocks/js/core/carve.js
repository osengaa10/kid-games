// Which blocks a hit takes out. Every shape returns two lists of grid cell indices:
//   core:  blocks smashed to crumbs
//   shell: blocks knocked loose around the edge, which fly off as chunks
// Coordinates are in grid space (cell x spans [x, x+1]). The edge gets a stable per-cell wobble so
// craters come out ragged, and tougher materials hold on a little better.
import { MATERIALS } from './materials.js';
import { hash01 } from './rng.js';

const NOISE = 0.24;

function classify(grid, i, d, radius, shell, shellChance, rand, seed, out) {
  const m = MATERIALS[grid.mat[i]];
  const wobble = 1 + NOISE * (hash01(i, seed) - 0.5) * 2;
  const r = radius * wobble * (1 - m.strength * 0.25);
  if (d <= r) out.core.push(i);
  else if (d <= r * shell) {
    const t = (d - r) / (r * (shell - 1));
    if (rand() < shellChance * (1 - t * 0.85) * (1 - m.strength * 0.5)) out.shell.push(i);
  }
}

function bounds(grid, x0, y0, z0, x1, y1, z1) {
  return [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0)), Math.max(0, Math.floor(z0)), Math.min(grid.sx - 1, Math.floor(x1)), Math.min(grid.sy - 1, Math.floor(y1)), Math.min(grid.sz - 1, Math.floor(z1))];
}

// A ball of damage around (cx, cy, cz).
export function carveSphere(grid, cx, cy, cz, radius, rand, { shell = 1.55, shellChance = 0.75, seed = 0 } = {}) {
  const out = { core: [], shell: [] };
  const reach = radius * shell * (1 + NOISE);
  const [x0, y0, z0, x1, y1, z1] = bounds(grid, cx - reach, cy - reach, cz - reach, cx + reach, cy + reach, cz + reach);
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const i = grid.index(x, y, z);
        if (!grid.mat[i]) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz);
        classify(grid, i, d, radius, shell, shellChance, rand, seed, out);
      }
  return out;
}

// Damage along a line segment from a to b (a ball dragged through a wall, a laser slice).
export function carveCapsule(grid, ax, ay, az, bx, by, bz, radius, rand, { shell = 1.5, shellChance = 0.7, seed = 0 } = {}) {
  const out = { core: [], shell: [] };
  const reach = radius * shell * (1 + NOISE);
  const [x0, y0, z0, x1, y1, z1] = bounds(grid, Math.min(ax, bx) - reach, Math.min(ay, by) - reach, Math.min(az, bz) - reach, Math.max(ax, bx) + reach, Math.max(ay, by) + reach, Math.max(az, bz) + reach);
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len2 = dx * dx + dy * dy + dz * dz || 1;
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const i = grid.index(x, y, z);
        if (!grid.mat[i]) continue;
        const px = x + 0.5 - ax;
        const py = y + 0.5 - ay;
        const pz = z + 0.5 - az;
        const t = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) / len2));
        const d = Math.hypot(px - dx * t, py - dy * t, pz - dz * t);
        classify(grid, i, d, radius, shell, shellChance, rand, seed, out);
      }
  return out;
}

// A downward crush: a square footprint (half-width hw) from the top of whatever stands at
// (cx, cz) down `depth` layers. The top gets pulverized, the layers under it knocked loose.
export function carveColumn(grid, cx, cz, hw, depth, rand, { seed = 0 } = {}) {
  const out = { core: [], shell: [] };
  const [x0, , z0, x1, , z1] = bounds(grid, cx - hw, 0, cz - hw, cx + hw, 0, cz + hw);
  let top = -1;
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++)
      for (let y = grid.sy - 1; y > top; y--)
        if (grid.mat[grid.index(x, y, z)]) {
          top = y;
          break;
        }
  if (top < 0) return out;
  const bottom = Math.max(0, top - depth);
  for (let y = top; y >= bottom; y--)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const i = grid.index(x, y, z);
        if (!grid.mat[i]) continue;
        const edge = Math.max(Math.abs(x + 0.5 - cx), Math.abs(z + 0.5 - cz)) / (hw + 0.5);
        const deep = (top - y) / (depth + 1);
        const wobble = hash01(i, seed);
        if (deep + edge * 0.5 < 0.45 + wobble * 0.25) out.core.push(i);
        else if (rand() < 0.85 - deep * 0.3) out.shell.push(i);
      }
  return out;
}

// Steps a ray through the grid (Amanatides–Woo) and returns the first filled cell it enters, or
// -1. Origin and direction are in grid space; maxDist in blocks.
export function raycastGrid(grid, ox, oy, oz, dx, dy, dz, maxDist = 200) {
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1;
  const sy = dy > 0 ? 1 : -1;
  const sz = dz > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(1 / dx) : Infinity;
  const tdy = dy ? Math.abs(1 / dy) : Infinity;
  const tdz = dz ? Math.abs(1 / dz) : Infinity;
  let tx = dx ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
  let ty = dy ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
  let tz = dz ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
  let t = 0;
  while (t <= maxDist) {
    if (grid.inside(x, y, z) && grid.mat[grid.index(x, y, z)]) return grid.index(x, y, z);
    if (tx < ty && tx < tz) {
      x += sx;
      t = tx;
      tx += tdx;
    } else if (ty < tz) {
      y += sy;
      t = ty;
      ty += tdy;
    } else {
      z += sz;
      t = tz;
      tz += tdz;
    }
  }
  return -1;
}
