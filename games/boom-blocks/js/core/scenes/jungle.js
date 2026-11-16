// Jungle Temple: a big stepped stone pyramid with vines hanging down it, a staircase up the front
// to a little temple on top (treasure inside, golden statues at the door), two giant stone heads,
// two watchtowers joined by a sagging rope bridge, and an explorers' camp with crates of TNT.
import { MAT } from '../materials.js';
import { tnt, palm } from './bay.js';

const STONES = [0xb9b096, 0xa79e84, 0xc9c0a4, 0xb0a68b];
const MOSS = [0x5fa84a, 0x4c9a3e];
const DARK = { mat: MAT.STONE, color: 0x3a3326, flat: true };
const GOLD = { mat: MAT.GOLD, color: 0xffd23f };
const LEAVES = [0x3fb950, 0x2f9e44, 0x4cc85a];

// A steady 0..99 per spot, for moss and stone shades.
const spot = (x, z) => ((((x * 374761393) ^ (z * 668265263)) >>> 0) % 100);
const stone = (x, y, z) => {
  if (y % 4 === 3 && spot(x, z) < 35) return { mat: MAT.STONE, color: MOSS[spot(z, x) % 2] };
  return { mat: MAT.STONE, color: STONES[(((x * 3 + y * 5 + z * 7) % 4) + 4) % 4] };
};

// A vine hanging down a wall: unit (x, y0, z) and the `len` units under it.
function vine(b, x, y0, z, len) {
  for (let i = 0; i < len; i++) b.put(x, y0 - i, z, { mat: MAT.LEAF, color: LEAVES[(((i + x) % 3) + 3) % 3] });
}

function pyramid(b, cx, cz) {
  const halves = [13, 10, 8, 6];
  halves.forEach((h, k) => b.box(cx - h, k * 4, cz - h, cx + h, k * 4 + 3, cz + h, stone));
  // The staircase up the front, with low walls each side.
  const TOP = 15;
  for (let y = 0; y <= TOP; y++) {
    const front = Math.round(cz + 15 - y * 0.6);
    b.box(cx - 2, y, cz, cx + 2, y, front, (x, py, z) => ({ mat: MAT.STONE, color: z === front ? 0xc2b898 : 0xdcd3b8 }));
    for (const x of [cx - 3, cx + 3]) b.box(x, y, cz, x, y + 1, front, { mat: MAT.STONE, color: 0x9a9178 });
  }
  // The temple on top: treasure inside, golden statues at the door, a stepped roof.
  b.hollowBox(cx - 4, TOP + 1, cz - 4, cx + 4, TOP + 5, cz + 4, (x, y) => ({ mat: MAT.STONE, color: y === TOP + 5 ? 0xd8b24a : STONES[(((x + y) % 4) + 4) % 4] }), { roof: true });
  b.hole(cx - 1, TOP + 1, cz + 4, cx + 1, TOP + 3, cz + 4);
  b.gift(cx, TOP + 1, cz, 'treasure');
  for (const x of [cx - 3, cx + 3]) b.box(x, TOP + 1, cz + 5, x, TOP + 2, cz + 5, GOLD);
  b.box(cx - 5, TOP + 6, cz - 5, cx + 5, TOP + 6, cz + 5, stone);
  const peak = b.pyramid(cx - 3, cz - 3, cx + 3, cz + 3, TOP + 7, { mat: MAT.STONE, color: 0xc9c0a4 });
  b.put(cx, peak - 1, cz, GOLD);
  // Vines down every tier, round all four sides (not over the stairs).
  halves.forEach((h, k) => {
    const top = k * 4 + 3;
    for (let i = -h + 1; i <= h - 1; i += 3) {
      const len = 2 + (spot(i, k) % 3);
      if (Math.abs(i) > 4) vine(b, cx + i, top, cz + h + 1, len);
      vine(b, cx + i, top, cz - h - 1, len);
      vine(b, cx + h + 1, top, cz + i, 2 + (spot(k, i) % 3));
      vine(b, cx - h - 1, top, cz + i, 2 + (spot(i + 7, k) % 3));
    }
  });
}

// A giant friendly stone head facing +z, with a feathered crown.
function idol(b, x, z) {
  const face = (px, py, pz) => {
    if (pz === z + 3) {
      const dx = Math.abs(px - x);
      if (py >= 6 && py <= 7 && dx >= 1 && dx <= 2) return DARK;
      if (py === 2 && dx <= 1) return DARK;
      if (py === 3 && dx === 2) return DARK;
    }
    if (py === 9 && spot(px, pz) < 40) return { mat: MAT.STONE, color: MOSS[0] };
    return { mat: MAT.STONE, color: STONES[(((px + py * 2 + pz) % 4) + 4) % 4] };
  };
  b.box(x - 3, 0, z - 3, x + 3, 9, z + 3, face);
  b.box(x, 4, z + 4, x, 5, z + 4, face);
  for (const ex of [x - 4, x + 4]) b.box(ex, 5, z - 1, ex, 7, z + 1, face);
  b.box(x - 4, 10, z - 3, x + 4, 11, z + 3, (px, py) => ({ mat: MAT.PLASTIC, color: py === 10 ? 0xffd23f : (px + 40) % 2 ? 0xe8333b : 0x2ec4f1 }));
  [0xe8333b, 0x5fd35f, 0x2ec4f1, 0xffd23f, 0xb15cff].forEach((color, i) => {
    const fx = x - 4 + i * 2;
    b.beam(fx, 12, z, fx + (i - 2) * 0.6, 15.5, z, { mat: MAT.CLOTH, color, flat: true }, 1);
  });
}

// A stone watchtower with a wooden hut and a straw roof on top. door: which side the bridge
// comes in (-1 = -z, 1 = +z).
function watchtower(b, x, z, door) {
  b.hollowBox(x - 2, 0, z - 2, x + 2, 12, z + 2, stone, { thick: 2, floorEvery: 4 });
  b.hollowBox(x - 2, 13, z - 2, x + 2, 15, z + 2, (px, py) => ({ mat: MAT.WOOD, color: py % 2 ? 0x9a6233 : 0xb07a3e }), { thick: 2 });
  b.hole(x - 1, 13, z + door * 2, x + 1, 14, z + door * 2);
  b.pyramid(x - 3, z - 3, x + 3, z + 3, 16, { mat: MAT.LEAF, color: 0xd9b44a });
}

// The rope bridge: planks sagging between the two huts, rope rails and ropes holding them up.
function bridge(b, x, z0, z1, y) {
  const sag = (z) => y - 2.5 * Math.sin((Math.PI * (z - z0)) / (z1 - z0));
  const rope = { mat: MAT.CLOTH, color: 0xd9c08a, flat: true };
  for (let z = z0; z < z1; z++) {
    const plank = { mat: MAT.WOOD, color: z % 2 ? 0xb07a3e : 0x8d5a2b };
    for (const px of [x - 1, x, x + 1]) b.beam(px, sag(z), z, px, sag(z + 1), z + 1, plank, 1);
    for (const px of [x - 1.5, x + 1.5]) {
      b.beam(px, sag(z) + 1.8, z, px, sag(z + 1) + 1.8, z + 1, rope, 0.5);
      if (z % 2 === 0) b.beam(px, sag(z) + 1.8, z, px, sag(z) + 0.4, z, rope, 0.5);
    }
  }
}

export default {
  id: 'jungle',
  icon: 'temple',
  camera: { target: [0, 11, -4], yaw: 0.32, pitch: 0.36, dist: 96 },
  build(b) {
    pyramid(b, 0, -6);
    idol(b, -22, 11);
    idol(b, 22, 11);
    watchtower(b, 29, -27, 1);
    watchtower(b, 29, -6, -1);
    bridge(b, 29, -25, -8, 13);
    // The explorers' camp: a striped tent and their crates of TNT.
    b.cone(-28, 4, 0, 6, 3.6, (x, y, z) => ({ mat: MAT.CLOTH, color: (Math.floor(Math.atan2(z - 4, x + 28) * 2.5) + 10) % 2 ? 0xff9f1c : 0xffffff, flat: true }));
    tnt(b, -24, 0, -1);
    tnt(b, -27, 0, -6);
    for (const [x, z, h, lean] of [
      [-33, 20, 10, [2, -1]],
      [-14, 25, 9, [-2, 2]],
      [12, 26, 10, [2, 1]],
      [34, 14, 9, [-2, -2]],
      [-34, -22, 11, [2, 2]],
      [8, -30, 9, [-1, 2]],
      [-18, -28, 10, [2, 1]],
    ])
      palm(b, x, z, h, lean);
    for (const [x, z, r] of [
      [-10, 18, 2.6],
      [16, 18, 2.2],
      [-32, 4, 2.4],
      [34, -16, 2.8],
      [-20, -16, 2.2],
      [4, 22, 1.8],
    ])
      b.ellipsoid(x, 0, z, r, r * 0.75, r, (px, py, pz) => ({ mat: MAT.LEAF, color: LEAVES[(((px + py + pz) % 3) + 3) % 3] }));
  },
};
