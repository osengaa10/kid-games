// Rainbow Tower Park: one giant spiral-striped tower to topple, with more towers round it (a
// brick tower, a candy-cane pillar, a wobbly stack of toy blocks, a plank tower of crossed
// wooden planks), a stepped pyramid of colored blocks, and trees to knock over with the pieces.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';

const leafColors = [0x4cc85a, 0x3fb950, 0x69d66b];
const WOODS = [0xd9a35b, 0xc98a4b, 0xe8b878, 0xb57a35];

// A plank tower: layers of three wooden planks, each layer crossing the one below. x0, z0: its
// corner; `w` across (three planks of w/3), `layers` high.
function plankTower(b, x0, z0, w = 9, layers = 20) {
  const plank = w / 3;
  for (let k = 0; k < layers; k++)
    for (let i = 0; i < 3; i++) {
      const color = WOODS[(k * 3 + i) % WOODS.length];
      const a = x0 + i * plank;
      const paint = { mat: MAT.WOOD, color };
      if (k % 2) b.box(a, k, z0, a + plank - 1, k, z0 + w - 1, paint);
      else b.box(x0, k, z0 + i * plank, x0 + w - 1, k, z0 + i * plank + plank - 1, paint);
    }
}

// A stepped pyramid of colored blocks, `size` units each, `n` blocks along the bottom.
function blockPyramid(b, x0, z0, n = 6, size = 2) {
  const colors = [0xff4d4d, 0x2ec4f1, 0xffd23f, 0x5fd35f, 0xb15cff, 0xff9f1c];
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n - k; i++)
      for (let j = 0; j < n - k; j++) {
        const x = x0 + Math.round((k * size) / 2) + i * size;
        const z = z0 + Math.round((k * size) / 2) + j * size;
        b.box(x, k * size, z, x + size - 1, k * size + size - 1, z + size - 1, { mat: MAT.PLASTIC, color: colors[(i + j * 2 + k * 3) % colors.length] });
      }
}

export function tree(b, x, z, h = 3, r = 2.4) {
  b.box(x, 0, z, x, h - 1, z, { mat: MAT.WOOD, color: 0x9a6233 });
  b.ellipsoid(x, h + 0.6, z, r, r / 1.15, r, (lx, ly, lz) => ({ mat: MAT.LEAF, color: leafColors[(((lx + lz + ly) % 3) + 3) % 3] }));
}

export default {
  id: 'tower',
  icon: 'tower',
  sky: 'day',
  camera: { target: [0, 15, -2], yaw: 0.42, pitch: 0.3, dist: 82 },
  build(b) {
    // The big tower: a hollow round tower, its stripes spiralling up through the rainbow.
    const R = 6.5;
    const TOP = 33;
    const stripe = (x, y, z) => {
      const a = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1;
      const band = Math.floor(a * 7 + y / 4) % 7;
      return { mat: MAT.PLASTIC, color: RAINBOW[band] };
    };
    b.cylinder(0, 0, 0, TOP, R, stripe, { thick: 2, floorEvery: 7 });
    b.cylinder(0, 0, TOP, TOP, R, { mat: MAT.PLASTIC, color: 0xffffff });
    // A crown of merlons round the top.
    for (let i = 0; i < 20; i++) {
      if (i % 2) continue;
      const a = (i / 20) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * (R - 0.6));
      const z = Math.round(Math.sin(a) * (R - 0.6));
      b.box(x, TOP + 1, z, x, TOP + 2, z, { mat: MAT.PLASTIC, color: RAINBOW[(i / 2) % 7] });
    }
    // A door and two rings of windows.
    b.hole(-1, 0, 4, 1, 3, 7);
    for (const wy of [9, 23])
      for (const [dx, dz] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]) {
        const cx = Math.round(dx * 5.5);
        const cz = Math.round(dz * 5.5);
        b.hole(cx - (dz ? 1 : 1), wy, cz - (dx ? 1 : 1), cx + (dz ? 1 : 1), wy + 2, cz + (dx ? 1 : 1));
      }
    // A flagpole and flag on the roof.
    b.box(0, TOP + 1, 0, 0, TOP + 10, 0, { mat: MAT.WOOD, color: 0xc98a4b });
    for (let y = TOP + 7; y <= TOP + 10; y++)
      for (let x = 1; x <= 5; x++) b.put(x, y, 0, { mat: MAT.CLOTH, color: (x + y) % 2 ? 0xff4d4d : 0xffffff, flat: true });
    // A surprise up in the top room.
    b.gift(0, 28, 0, 'fireworks');

    // A wobbly stack of giant toy blocks.
    const stack = [0xff4d4d, 0x2ec4f1, 0xffd23f, 0x5fd35f, 0xb15cff, 0xff9f1c, 0x5b6cff];
    for (let i = 0; i < 7; i++) {
      const ox = -22 + (i % 2);
      const oz = 9 - (i % 3 === 2 ? 1 : 0);
      b.box(ox - 2, i * 4, oz - 2, ox + 1, i * 4 + 3, oz + 1, { mat: MAT.PLASTIC, color: stack[i], jitter: 0.04 });
    }

    // A brick tower with a red roof.
    b.hollowBox(15, 0, -24, 24, 25, -15, { mat: MAT.BRICK, color: 0xe8774f }, { floorEvery: 5 });
    b.pyramid(15, -24, 24, -15, 26, { mat: MAT.BRICK, color: 0xd9363e });
    b.hole(19, 0, -15, 20, 3, -15);
    for (const wy of [6, 11, 16, 21])
      for (const [x0, z0, x1, z1] of [
        [19, -15, 20, -15],
        [15, -20, 15, -19],
        [24, -20, 24, -19],
      ])
        b.hole(x0, wy, z0, x1, wy + 1, z1);

    // A candy-cane tower.
    b.box(-23, 0, -19, -18, 29, -14, (x, y) => ({ mat: MAT.CANDY, color: Math.floor(y / 2) % 2 ? 0xffffff : 0xff5fa2 }));
    b.cone(-20.5, -16.5, 30, 5, 3.6, { mat: MAT.CANDY, color: 0xffd23f });

    // A plank tower and a pyramid of blocks out front.
    plankTower(b, 26, -2, 9, 22);
    blockPyramid(b, -17, 15, 6, 2);

    // Trees to flatten.
    for (const [x, z, h] of [
      [-9, -18, 3],
      [-30, -2, 4],
      [4, -27, 4],
      [2, 24, 3],
      [15, 17, 3],
      [24, 22, 4],
    ])
      tree(b, x, z, h);
  },
};
