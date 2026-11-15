// Rainbow Tower Park: one giant spiral-striped tower to topple, with a few smaller towers and
// trees around it to knock over with the pieces.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';

const leafColors = [0x4cc85a, 0x3fb950, 0x69d66b];

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
      const ox = -19 + (i % 2);
      const oz = 10 - (i % 3 === 2 ? 1 : 0);
      b.box(ox - 1, i * 3, oz - 1, ox + 1, i * 3 + 2, oz + 1, { mat: MAT.PLASTIC, color: stack[i], jitter: 0.04 });
    }

    // A brick tower with a red roof.
    b.hollowBox(15, 0, -19, 21, 19, -13, { mat: MAT.BRICK, color: 0xe8774f }, { floorEvery: 5 });
    b.pyramid(15, -19, 21, -13, 20, { mat: MAT.BRICK, color: 0xd9363e });
    b.hole(18, 0, -13, 18, 2, -13);
    for (const wy of [6, 12])
      for (const [x0, z0, x1, z1] of [
        [18, -13, 18, -13],
        [15, -16, 15, -16],
        [21, -16, 21, -16],
      ])
        b.hole(x0, wy, z0, x1, wy + 1, z1);

    // A skinny candy-cane tower.
    b.box(-21, 0, -15, -18, 23, -12, (x, y) => ({ mat: MAT.CANDY, color: Math.floor(y / 2) % 2 ? 0xffffff : 0xff5fa2 }));
    b.cone(-19.5, -13.5, 24, 4, 2.5, { mat: MAT.CANDY, color: 0xffd23f });

    // Trees to flatten.
    for (const [x, z, h] of [
      [-9, -16, 3],
      [-28, -2, 4],
      [-6, 20, 3],
      [16, 10, 3],
      [26, 0, 4],
      [4, -26, 4],
      [-28, 20, 3],
    ])
      tree(b, x, z, h);
  },
};
