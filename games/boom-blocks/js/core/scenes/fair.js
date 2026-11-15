// Fun Fair: a rainbow Ferris wheel on two A-frames (knock out a leg and the whole wheel comes
// down), a candy-striped helter-skelter with its slide spiralling round it, a big-top circus
// tent with balloons inside, a tall drop-tower ride, and a stall stacked with tin cans to bowl
// over.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';
import { tree } from './tower.js';

const angleOf = (x, z, cx, cz) => (Math.atan2(z - cz, x - cx) / (Math.PI * 2) + 1) % 1;

function ferrisWheel(b, cx, cy, cz, R = 13) {
  const steel = { mat: MAT.METAL, color: 0xffffff };
  const rim = (x, y) => ({ mat: MAT.PLASTIC, color: RAINBOW[Math.floor(angleOf(x, y, cx, cy) * 14) % 7] });
  b.ring(cx, cy, cz, R, rim, { w: 1 });
  b.ring(cx, cy, cz, R - 2.5, rim, { w: 0.75 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    b.beam(cx, cy, cz, cx + Math.cos(a) * R, cy + Math.sin(a) * R, cz, steel, 0.75);
  }
  // The axle, and the A-frames holding it up on either side of the wheel.
  b.box(cx - 1, cy - 1, cz - 5, cx + 1, cy + 1, cz + 5, { mat: MAT.METAL, color: 0xffd23f });
  const leg = { mat: MAT.METAL, color: 0x5b6cff };
  for (const z of [cz - 5, cz + 5]) {
    b.beam(cx - 9, 0, z, cx, cy, z, leg, 1.5);
    b.beam(cx + 9, 0, z, cx, cy, z, leg, 1.5);
  }
  // Cabins hanging in front of the wheel, each on a little arm.
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(a) * R);
    const py = Math.round(cy + Math.sin(a) * R);
    b.beam(px, py, cz, px, py, cz + 2, steel, 0.75);
    b.beam(px, py, cz + 2, px, py - 1.5, cz + 2, steel, 0.75);
    const color = RAINBOW[k % 7];
    b.hollowBox(px - 1, py - 4, cz + 1, px + 1, py - 2, cz + 3, (x, y) => ({ mat: MAT.PLASTIC, color: y === py - 2 ? 0xffffff : color }), { roof: true });
  }
}

// The helter-skelter: a striped round tower with a cone roof and a slide spiralling down it.
function helterSkelter(b, cx, cz) {
  const stripes = (x, y, z) => ({ mat: MAT.PLASTIC, color: Math.floor(angleOf(x + 0.5, z + 0.5, cx + 0.5, cz + 0.5) * 10) % 2 ? 0xffffff : 0xff4d4d });
  b.cylinder(cx, cz, 0, 24, 3.6, stripes, { thick: 2, floorEvery: 6 });
  b.cone(cx, cz, 25, 6, 4.4, (x, y, z) => ({ mat: MAT.PLASTIC, color: Math.floor(angleOf(x + 0.5, z + 0.5, cx + 0.5, cz + 0.5) * 10) % 2 ? 0xffd23f : 0x2e9bf1 }));
  b.box(cx, 31, cz, cx, 34, cz, { mat: MAT.WOOD, color: 0xc98a4b });
  b.box(cx + 1, 33, cz, cx + 3, 34, cz, { mat: MAT.CLOTH, color: 0x5fd35f, flat: true });
  b.hole(cx - 1, 0, cz + 2, cx + 1, 2, cz + 4);
  const turns = 3;
  const total = turns * Math.PI * 2;
  for (let a = 0; a <= total; a += 0.035) {
    const y = 22 - (a / total) * 21;
    const slide = { mat: MAT.PLASTIC, color: Math.floor(a / (Math.PI / 3)) % 2 ? 0xffd23f : 0x2e9bf1 };
    for (const r of [3.8, 4.6, 5.4, 6.2]) b.dab(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, slide, 1);
    b.dab(cx + Math.cos(a) * 6.8, y + 0.7, cz + Math.sin(a) * 6.8, { mat: MAT.PLASTIC, color: 0xffffff }, 0.6);
  }
}

// The big top: a striped round tent with a pointy roof, a flag, and a circus ring inside.
function bigTop(b, cx, cz) {
  const wall = (x, y, z) => ({ mat: MAT.CLOTH, color: Math.floor(angleOf(x + 0.5, z + 0.5, cx + 0.5, cz + 0.5) * 16) % 2 ? 0xffffff : 0xff4d4d, flat: true });
  const roof = (x, y, z) => ({ mat: MAT.CLOTH, color: Math.floor(angleOf(x + 0.5, z + 0.5, cx + 0.5, cz + 0.5) * 16) % 2 ? 0xffd23f : 0xff4d4d, flat: true });
  b.cylinder(cx, cz, 0, 5, 8.5, wall, { thick: 1 });
  b.cone(cx, cz, 6, 8, 9.6, roof);
  b.box(cx, 14, cz, cx, 17, cz, { mat: MAT.WOOD, color: 0xc98a4b });
  b.box(cx + 1, 16, cz, cx + 3, 17, cz, { mat: MAT.CLOTH, color: 0x2e9bf1, flat: true });
  b.hole(cx - 2, 0, cz + 6, cx + 2, 3, cz + 9);
  b.cylinder(cx, cz, 0, 0, 4, { mat: MAT.PLASTIC, color: 0xffd23f }, { thick: 1.5 });
  b.gift(cx, 0, cz, 'balloons');
}

// The drop tower: a tall striped mast with a ring of seats high up.
function dropTower(b, cx, cz) {
  b.box(cx - 3, 0, cz - 3, cx + 3, 0, cz + 3, { mat: MAT.METAL, color: 0x8a90b0 });
  b.hollowBox(cx - 1, 1, cz - 1, cx + 1, 33, cz + 1, (x, y) => ({ mat: MAT.METAL, color: Math.floor(y / 4) % 2 ? 0xffffff : 0xff4d4d }), { thick: 1 });
  b.box(cx - 3, 23, cz - 3, cx + 3, 24, cz + 3, (x, y, z) => ({ mat: MAT.PLASTIC, color: y === 24 ? 0xffd23f : RAINBOW[(x + z + 14) % 7] }));
  b.box(cx - 2, 34, cz - 2, cx + 2, 35, cz + 2, { mat: MAT.METAL, color: 0xff4d4d });
  b.dab(cx, 36.5, cz, { mat: MAT.CANDY, color: 0xffd23f, flat: true }, 1.5);
}

const CAN = [];
for (let y = 0; y < 3; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) CAN.push([x, y, z]);

export default {
  id: 'fair',
  icon: 'ferris',
  camera: { target: [0, 13, -4], yaw: 0.4, pitch: 0.36, dist: 96 },
  build(b) {
    ferrisWheel(b, 0, 19, -16);
    helterSkelter(b, -23, 4);
    bigTop(b, 19, 8);
    dropTower(b, 27, -22);
    // The tin-can stall: a striped counter with a pyramid of cans on it.
    b.box(-6, 0, 14, 6, 2, 16, (x, y) => ({ mat: MAT.WOOD, color: y === 2 ? 0xffffff : (x & 1 ? 0xff4d4d : 0xffffff) }));
    for (const x of [-6, 6]) b.box(x, 3, 16, x, 8, 16, { mat: MAT.WOOD, color: 0xc98a4b });
    b.box(-6, 9, 14, 6, 9, 16, (x) => ({ mat: MAT.CLOTH, color: x & 1 ? 0x2e9bf1 : 0xffffff, flat: true }));
    const canColors = [0xff4d4d, 0x5fd35f, 0x2e9bf1, 0xffd23f, 0xb15cff, 0xff9f1c, 0xff5fa2, 0x5b6cff, 0xff4d4d, 0x2e9bf1];
    let n = 0;
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4 - row; i++) {
        const color = canColors[n++];
        b.prop(CAN.map(([x, y, z]) => [x, y, z, MAT.METAL, y === 1 ? 0xffffff : color]), [-3.075 + i * 2.05 + row * 1.025, 4.5 + row * 3, 15.5], 0);
      }
    for (const [x, z] of [
      [-33, -22],
      [32, 26],
      [-10, 28],
      [34, -6],
      [-34, 22],
      [-14, -30],
    ])
      tree(b, x, z, 3);
  },
};
