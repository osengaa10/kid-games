// Truck Town: a multi-storey car park full of toy cars standing on thin pillars (knock the
// bottom ones out and the decks pancake down), a fire engine with its ladder raised high, a
// yellow school bus, a digger holding up a bucket of dirt, a dump truck and a dirt pile, a tall
// tower crane, and a row of loose toy cars on the street to bowl over. Fireworks are hidden on
// the car park's roof.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';
import { gantry } from './space.js';
import { tree } from './tower.js';

const TIRE = { mat: MAT.PLASTIC, color: 0x2b2f45 };
const GLASS = { mat: MAT.GLASS, color: 0x9fe3ff, flat: true };
const CONCRETE = (x, y, z) => ({ mat: MAT.STONE, color: (x + z) % 2 ? 0xb8bcc8 : 0xaab0bd });
const DIRT = (x, y, z) => ({ mat: MAT.DIRT, color: [0x8d5a2b, 0x7a4a22, 0x9a6233][(((x + y * 2 + z) % 3) + 3) % 3] });

// A toy car facing +x on top of y: four wheels, a body and a cabin with windows, lights.
function car(b, x, y, z, color) {
  for (const [dx, dz] of [
    [0, 0],
    [4, 0],
    [0, 2],
    [4, 2],
  ])
    b.put(x + dx, y, z + dz, TIRE);
  b.box(x, y + 1, z, x + 4, y + 1, z + 2, { mat: MAT.PLASTIC, color });
  b.box(x + 1, y + 2, z, x + 3, y + 2, z + 2, (px, py, pz) => (pz === z + 1 ? { mat: MAT.PLASTIC, color } : GLASS));
  b.put(x + 4, y + 1, z, { mat: MAT.CANDY, color: 0xfff3a0, flat: true });
  b.put(x + 4, y + 1, z + 2, { mat: MAT.CANDY, color: 0xfff3a0, flat: true });
  b.put(x, y + 1, z + 1, { mat: MAT.CANDY, color: 0xff3b3b, flat: true });
}

// The car park: decks every 4 units on a grid of thin pillars, a yellow wall round every deck,
// cars on every level, and a big blue P sign on the roof.
function carPark(b, x0, z0, x1, z1) {
  const levels = [4, 8, 12, 16, 20];
  const pillarsX = [x0, (x0 * 3 + x1) / 4, (x0 + x1) / 2, (x0 + x1 * 3) / 4, x1].map(Math.round);
  const pillarsZ = [z0, Math.round((z0 + z1) / 2), z1];
  let prev = 0;
  for (const y of levels) {
    for (const px of pillarsX) for (const pz of pillarsZ) b.box(px, prev, pz, px, y - 1, pz, CONCRETE);
    b.box(x0, y, z0, x1, y, z1, CONCRETE);
    // The striped wall round the deck.
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) b.put(x, y + 1, z, { mat: MAT.PLASTIC, color: (x >> 1) % 2 ? 0xffd23f : 0x2b2f45 });
    for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) b.put(x, y + 1, z, { mat: MAT.PLASTIC, color: (z >> 1) % 2 ? 0xffd23f : 0x2b2f45 });
    prev = y + 1;
  }
  // Cars parked on every level (and on the ground under the first deck), different on each.
  let k = 0;
  for (const y of [0, ...levels])
    for (const [cx, cz] of [
      [x0 + 2, z0 + 2],
      [x0 + 9, z1 - 4],
      [x1 - 6, z0 + 2],
    ]) {
      if ((k + y) % 4 === 3) {
        k++;
        continue;
      }
      car(b, cx, y + (y ? 1 : 0), cz, RAINBOW[k++ % RAINBOW.length]);
    }
  // The P sign on the roof.
  const sx = x1 - 6;
  const sz = z1 - 1;
  const top = levels[levels.length - 1];
  b.box(sx + 3, top + 1, sz, sx + 3, top + 4, sz, { mat: MAT.METAL, color: 0x8a90b0 });
  const P = ['XXXX.', 'X...X', 'XXXX.', 'X....', 'X....'];
  b.box(sx, top + 5, sz, sx + 6, top + 11, sz, (x, y) => {
    const row = P[top + 10 - y];
    const col = x - sx - 1;
    const on = row && col >= 0 && col < 5 && row[col] === 'X';
    return { mat: MAT.PLASTIC, color: on ? 0xffffff : 0x2e9bf1, flat: true };
  });
  b.gift(Math.round((x0 + x1) / 2), top + 1, Math.round((z0 + z1) / 2), 'fireworks');
}

// The fire engine, facing +x, with its ladder raised up over the cab.
function fireEngine(b, x0, z0) {
  const red = (x, y) => ({ mat: MAT.PLASTIC, color: y === 3 ? 0xffffff : 0xe8333b });
  for (const x of [x0 + 1, x0 + 7, x0 + 10]) for (const z of [z0, z0 + 3]) b.box(x, 0, z, x + 1, 1, z, TIRE);
  b.box(x0, 2, z0, x0 + 8, 5, z0 + 3, red);
  // The cab, with windows all round and a light bar on top.
  b.box(x0 + 9, 2, z0, x0 + 12, 5, z0 + 3, (x, y, z) => (y >= 4 && (x === x0 + 12 || z === z0 || z === z0 + 3) ? GLASS : red(x, y)));
  for (let z = z0; z <= z0 + 3; z++) b.put(x0 + 10, 6, z, { mat: MAT.CANDY, color: z % 2 ? 0x2e9bf1 : 0xff3b3b, flat: true });
  // A hose reel on the side, and the ladder on a turntable at the back.
  b.cylinderX(x0 + 3, x0 + 5, 3.5, z0 + 3.5, 1.1, { mat: MAT.METAL, color: 0xffd23f });
  b.box(x0 + 1, 6, z0 + 1, x0 + 3, 6, z0 + 2, { mat: MAT.METAL, color: 0x8a90b0 });
  const rail = { mat: MAT.METAL, color: 0xd7dceb };
  const [ax, ay] = [x0 + 2, 7];
  const [bx, by] = [x0 + 17, 19];
  for (const z of [z0 + 0.5, z0 + 2.5]) b.beam(ax, ay, z, bx, by, z, rail, 0.75);
  for (let t = 0.08; t < 1; t += 0.08) b.beam(ax + (bx - ax) * t, ay + (by - ay) * t, z0 + 0.5, ax + (bx - ax) * t, ay + (by - ay) * t, z0 + 2.5, rail, 0.5);
  b.box(bx, by - 1, z0, bx + 2, by, z0 + 3, { mat: MAT.METAL, color: 0xe8333b });
}

// The yellow school bus, facing +x.
function schoolBus(b, x0, z0) {
  const yellow = (x, y, z) => {
    if (y === 3) return { mat: MAT.PLASTIC, color: 0x2b2f45 };
    if (y >= 4 && y <= 5 && (z === z0 || z === z0 + 3) && x > x0 && x < x0 + 11 && x % 2) return GLASS;
    return { mat: MAT.PLASTIC, color: 0xffc31a };
  };
  for (const x of [x0 + 2, x0 + 11]) for (const z of [z0, z0 + 3]) b.box(x, 0, z, x + 1, 1, z, TIRE);
  b.box(x0, 2, z0, x0 + 12, 6, z0 + 3, yellow);
  b.box(x0 + 13, 2, z0, x0 + 15, 4, z0 + 3, (x, y, z) => (x === x0 + 15 && y === 3 && (z === z0 || z === z0 + 3) ? { mat: MAT.CANDY, color: 0xfff3a0, flat: true } : yellow(x, y, z)));
  b.box(x0 + 12, 5, z0, x0 + 12, 6, z0 + 3, GLASS);
  // The little stop sign on the side.
  b.put(x0 + 10, 4, z0 + 4, { mat: MAT.CANDY, color: 0xff3b3b, flat: true });
}

// The digger, facing +x: tracks, a turning body, a cab, and its arm up holding a bucket of dirt.
function digger(b, x0, z0) {
  const yellow = { mat: MAT.PLASTIC, color: 0xffb000 };
  for (const z of [z0, z0 + 4]) b.box(x0, 0, z, x0 + 7, 1, z + 1, (x, y) => ({ mat: MAT.PLASTIC, color: (x + y) % 2 ? 0x2b2f45 : 0x4f5568 }));
  b.box(x0 + 1, 2, z0, x0 + 6, 4, z0 + 5, yellow);
  b.hollowBox(x0 + 1, 5, z0, x0 + 3, 8, z0 + 2, (x, y, z) => (y >= 6 && y <= 7 ? GLASS : yellow), { roof: true });
  b.box(x0, 2, z0 + 1, x0, 4, z0 + 4, { mat: MAT.METAL, color: 0x4f5568 });
  // Boom up, stick down, bucket.
  const arm = { mat: MAT.PLASTIC, color: 0xffb000 };
  b.beam(x0 + 5, 5, z0 + 3.5, x0 + 10, 14, z0 + 3.5, arm, 1.5);
  b.beam(x0 + 10, 14, z0 + 3.5, x0 + 14, 9, z0 + 3.5, arm, 1.2);
  b.beam(x0 + 5, 4.5, z0 + 3.5, x0 + 8, 10, z0 + 3.5, { mat: MAT.METAL, color: 0xd7dceb }, 0.5);
  b.box(x0 + 13, 6, z0 + 2, x0 + 16, 8, z0 + 5, { mat: MAT.METAL, color: 0x4f5568 });
  b.box(x0 + 14, 9, z0 + 2, x0 + 15, 9, z0 + 5, DIRT);
}

// The dump truck, facing +x, its tipper full of dirt.
function dumpTruck(b, x0, z0) {
  const orange = { mat: MAT.PLASTIC, color: 0xff7b2e };
  for (const x of [x0 + 1, x0 + 6, x0 + 9]) for (const z of [z0, z0 + 3]) b.box(x, 0, z, x + 1, 1, z, TIRE);
  b.box(x0, 2, z0, x0 + 11, 2, z0 + 3, { mat: MAT.METAL, color: 0x4f5568 });
  b.hollowBox(x0, 3, z0, x0 + 7, 6, z0 + 3, orange, { thick: 2 });
  b.box(x0 + 1, 3, z0 + 1, x0 + 6, 3, z0 + 2, orange);
  b.ellipsoid(x0 + 3.5, 6, z0 + 1.5, 3.6, 2, 1.8, DIRT);
  b.box(x0 + 9, 3, z0, x0 + 11, 6, z0 + 3, (x, y, z) => (y >= 5 && (x === x0 + 11 || z === z0 || z === z0 + 3) ? GLASS : orange));
}

// The tower crane: a yellow lattice mast, a cab, a long jib with a hook hanging off it, and a
// short counter-jib with a concrete weight.
function crane(b, x, z) {
  const yellow = { mat: MAT.METAL, color: 0xffc31a };
  const TOP = 31;
  gantry(b, x - 2, z - 2, x + 2, z + 2, TOP, 4, { postColor: 0xffc31a, braceColor: 0xffe680, aerial: false });
  b.hollowBox(x - 2, TOP + 2, z - 2, x + 1, TOP + 4, z + 2, (px, py) => (py === TOP + 3 ? GLASS : yellow), { roof: true });
  // The jib reaches out to -x, the counter-jib to +x: three chords with zigzag braces.
  const y0 = TOP + 2;
  for (const [from, to] of [
    [x - 2, x - 26],
    [x + 2, x + 10],
  ]) {
    b.beam(from, y0, z - 1, to, y0, z - 1, yellow, 0.75);
    b.beam(from, y0, z + 1, to, y0, z + 1, yellow, 0.75);
    b.beam(from, y0 + 2.5, z, to, y0 + 0.5, z, yellow, 0.75);
    const n = Math.round(Math.abs(to - from) / 2);
    for (let i = 0; i < n; i++) {
      const xa = from + ((to - from) * i) / n;
      const xb = from + ((to - from) * (i + 1)) / n;
      const ya = y0 + 2.5 - (2 * i) / n;
      b.beam(xa, y0, i % 2 ? z - 1 : z + 1, xb, ya - 2 / n, z, yellow, 0.5);
    }
  }
  b.box(x + 7, y0 - 3, z - 1, x + 10, y0 - 1, z + 1, { mat: MAT.STONE, color: 0xaab0bd });
  // The hook on its cable.
  const hx = x - 6;
  b.beam(hx, y0 - 0.5, z, hx, y0 - 13, z, { mat: MAT.METAL, color: 0x2b2f45 }, 0.5);
  b.box(hx - 1, y0 - 14, z - 1, hx + 1, y0 - 13, z + 1, { mat: MAT.METAL, color: 0xff3b3b });
}

// A traffic light: red, yellow and green, on a pole.
function trafficLight(b, x, z) {
  b.box(x, 0, z, x, 7, z, { mat: MAT.METAL, color: 0x4f5568 });
  b.box(x - 1, 8, z, x + 1, 11, z, (px, py) => {
    if (px !== x) return { mat: MAT.METAL, color: 0x2b2f45 };
    const c = { 10: 0xff3b3b, 9: 0xffd23f, 8: 0x5fd35f }[py];
    return c ? { mat: MAT.CANDY, color: c, flat: true } : { mat: MAT.METAL, color: 0x2b2f45 };
  });
}

// A traffic cone.
function trafficCone(b, x, z) {
  b.cone(x, z, 0, 3, 1.1, (px, py) => ({ mat: MAT.PLASTIC, color: py === 1 ? 0xffffff : 0xff7b2e, flat: true }));
}

// Loose toy cars (sleeping physics props), to bowl over.
const CAR = [];
for (const [dx, dz] of [
  [0, 0],
  [4, 0],
  [0, 2],
  [4, 2],
])
  CAR.push([dx, 0, dz, 'tire']);
for (let x = 0; x <= 4; x++) for (let z = 0; z <= 2; z++) CAR.push([x, 1, z, 'body']);
for (let x = 1; x <= 3; x++) for (let z = 0; z <= 2; z++) CAR.push([x, 2, z, z === 1 ? 'body' : 'glass']);

function looseCar(b, x, z, color, yaw) {
  const cells = CAR.map(([cx, cy, cz, part]) => {
    if (part === 'tire') return [cx, cy, cz, MAT.PLASTIC, 0x2b2f45];
    if (part === 'glass') return [cx, cy, cz, MAT.GLASS, 0x9fe3ff];
    return [cx, cy, cz, MAT.PLASTIC, color];
  });
  // A prop is placed by the middle of its blocks.
  const cy = cells.reduce((a, c) => a + c[1] + 0.5, 0) / cells.length;
  b.prop(cells, [x, cy, z], yaw);
}

export default {
  id: 'trucks',
  icon: 'truck',
  camera: { target: [0, 13, -4], yaw: 0.36, pitch: 0.36, dist: 96 },
  build(b) {
    carPark(b, -11, -26, 9, -12);
    fireEngine(b, -30, 4);
    schoolBus(b, 12, 6);
    digger(b, -34, -14);
    dumpTruck(b, 14, -6);
    b.ellipsoid(30, 0, -3, 4.5, 3.5, 4.5, DIRT);
    crane(b, 24, -24);
    trafficLight(b, -4, 2);
    for (const [x, z] of [
      [6, 12],
      [9, 13],
      [12, 14],
      [-12, 12],
    ])
      trafficCone(b, x, z);
    [-22, -12, -2, 8, 18].forEach((x, i) => looseCar(b, x, 21, RAINBOW[(i * 2) % RAINBOW.length], 0));
    for (const [x, z] of [
      [-33, 24],
      [33, 24],
      [-34, -30],
      [34, 8],
    ])
      tree(b, x, z, 3);
  },
};
