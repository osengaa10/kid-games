// Rocket Base: a big toy rocket standing on its fins beside a red lattice launch tower (fireworks
// in the nose), crates of rocket fuel (TNT) at the tower's foot, a radar dish, glass moon-base
// domes that shatter into sparkles, and a giant toy robot to knock off its feet.
import { MAT } from '../materials.js';
import { tnt } from './bay.js';

const WHITE = 0xf4f6fb;
const RED = 0xff4d4d;
const BLUE = 0x2e9bf1;
const GREY = 0xaab3c2;
const DARK = 0x2b2f45;

function rocket(b, cx, cz) {
  const body = (x, y, z) => {
    if (z - cz > 2.5 && Math.abs(x - cx) <= 1 && y >= 25 && y <= 27) return { mat: MAT.GLASS, color: 0x7fd6ff, flat: true };
    if (y === 14 || y === 15) return { mat: MAT.PLASTIC, color: RED };
    if (y === 30) return { mat: MAT.PLASTIC, color: BLUE };
    return { mat: MAT.PLASTIC, color: WHITE, jitter: 0.03 };
  };
  b.cylinder(cx, cz, 6, 33, 4, body, { thick: 2, floorEvery: 7 });
  b.cone(cx, cz, 34, 9, 4, { mat: MAT.PLASTIC, color: RED });
  b.gift(cx, 34, cz, 'fireworks');
  // The engine bell, and four fins it stands on.
  b.cylinder(cx, cz, 2, 3, 2.9, { mat: MAT.METAL, color: GREY });
  b.cylinder(cx, cz, 4, 5, 2.3, { mat: MAT.METAL, color: 0x8a90b0 });
  const fin = (x, y) => ({ mat: MAT.PLASTIC, color: y < 2 ? 0xffd23f : RED });
  for (let y = 0; y <= 12; y++) {
    const out = Math.round(3.5 - y * 0.25);
    b.box(cx + 3, y, cz, cx + 3 + out, y, cz, fin);
    b.box(cx - 3 - out, y, cz, cx - 3, y, cz, fin);
    b.box(cx, y, cz + 3, cx, y, cz + 3 + out, fin);
    b.box(cx, y, cz - 3 - out, cx, y, cz - 3, fin);
  }
}

// A square lattice tower: corner posts, a ring every `step`, zigzag braces on every face.
// (Truck Town's tower crane uses it too: other colors, no aerial on top.)
export function gantry(b, x0, z0, x1, z1, top, step = 5, { postColor = RED, braceColor = 0xffffff, aerial = true } = {}) {
  const post = { mat: MAT.METAL, color: postColor };
  const brace = { mat: MAT.METAL, color: braceColor };
  const corners = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  for (const [x, z] of corners) b.box(x, 0, z, x, top, z, post);
  for (let y = step; y <= top; y += step) {
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k];
      const [bx, bz] = corners[(k + 1) % 4];
      b.beam(ax, y, az, bx, y, bz, post, 1);
      // Braces zigzag up each face.
      const flip = (y / step + k) % 2;
      b.beam(flip ? ax : bx, y - step, flip ? az : bz, flip ? bx : ax, y, flip ? bz : az, brace, 0.75);
    }
  }
  b.box(x0, top + 1, z0, x1, top + 1, z1, { mat: MAT.METAL, color: GREY });
  if (!aerial) return;
  b.beam((x0 + x1) / 2, top + 2, (z0 + z1) / 2, (x0 + x1) / 2, top + 7, (z0 + z1) / 2, { mat: MAT.METAL, color: GREY }, 0.5);
  b.dab((x0 + x1) / 2, top + 7.5, (z0 + z1) / 2, { mat: MAT.CANDY, color: RED, flat: true }, 1);
}

// A radar dish on a pole, tipped back to look at the sky.
function dish(b, x, z) {
  b.cylinder(x, z, 0, 9, 1.1, { mat: MAT.METAL, color: GREY });
  b.box(x - 1, 10, z - 1, x + 1, 10, z + 1, { mat: MAT.METAL, color: DARK });
  const tilt = 0.6;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  for (let u = -6; u <= 6; u += 0.35)
    for (let v = -6; v <= 6; v += 0.35) {
      const r2 = u * u + v * v;
      if (r2 > 36) continue;
      const h = r2 / 12;
      b.dab(x + u, 11 + h * c - v * s, z + h * s + v * c, { mat: MAT.PLASTIC, color: r2 > 25 ? BLUE : WHITE, flat: r2 > 25 }, 1);
    }
  b.beam(x, 11, z, x, 11 + 5 * c, z + 5 * s, { mat: MAT.METAL, color: DARK }, 0.5);
  b.dab(x, 11 + 5.5 * c, z + 5.5 * s, { mat: MAT.CANDY, color: RED, flat: true }, 1.5);
}

// A glass dome on a metal ring.
function dome(b, x, z, r) {
  b.cylinder(x, z, 0, 0, r + 0.7, { mat: MAT.METAL, color: GREY }, { thick: 2 });
  b.ellipsoid(x, 0, z, r, r * 0.85, r, (px, py) => ({ mat: MAT.GLASS, color: py % 2 ? 0xbff3ff : 0xa6e8ff, flat: true }));
  b.cylinder(x, z, Math.round(r * 0.85), Math.round(r * 0.85) + 1, 0.8, { mat: MAT.METAL, color: GREY });
  b.dab(x, Math.round(r * 0.85) + 2, z, { mat: MAT.CANDY, color: 0x5fd35f, flat: true }, 1);
}

// The giant toy robot, facing +z: feet, legs, a chest with blinking lights, arms with claws,
// a head with a glass visor and glowing eyes, and an antenna.
function robot(b, x, z) {
  const metal = { mat: MAT.METAL, color: GREY };
  const blue = { mat: MAT.PLASTIC, color: 0x5b6cff };
  const dark = { mat: MAT.METAL, color: DARK };
  for (const lx of [x - 4, x + 2]) {
    b.box(lx - 1, 0, z - 2, lx + 3, 1, z + 3, dark);
    b.box(lx, 2, z - 1, lx + 2, 9, z + 1, (px, py) => (py === 5 ? dark : metal));
  }
  b.box(x - 5, 10, z - 2, x + 5, 11, z + 2, dark);
  b.hollowBox(x - 5, 12, z - 2, x + 5, 20, z + 2, blue, { roof: true });
  for (const [dx, color] of [
    [-2, 0xff4d4d],
    [0, 0xffd23f],
    [2, 0x5fd35f],
  ])
    b.put(x + dx, 17, z + 2, { mat: MAT.CANDY, color, flat: true });
  b.box(x - 2, 13, z + 2, x + 2, 14, z + 2, { mat: MAT.METAL, color: 0xffd23f });
  for (const side of [-1, 1]) {
    const ax = side < 0 ? x - 7 : x + 6;
    b.box(ax, 18, z - 1, ax + 1, 20, z + 1, dark);
    b.box(ax, 11, z - 1, ax + 1, 17, z + 1, metal);
    b.box(ax - 1, 9, z - 1, ax + 2, 10, z + 1, dark);
    b.box(ax - 1, 7, z - 1, ax - 1, 8, z + 1, dark);
    b.box(ax + 2, 7, z - 1, ax + 2, 8, z + 1, dark);
  }
  b.box(x - 1, 21, z - 1, x + 1, 21, z + 1, dark);
  b.hollowBox(x - 3, 22, z - 2, x + 3, 26, z + 2, blue, { roof: true });
  b.box(x - 3, 22, z - 2, x + 3, 22, z + 2, dark);
  b.box(x - 2, 24, z + 2, x + 2, 25, z + 2, { mat: MAT.GLASS, color: 0x7fd6ff, flat: true });
  for (const ex of [x - 1, x + 1]) b.put(ex, 24, z + 2, { mat: MAT.GOLD, color: 0xffe14d, flat: true });
  b.box(x - 1, 23, z + 2, x + 1, 23, z + 2, dark);
  for (const ex of [x - 4, x + 4]) b.box(ex, 23, z - 1, ex, 25, z + 1, dark);
  b.beam(x, 27, z, x, 30, z, metal, 0.5);
  b.dab(x, 30.6, z, { mat: MAT.CANDY, color: RED, flat: true }, 1.25);
}

// A grey moon rock.
function rock(b, x, z, r) {
  b.ellipsoid(x, 0, z, r, r * 0.7, r * 0.85, (px, py, pz) => ({ mat: MAT.STONE, color: (px + py + pz) % 3 ? 0xb8bcc8 : 0x9ea3b0 }));
}

export default {
  id: 'space',
  icon: 'rocket',
  camera: { target: [0, 14, -4], yaw: 0.38, pitch: 0.34, dist: 96 },
  build(b) {
    rocket(b, -9, -8);
    gantry(b, 0, -11, 6, -5, 38);
    // Walkways reaching across to the rocket.
    for (const y of [20, 30]) b.box(-3, y, -9, -1, y, -7, { mat: MAT.METAL, color: GREY });
    tnt(b, 9, 0, -12);
    tnt(b, 9, 0, -6);
    tnt(b, 12, 0, -9);
    dish(b, 22, 10);
    dome(b, -24, 14, 5);
    dome(b, -12, 22, 3.5);
    robot(b, 22, -18);
    for (const [x, z, r] of [
      [-30, -6, 2.6],
      [8, 22, 2],
      [-2, 14, 1.5],
      [30, 26, 2.2],
      [-28, -26, 3],
    ])
      rock(b, x, z, r);
  },
};
