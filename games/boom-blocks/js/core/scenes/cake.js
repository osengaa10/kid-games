// Cake Land: a giant three-tier birthday cake with candles (fireworks hidden in its middle),
// cupcakes, ice cream cones balanced on their points, a gingerbread house with candy canes by
// the door, lollipop trees, and a giant donut standing on its edge.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';

const spot = (x, z) => ((((x * 374761393) ^ (z * 668265263)) >>> 0) % 100);
const SPRINKLES = [0xff4d4d, 0xffd23f, 0x5fd35f, 0x2ec4f1, 0xb15cff, 0xffffff];
const sprinkled = (base, x, y, z) => (spot(x + y * 7, z) < 14 ? { mat: MAT.CANDY, color: SPRINKLES[spot(z, x + y) % SPRINKLES.length], flat: true } : base);
const angleOf = (x, z, cx, cz) => (Math.atan2(z - cz, x - cx) / (Math.PI * 2) + 1) % 1;

function birthdayCake(b, cx, cz) {
  const tiers = [
    [0, 7, 13, 0xff8cc0],
    [8, 14, 9.5, 0xfff3d6],
    [15, 20, 6, 0xb8e8ff],
  ];
  for (const [y0, y1, r, color] of tiers)
    b.cylinder(cx, cz, y0, y1, r, (x, y, z) => {
      // White icing on top, dripping down the side a little.
      if (y === y1) return sprinkled({ mat: MAT.CANDY, color: 0xffffff }, x, y, z);
      if (y === y1 - 1 && spot(x, z) % 3 === 0) return { mat: MAT.CANDY, color: 0xffffff };
      return { mat: MAT.CANDY, color };
    });
  // Strawberries round the bottom tier, candles round the top.
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    b.ellipsoid(cx + Math.cos(a) * 11.3, 8, cz + Math.sin(a) * 11.3, 1.1, 1.1, 1.1, { mat: MAT.JELLY, color: 0xe8333b });
  }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const x = cx + Math.round(Math.cos(a) * 3.6);
    const z = cz + Math.round(Math.sin(a) * 3.6);
    b.cylinder(x, z, 21, 27, 0.7, (px, py) => ({ mat: MAT.CANDY, color: py % 2 ? 0xffffff : RAINBOW[k] }));
    b.dab(x, 28, z, { mat: MAT.CANDY, color: 0xff9f1c, flat: true }, 1.2);
    b.dab(x, 28.8, z, { mat: MAT.CANDY, color: 0xfff3a0, flat: true }, 0.6);
  }
  b.gift(cx, 0, cz, 'fireworks');
}

// A cupcake in a striped paper case, with swirled frosting and a cherry: `s` times its first size.
function cupcake(b, x, z, frosting, s = 1) {
  const liner = (px, py, pz) => ({ mat: MAT.CANDY, color: Math.floor(angleOf(px + 0.5, pz + 0.5, x + 0.5, z + 0.5) * 14) % 2 ? 0xffffff : 0x2ec4f1 });
  const layers = Math.round(3 * s);
  for (let y = 0; y < layers; y++) b.cylinder(x, z, y, y, (2.2 + (y / s) * 0.25) * s, liner);
  const icing = (px, py, pz) => sprinkled({ mat: MAT.CANDY, color: frosting }, px, py, pz);
  b.ellipsoid(x, 3 * s, z, 2.9 * s, 1.4 * s, 2.9 * s, icing);
  b.ellipsoid(x, 4.4 * s, z, 2.1 * s, 1.2 * s, 2.1 * s, icing);
  b.ellipsoid(x, 5.6 * s, z, 1.2 * s, 1 * s, 1.2 * s, icing);
  b.dab(x, 7 * s, z, { mat: MAT.JELLY, color: 0xe8333b }, 1.2 * s);
  b.beam(x, 7 * s + 0.6 * s, z, x + 0.6 * s, 8.8 * s, z, { mat: MAT.LEAF, color: 0x2f9e44 }, 0.5 * s);
}

// An ice cream cone standing on its point, with three scoops and a cherry: `s` times its first size.
function iceCream(b, x, z, s = 1) {
  const waffle = (px, py, pz) => ({ mat: MAT.CANDY, color: (((px + py + pz) % 2) + 2) % 2 ? 0xd9a35b : 0xb57a35 });
  const layers = Math.round(8 * s);
  for (let y = 0; y < layers; y++) b.cylinder(x, z, y, y, (0.6 + (y / s) * 0.28) * s, waffle);
  b.ellipsoid(x, 9 * s, z, 2.8 * s, 2.4 * s, 2.8 * s, { mat: MAT.CANDY, color: 0xff8cc0 });
  b.ellipsoid(x, 12.4 * s, z, 2.5 * s, 2.2 * s, 2.5 * s, { mat: MAT.CANDY, color: 0x8d5a2b });
  b.ellipsoid(x, 15.4 * s, z, 2.2 * s, 2 * s, 2.2 * s, (px, py, pz) => ({ mat: MAT.CANDY, color: spot(px + py, pz) < 18 ? 0x3a2a1a : 0x9ff0c4 }));
  b.dab(x, 17.6 * s, z, { mat: MAT.JELLY, color: 0xe8333b }, 1.2 * s);
}

// A gingerbread house with white icing, candy windows, gumdrops on the roof and candy canes by
// the door. Faces +z.
function gingerbread(b, x, z) {
  const ginger = { mat: MAT.CANDY, color: 0xb5733c };
  const white = { mat: MAT.CANDY, color: 0xffffff };
  b.hollowBox(x - 5, 0, z - 4, x + 5, 6, z + 4, (px, py, pz) => {
    const corner = (px === x - 5 || px === x + 5) && (pz === z - 4 || pz === z + 4);
    if (corner || py === 6) return white;
    if (pz === z + 4 && py >= 2 && py <= 4 && Math.abs(px - x) >= 3 && Math.abs(px - x) <= 4) return py === 3 ? { mat: MAT.GLASS, color: 0xffe066, flat: true } : white;
    return ginger;
  }, { roof: true });
  b.hole(x - 1, 0, z + 4, x + 1, 3, z + 4);
  for (let y = 7; y <= 12; y++) {
    const h = 5.5 - (y - 7);
    b.box(x - 6, y, Math.round(z - h), x + 6, y, Math.round(z + h), (px, py, pz) => {
      // Rows of white icing and pink frosting, edged with icing at the ends.
      const end = px === x - 6 || px === x + 6;
      return end || py % 2 ? white : { mat: MAT.CANDY, color: 0xff8cc0 };
    });
  }
  for (let px = x - 5; px <= x + 5; px += 2) b.dab(px, 13, z, { mat: MAT.JELLY, color: RAINBOW[(px + 70) % 7] }, 1.2);
  b.box(x + 3, 10, z - 2, x + 3, 13, z - 2, (px, py) => (py === 13 ? white : ginger));
  // Candy canes either side of the door.
  for (const cx of [x - 3, x + 3]) {
    const stripe = (px, py) => ({ mat: MAT.CANDY, color: (((px + py) % 2) + 2) % 2 ? 0xffffff : 0xe8333b });
    b.box(cx, 0, z + 6, cx, 6, z + 6, stripe);
    let prev = [cx, 6, z + 6];
    for (let a = 0.2; a <= Math.PI; a += 0.2) {
      const p = [cx + (cx < x ? -1 : 1) * (1 - Math.cos(a)) * 1.2, 6 + Math.sin(a) * 1.4, z + 6];
      b.beam(...prev, ...p, stripe, 1);
      prev = p;
    }
  }
}

// A lollipop on a stick: a swirly disc standing up, `s` times its first size.
function lollipop(b, x, z, colors, s = 1) {
  const cy = 10.5 * s;
  b.beam(x, 0, z, x, 8 * s, z, { mat: MAT.CANDY, color: 0xfff8ec }, 0.75 * s);
  const swirl = (px, py) => {
    const a = Math.atan2(py - cy, px - x) / (Math.PI * 2) + 1;
    const r = Math.hypot(px - x, py - cy) / s;
    return { mat: MAT.CANDY, color: colors[Math.floor((a + r * 0.22) * 6) % colors.length], flat: true };
  };
  // Rings close enough to touch, so the disc is all one piece.
  for (let r = 0.4; r <= 3.2 * s; r += 0.6) b.ring(x, cy, z, r, swirl, { w: 0.8 * Math.max(1, s * 0.8) });
}

// A giant donut standing on its edge: frosted on top, sprinkles all over. R: from its middle to
// the middle of the dough.
function donut(b, x, z, R = 4.5) {
  const t = 1.5 * (R / 4.5);
  const cy = R + t - 0.4;
  const paint = (px, py, pz) => (py + 0.5 > cy + 0.5 ? sprinkled({ mat: MAT.CANDY, color: 0xff8cc0 }, px, py, pz) : { mat: MAT.CANDY, color: 0xd9a35b });
  for (let dz = -t; dz <= t; dz += 0.5)
    for (let dr = -t; dr <= t; dr += 0.5) if (dz * dz + dr * dr <= t * t + 0.2) b.ring(x, cy, z + dz, R + dr, paint, { w: 0.75 });
}

export default {
  id: 'cake',
  icon: 'cake',
  camera: { target: [0, 12, -4], yaw: 0.36, pitch: 0.38, dist: 98 },
  build(b) {
    birthdayCake(b, 0, -11);
    cupcake(b, -25, -19, 0xb15cff, 1.7);
    cupcake(b, 24, -23, 0x5fd35f, 1.7);
    cupcake(b, -29, 5, 0xffd23f, 1.7);
    cupcake(b, 30, -3, 0xff8cc0, 1.7);
    iceCream(b, -12, 14, 1.3);
    iceCream(b, 8, 19, 1.3);
    gingerbread(b, 23, 15);
    lollipop(b, -33, -8, [0xff4d4d, 0xffffff, 0xff8cc0], 1.5);
    lollipop(b, -2, 26, [0x2ec4f1, 0xffffff, 0xb15cff], 1.5);
    lollipop(b, 34, -16, [0x5fd35f, 0xffd23f, 0xffffff], 1.5);
    lollipop(b, -14, -31, [0xff9f1c, 0xffffff, 0xff4d4d], 1.5);
    donut(b, -24, 23, 6.2);
  },
};
