// Toy Room: giant toys. A stacking-ring tower, a jack-in-the-box with a smiley face on its spring
// (balloons inside the box), a big teddy bear, a wooden rainbow arch, a spinning top balanced on
// its point, a wobbly tower of picture blocks, and a toy train to knock off its track.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';

const DARK = { mat: MAT.STONE, color: 0x2b2f45, flat: true };
const angleOf = (x, z, cx, cz) => (Math.atan2(z - cz, x - cx) / (Math.PI * 2) + 1) % 1;

// Rings stacked on a pole, biggest at the bottom, with a ball on top.
function stackingRings(b, cx, cz) {
  b.cylinder(cx, cz, 0, 18, 0.9, { mat: MAT.WOOD, color: 0xc98a4b });
  for (let k = 0; k < 6; k++) b.ellipsoid(cx, k * 2.6 + 0.9, cz, 7 - k, 1.4, 7 - k, { mat: MAT.PLASTIC, color: RAINBOW[k] });
  b.ellipsoid(cx, 19, cz, 2, 2, 2, { mat: MAT.PLASTIC, color: 0xff5fa2 });
}

// A jack-in-the-box: a painted box, its lid flipped up, a spring, and a smiling face in a party hat.
function jackInTheBox(b, x, z) {
  const sides = { [z + 3]: 0xe8333b, [z - 4]: 0xffd23f };
  const box = (px, py, pz) => {
    if (py === 7) return { mat: MAT.PLASTIC, color: 0xffffff };
    const face = pz === z + 3 || pz === z - 4 ? sides[pz] : 0x2e9bf1;
    const u = pz === z + 3 || pz === z - 4 ? px - (x - 0.5) : pz - (z - 0.5);
    const diamond = Math.abs(u) + Math.abs(py - 3.5) <= 2;
    return { mat: MAT.PLASTIC, color: diamond ? 0xffffff : face };
  };
  b.box(x - 4, 0, z - 4, x + 3, 7, z + 3, box);
  b.box(x - 4, 8, z - 4, x + 3, 14, z - 4, (px, py) => ({ mat: MAT.PLASTIC, color: py === 14 ? 0xffffff : 0x5fd35f }));
  // The crank on the side.
  b.beam(x + 3.6, 4, z - 0.5, x + 6, 4, z - 0.5, { mat: MAT.METAL, color: 0xc7cfdb }, 0.75);
  b.beam(x + 6, 4, z - 0.5, x + 6, 6, z - 0.5, { mat: MAT.METAL, color: 0xc7cfdb }, 0.75);
  b.dab(x + 6, 6.6, z - 0.5, { mat: MAT.PLASTIC, color: 0xe8333b }, 1.2);
  // The spring: a coil going up from the middle of the box.
  const mx = x - 0.5;
  const mz = z - 0.5;
  let prev = null;
  for (let a = 0; a <= Math.PI * 2 * 5; a += 0.2) {
    const p = [mx + Math.cos(a) * 1.5, 7.6 + (a / (Math.PI * 2)) * 1.7, mz + Math.sin(a) * 1.5];
    if (prev) b.beam(...prev, ...p, { mat: MAT.METAL, color: 0xd7dceb }, 0.75);
    prev = p;
  }
  // The face.
  b.ellipsoid(mx, 17.5, mz, 3, 3, 3, { mat: MAT.PLASTIC, color: 0xffd23f });
  for (const s of [-1, 1]) {
    b.dab(mx + s * 1.1, 18.6, mz + 2.6, DARK, 0.75);
    b.dab(mx + s * 1.9, 17.4, mz + 2.2, { mat: MAT.PLASTIC, color: 0xff8cc0, flat: true }, 0.75);
  }
  for (let t = -1; t <= 1; t += 0.25) b.dab(mx + t * 1.3, 16.9 - (1 - t * t) * 0.8, mz + 2.45, DARK, 0.5);
  b.cone(mx, mz, 20, 5, 2.2, (px, py) => ({ mat: MAT.PLASTIC, color: py % 2 ? 0xb15cff : 0x2ec4f1 }));
  b.dab(mx, 24.8, mz, { mat: MAT.PLASTIC, color: 0xffffff }, 1.2);
  b.gift(x - 1, 0, z - 1, 'balloons');
}

// A big teddy bear sitting on the ground, facing +z, with a red bow tie.
function teddy(b, x, z) {
  const fur = { mat: MAT.CLOTH, color: 0xa86b3c };
  const tan = { mat: MAT.CLOTH, color: 0xe3c08a };
  b.ellipsoid(x, 5, z, 5, 5.5, 4.2, (px, py, pz) => (pz > z + 2 && Math.abs(px - x) < 3 && py >= 2 && py <= 8 ? tan : fur));
  for (const s of [-1, 1]) {
    b.ellipsoid(x + s * 3, 1.5, z + 3.5, 2, 1.8, 3, fur);
    b.ellipsoid(x + s * 3, 1.5, z + 6.2, 1.4, 1.3, 0.6, tan);
    b.ellipsoid(x + s * 5, 6, z + 1, 1.6, 3, 1.6, fur);
    b.ellipsoid(x + s * 3, 16, z, 1.3, 1.3, 0.8, fur);
    b.ellipsoid(x + s * 3, 16, z + 0.4, 0.7, 0.7, 0.6, tan);
    b.dab(x + s * 1.3, 14.2, z + 3.1, DARK, 0.75);
    b.dab(x + s * 1, 10.4, z + 2.4, { mat: MAT.CLOTH, color: 0xe8333b, flat: true }, 1);
  }
  b.ellipsoid(x, 13, z, 3.8, 3.4, 3.4, fur);
  b.ellipsoid(x, 12.3, z + 2.6, 1.6, 1.2, 1.2, tan);
  b.dab(x, 13, z + 3.9, DARK, 0.75);
  b.dab(x, 10.4, z + 2.6, { mat: MAT.CLOTH, color: 0xb02a31, flat: true }, 0.75);
}

// A wooden rainbow arch: nested half circles standing on the ground.
function rainbowArch(b, cx, cz) {
  [9, 7.8, 6.6, 5.4, 4.2].forEach((r, k) => {
    let prev = null;
    for (let a = 0; a <= Math.PI + 1e-6; a += 0.06) {
      const p = [cx + Math.cos(a) * r, Math.sin(a) * r, cz];
      if (prev) b.beam(...prev, ...p, { mat: MAT.WOOD, color: RAINBOW[k] }, 1.2);
      prev = p;
    }
  });
}

// A spinning top balanced on its point, striped round.
function spinningTop(b, cx, cz) {
  const stripes = (x, y, z) => ({ mat: MAT.PLASTIC, color: RAINBOW[Math.floor(angleOf(x + 0.5, z + 0.5, cx + 0.5, cz + 0.5) * 7)] });
  [0.6, 1.5, 2.4, 3.3, 4.2, 4.2, 3, 1.6].forEach((r, y) => b.cylinder(cx, cz, y, y, r, stripes));
  b.cylinder(cx, cz, 8, 10, 0.6, { mat: MAT.WOOD, color: 0xc98a4b });
}

// A wobbly tower of picture blocks: each a different color with a white diamond on its sides.
function pictureBlocks(b, x, z) {
  const offsets = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
  ];
  offsets.forEach(([ox, oz], k) => {
    const cx = x + ox;
    const cz = z + oz;
    const color = RAINBOW[(k * 3) % 7];
    b.box(cx - 1, k * 3, cz - 1, cx + 1, k * 3 + 2, cz + 1, (px, py, pz) => {
      const mid = py === k * 3 + 1 && (px === cx || pz === cz);
      return { mat: MAT.PLASTIC, color: mid ? 0xffffff : color };
    });
  });
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
  camera: { target: [0, 9, -4], yaw: 0.34, pitch: 0.38, dist: 90 },
  build(b) {
    stackingRings(b, -20, -12);
    jackInTheBox(b, 17, -16);
    teddy(b, 0, -26);
    rainbowArch(b, -2, 2);
    spinningTop(b, -24, 12);
    pictureBlocks(b, 22, 8);
    trainProps(b, 14, 13);
  },
};
