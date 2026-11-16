// Train Station: a steam train and its carriages rolling out of a tunnel along a tall brick
// viaduct (knock out a pillar and the whole bridge comes down, train and all), a station with a
// clock tower (fireworks inside), a signal, and suitcases waiting on the platform.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';
import { tree } from './tower.js';

const BRICK = (x, y, z) => ({ mat: MAT.BRICK, color: (x + y * 3 + z) % 4 === 0 ? 0xb5523a : 0xc9643f });
const DARKM = { mat: MAT.METAL, color: 0x2b2f45 };
const GLASS = { mat: MAT.GLASS, color: 0x9fe3ff, flat: true };
// The rails run along x over the viaduct, between these z rows.
const Z0 = -16;
const Z1 = -13;
const MZ = (Z0 + Z1) / 2;

function viaduct(b, x0, x1) {
  const DECK = 12;
  b.box(x0, DECK, Z0, x1, DECK + 1, Z1, BRICK);
  // Pillars every 8 units with round arches between them.
  for (let x = x0 + 4; x <= x1 - 2; x += 8) {
    b.box(x - 1, 0, Z0, x + 1, DECK - 1, Z1, BRICK);
    for (let u = x + 2; u <= x + 6 && u < x1; u++) {
      const d = u + 0.5 - (x + 4.5);
      const arch = Math.ceil(7 + Math.sqrt(Math.max(0, 6.25 - d * d)));
      if (arch <= DECK - 1) b.box(u, arch, Z0, u, DECK - 1, Z1, BRICK);
    }
  }
  // The west end rests on a stone abutment.
  b.box(x0 - 2, 0, Z0 - 1, x0 + 1, DECK + 1, Z1 + 1, { mat: MAT.STONE, color: 0xa7b0ba });
  // Low walls along both edges, rails and sleepers between.
  for (const z of [Z0, Z1]) b.box(x0, DECK + 2, z, x1, DECK + 2, z, { mat: MAT.STONE, color: 0xd3d9df });
  b.box(x0, DECK + 2, Z0 + 1, x1, DECK + 2, Z1 - 1, (x) => (x % 2 ? DARKM : { mat: MAT.WOOD, color: 0x6b4423 }));
}

// A round wheel standing up beside the train, at (x, y) on the side z.
function wheel(b, x, y, z, r = 1.1) {
  for (const rr of [0.5, r]) b.ring(x, y, z, rr, { mat: MAT.PLASTIC, color: 0xe8333b }, { w: 0.75 });
  b.dab(x, y, z, { mat: MAT.METAL, color: 0xffd23f }, 0.75);
}

// The steam engine, facing -x, its front at x0.
function engine(b, x0) {
  const y = 15;
  b.box(x0, y, Z0, x0 + 10, y, Z1, DARKM);
  b.cylinderX(x0, x0 + 6, y + 2, MZ, 1.8, (px, py) => ({ mat: MAT.PLASTIC, color: px % 3 === 0 ? 0xffd23f : 0x2e9bf1 }));
  b.cylinderX(x0 - 1, x0 - 1, y + 2, MZ, 1.5, DARKM);
  b.dab(x0 - 1.6, y + 2, MZ, { mat: MAT.CANDY, color: 0xfff3a0, flat: true }, 1);
  b.cylinder(x0 + 1, MZ, y + 4, y + 6, 0.8, DARKM);
  b.cylinder(x0 + 4, MZ, y + 4, y + 4, 0.9, { mat: MAT.METAL, color: 0xffd23f });
  // Puffs of steam from the chimney.
  [
    [1, 7.5, 1.3],
    [2.5, 9.5, 1.7],
    [5, 11.5, 2.2],
  ].forEach(([dx, dy, r]) => b.ellipsoid(x0 + dx, y + dy, MZ, r, r * 0.85, r, { mat: MAT.SNOW, color: 0xffffff }));
  // The cab, with windows and a roof.
  b.hollowBox(x0 + 7, y + 1, Z0, x0 + 10, y + 5, Z1, (px, py, pz) => (py >= y + 3 && py <= y + 4 && (pz === Z0 || pz === Z1) ? GLASS : { mat: MAT.PLASTIC, color: 0xe8333b }));
  b.box(x0 + 6, y + 6, Z0 - 1, x0 + 11, y + 6, Z1 + 1, DARKM);
  // The cowcatcher.
  b.box(x0 - 2, y, Z0, x0 - 1, y, Z1, { mat: MAT.PLASTIC, color: 0xe8333b });
  b.box(x0 - 3, y, Z0 + 1, x0 - 3, y, Z1 - 1, { mat: MAT.PLASTIC, color: 0xe8333b });
  for (const x of [x0 + 2, x0 + 5, x0 + 8]) for (const z of [Z0 - 0.8, Z1 + 0.8]) wheel(b, x, y + 0.6, z, 1.2);
}

// A passenger carriage from x0 to x0 + 7.
function carriage(b, x0, color) {
  const y = 15;
  b.box(x0, y, Z0, x0 + 7, y, Z1, DARKM);
  b.hollowBox(x0, y + 1, Z0, x0 + 7, y + 4, Z1, (px, py, pz) => (py >= y + 2 && py <= y + 3 && (pz === Z0 || pz === Z1) && px > x0 && px < x0 + 7 && px % 2 ? GLASS : { mat: MAT.PLASTIC, color }), { roof: true });
  b.cylinderX(x0, x0 + 7, y + 4.2, MZ, 2.1, { mat: MAT.METAL, color: 0x8a90b0 });
  for (const x of [x0 + 1.5, x0 + 5.5]) for (const z of [Z0 - 0.8, Z1 + 0.8]) wheel(b, x, y + 0.6, z, 1);
}

// The station: a brick building, a platform under a striped canopy, and a clock tower.
function station(b) {
  b.hollowBox(-30, 0, 4, -12, 7, 12, (x, y, z) => (y >= 2 && y <= 4 && z === 12 && x % 3 === 0 ? GLASS : BRICK(x, y, z)), { roof: true });
  b.hole(-22, 0, 12, -20, 4, 12);
  b.box(-30, 0, 13, -12, 0, 16, { mat: MAT.STONE, color: 0xd3d9df });
  for (const x of [-29, -21, -13]) b.box(x, 1, 16, x, 6, 16, { mat: MAT.METAL, color: 0x2e9bf1 });
  b.box(-30, 7, 13, -12, 7, 16, (x) => ({ mat: MAT.CLOTH, color: x % 2 ? 0xffffff : 0xe8333b, flat: true }));
  // The clock tower, with a clock face on the front.
  b.hollowBox(-23, 8, 6, -19, 18, 10, (x, y, z) => {
    if (z === 10) {
      const d = Math.hypot(x + 21, y - 15);
      if (d < 1.9) return { mat: MAT.PLASTIC, color: (x === -21 && y >= 15) || (y === 15 && x >= -21) ? 0x2b2f45 : 0xffffff, flat: true };
    }
    return { mat: MAT.BRICK, color: y % 5 === 2 ? 0xd9c8a0 : 0xf3ead6 };
  }, { floorEvery: 5 });
  b.pyramid(-24, 5, -18, 11, 19, { mat: MAT.BRICK, color: 0x4f5568 });
  b.gift(-21, 13, 8, 'fireworks');
}

// A railway signal by the line.
function signal(b, x, z) {
  b.box(x, 0, z, x, 10, z, { mat: MAT.METAL, color: 0x4f5568 });
  b.box(x - 1, 11, z, x + 1, 13, z, (px, py) => (px === x && py === 13 ? { mat: MAT.CANDY, color: 0xff3b3b, flat: true } : px === x && py === 11 ? { mat: MAT.CANDY, color: 0x5fd35f, flat: true } : DARKM));
}

// Suitcases (sleeping physics props) waiting by the platform.
function suitcase(b, x, z, color) {
  const cells = [];
  for (let px = 0; px <= 1; px++) for (let py = 0; py <= 1; py++) cells.push([px, py, 0, MAT.CLOTH, color]);
  b.prop(cells, [x, 1, z], 0.3);
}

export default {
  id: 'train',
  icon: 'train',
  camera: { target: [0, 12, -4], yaw: 0.42, pitch: 0.32, dist: 96 },
  build(b) {
    // The hill the line tunnels into, at the east end.
    b.ellipsoid(32, 0, MZ, 7.5, 24, 9, (x, y) => (y > 19 ? { mat: MAT.LEAF, color: 0x4cc85a } : { mat: MAT.STONE, color: (x + y) % 3 ? 0xa79e84 : 0x8d846a }));
    b.hole(24, 12, Z0 - 1, 40, 21, Z1 + 1);
    viaduct(b, -34, 34);
    engine(b, -4);
    [0x5fd35f, 0xffd23f, 0xb15cff].forEach((c, k) => {
      carriage(b, 8 + k * 9, c);
      b.box(7 + k * 9, 15, MZ - 0.5, 7 + k * 9, 15, MZ + 0.5, DARKM);
    });
    station(b);
    signal(b, -8, -10);
    RAINBOW.slice(0, 3).forEach((c, i) => suitcase(b, -27 + i * 3, 19, c));
    for (const [x, z] of [
      [-34, 22],
      [32, 20],
      [10, 14],
      [-6, 24],
      [-34, -28],
      [20, -30],
    ])
      tree(b, x, z, 3);
  },
};
