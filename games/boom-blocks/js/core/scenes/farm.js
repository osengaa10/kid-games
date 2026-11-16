// Farm: a big red barn with a hay loft (balloons hidden up there), a tall silo, a windmill with
// four big sails, a stack of hay bales to bowl over, a pumpkin patch, a scarecrow, a little red
// tractor, and a white fence.
import { MAT } from '../materials.js';
import { tree } from './tower.js';

const RED = 0xd9363e;
const WHITE = 0xffffff;
const HAY = [0xe8c65a, 0xd9b44a];

// The barn: red walls with white trim, big white-crossed doors at the front, and a two-slope
// roof whose front gable has the hay-loft door.
function barn(b, cx, cz) {
  const x0 = cx - 7;
  const x1 = cx + 7;
  const z0 = cz - 9;
  const z1 = cz + 9;
  const wall = (x, y, z) => {
    if (x === x0 || x === x1 || y === 9) return { mat: MAT.WOOD, color: WHITE };
    if (z === z1 && Math.abs(x - cx) <= 3 && y <= 6) {
      const dx = x - cx;
      if (Math.abs(dx) === 3 || y === 6 || Math.abs(dx) === Math.round((y * 3) / 6) || Math.abs(dx) === Math.round(((6 - y) * 3) / 6)) return { mat: MAT.WOOD, color: WHITE };
      return { mat: MAT.WOOD, color: 0xb02a31 };
    }
    return { mat: MAT.WOOD, color: RED };
  };
  b.hollowBox(x0, 0, z0, x1, 9, z1, wall, { thick: 2, floorEvery: 10 });
  b.box(x0 + 1, 9, z0 + 1, x1 - 1, 9, z1 - 1, { mat: MAT.WOOD, color: 0xb07a3e });
  // The roof: steep low slopes, then shallow ones up to the ridge (cross-section in x).
  const halfAt = (y) => (y <= 13 ? 8 - (y - 10) * 0.9 : 5.3 - (y - 13) * 1.4);
  for (let y = 10; y <= 16; y++) {
    const h = Math.max(0.5, halfAt(y));
    const hx0 = Math.round(cx - h);
    const hx1 = Math.round(cx + h);
    b.box(hx0, y, z0 - 1, hx1, y, z1 + 1, (x, py, z) => {
      const end = z === z0 - 1 || z === z1 + 1;
      if (end) {
        const edge = x === hx0 || x === hx1;
        const loft = z === z1 + 1 && py >= 11 && py <= 13 && Math.abs(x - cx) <= 1;
        if (loft) return { mat: MAT.WOOD, color: Math.abs(x - cx) === 1 || py !== 12 ? WHITE : 0x6b4423 };
        return { mat: MAT.WOOD, color: edge ? WHITE : RED };
      }
      return { mat: MAT.BRICK, color: (z + py) % 2 ? 0x6b5a4e : 0x5c4c42 };
    });
  }
  b.gift(cx, 10, cz, 'balloons');
}

// A tall silo with a silver dome.
function silo(b, cx, cz) {
  b.cylinder(cx, cz, 0, 22, 3.2, (x, y) => ({ mat: MAT.METAL, color: y % 3 === 2 ? 0x9aa3b5 : 0xc7cfdb }), { thick: 2, floorEvery: 6 });
  b.ellipsoid(cx, 23, cz, 3.2, 2.6, 3.2, { mat: MAT.METAL, color: 0xe6eaf2 });
  b.cylinder(cx, cz, 26, 26, 0.6, { mat: MAT.METAL, color: RED });
}

// The windmill: a tapering cream tower, a red cap, and four big sails on the front.
function windmill(b, cx, cz) {
  const TOP = 20;
  const radius = (y) => 4.2 - (y / TOP) * 1.3;
  for (let y = 0; y <= TOP; y++) b.cylinder(cx, cz, y, y, radius(y), (x, py) => ({ mat: MAT.BRICK, color: py % 5 === 4 ? 0xd9c8a0 : 0xf3ead6 }), { thick: 2, floorEvery: y % 5 === 4 ? 1 : 0 });
  b.hole(cx - 1, 0, cz + 3, cx + 1, 2, cz + 5);
  b.cone(cx, cz, TOP + 1, 5, 3.8, { mat: MAT.BRICK, color: RED });
  const hy = TOP - 1;
  b.beam(cx, hy, cz, cx, hy, cz + 4.5, { mat: MAT.WOOD, color: 0x6b4423 }, 1.2);
  b.dab(cx, hy, cz + 4.5, { mat: MAT.WOOD, color: 0x6b4423 }, 1.6);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    b.beam(cx, hy, cz + 4.6, cx + ux * 10, hy + uy * 10, cz + 4.6, { mat: MAT.WOOD, color: 0x8d5a2b }, 0.75);
    // The sail cloth runs alongside the arm, from near the hub out to its tip.
    for (let t = 2; t <= 9.5; t += 0.25)
      for (const s of [0.5, 1.2, 1.9])
        b.dab(cx + ux * t - uy * s, hy + uy * t + ux * s, cz + 4.6, { mat: MAT.CLOTH, color: (Math.floor(t) + k) % 2 ? WHITE : 0xf0e6d0, flat: true }, 0.75);
  }
}

// A pumpkin with ribs and a stalk.
function pumpkin(b, x, z, r = 1.7) {
  b.ellipsoid(x, 0, z, r, r * 0.75, r, (px, py, pz) => ({ mat: MAT.PLASTIC, color: (((px + pz) % 2) + 2) % 2 ? 0xff8c1a : 0xe8740f }));
  const top = Math.floor(r * 0.75 + 0.5);
  b.box(x, top, z, x, top + 1, z, { mat: MAT.LEAF, color: 0x4c9a3e });
}

// The scarecrow: a post with a crossbar, a patched shirt, a sack head and a straw hat.
function scarecrow(b, x, z) {
  const wood = { mat: MAT.WOOD, color: 0x8d5a2b };
  b.box(x, 0, z, x, 9, z, wood);
  b.beam(x - 4, 7, z, x + 4, 7, z, wood, 1);
  b.box(x - 1, 4, z, x + 1, 7, z, (px, py) => ({ mat: MAT.CLOTH, color: (px + py) % 2 ? 0x2e9bf1 : 0x5b6cff, flat: true }));
  for (const s of [-1, 1]) b.box(x + s * 4, 6, z, x + s * 4, 6, z, { mat: MAT.LEAF, color: HAY[0] });
  b.ellipsoid(x, 9, z, 1.6, 1.6, 1.4, { mat: MAT.CLOTH, color: 0xe3cfa0, flat: true });
  for (const s of [-1, 1]) b.dab(x + s * 0.6, 9.3, z + 1.2, { mat: MAT.STONE, color: 0x2b2f45, flat: true }, 0.5);
  b.cylinder(x, z, 11, 11, 2.6, { mat: MAT.LEAF, color: HAY[0] });
  b.cylinder(x, z, 12, 13, 1.4, { mat: MAT.LEAF, color: HAY[1] });
}

// The little red tractor, facing +x: big back wheels, small front ones, a cab and a funnel.
function tractor(b, x0, z0) {
  const tire = { mat: MAT.PLASTIC, color: 0x2b2f45 };
  for (const z of [z0, z0 + 5]) {
    b.box(x0, 0, z, x0 + 2, 3, z, tire);
    b.box(x0 + 6, 0, z, x0 + 7, 1, z, tire);
  }
  b.box(x0, 2, z0 + 1, x0 + 8, 3, z0 + 4, { mat: MAT.PLASTIC, color: RED });
  b.box(x0 + 4, 4, z0 + 1, x0 + 8, 4, z0 + 4, { mat: MAT.PLASTIC, color: RED });
  b.hollowBox(x0, 4, z0 + 1, x0 + 3, 7, z0 + 4, (x, y, z) => (y >= 5 && y <= 6 && (z === z0 + 1 || z === z0 + 4 || x === x0 + 3) ? { mat: MAT.GLASS, color: 0x9fe3ff, flat: true } : { mat: MAT.PLASTIC, color: RED }), { roof: true });
  b.beam(x0 + 6, 5, z0 + 2.5, x0 + 6, 8, z0 + 2.5, { mat: MAT.METAL, color: 0x4f5568 }, 0.75);
}

// A white fence: posts every 3 units with two rails.
function fence(b, x0, x1, z) {
  const white = { mat: MAT.WOOD, color: 0xf2efe6 };
  for (let x = x0; x <= x1; x += 3) b.box(x, 0, z, x, 2, z, white);
  for (const y of [1, 2]) b.box(x0, y, z, x1, y, z, white);
}

// Hay bales (sleeping physics props): 3 long, 2 wide, 2 high.
const BALE = [];
for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 3; x++) BALE.push([x, y, z]);

export default {
  id: 'farm',
  icon: 'barn',
  camera: { target: [0, 10, -4], yaw: 0.34, pitch: 0.38, dist: 92 },
  build(b) {
    barn(b, -14, -12);
    silo(b, 0, -22);
    windmill(b, 20, -14);
    // A stack of hay bales, 3-2-1.
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 3 - row; i++) b.prop(BALE.map(([x, y, z]) => [x, y, z, MAT.WOOD, HAY[(x + y + z) % 2]]), [6 + i * 3.05 + row * 1.525, 1 + row * 2, 10], 0);
    for (const [x, z, r] of [
      [-26, 10, 1.8],
      [-21, 13, 1.4],
      [-28, 16, 1.5],
      [-23, 19, 1.9],
      [-18, 17, 1.3],
    ])
      pumpkin(b, x, z, r);
    scarecrow(b, -12, 16);
    tractor(b, 18, 4);
    fence(b, -33, 33, 26);
    for (const [x, z] of [
      [-32, -4],
      [33, 12],
      [-30, -28],
      [32, -30],
    ])
      tree(b, x, z, 4);
  },
};
