// Lighthouse Bay: a tall red-and-white lighthouse with a glass lamp room (fireworks inside the
// lamp), a pirate ship with billowing sails and treasure in the captain's cabin, a stone sea
// fort with powder crates beside it, and palm trees that bend when they fall.
import { MAT } from '../materials.js';

const WOOD = 0x8d5a2b;
const PLANK = 0x7a4a22;
const DECK = 0xc98a4b;
const SAIL = 0xfffbef;
const STONE = 0xa7b0ba;

export function tnt(b, x, y, z) {
  b.box(x, y, z, x + 1, y + 1, z + 1, (cx, cy) => ({ mat: MAT.TNT, color: cy === y + 1 ? 0xffffff : 0xff3b3b, flat: true }));
}

// A palm tree: a gently curving trunk with ringed bark, a crown of drooping fronds and a few
// coconuts. lean: which way it curves (x and z, in units over its height).
export function palm(b, x, z, h = 10, lean = [3, 0]) {
  const at = (i) => [x + lean[0] * (i / h) ** 2, i, z + lean[1] * (i / h) ** 2];
  for (let i = 0; i < h; i++) {
    const [ax, ay, az] = at(i);
    const [bx, by, bz] = at(i + 1);
    b.beam(ax, ay, az, bx, by, bz, { mat: MAT.WOOD, color: i % 2 ? 0xc9a36b : 0xa8824f }, 1);
  }
  const [tx, ty, tz] = at(h);
  const greens = [0x3fb950, 0x4cc85a, 0x2f9e44];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.4;
    let px = tx;
    let py = ty;
    let pz = tz;
    for (let s = 1; s <= 5; s++) {
      const nx = tx + Math.cos(a) * s * 1.1;
      const ny = ty + 0.9 * s - 0.32 * s * s;
      const nz = tz + Math.sin(a) * s * 1.1;
      b.beam(px, py, pz, nx, ny, nz, { mat: MAT.LEAF, color: greens[(k + s) % 3] }, s < 4 ? 1 : 0.5);
      px = nx;
      py = ny;
      pz = nz;
    }
  }
  for (const [dx, dz] of [
    [0.6, 0],
    [-0.4, 0.5],
    [-0.3, -0.5],
  ])
    b.dab(tx + dx, ty - 0.6, tz + dz, { mat: MAT.WOOD, color: 0x6b4423, flat: true }, 1);
}

// The lighthouse: a tapering striped tower, a gallery with a railing, a glass lamp room and a
// red cap.
function lighthouse(b, cx, cz) {
  const TOP = 29;
  const radius = (y) => 5.4 - (y / TOP) * 1.7;
  const stripe = (x, y) => ({ mat: MAT.BRICK, color: Math.floor(y / 4) % 2 ? 0xffffff : 0xff4d4d });
  for (let y = 0; y <= TOP; y++) b.cylinder(cx, cz, y, y, radius(y), stripe, { thick: 2, floorEvery: y % 6 === 5 ? 1 : 0 });
  // The door, and little windows spiralling up.
  b.hole(cx - 1, 0, cz + 3, cx + 1, 3, cz + 6);
  for (const [y, dx, dz] of [
    [9, 0, 1],
    [14, 1, 0],
    [19, 0, -1],
    [24, -1, 0],
  ]) {
    for (const t of [radius(y) - 1.3, radius(y) - 0.5, radius(y) + 0.2]) {
      const ux = Math.floor(cx + 0.5 + dx * t);
      const uz = Math.floor(cz + 0.5 + dz * t);
      b.hole(ux, y, uz, ux, y + 1, uz);
    }
  }
  // Gallery deck and railing.
  b.cylinder(cx, cz, TOP + 1, TOP + 1, 5.4, { mat: MAT.METAL, color: 0x4f5568 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.beam(cx + Math.cos(a) * 4.9, TOP + 2, cz + Math.sin(a) * 4.9, cx + Math.cos(a) * 4.9, TOP + 3, cz + Math.sin(a) * 4.9, { mat: MAT.METAL, color: 0x2b2f45 }, 0.5);
  }
  b.cylinder(cx, cz, TOP + 3, TOP + 3, 5.4, { mat: MAT.METAL, color: 0x2b2f45 }, { thick: 1 });
  // The lamp room: yellow glass all round, the lamp (the surprise) on a golden stand.
  b.cylinder(cx, cz, TOP + 2, TOP + 6, 3.2, { mat: MAT.GLASS, color: 0xfff3b0, flat: true }, { thick: 1 });
  b.put(cx, TOP + 2, cz, { mat: MAT.GOLD, color: 0xffd23f });
  b.gift(cx, TOP + 3, cz, 'fireworks');
  b.cylinder(cx, cz, TOP + 7, TOP + 7, 3.6, { mat: MAT.METAL, color: 0x2b2f45 });
  b.cone(cx, cz, TOP + 8, 4, 3.8, { mat: MAT.BRICK, color: 0xd9363e });
  b.dab(cx, TOP + 12, cz, { mat: MAT.GOLD, color: 0xffd23f }, 1);
}

// The pirate ship, bow toward +x, sitting upright on its keel. x0: the stern, zc: the middle
// line (in units: the hull is 10 units across at the deck).
function ship(b, x0, zc) {
  const DECK_Y = 5;
  const half = (y) => 2.2 + y * 0.55;
  const end = (y) => x0 + 22 + y * 0.45;
  const start = (y) => x0 + 2 - y * 0.35;
  const hull = (x, y, z) => {
    if (y <= 1) return { mat: MAT.WOOD, color: 0xd9363e };
    if (y === 4) return { mat: MAT.WOOD, color: 0xffd23f };
    if (y === DECK_Y) return { mat: MAT.WOOD, color: DECK };
    return { mat: MAT.WOOD, color: y % 2 ? WOOD : PLANK };
  };
  for (let y = 0; y <= DECK_Y + 1; y++) {
    const yy = Math.min(y, DECK_Y);
    const bow = 7 + yy * 0.4;
    for (let x = Math.floor(start(yy)); x <= Math.ceil(end(yy)); x++) {
      if (x + 0.5 < start(yy) || x + 0.5 > end(yy)) continue;
      const k = x + 0.5 > end(yy) - bow ? Math.sqrt(Math.max(0, 1 - ((x + 0.5 - (end(yy) - bow)) / bow) ** 2)) : 1;
      const hw = half(yy) * k;
      for (let z = Math.floor(zc - 6); z <= Math.ceil(zc + 6); z++) {
        const d = Math.abs(z + 0.5 - zc);
        if (d > hw) continue;
        // The railing round the deck edge (one unit up).
        if (y === DECK_Y + 1 && d < hw - 1 && x + 0.5 > start(yy) + 1) continue;
        b.put(x, y, z, y === DECK_Y + 1 ? { mat: MAT.WOOD, color: PLANK } : hull);
      }
    }
  }
  const zl = Math.floor(zc - 0.5);
  // Cannons poking out of both sides.
  for (const x of [x0 + 6, x0 + 10, x0 + 14]) {
    b.put(x, 3, zl - 4, { mat: MAT.METAL, color: 0x2b2f45 });
    b.put(x, 3, zl + 5, { mat: MAT.METAL, color: 0x2b2f45 });
  }
  // The captain's cabin at the stern, with the treasure inside.
  b.hollowBox(x0 + 1, DECK_Y + 1, zl - 3, x0 + 6, DECK_Y + 4, zl + 4, (x, y) => ({ mat: MAT.WOOD, color: y === DECK_Y + 4 ? 0xffd23f : 0xb07a3e }), { roof: true });
  b.hole(x0 + 6, DECK_Y + 1, zl, x0 + 6, DECK_Y + 2, zl + 1);
  for (const z of [zl - 3, zl + 4]) b.hole(x0 + 3, DECK_Y + 2, z, x0 + 4, DECK_Y + 3, z);
  b.gift(x0 + 3, DECK_Y + 1, zl, 'treasure');
  // Masts with billowing sails on yards, a crow's nest, and a flag.
  const mz = zc - 0.5;
  const mast = { mat: MAT.WOOD, color: 0x9a6233 };
  for (const [mx, top, s0, s1] of [
    [x0 + 11, 26, 12, 22],
    [x0 + 17, 21, 10, 18],
  ]) {
    b.beam(mx, DECK_Y + 1, mz, mx, top, mz, mast, 1);
    for (const y of [s0, s1]) b.beam(mx, y, mz - 4.5, mx, y, mz + 4.5, mast, 1);
    for (let y = s0; y <= s1; y += 0.5)
      for (let z = mz - 4; z <= mz + 4; z += 0.25) {
        const bulge = 1.6 * Math.sin((Math.PI * (z - mz + 4)) / 8) * Math.sin((Math.PI * (y - s0)) / (s1 - s0));
        const stripe = Math.abs(y - (s0 + s1) / 2) < 1.2;
        b.dab(mx + bulge, y, z, { mat: MAT.CLOTH, color: stripe ? 0xff4d4d : SAIL, flat: true }, 1);
      }
  }
  b.cylinder(x0 + 11, mz, 23, 23, 1.9, mast, { thick: 1, floorEvery: 1 });
  b.box(x0 + 7, 24, zl, x0 + 10, 25, zl, { mat: MAT.CLOTH, color: 0x2b2f45, flat: true });
  b.put(x0 + 8, 24, zl, { mat: MAT.CLOTH, color: 0xffd23f, flat: true });
  // The bowsprit.
  b.beam(x0 + 22, DECK_Y + 1, mz, x0 + 28, DECK_Y + 4, mz, mast, 1);
}

export default {
  id: 'bay',
  icon: 'lighthouse',
  camera: { target: [2, 12, -2], yaw: 0.42, pitch: 0.36, dist: 94 },
  build(b) {
    lighthouse(b, -16, -12);
    ship(b, -8, 9);
    // The sea fort: a square stone tower with battlements and a cannon on top.
    const stone = (x, y) => ({ mat: MAT.STONE, color: y % 5 === 4 ? 0xd3d9df : STONE });
    b.hollowBox(18, 0, -22, 26, 16, -14, stone, { thick: 2, floorEvery: 6, roof: true });
    b.battlements(18, -22, 26, -14, 17, { mat: MAT.STONE, color: 0xd3d9df });
    b.hole(21, 0, -14, 23, 3, -14);
    for (const y of [7, 12]) {
      b.hole(22, y, -14, 22, y + 1, -14);
      b.hole(18, y, -18, 18, y + 1, -18);
    }
    b.beam(22, 17, -18, 18, 18.5, -12, { mat: MAT.METAL, color: 0x2b2f45 }, 1.5);
    b.box(22, 18, -18, 22, 22, -18, { mat: MAT.WOOD, color: 0xc98a4b });
    b.box(23, 21, -18, 25, 22, -18, { mat: MAT.CLOTH, color: 0x2e9bf1, flat: true });
    // Powder crates by the fort: one bang sets off the next.
    tnt(b, 13, 0, -24);
    tnt(b, 13, 0, -19);
    tnt(b, 28, 0, -9);
    // Palm trees.
    for (const [x, z, h, lean] of [
      [-30, 8, 10, [3, 1]],
      [-26, 24, 9, [2, -2]],
      [30, 18, 11, [-3, 1]],
      [-32, -22, 9, [2, 2]],
      [4, -24, 10, [-2, 2]],
      [32, -2, 9, [-2, -2]],
    ])
      palm(b, x, z, h, lean);
  },
};
