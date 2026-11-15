// The physics world (Rapier). Standing blocks are one voxel collider whose cells switch off one
// at a time as blocks break; loose pieces are dynamic bodies made of a few boxes each.
import { OX, OZ, BLOCK } from '../core/grid.js';

export const GRAVITY = -30;
// Half the island's width: the ground collider ends here and pieces past it fall in the water.
export const ISLAND = 44;
// A raised rim round the island's edge (like the edge of a toy play board), so rubble that
// slides across the grass stops at the edge instead of going over. Pieces flying high still can.
export const RIM = { height: 1.8, width: 1.4 };

let R = null;
export async function loadRapier() {
  if (R) return R;
  const mod = await import('../../vendor/rapier.module.js');
  R = mod.default;
  await R.init();
  return R;
}

export class Physics {
  constructor(rapier) {
    this.R = rapier;
    this.world = new rapier.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = 1 / 60;
    // Two solver passes instead of four: about a third cheaper, and tumbling debris can't tell.
    this.world.numSolverIterations = 2;
    this.events = new rapier.EventQueue(true);
    // The island is a deep block: a big falling slab that sinks into a thin ground gets pushed out
    // the bottom and drops through, so the ground goes 100 units down.
    const ground = rapier.ColliderDesc.cuboid(ISLAND, 50, ISLAND).setTranslation(0, -50, 0).setFriction(0.9).setRestitution(0.15);
    this.ground = this.world.createCollider(ground);
    const r = ISLAND - RIM.width / 2;
    for (const [x, z, hx, hz] of [
      [0, r, ISLAND, RIM.width / 2],
      [0, -r, ISLAND, RIM.width / 2],
      [r, 0, RIM.width / 2, ISLAND],
      [-r, 0, RIM.width / 2, ISLAND],
    ])
      this.world.createCollider(rapier.ColliderDesc.cuboid(hx, RIM.height / 2, hz).setTranslation(x, RIM.height / 2, z).setFriction(0.8).setRestitution(0.2));
    this.fixed = this.world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(OX, 0, OZ));
    this.voxels = null;
  }

  // (Re)builds the standing-block collider from the grid.
  setStatic(grid) {
    if (this.voxels) this.world.removeCollider(this.voxels, true);
    this.voxels = null;
    const cells = grid.filled();
    if (!cells.length) return;
    const coords = new Int32Array(cells.length * 3);
    cells.forEach((c, k) => {
      coords[k * 3] = grid.cx(c);
      coords[k * 3 + 1] = grid.cy(c);
      coords[k * 3 + 2] = grid.cz(c);
    });
    const desc = this.R.ColliderDesc.voxels(coords, { x: BLOCK, y: BLOCK, z: BLOCK }).setFriction(0.85).setRestitution(0.1);
    this.voxels = this.world.createCollider(desc, this.fixed);
  }

  // A round collider that's safe against the voxel shape. (Rapier 0.21's ball-vs-voxels contact
  // panics at some positions, which kills the whole physics world; a convex hull of a
  // geodesic sphere behaves the same and never does. Never use ColliderDesc.ball here.)
  roundDesc(radius) {
    return this.R.ColliderDesc.convexHull(sphereHull(radius));
  }

  removeCell(x, y, z) {
    if (this.voxels) this.voxels.setVoxel(x, y, z, false);
  }

  step() {
    this.world.step(this.events);
  }

  // First thing a ray hits: { x, y, z, nx, ny, nz, toi, collider } or null. Hits on the water
  // plane past the island don't count: the ray just misses.
  cast(ox, oy, oz, dx, dy, dz, max = 400, exclude) {
    const ray = new this.R.Ray({ x: ox, y: oy, z: oz }, { x: dx, y: dy, z: dz });
    const hit = this.world.castRayAndGetNormal(ray, max, true, undefined, undefined, undefined, exclude);
    if (!hit) return null;
    const t = hit.timeOfImpact;
    return { x: ox + dx * t, y: oy + dy * t, z: oz + dz * t, nx: hit.normal.x, ny: hit.normal.y, nz: hit.normal.z, toi: t, collider: hit.collider };
  }

  isStatic(collider) {
    return this.voxels && collider && collider.handle === this.voxels.handle;
  }
  isGround(collider) {
    return collider && collider.handle === this.ground.handle;
  }
}

// Points of a geodesic sphere (icosahedron split once: 42 points) of the given radius.
const cache = new Map();
export function sphereHull(radius) {
  if (cache.has(radius)) return cache.get(radius);
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const pts = v.map((p) => p.map((c) => c / Math.hypot(...p)));
  const seen = new Set();
  for (const [a, b, c] of faces)
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const m = pts[i].map((q, k) => q + pts[j][k]);
      const l = Math.hypot(...m);
      pts.push(m.map((q) => q / l));
    }
  const out = new Float32Array(pts.flat().map((c) => c * radius));
  cache.set(radius, out);
  return out;
}
