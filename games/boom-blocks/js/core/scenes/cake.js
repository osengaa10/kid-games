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
    [0, 6, 11, 0xff8cc0],
    [7, 12, 8, 0xfff3d6],
    [13, 17, 5, 0xb8e8ff],
  ];
  for (const [y0, y1, r, color] of tiers)
    b.cylinder(cx, cz, y0, y1, r, (x, y, z) => {
      // White icing on top, dripping down the side a little.
      if (y === y1) return sprinkled({ mat: MAT.CANDY, color: 0xffffff }, x, y, z);
      if (y === y1 - 1 && spot(x, z) % 3 === 0) return { mat: MAT.CANDY, color: 0xffffff };
      return { mat: MAT.CANDY, color };
    });
  // Strawberries round the bottom tier, candles round the top.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    b.ellipsoid(cx + Math.cos(a) * 9.6, 7, cz + Math.sin(a) * 9.6, 0.9, 0.9, 0.9, { mat: MAT.JELLY, color: 0xe8333b });
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const x = cx + Math.round(Math.cos(a) * 3);
    const z = cz + Math.round(Math.sin(a) * 3);
    b.cylinder(x, z, 18, 22, 0.55, (px, py) => ({ mat: MAT.CANDY, color: py % 2 ? 0xffffff : RAINBOW[k] }));
    b.dab(x, 23, z, { mat: MAT.CANDY, color: 0xff9f1c, flat: true }, 1);
    b.dab(x, 23.6, z, { mat: MAT.CANDY, color: 0xfff3a0, flat: true }, 0.5);
  }
  b.gift(cx, 0, cz, 'fireworks');
}

function cupcake(b, x, z, frosting) {
  for (let y = 0; y <= 2; y++) b.cylinder(x, z, y, y, 2.2 + y * 0.25, (px, py, pz) => ({ mat: MAT.CANDY, color: Math.floor(angleOf(px + 0.5, pz + 0.5, x + 0.5, z + 0.5) * 14) % 2 ? 0xffffff : 0x2ec4f1 }));
  const icing = (px, py, pz) => sprinkled({ mat: MAT.CANDY, color: frosting }, px, py, pz);
  b.ellipsoid(x, 3, z, 2.9, 1.4, 2.9, icing);
  b.ellipsoid(x, 4.4, z, 2.1, 1.2, 2.1, icing);
  b.ellipsoid(x, 5.6, z, 1.2, 1, 1.2, icing);
  b.dab(x, 7, z, { mat: MAT.JELLY, color: 0xe8333b }, 1.2);
  b.beam(x, 7.5, z, x + 0.6, 8.8, z, { mat: MAT.LEAF, color: 0x2f9e44 }, 0.5);
}

// An ice cream cone standing on its point, with three scoops and a cherry.
function iceCream(b, x, z) {
  for (let y = 0; y <= 7; y++) b.cylinder(x, z, y, y, 0.6 + y * 0.28, (px, py, pz) => ({ mat: MAT.CANDY, color: (((px + py + pz) % 2) + 2) % 2 ? 0xd9a35b : 0xb57a35 }));
  b.ellipsoid(x, 9, z, 2.8, 2.4, 2.8, { mat: MAT.CANDY, color: 0xff8cc0 });
  b.ellipsoid(x, 12.4, z, 2.5, 2.2, 2.5, { mat: MAT.CANDY, color: 0x8d5a2b });
  b.ellipsoid(x, 15.4, z, 2.2, 2, 2.2, (px, py, pz) => ({ mat: MAT.CANDY, color: spot(px + py, pz) < 18 ? 0x3a2a1a : 0x9ff0c4 }));
  b.dab(x, 17.6, z, { mat: MAT.JELLY, color: 0xe8333b }, 1.2);
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

// A lollipop on a stick: a swirly disc standing up.
function lollipop(b, x, z, colors) {
  b.beam(x, 0, z, x, 8, z, { mat: MAT.CANDY, color: 0xfff8ec }, 0.75);
  const swirl = (px, py) => {
    const a = Math.atan2(py - 10.5, px - x) / (Math.PI * 2) + 1;
    const r = Math.hypot(px - x, py - 10.5);
    return { mat: MAT.CANDY, color: colors[Math.floor((a + r * 0.22) * 6) % colors.length], flat: true };
  };
  for (const r of [0.4, 1.1, 1.8, 2.5, 3.2]) b.ring(x, 10.5, z, r, swirl, { w: 0.8 });
}

// A giant donut standing on its edge: frosted on top, sprinkles all over.
function donut(b, x, z) {
  const R = 4.5;
  const cy = R + 1.1;
  const paint = (px, py, pz) => (py + 0.5 > cy + 0.5 ? sprinkled({ mat: MAT.CANDY, color: 0xff8cc0 }, px, py, pz) : { mat: MAT.CANDY, color: 0xd9a35b });
  for (let dz = -1.5; dz <= 1.5; dz += 0.5)
    for (let dr = -1.5; dr <= 1.5; dr += 0.5) if (dz * dz + dr * dr <= 2.4) b.ring(x, cy, z + dz, R + dr, paint, { w: 0.75 });
}

export default {
  id: 'cake',
  icon: 'cake',
  camera: { target: [0, 10, -4], yaw: 0.36, pitch: 0.38, dist: 90 },
  build(b) {
    birthdayCake(b, 0, -10);
    cupcake(b, -24, -18, 0xb15cff);
    cupcake(b, 22, -22, 0x5fd35f);
    cupcake(b, -28, 6, 0xffd23f);
    cupcake(b, 28, 0, 0xff8cc0);
    iceCream(b, -12, 14);
    iceCream(b, 10, 18);
    gingerbread(b, 22, 14);
    lollipop(b, -32, -6, [0xff4d4d, 0xffffff, 0xff8cc0]);
    lollipop(b, -2, 24, [0x2ec4f1, 0xffffff, 0xb15cff]);
    lollipop(b, 33, -14, [0x5fd35f, 0xffd23f, 0xffffff]);
    lollipop(b, -16, -28, [0xff9f1c, 0xffffff, 0xff4d4d]);
    donut(b, -24, 22);
  },
};
