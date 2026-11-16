// Domino Garden: a giant block dinosaur, a rainbow line of dominoes snaking round the garden to a
// TNT crate at the end (knock the first one over and wait for the BOOM), a pyramid of wooden
// crates to bowl over, a glass greenhouse, a garden shed, a toadstool house, giant flowers and a
// big flower pot.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';
import { tree } from './tower.js';

const DINO = 0x5fd35f;
const BELLY = 0xc9f27a;
const SPOTS = 0xb15cff;

const blob = (b, cx, cy, cz, rx, ry, rz, paint) => b.ellipsoid(cx, cy, cz, rx, ry, rz, paint);

// A friendly long-necked dinosaur made of blocks, facing +x, `s` times its first size.
function dino(b, ox, oz, s = 1) {
  const skin = (x, y, z) => {
    if (y < 5 * s && Math.abs(z - oz) < 3 * s) return { mat: MAT.PLASTIC, color: BELLY };
    const spot = Math.sin((x * 0.9) / s) * Math.sin((z * 1.3 + y * 0.7) / s) > 0.55;
    return { mat: MAT.PLASTIC, color: spot ? SPOTS : DINO };
  };
  const leg = Math.round(1.2 * s);
  for (const [lx, lz] of [
    [-4, -2],
    [-4, 2],
    [4, -2],
    [4, 2],
  ]) {
    const cx = ox + Math.round(lx * s);
    const cz = oz + Math.round(lz * s);
    b.box(cx - leg, 0, cz - leg, cx + leg, Math.round(5 * s) - 1, cz + leg, { mat: MAT.PLASTIC, color: DINO });
  }
  blob(b, ox, 8 * s, oz, 8 * s, 4.2 * s, 4.2 * s, skin);
  // The neck curves up and forward to the head.
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = (2.2 - t * 0.5) * s;
    blob(b, ox + (7 + t * 6) * s, (10 + t * 9) * s, oz, r, r, r, skin);
  }
  const hx = ox + 14.5 * s;
  const hy = 19.5 * s;
  blob(b, hx, hy, oz, 2.8 * s, 1.8 * s, 1.9 * s, { mat: MAT.PLASTIC, color: DINO });
  for (const k of [-1, 1]) {
    b.dab(hx + 0.6 * s, hy + 0.6 * s, oz + k * 1.6 * s, { mat: MAT.PLASTIC, color: 0xffffff, flat: true }, s);
    b.dab(hx + 1.3 * s, hy + 0.6 * s, oz + k * 1.6 * s, { mat: MAT.PLASTIC, color: 0x163a63, flat: true }, 0.8 * s);
  }
  b.dab(hx + 2.6 * s, hy - 0.4 * s, oz, { mat: MAT.PLASTIC, color: 0xff5fa2, flat: true }, s);
  // The tail sweeps down and back.
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = (2.6 - t * 1.6) * s;
    blob(b, ox - (7 + t * 10) * s, (8 - t * 5) * s, oz + Math.sin(t * 3) * 2 * s, r, r, r, skin);
  }
  // Spikes down its back.
  for (let i = -5; i <= 5; i += 2) b.beam(ox + i * s, 11.8 * s, oz, ox + i * s, 13.6 * s, oz, { mat: MAT.CANDY, color: 0xff9f1c }, 1.2 * s);
}

// A glass greenhouse in a white wooden frame, with a pitched glass roof and pots of flowers on
// a bench inside. x0, z0: its back left corner; it runs 14 along x and 9 along z.
function greenhouse(b, x0, z0) {
  const x1 = x0 + 13;
  const z1 = z0 + 8;
  const frame = { mat: MAT.WOOD, color: 0xf2efe6 };
  const glass = { mat: MAT.GLASS, color: 0xbff3ff, flat: true };
  const post = (x, z) => (x - x0) % 3 === 0 || (z - z0) % 4 === 0;
  b.hollowBox(x0, 0, z0, x1, 7, z1, (x, y, z) => (y <= 1 ? { mat: MAT.BRICK, color: 0xc0633f } : y === 7 || post(x, z) ? frame : glass), { thick: 1 });
  // The roof: a step of glass each unit up from both long sides to the ridge, ends glazed too.
  for (let k = 0; k <= 4; k++) {
    const roof = (x) => ((x - x0) % 3 === 0 ? frame : glass);
    b.box(x0, 8 + k, z0 + k, x1, 8 + k, Math.min(z0 + k + 1, z1 - k), roof);
    b.box(x0, 8 + k, Math.max(z1 - k - 1, z0 + k), x1, 8 + k, z1 - k, roof);
    b.box(x0, 8 + k, z0 + k, x0, 8 + k, z1 - k, glass);
    b.box(x1, 8 + k, z0 + k, x1, 8 + k, z1 - k, glass);
  }
  b.box(x0, 12, z0 + 4, x1, 12, z0 + 4, frame);
  // A bench of pots inside along the back.
  b.box(x0 + 2, 0, z0 + 1, x1 - 2, 3, z0 + 2, { mat: MAT.WOOD, color: 0x9a6233 });
  for (let x = x0 + 3; x <= x1 - 3; x += 3) {
    b.box(x, 4, z0 + 1, x + 1, 5, z0 + 2, { mat: MAT.BRICK, color: 0xd9733f });
    b.ellipsoid(x + 0.5, 7, z0 + 1.5, 1.4, 1.4, 1.4, { mat: MAT.LEAF, color: [0xff5fa2, 0xffd23f, 0xb15cff, 0xff9f1c][((x - x0) / 3) % 4 | 0] });
  }
}

// A wooden garden shed with a door, a window and a pitched roof. x0, z0: back left corner.
function shed(b, x0, z0) {
  const x1 = x0 + 9;
  const z1 = z0 + 7;
  b.hollowBox(x0, 0, z0, x1, 8, z1, (x, y) => ({ mat: MAT.WOOD, color: y % 2 ? 0x7fb3d5 : 0x6fa3c5 }), { thick: 2 });
  b.hole(x0 + 2, 0, z1, x0 + 3, 5, z1);
  b.box(x0 + 2, 0, z1, x0 + 3, 5, z1, { mat: MAT.WOOD, color: 0x9a6233 });
  b.box(x0 + 6, 4, z1, x0 + 8, 6, z1, { mat: MAT.GLASS, color: 0xbff3ff, flat: true });
  for (let k = 0; k <= 4; k++) b.box(x0 - 1, 9 + k, z0 - 1 + k, x1 + 1, 9 + k, z1 + 1 - k, { mat: MAT.WOOD, color: k % 2 ? 0xb5432f : 0xc9553f });
}

// A toadstool house: a fat white stalk with a door and round windows, under a big red cap with
// white spots.
function toadstool(b, x, z, s = 1) {
  const stalk = { mat: MAT.PLASTIC, color: 0xf5ecd7 };
  b.cylinder(x, z, 0, Math.round(6 * s), 2.6 * s, stalk);
  const cap = (px, py, pz) => {
    if (py < 8 * s) return { mat: MAT.PLASTIC, color: 0xf0e2c0 };
    const spot = Math.sin(px * 0.9) * Math.sin(pz * 0.9) > 0.6 || Math.sin(px * 0.6 + pz * 0.8) > 0.92;
    return { mat: MAT.PLASTIC, color: spot ? 0xffffff : 0xe8333b };
  };
  b.ellipsoid(x, 8 * s, z, 7 * s, 3.4 * s, 7 * s, cap);
  // A door and two windows on the front (+z).
  b.dab(x, 1.4 * s, z + 2.5 * s, { mat: MAT.WOOD, color: 0x8d5a2b, flat: true }, 1.6 * s);
  b.dab(x, 2.6 * s, z + 2.5 * s, { mat: MAT.WOOD, color: 0x8d5a2b, flat: true }, 1.6 * s);
  for (const k of [-1, 1]) b.dab(x + k * 1.7 * s, 4.4 * s, z + 2.1 * s, { mat: MAT.GLASS, color: 0xffe08a, flat: true }, 1 * s);
}

// A giant flower: a tall stalk with two leaves and a big daisy head facing the front (+z).
function flower(b, x, z, h, petal, centre = 0xffd23f) {
  const green = { mat: MAT.LEAF, color: 0x3fae55 };
  b.cylinder(x, z, 0, h, 0.7, green);
  for (const [k, y] of [
    [-1, h * 0.35],
    [1, h * 0.55],
  ])
    b.ellipsoid(x + 0.5 + k * 1.6, y, z + 0.5, 1.8, 0.6, 1, green);
  const hy = h + 2.5;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.ellipsoid(x + 0.5 + Math.cos(a) * 3, hy + Math.sin(a) * 3, z + 0.5, 1.5, 1.5, 0.7, { mat: MAT.PLASTIC, color: petal });
  }
  b.ellipsoid(x + 0.5, hy, z + 0.6, 2, 2, 1, { mat: MAT.PLASTIC, color: centre });
}

// A big terracotta flower pot full of flowers.
function flowerPot(b, x, z) {
  const pot = (px, py) => ({ mat: MAT.BRICK, color: py >= 5 ? 0xb85a33 : 0xd9733f });
  for (let y = 0; y <= 5; y++) b.cylinder(x, z, y, y, 3.4 + y * 0.25, pot, { thick: y === 0 ? 0 : 2 });
  b.cylinder(x, z, 5, 5, 3.3, { mat: MAT.DIRT, color: 0x6b4423 });
  flowerHead(b, x - 1.5, z, 10, 0xff5fa2);
  flowerHead(b, x + 2, z - 1, 12, 0xb15cff);
  flowerHead(b, x + 0.5, z + 1.5, 8, 0xffffff);
}

// A smaller flower growing out of a pot: a stalk from the soil (y 6) up to its head.
function flowerHead(b, x, z, h, petal) {
  b.beam(x, 6, z, x, h, z, { mat: MAT.LEAF, color: 0x3fae55 }, 1);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.ellipsoid(x + Math.cos(a) * 1.6, h + 1.4 + Math.sin(a) * 1.6, z, 0.9, 0.9, 0.5, { mat: MAT.PLASTIC, color: petal });
  }
  b.ellipsoid(x, h + 1.4, z + 0.1, 1.1, 1.1, 0.6, { mat: MAT.PLASTIC, color: 0xffd23f });
}

// A smooth curve through the control points (Catmull-Rom), as a dense polyline.
function smooth(points, per = 12) {
  const out = [];
  const p = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++)
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const [a, b, c, d] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      const f = (j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  out.push(points[points.length - 1]);
  return out;
}

// Walks a polyline and returns points every `step` units, with the direction at each.
function along(points, step) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    let d = carry;
    for (; d < len; d += step) out.push({ x: ax + ((bx - ax) * d) / len, z: az + ((bz - az) * d) / len, yaw: Math.atan2(bz - az, bx - ax) });
    carry = d - len;
  }
  return out;
}

const DOMINO = [];
for (let y = 0; y < 7; y++) for (let z = 0; z < 3; z++) DOMINO.push([0, y, z]);

const CRATE = [];
for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) CRATE.push([x, y, z]);

export default {
  id: 'garden',
  icon: 'dominoes',
  camera: { target: [0, 8, 0], yaw: 0.25, pitch: 0.48, dist: 94 },
  build(b) {
    dino(b, 3, -7, 1.25);
    greenhouse(b, -25, -32);
    shed(b, 6, -33);
    toadstool(b, -9, 9, 1.1);
    flowerPot(b, 11, 11);
    flower(b, 29, 3, 15, 0xff5fa2);
    flower(b, 33, -5, 12, 0xffffff);
    flower(b, 25, 11, 10, 0xff9f1c, 0x8d5a2b);

    // The domino line: a rainbow S round the front and left of the garden.
    const path = along(
      smooth([
        [28, 20],
        [16, 26],
        [2, 23],
        [-12, 26],
        [-24, 20],
        [-29, 7],
        [-26, -5],
        [-20, -12],
      ]),
      3.1,
    );
    path.forEach((p, i) => {
      const color = RAINBOW[i % RAINBOW.length];
      // Dominoes face along the path: their thin side points the way they'll fall.
      b.prop(DOMINO.map(([x, y, z]) => [x, y, z, MAT.PLASTIC, y === 3 ? 0xffffff : color]), [p.x, 3.5, p.z], -p.yaw);
    });
    // At the end of the line, right where the last domino will land: a TNT crate.
    const last = path[path.length - 1];
    b.prop(CRATE.map(([x, y, z]) => [x, y, z, MAT.TNT, y ? 0xffffff : 0xff3b3b]), [last.x + Math.cos(last.yaw) * 3.4, 1, last.z + Math.sin(last.yaw) * 3.4], -last.yaw);

    // A pyramid of wooden crates to bowl over.
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4 - row; i++)
        b.prop(CRATE.map(([x, y, z]) => [x, y, z, MAT.WOOD, (x + y + z) % 2 ? 0xc98a4b : 0xb07a3e]), [20 + i * 2.05 + row * 1.02, 1 + row * 2, -18], 0.3);

    for (const [x, z] of [
      [-32, -14],
      [28, -30],
      [-4, -30],
    ])
      tree(b, x, z, 3);
  },
};
