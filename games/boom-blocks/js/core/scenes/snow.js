// Snowy Hill: a family of snowmen (knock their heads off), a sparkly ice castle whose chunks
// skate across the grass, an igloo and snowy pine trees. Balloons are hidden at the top of the
// castle's tallest spire.
import { MAT } from '../materials.js';

const SNOW = { mat: MAT.SNOW, color: 0xf6faff, jitter: 0.03 };
const COAL = { mat: MAT.STONE, color: 0x23262f, flat: true };
const ICE = [0xbfeaff, 0xa6dcff, 0xdcf5ff, 0x8fd0ff];

// A snowman s times the usual size, facing +z: three snowballs, coal eyes, smile and buttons,
// a carrot nose, stick arms, a scarf and a top hat.
function snowman(b, x, z, s = 1, scarf = 0xff4d4d) {
  const r1 = 5.4 * s;
  const r2 = 3.9 * s;
  const r3 = 2.9 * s;
  const y1 = r1 * 0.8;
  const y2 = y1 + r1 * 0.8 + r2 * 0.72;
  const y3 = y2 + r2 * 0.8 + r3 * 0.72;
  b.ellipsoid(x, y1, z, r1, r1 * 0.95, r1, SNOW);
  b.ellipsoid(x, y2, z, r2, r2 * 0.95, r2, SNOW);
  b.ellipsoid(x, y3, z, r3, r3, r3, SNOW);
  // The face (the middle of unit x is x + 0.5; dabs are placed by unit middles too).
  for (const side of [-1, 1]) b.dab(x + side * r3 * 0.38, y3 + r3 * 0.3, z + r3 * 0.86, COAL, 0.75);
  for (let i = -2; i <= 2; i++) b.dab(x + i * r3 * 0.18, y3 - r3 * 0.35 + Math.abs(i) * 0.12 * r3, z + r3 * 0.88, COAL, 0.5);
  b.beam(x, y3, z + r3 * 0.85, x, y3 - 0.2, z + r3 + 1.6 * s, { mat: MAT.CANDY, color: 0xff8c1a }, 1);
  b.beam(x, y3 - 0.2, z + r3 + 1.6 * s, x, y3 - 0.3, z + r3 + 2.6 * s, { mat: MAT.CANDY, color: 0xff8c1a }, 0.5);
  // Buttons down the middle snowball.
  for (const k of [0.45, 0, -0.45]) b.dab(x, y2 + k * r2, z + Math.sqrt(1 - k * k) * r2 * 0.93, COAL, 0.75);
  // Stick arms with little twig fingers.
  const stick = { mat: MAT.WOOD, color: 0x7a4a22 };
  for (const side of [-1, 1]) {
    const sx = x + side * r2 * 0.85;
    const ex = x + side * (r2 + 4.5 * s);
    const ey = y2 + 3.2 * s;
    b.beam(sx, y2 + 0.4, z, ex, ey, z, stick, 0.75);
    b.beam(ex, ey, z, ex + side * 1.2 * s, ey + 1.4 * s, z, stick, 0.5);
    b.beam(ex, ey, z, ex + side * 1.6 * s, ey - 0.2, z, stick, 0.5);
  }
  // The scarf round the neck, its end hanging down the front.
  const neck = Math.floor(y2 + r2 * 0.78);
  b.cylinder(x, z, neck, neck, r3 * 0.95, { mat: MAT.CLOTH, color: scarf, flat: true }, { thick: 1.6 });
  b.beam(x + r3 * 0.5, neck, z + r3 * 0.7, x + r3 * 0.6, neck - 2.5 * s, z + r3 * 0.95, { mat: MAT.CLOTH, color: scarf, flat: true }, 1);
  // A top hat with a red band.
  const hat = Math.floor(y3 + r3 * 0.9);
  b.cylinder(x, z, hat, hat, r3 * 1.15, { mat: MAT.CLOTH, color: 0x2b2f45, flat: true });
  b.cylinder(x, z, hat + 1, hat + Math.round(3 * s), r3 * 0.72, (px, py) => ({ mat: MAT.CLOTH, color: py === hat + 1 ? 0xff4d4d : 0x2b2f45, flat: true }));
}

// A pine tree in three tiers with snow on the branches.
function pine(b, x, z, s = 1) {
  b.box(x, 0, z, x, 1, z, { mat: MAT.WOOD, color: 0x7a4a22 });
  for (let k = 0; k < 3; k++) {
    const y0 = 2 + Math.round(k * 3.2 * s);
    const r = (4.2 - k * 1.1) * s;
    b.cone(x, z, y0, Math.round(5 * s), r, (px, py, pz) => {
      const snowy = (py - y0 >= 1 && (((px * 7 + pz * 3 + py * 5) % 4) + 4) % 4 === 0) || py - y0 >= Math.round(5 * s) - 1;
      return snowy ? { mat: MAT.SNOW, color: 0xffffff } : { mat: MAT.LEAF, color: k % 2 ? 0x2f8f3a : 0x267a32 };
    });
  }
}

// The ice castle: walls with battlements, four corner spires and a tall middle spire.
function iceCastle(b, cx, cz) {
  const ice = (x, y, z) => ({ mat: MAT.ICE, color: ICE[(y + ((x + z) & 1)) % 4], jitter: 0.04 });
  const tip = { mat: MAT.ICE, color: 0xffffff };
  b.hollowBox(cx - 9, 0, cz - 7, cx + 9, 8, cz + 7, ice, { thick: 2 });
  b.battlements(cx - 9, cz - 7, cx + 9, cz + 7, 9, { mat: MAT.ICE, color: 0xe8f9ff });
  b.hole(cx - 2, 0, cz + 6, cx + 2, 4, cz + 7);
  for (const [x, z, h] of [
    [cx - 9, cz + 7, 15],
    [cx + 9, cz + 7, 13],
    [cx - 9, cz - 7, 19],
    [cx + 9, cz - 7, 17],
  ]) {
    b.cylinder(x, z, 0, h, 2.6, ice, { thick: 2, floorEvery: 6 });
    b.cone(x, z, h + 1, 6, 2.9, tip);
  }
  b.cylinder(cx, cz - 1, 0, 26, 3.6, ice, { thick: 2, floorEvery: 6 });
  b.cone(cx, cz - 1, 27, 10, 3.9, (x, y) => ({ mat: MAT.ICE, color: y % 3 ? 0xdcf5ff : 0x8fd0ff }));
  b.gift(cx, 24, cz - 1, 'balloons');
  for (const y of [8, 14, 20]) b.hole(cx, y, cz + 2, cx, y + 2, cz + 3);
}

// An igloo of snow bricks with a tunnel to crawl in by.
function igloo(b, x, z) {
  const brick = (px, py, pz) => {
    const grout = py % 2 === 0 || (px + pz + (py % 4 < 2 ? 0 : 1)) % 3 === 0;
    return { mat: MAT.SNOW, color: grout ? 0xd6e9fb : 0xffffff, flat: true };
  };
  b.ellipsoid(x, 0, z, 6.5, 6, 6.5, brick);
  b.box(x - 2, 0, z + 5, x + 2, 3, z + 9, brick);
  b.hole(x - 1, 0, z + 2, x + 1, 2, z + 9);
}

export default {
  id: 'snow',
  icon: 'snowman',
  camera: { target: [0, 10, -2], yaw: 0.3, pitch: 0.4, dist: 88 },
  build(b) {
    snowman(b, -12, 4, 1.15, 0xff4d4d);
    snowman(b, 6, 14, 0.8, 0x2e9bf1);
    snowman(b, 17, 18, 0.55, 0xffd23f);
    iceCastle(b, 12, -16);
    igloo(b, -25, 15);
    for (const [x, z, s] of [
      [-32, -2, 1],
      [-17, 29, 0.9],
      [-26, -20, 1.1],
      [29, 2, 1.1],
      [31, -28, 1],
      [-6, -27, 1.2],
      [30, 26, 0.8],
      [-12, 26, 0.8],
    ])
      pine(b, x, z, s);
  },
};
