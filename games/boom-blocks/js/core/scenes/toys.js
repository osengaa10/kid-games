// Toy Room: giant toys. A stacking-ring tower, a jack-in-the-box with a smiley face on its spring
// (balloons inside the box), a big teddy bear, a wooden rainbow arch, a spinning top balanced on
// its point, a wobbly tower of picture blocks, a tin robot, a box of giant crayons standing up
// (knock one into the next), and a toy train to knock off its track.
// Each toy is drawn at a size `s` (1 = the size it was first designed at).
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';

const DARK = { mat: MAT.STONE, color: 0x2b2f45, flat: true };
const METAL = { mat: MAT.METAL, color: 0xc7cfdb };
const angleOf = (x, z, cx, cz) => (Math.atan2(z - cz, x - cx) / (Math.PI * 2) + 1) % 1;

// A donut lying flat around the middle of unit (cx, cz) at height cy: `outer` radius, a tube
// `tube` thick across and `high` tall. Small enough and it closes into a disc.
function donut(b, cx, cy, cz, outer, tube, high, paint) {
  const R = outer - tube;
  if (R <= tube * 0.5) return b.ellipsoid(cx, cy, cz, outer, high, outer, paint);
  const n = Math.ceil((Math.PI * 2 * R) / (tube * 0.5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.ellipsoid(cx + Math.cos(a) * R, cy, cz + Math.sin(a) * R, tube, high, tube, paint);
  }
}

// Donut rings stacked on a pole, biggest at the bottom, with a ball on top. Each ring rests on
// the one below (and the top ones hug the pole).
function stackingRings(b, cx, cz, s) {
  b.cylinder(cx, cz, 0, Math.round(18 * s), 0.9 * s, { mat: MAT.WOOD, color: 0xc98a4b });
  for (let k = 0; k < 6; k++) donut(b, cx, (k * 2.6 + 0.9) * s, cz, (7 - k) * s, 1.6 * s, 1.45 * s, { mat: MAT.PLASTIC, color: RAINBOW[k] });
  b.ellipsoid(cx, 19 * s, cz, 2 * s, 2 * s, 2 * s, { mat: MAT.PLASTIC, color: 0xff5fa2 });
}

// A jack-in-the-box: a painted box, its lid flipped up, a spring, and a smiling face in a party hat.
function jackInTheBox(b, x, z, s) {
  const half = Math.round(4 * s);
  const top = Math.round(8 * s) - 1;
  const front = z + half - 1;
  const back = z - half;
  const mx = x - 0.5;
  const mz = z - 0.5;
  const box = (px, py, pz) => {
    if (py === top) return { mat: MAT.PLASTIC, color: 0xffffff };
    const end = pz === front || pz === back;
    const face = pz === front ? 0xe8333b : pz === back ? 0xffd23f : 0x2e9bf1;
    const u = end ? px - mx : pz - mz;
    const diamond = Math.abs(u) + Math.abs(py - top / 2) <= 2 * s;
    return { mat: MAT.PLASTIC, color: diamond ? 0xffffff : face };
  };
  b.box(x - half, 0, back, x + half - 1, top, front, box);
  const lid = top + Math.round(7 * s);
  b.box(x - half, top + 1, back, x + half - 1, lid, back, (px, py) => ({ mat: MAT.PLASTIC, color: py === lid ? 0xffffff : 0x5fd35f }));
  // The crank on the side.
  const side = x + half - 0.4;
  b.beam(side, 4 * s, mz, side + 2.4 * s, 4 * s, mz, METAL, 0.75 * s);
  b.beam(side + 2.4 * s, 4 * s, mz, side + 2.4 * s, 6 * s, mz, METAL, 0.75 * s);
  b.dab(side + 2.4 * s, 6.6 * s, mz, { mat: MAT.PLASTIC, color: 0xe8333b }, 1.2 * s);
  // The spring: a coil going up from the middle of the box.
  const y0 = top + 0.6;
  let prev = null;
  for (let a = 0; a <= Math.PI * 2 * 5; a += 0.2) {
    const p = [mx + Math.cos(a) * 1.5 * s, y0 + (a / (Math.PI * 2)) * 1.7 * s, mz + Math.sin(a) * 1.5 * s];
    if (prev) b.beam(...prev, ...p, { mat: MAT.METAL, color: 0xd7dceb }, 0.75 * s);
    prev = p;
  }
  // The face.
  const fy = y0 + 9.9 * s;
  b.ellipsoid(mx, fy, mz, 3 * s, 3 * s, 3 * s, { mat: MAT.PLASTIC, color: 0xffd23f });
  for (const k of [-1, 1]) {
    b.dab(mx + k * 1.1 * s, fy + 1.1 * s, mz + 2.6 * s, DARK, 0.75 * s);
    b.dab(mx + k * 1.9 * s, fy - 0.1 * s, mz + 2.2 * s, { mat: MAT.PLASTIC, color: 0xff8cc0, flat: true }, 0.75 * s);
  }
  for (let t = -1; t <= 1; t += 0.25) b.dab(mx + t * 1.3 * s, fy - (0.6 + (1 - t * t) * 0.8) * s, mz + 2.45 * s, DARK, 0.5 * s);
  b.cone(mx, mz, fy + 2.5 * s, 5 * s, 2.2 * s, (px, py) => ({ mat: MAT.PLASTIC, color: py % 2 ? 0xb15cff : 0x2ec4f1 }));
  b.dab(mx, fy + 7.3 * s, mz, { mat: MAT.PLASTIC, color: 0xffffff }, 1.2 * s);
  b.gift(x - 1, 0, z - 1, 'balloons');
}

// A big teddy bear sitting on the ground, facing +z, with a red bow tie.
function teddy(b, x, z, s) {
  const fur = { mat: MAT.CLOTH, color: 0xa86b3c };
  const tan = { mat: MAT.CLOTH, color: 0xe3c08a };
  b.ellipsoid(x, 5 * s, z, 5 * s, 5.5 * s, 4.2 * s, (px, py, pz) => (pz > z + 2 * s && Math.abs(px - x) < 3 * s && py >= 2 * s && py <= 8 * s ? tan : fur));
  for (const k of [-1, 1]) {
    b.ellipsoid(x + k * 3 * s, 1.5 * s, z + 3.5 * s, 2 * s, 1.8 * s, 3 * s, fur);
    b.ellipsoid(x + k * 3 * s, 1.5 * s, z + 6.2 * s, 1.4 * s, 1.3 * s, 0.6 * s, tan);
    b.ellipsoid(x + k * 5 * s, 6 * s, z + 1 * s, 1.6 * s, 3 * s, 1.6 * s, fur);
    b.ellipsoid(x + k * 3 * s, 16 * s, z, 1.3 * s, 1.3 * s, 0.8 * s, fur);
    b.ellipsoid(x + k * 3 * s, 16 * s, z + 0.4 * s, 0.7 * s, 0.7 * s, 0.6 * s, tan);
    b.dab(x + k * 1.3 * s, 14.2 * s, z + 3.1 * s, DARK, 0.75 * s);
    b.dab(x + k * 1 * s, 10.4 * s, z + 2.4 * s, { mat: MAT.CLOTH, color: 0xe8333b, flat: true }, 1 * s);
  }
  b.ellipsoid(x, 13 * s, z, 3.8 * s, 3.4 * s, 3.4 * s, fur);
  b.ellipsoid(x, 12.3 * s, z + 2.6 * s, 1.6 * s, 1.2 * s, 1.2 * s, tan);
  b.dab(x, 13 * s, z + 3.9 * s, DARK, 0.75 * s);
  b.dab(x, 10.4 * s, z + 2.6 * s, { mat: MAT.CLOTH, color: 0xb02a31, flat: true }, 0.75 * s);
}

// A wooden rainbow arch: nested half circles standing on the ground, two layers deep.
function rainbowArch(b, cx, cz, s) {
  [9, 7.8, 6.6, 5.4, 4.2].forEach((r, k) => {
    for (const dz of [0, 1.1 * s]) {
      let prev = null;
      for (let a = 0; a <= Math.PI + 1e-6; a += 0.06 / s) {
        const p = [cx + Math.cos(a) * r * s, Math.sin(a) * r * s, cz + dz];
        if (prev) b.beam(...prev, ...p, { mat: MAT.WOOD, color: RAINBOW[k] }, 1.2 * s);
        prev = p;
      }
    }
  });
}

// A spinning top balanced on its point, striped round.
function spinningTop(b, cx, cz, s) {
  const stripes = (x, y, z) => ({ mat: MAT.PLASTIC, color: RAINBOW[Math.floor(angleOf(x + 0.5, z + 0.5, cx + 0.5, cz + 0.5) * 7)] });
  const profile = [0.6, 1.5, 2.4, 3.3, 4.2, 4.2, 3, 1.6];
  const layers = Math.round(profile.length * s);
  for (let y = 0; y < layers; y++) {
    // The radius at this height, along the profile.
    const t = Math.min(profile.length - 1, Math.max(0, (y + 0.5) / s - 0.5));
    const i = Math.floor(t);
    const r = profile[i] + (profile[Math.min(profile.length - 1, i + 1)] - profile[i]) * (t - i);
    b.cylinder(cx, cz, y, y, r * s, stripes);
  }
  b.cylinder(cx, cz, layers, layers + Math.round(3 * s) - 1, 0.6 * s, { mat: MAT.WOOD, color: 0xc98a4b });
}

// A wobbly tower of picture blocks, each `size` units across: a different color each, with a
// white diamond on its sides.
function pictureBlocks(b, x, z, size = 3) {
  const offsets = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
  ];
  const lo = -Math.floor(size / 2);
  const hi = lo + size - 1;
  offsets.forEach(([ox, oz], k) => {
    const x0 = x + ox + lo;
    const x1 = x + ox + hi;
    const z0 = z + oz + lo;
    const z1 = z + oz + hi;
    const y0 = k * size;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const my = y0 + (size - 1) / 2;
    const color = RAINBOW[(k * 3) % 7];
    b.box(x0, y0, z0, x1, y0 + size - 1, z1, (px, py, pz) => {
      const v = Math.abs(py - my);
      const white = ((pz === z0 || pz === z1) && Math.abs(px - mx) + v <= size / 2 - 0.5) || ((px === x0 || px === x1) && Math.abs(pz - mz) + v <= size / 2 - 0.5);
      return { mat: MAT.PLASTIC, color: white ? 0xffffff : color };
    });
  });
}

// A tin robot standing facing +z: square legs, a red body with blinking lights, arms with pincers,
// a boxy head with big eyes and an antenna.
function robot(b, x, z) {
  const red = { mat: MAT.PLASTIC, color: 0xe8333b };
  const blue = { mat: MAT.PLASTIC, color: 0x2e9bf1 };
  // Feet and legs.
  for (const lx of [x - 4, x + 1]) {
    b.box(lx - 1, 0, z - 2, lx + 3, 1, z + 3, blue);
    b.box(lx, 2, z - 1, lx + 2, 8, z + 1, (px, py) => (py % 2 ? METAL : { mat: MAT.METAL, color: 0x9aa3b5 }));
  }
  // Body, with a panel of lights on the front.
  const lights = [0xffd23f, 0x5fd35f, 0x2ec4f1, 0xff5fa2];
  b.box(x - 5, 9, z - 3, x + 4, 19, z + 2, (px, py, pz) => {
    if (pz === z + 2 && py >= 13 && py <= 16 && px >= x - 3 && px <= x + 2) {
      const lit = (px + py) % 2 === 0;
      return { mat: MAT.PLASTIC, color: lit ? lights[(px - x + 3 + py) % 4] : 0x2b2f45, flat: true };
    }
    return py === 9 || py === 19 ? METAL : red;
  });
  // Arms, hanging down, with pincer hands.
  for (const [ax, k] of [
    [x - 8, -1],
    [x + 5, 1],
  ]) {
    b.box(ax, 16, z - 1, ax + 2, 18, z + 1, METAL);
    b.box(k < 0 ? ax : ax + 1, 9, z - 1, k < 0 ? ax + 1 : ax + 2, 15, z + 1, (px, py) => (py % 3 === 0 ? { mat: MAT.METAL, color: 0x9aa3b5 } : METAL));
    b.box(k < 0 ? ax : ax + 1, 6, z - 2, k < 0 ? ax + 1 : ax + 2, 8, z - 2, blue);
    b.box(k < 0 ? ax : ax + 1, 6, z + 2, k < 0 ? ax + 1 : ax + 2, 8, z + 2, blue);
    b.box(k < 0 ? ax : ax + 1, 8, z - 1, k < 0 ? ax + 1 : ax + 2, 8, z + 1, blue);
  }
  // Neck and head.
  b.box(x - 1, 20, z - 1, x, 20, z, METAL);
  b.box(x - 4, 21, z - 3, x + 3, 27, z + 2, (px, py, pz) => (py === 27 ? red : METAL));
  for (const ex of [x - 3, x + 1]) {
    b.box(ex, 24, z + 3, ex + 1, 25, z + 3, { mat: MAT.PLASTIC, color: 0xffd23f, flat: true });
    b.put(ex + (ex < x ? 1 : 0), 24, z + 3, DARK);
  }
  b.box(x - 2, 22, z + 3, x + 1, 22, z + 3, DARK);
  b.beam(x - 0.5, 28, z - 0.5, x - 0.5, 31, z - 0.5, METAL, 0.75);
  b.dab(x - 0.5, 31.8, z - 0.5, { mat: MAT.PLASTIC, color: 0xff3b3b }, 1.6);
}

// A box of giant crayons standing on end, tips up, poking out of the top: knock one into the next.
function crayonBox(b, cx, cz) {
  const colors = [0xe8333b, 0xff9f1c, 0xffd23f, 0x5fd35f, 0x2e9bf1, 0xb15cff];
  const heights = [14, 11, 15, 12, 14, 10];
  colors.forEach((color, i) => {
    const x = cx - 8 + i * 3;
    const h = heights[i];
    const paper = (px, py) => ({ mat: MAT.PLASTIC, color: py === 3 || py === h - 3 ? 0x2b2f45 : py > 3 && py < h - 3 ? color : 0xffffff });
    // (Thin enough that each stands on its own, clear of its neighbors and the box.)
    b.cylinder(x, cz + 0.5, 0, h, 1.15, paper);
    b.cone(x, cz + 0.5, h + 1, 3, 1.15, { mat: MAT.PLASTIC, color });
  });
  // The box: green with a yellow band and a pointed flap at the back.
  const paint = (x, y) => ({ mat: MAT.PLASTIC, color: y === 3 ? 0xffd23f : 0x3fae55 });
  b.hollowBox(cx - 11, 0, cz - 2, cx + 10, 5, cz + 3, paint, { thick: 2 });
  for (let k = 0; k <= 3; k++) b.box(cx - 10 + k, 6 + k, cz - 2, cx + 9 - k, 6 + k, cz - 2, { mat: MAT.PLASTIC, color: 0x3fae55 });
}

// The toy train (sleeping physics props): an engine and three wagons, on the floor in a line.
function trainProps(b, x, z) {
  const engine = [];
  for (let px = 0; px <= 5; px++) for (let pz = 0; pz <= 2; pz++) engine.push([px, 0, pz, MAT.PLASTIC, 0xe8333b]);
  for (let px = 2; px <= 5; px++) for (let py = 1; py <= 2; py++) for (let pz = 0; pz <= 2; pz++) engine.push([px, py, pz, MAT.PLASTIC, 0x2e9bf1]);
  for (let px = 0; px <= 1; px++) for (let py = 1; py <= 3; py++) for (let pz = 0; pz <= 2; pz++) engine.push([px, py, pz, MAT.PLASTIC, 0xffd23f]);
  engine.push([4, 3, 1, MAT.PLASTIC, 0x2b2f45], [4, 4, 1, MAT.PLASTIC, 0x2b2f45]);
  const place = (cells, cx) => {
    const cy = cells.reduce((a, c) => a + c[1] + 0.5, 0) / cells.length;
    b.prop(cells, [cx, cy, z], 0);
  };
  place(engine, x);
  for (let k = 0; k < 3; k++) {
    const color = RAINBOW[(k * 2 + 1) % 7];
    const wagon = [];
    for (let px = 0; px <= 3; px++)
      for (let pz = 0; pz <= 2; pz++) {
        wagon.push([px, 0, pz, MAT.PLASTIC, 0xe8333b]);
        if (px === 0 || px === 3 || pz === 0 || pz === 2) wagon.push([px, 1, pz, MAT.PLASTIC, color]);
      }
    wagon.push([1, 1, 1, MAT.PLASTIC, 0xffffff], [2, 1, 1, MAT.PLASTIC, RAINBOW[(k * 2 + 4) % 7]]);
    place(wagon, x - 5.2 - k * 4.4);
  }
}

export default {
  id: 'toys',
  icon: 'toybox',
  camera: { target: [0, 11, -3], yaw: 0.34, pitch: 0.38, dist: 102 },
  build(b) {
    stackingRings(b, -23, -15, 1.3);
    teddy(b, -2, -26, 1.3);
    jackInTheBox(b, 16, -20, 1.3);
    robot(b, 31, -3);
    pictureBlocks(b, -33, 4, 4);
    rainbowArch(b, -4, 2, 1.3);
    spinningTop(b, -20, 19, 1.4);
    crayonBox(b, 18, 18);
    trainProps(b, 2, 29);
  },
};
