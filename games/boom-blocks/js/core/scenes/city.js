// Block City: skyscrapers with sparkly glass windows, a wooden sky-bridge between two of them,
// a water tower up on a roof, little houses, and a surprise hidden on a high floor.
import { MAT } from '../materials.js';
import { tree } from './tower.js';

const GLASS = { mat: MAT.GLASS, color: 0xbff3ff, flat: true };

// A hollow building with floors every 4 layers and glass window bands. rgb: wall color.
function building(b, x0, z0, x1, z1, height, color, { roof = null, every = 4 } = {}) {
  b.hollowBox(x0, 0, z0, x1, height - 1, z1, (x, y, z) => {
    const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
    const floor = y % every === every - 1;
    const along = x === x0 || x === x1 ? z : x;
    if (!corner && !floor && y > 1 && y % every !== 0 && along % 3 !== 0) return GLASS;
    return { mat: MAT.BRICK, color };
  }, { floorEvery: every, roof: true });
  if (roof) b.pyramid(x0, z0, x1, z1, height, roof);
}

function house(b, x0, z0, w, d, h, color, roof) {
  b.hollowBox(x0, 0, z0, x0 + w - 1, h - 1, z0 + d - 1, { mat: MAT.WOOD, color }, { roof: true });
  b.pyramid(x0 - 1, z0 - 1, x0 + w, z0 + d, h, { mat: MAT.BRICK, color: roof });
  b.hole(x0 + Math.floor(w / 2), 0, z0 + d - 1, x0 + Math.floor(w / 2), 1, z0 + d - 1);
}

export default {
  id: 'city',
  icon: 'city',
  camera: { target: [0, 14, -4], yaw: 0.35, pitch: 0.32, dist: 92 },
  build(b) {
    // Two big skyscrapers joined by a wooden sky-bridge.
    building(b, -15, -17, -7, -9, 34, 0x2e9bf1);
    building(b, 6, -17, 14, -9, 28, 0xff9f1c);
    for (let x = -6; x <= 5; x++)
      for (let z = -14; z <= -12; z++) {
        b.put(x, 18, z, { mat: MAT.WOOD, color: (x + z) % 2 ? 0xc98a4b : 0xb07a3e });
        if (z !== -13) b.put(x, 19, z, { mat: MAT.WOOD, color: 0x8d6236 });
      }
    // A skinny pink tower at the back.
    building(b, -2, -27, 3, -22, 42, 0xff7eb6, { every: 5 });
    b.box(0, 42, -25, 1, 47, -24, { mat: MAT.METAL, color: 0xd0d6e0 });
    b.put(0, 48, -25, { mat: MAT.CANDY, color: 0xff3b3b });
    // A green building with a pointy roof, and a purple one with a water tower on top.
    building(b, -17, 3, -9, 11, 16, 0x5fd35f, { roof: { mat: MAT.BRICK, color: 0x2f8f3a } });
    building(b, 8, 1, 16, 9, 20, 0xb15cff);
    for (const [lx, lz] of [
      [10, 4],
      [14, 4],
      [10, 6],
      [14, 6],
    ])
      b.box(lx, 20, lz, lx, 23, lz, { mat: MAT.WOOD, color: 0x8d6236 });
    b.cylinder(12, 5, 24, 24, 2.8, { mat: MAT.METAL, color: 0xaab3c2 });
    b.cylinder(12, 5, 25, 28, 2.8, { mat: MAT.METAL, color: 0xc7cfdb }, { thick: 1 });
    b.cone(12, 5, 29, 3, 3, { mat: MAT.METAL, color: 0xff5a3c });
    // Little houses down the front street.
    house(b, -4, 10, 7, 6, 6, 0xffe08a, 0xd9363e);
    house(b, -27, -4, 6, 6, 5, 0xffffff, 0x2e9bf1);
    house(b, 22, 12, 6, 5, 5, 0xffc2e0, 0x8f5bff);
    // A surprise up in the blue skyscraper.
    b.gift(-11, 24, -13, 'balloons');
    // Fireworks crates behind the orange tower.
    b.box(16, 0, -20, 17, 1, -19, (x, y) => ({ mat: MAT.TNT, color: y ? 0xffffff : 0xff3b3b, flat: true }));
    for (const [x, z] of [
      [-22, 14],
      [20, -2],
      [-24, -18],
      [4, 22],
      [24, 24],
      [-12, 22],
    ])
      tree(b, x, z, 3);
  },
};
