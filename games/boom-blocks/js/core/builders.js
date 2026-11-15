// Little shape helpers that scenes are built from. Scenes are laid out in whole scene units
// (x and z from -40 to 39, y up from the ground), so scene files read like a model kit; every unit
// is filled with RES×RES×RES little blocks, each shaded a touch differently.
// A paint is either { mat, color } or a function (x, y, z) => { mat, color } | null, called with the
// scene-unit coordinates, so stripes and window patterns are laid out in units too.
// Walls come out thin (a `thick` of 1 is one little block), and at the end hollowOut() turns any
// solid shape into a shell a couple of little blocks thick: the same look from outside, a lot
// fewer blocks to draw and simulate.
import { OX, OZ, RES, BLOCK } from './grid.js';

const R = RES;
const fx0 = (ux) => Math.round((ux - OX) * R);
const fz0 = (uz) => Math.round((uz - OZ) * R);
const fy0 = (uy) => Math.round(uy * R);
// The scene unit a little block belongs to.
const unitX = (fx) => OX + Math.floor(fx / R);
const unitZ = (fz) => OZ + Math.floor(fz / R);
const unitY = (fy) => Math.floor(fy / R);
// World center of a little block.
const centerX = (fx) => OX + (fx + 0.5) * BLOCK;
const centerY = (fy) => (fy + 0.5) * BLOCK;
const centerZ = (fz) => OZ + (fz + 0.5) * BLOCK;

export class Builder {
  constructor(grid, rand) {
    this.grid = grid;
    this.rand = rand;
    // Things a scene adds that aren't grid blocks: props, surprise spots and so on.
    this.props = [];
    this.gifts = [];
  }

  // Shades a color a little lighter or darker so walls don't look flat.
  jitter(color, amount = 0.08) {
    const f = 1 + (this.rand() - 0.5) * 2 * amount;
    const r = Math.min(255, Math.round(((color >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((color >> 8) & 255) * f));
    const b = Math.min(255, Math.round((color & 255) * f));
    return (r << 16) | (g << 8) | b;
  }

  // One little block at fine grid coordinates, painted as scene unit (ux, uy, uz).
  fine(fx, fy, fz, paint, p = null) {
    if (!p) p = typeof paint === 'function' ? paint(unitX(fx), unitY(fy), unitZ(fz)) : paint;
    if (!p || !p.mat) return;
    this.grid.set(fx, fy, fz, p.mat, p.flat ? p.color : this.jitter(p.color, p.jitter ?? 0.08));
  }

  // A whole scene unit (all its little blocks).
  put(x, y, z, paint) {
    const p = typeof paint === 'function' ? paint(x, y, z) : paint;
    if (!p || !p.mat) return;
    const X = fx0(x);
    const Y = fy0(y);
    const Z = fz0(z);
    for (let dy = 0; dy < R; dy++) for (let dz = 0; dz < R; dz++) for (let dx = 0; dx < R; dx++) this.fine(X + dx, Y + dy, Z + dz, null, p);
  }

  clear(x, y, z) {
    const X = fx0(x);
    const Y = fy0(y);
    const Z = fz0(z);
    for (let dy = 0; dy < R; dy++) for (let dz = 0; dz < R; dz++) for (let dx = 0; dx < R; dx++) this.grid.set(X + dx, Y + dy, Z + dz, 0);
  }

  has(x, y, z) {
    return this.grid.get(fx0(x), fy0(y), fz0(z)) !== 0;
  }

  // A solid box, corners inclusive (scene units).
  box(x0, y0, z0, x1, y1, z1, paint) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.put(x, y, z, paint);
  }

  // Walls `thick` little blocks thick (and optionally a thin floor every `floorEvery` units, and
  // a roof), corners inclusive.
  hollowBox(x0, y0, z0, x1, y1, z1, paint, { thick = 1, floorEvery = 0, roof = false } = {}) {
    const X0 = fx0(x0);
    const X1 = fx0(x1 + 1) - 1;
    const Z0 = fz0(z0);
    const Z1 = fz0(z1 + 1) - 1;
    const Y0 = fy0(y0);
    const Y1 = fy0(y1 + 1) - 1;
    for (let fy = Y0; fy <= Y1; fy++) {
      const uy = unitY(fy);
      const floor = (floorEvery && (uy - y0) % floorEvery === floorEvery - 1 && fy % R === R - 1) || (roof && fy === Y1);
      for (let fz = Z0; fz <= Z1; fz++)
        for (let fx = X0; fx <= X1; fx++) {
          const edge = fx - X0 < thick || X1 - fx < thick || fz - Z0 < thick || Z1 - fz < thick;
          if (edge || floor) this.fine(fx, fy, fz, paint);
        }
    }
  }

  // An upright cylinder around the middle of unit (cx, cz). thick (in units, halved: thin walls)
  // makes it a tube; 0 makes it solid. Floors are thin.
  cylinder(cx, cz, y0, y1, radius, paint, { thick = 0, floorEvery = 0 } = {}) {
    const mx = cx + 0.5;
    const mz = cz + 0.5;
    const wall = thick ? Math.max(0.75, thick * 0.5) : 0;
    const X0 = fx0(Math.floor(mx - radius - 1));
    const X1 = fx0(Math.ceil(mx + radius + 1));
    const Z0 = fz0(Math.floor(mz - radius - 1));
    const Z1 = fz0(Math.ceil(mz + radius + 1));
    for (let fy = fy0(y0); fy < fy0(y1 + 1); fy++) {
      const uy = unitY(fy);
      const floor = floorEvery && (uy - y0) % floorEvery === floorEvery - 1 && fy % R === R - 1;
      for (let fz = Z0; fz <= Z1; fz++)
        for (let fx = X0; fx <= X1; fx++) {
          const d = Math.hypot(centerX(fx) - mx, centerZ(fz) - mz);
          if (d > radius) continue;
          if (wall && !floor && d < radius - wall) continue;
          this.fine(fx, fy, fz, paint);
        }
    }
  }

  // A cone (round roof) from radius at y0 to a point at y0 + height.
  cone(cx, cz, y0, height, radius, paint) {
    const mx = cx + 0.5;
    const mz = cz + 0.5;
    const F0 = fy0(y0);
    const n = height * R;
    for (let i = 0; i < n; i++) {
      const r = Math.max(0.4, radius * (1 - i / n));
      const X0 = fx0(Math.floor(mx - r - 1));
      const X1 = fx0(Math.ceil(mx + r + 1));
      const Z0 = fz0(Math.floor(mz - r - 1));
      const Z1 = fz0(Math.ceil(mz + r + 1));
      for (let fz = Z0; fz <= Z1; fz++)
        for (let fx = X0; fx <= X1; fx++) if (Math.hypot(centerX(fx) - mx, centerZ(fz) - mz) <= r) this.fine(fx, F0 + i, fz, paint);
    }
  }

  // A stepped pyramid roof over a rectangle (each little layer one little block smaller).
  pyramid(x0, z0, x1, z1, y0, paint) {
    let X0 = fx0(x0);
    let X1 = fx0(x1 + 1) - 1;
    let Z0 = fz0(z0);
    let Z1 = fz0(z1 + 1) - 1;
    let fy = fy0(y0);
    while (X0 <= X1 && Z0 <= Z1) {
      for (let fz = Z0; fz <= Z1; fz++) for (let fx = X0; fx <= X1; fx++) this.fine(fx, fy, fz, paint);
      X0++;
      Z0++;
      X1--;
      Z1--;
      fy++;
    }
    return Math.ceil(fy / R);
  }

  // An ellipsoid around (cx + ½, cy + ½, cz + ½), radii in units.
  ellipsoid(cx, cy, cz, rx, ry, rz, paint) {
    const mx = cx + 0.5;
    const my = cy + 0.5;
    const mz = cz + 0.5;
    for (let fy = Math.max(0, fy0(Math.floor(my - ry))); fy <= fy0(Math.ceil(my + ry)); fy++)
      for (let fz = fz0(Math.floor(mz - rz)); fz <= fz0(Math.ceil(mz + rz)); fz++)
        for (let fx = fx0(Math.floor(mx - rx)); fx <= fx0(Math.ceil(mx + rx)); fx++) {
          const d = ((centerX(fx) - mx) / rx) ** 2 + ((centerY(fy) - my) / ry) ** 2 + ((centerZ(fz) - mz) / rz) ** 2;
          if (d <= 1) this.fine(fx, fy, fz, paint);
        }
  }

  // A cube of little blocks `w` units across around the middle of unit (x, y, z), which can be
  // fractional: the brush that beams, rings and curved shapes are drawn with.
  dab(x, y, z, paint, w = 1) {
    const h = w / 2;
    const span = (c, o) => [Math.ceil((c - h - o) / BLOCK - 0.5), Math.ceil((c + h - o) / BLOCK - 0.5) - 1];
    const [X0, X1] = span(x + 0.5, OX);
    const [Y0, Y1] = span(y + 0.5, 0);
    const [Z0, Z1] = span(z + 0.5, OZ);
    for (let fy = Math.max(0, Y0); fy <= Y1; fy++) for (let fz = Z0; fz <= Z1; fz++) for (let fx = X0; fx <= X1; fx++) this.fine(fx, fy, fz, paint);
  }

  // A straight beam `w` units thick from the middle of unit (x0, y0, z0) to the middle of
  // (x1, y1, z1), any direction (girders, spokes, legs, masts). Always joined face to face, so
  // it never comes apart at the build.
  beam(x0, y0, z0, x1, y1, z1, paint, w = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 0.2));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const z = z0 + (z1 - z0) * t;
      this.dab(x, y, z, paint, w);
      // A thin beam's little blocks could meet only at their corners on a slant: walk the
      // middle line one axis at a time so it stays in one piece.
      const c = [Math.floor((x + 0.5 - OX) / BLOCK), Math.max(0, Math.floor((y + 0.5) / BLOCK)), Math.floor((z + 0.5 - OZ) / BLOCK)];
      if (prev) {
        const p = [...prev];
        for (let k = 0; k < 3; k++)
          while (p[k] !== c[k]) {
            p[k] += Math.sign(c[k] - p[k]);
            this.fine(p[0], p[1], p[2], paint);
          }
      } else this.fine(c[0], c[1], c[2], paint);
      prev = c;
    }
  }

  // An upright ring (a wheel rim) of `radius` around the middle of unit (cx, cy, cz), standing
  // across the x axis ('x') or the z axis ('z').
  ring(cx, cy, cz, radius, paint, { w = 1, across = 'z' } = {}) {
    const n = Math.ceil((Math.PI * 2 * radius) / 0.25);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const u = Math.cos(a) * radius;
      const v = Math.sin(a) * radius;
      if (across === 'z') this.dab(cx + u, cy + v, cz, paint, w);
      else this.dab(cx, cy + v, cz + u, paint, w);
    }
  }

  // Merlons around the top edge of a rectangle (every other unit, one unit high).
  battlements(x0, z0, x1, z1, y, paint) {
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        const edge = x === x0 || x === x1 || z === z0 || z === z1;
        if (edge && (x + z) % 2 === 0) this.put(x, y, z, paint);
      }
  }

  // Punches a hole through whatever is there (windows, doors, arches).
  hole(x0, y0, z0, x1, y1, z1) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.clear(x, y, z);
  }

  // A surprise block (the gift) at a spot; also remembered so the scene knows where they are.
  gift(x, y, z, kind) {
    this.put(x, y, z, { mat: 12, color: 0xff4fa3, flat: true });
    this.gifts.push({ x, y, z, kind });
  }

  // A loose physics piece placed in the scene (asleep until something hits it): cells are
  // [x, y, z, mat, color] in the piece's own scene units, center is the world position of the
  // piece's middle, yaw turns it around the vertical axis.
  prop(cells, center, yaw = 0) {
    this.props.push({ cells, center, yaw });
  }

  // Scoops out the inside of anything thicker than `depth` little blocks, leaving a shell: what
  // you see doesn't change, but there are far fewer blocks. (Below the ground counts as solid,
  // so a shape's underside is scooped out too.)
  hollowOut(depth = 2) {
    const g = this.grid;
    const { mat, sx, sz, layer } = g;
    const n = g.top * layer;
    const dist = new Uint8Array(n);
    let queue = [];
    for (let i = 0; i < n; i++) {
      if (!mat[i]) continue;
      const x = i % sx;
      const z = Math.floor(i / sx) % sz;
      const y = Math.floor(i / layer);
      const open = x === 0 || x === sx - 1 || z === 0 || z === sz - 1 || !mat[i - 1] || !mat[i + 1] || !mat[i - sx] || !mat[i + sx] || (y > 0 && !mat[i - layer]) || i + layer >= n || !mat[i + layer];
      if (open) {
        dist[i] = 1;
        queue.push(i);
      }
    }
    for (let d = 2; d <= depth; d++) {
      const next = [];
      for (const i of queue)
        for (const j of [i - 1, i + 1, i - sx, i + sx, i - layer, i + layer]) {
          if (j < 0 || j >= n || !mat[j] || dist[j]) continue;
          dist[j] = d;
          next.push(j);
        }
      queue = next;
    }
    for (let i = 0; i < n; i++) if (mat[i] && !dist[i] && mat[i] !== 12 && mat[i] !== 11) g.remove(i);
  }
}

// HSV (all 0..1) to a 0xRRGGBB color.
export function hsv(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i % 6];
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

// The toy-box rainbow every scene picks from.
export const RAINBOW = [0xff4d4d, 0xff9f1c, 0xffd23f, 0x5fd35f, 0x2ec4f1, 0x5b6cff, 0xb15cff];
