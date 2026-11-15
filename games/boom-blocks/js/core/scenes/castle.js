// Candy Castle: pink walls, four round towers with wobbly jelly roofs, a gatehouse, a tall keep
// with treasure hidden at the top, and stacks of TNT in the courtyard waiting for a spark.
import { MAT } from '../materials.js';
import { tree } from './tower.js';

const WALL = 0xffb3d1;
const TRIM = 0xffffff;
const TOWER = 0xc9a7ff;
const KEEP = 0x8ff0c4;
const ROOFS = [0x8f5bff, 0x2ec4f1, 0xff5fa2, 0xffb000];

function tnt(b, x, y, z) {
  b.box(x, y, z, x + 1, y + 1, z + 1, (cx, cy) => ({ mat: MAT.TNT, color: cy === y + 1 ? 0xffffff : 0xff3b3b, flat: true }));
}

function flag(b, x, y, z, color) {
  b.box(x, y, z, x, y + 4, z, { mat: MAT.WOOD, color: 0xc98a4b });
  for (let fy = y + 2; fy <= y + 4; fy++) for (let fx = 1; fx <= 3; fx++) b.put(x + fx, fy, z, { mat: MAT.CLOTH, color, flat: true });
}

export default {
  id: 'castle',
  icon: 'castle',
  camera: { target: [0, 7, 0], yaw: 0.5, pitch: 0.56, dist: 96 },
  build(b) {
    // The curtain wall, striped with a white trim.
    const wallPaint = (x, y) => ({ mat: MAT.CANDY, color: y === 4 ? TRIM : WALL });
    b.hollowBox(-16, 0, -16, 16, 8, 16, wallPaint, { thick: 2 });
    b.battlements(-16, -16, 16, 16, 9, { mat: MAT.CANDY, color: TRIM });
    // The gate.
    b.hole(-2, 0, 15, 2, 5, 16);
    // Round corner towers with jelly cone roofs and flags.
    const corners = [
      [-16, -16],
      [16, -16],
      [-16, 16],
      [16, 16],
    ];
    corners.forEach(([cx, cz], i) => {
      b.cylinder(cx, cz, 0, 15, 4.2, (x, y) => ({ mat: MAT.CANDY, color: y % 5 === 4 ? TRIM : TOWER }), { thick: 1.6, floorEvery: 5 });
      b.cone(cx, cz, 16, 7, 5, { mat: MAT.JELLY, color: ROOFS[i] });
      flag(b, cx, 23, cz, ROOFS[(i + 2) % 4]);
      b.hole(cx - 1, 7, cz + (cz < 0 ? 3 : -4), cx + 1, 8, cz + (cz < 0 ? 4 : -3));
    });
    // The gatehouse: two little towers either side of the gate.
    for (const gx of [-5, 5]) {
      b.cylinder(gx, 17, 0, 12, 2.6, { mat: MAT.CANDY, color: TOWER });
      b.cone(gx, 17, 13, 4, 3, { mat: MAT.JELLY, color: 0xffd23f });
    }
    b.box(-3, 6, 15, 3, 8, 17, { mat: MAT.CANDY, color: TRIM });
    // The keep: tall, mint, with a spire, and treasure up top.
    b.hollowBox(-6, 0, -9, 6, 21, 3, (x, y) => ({ mat: MAT.CANDY, color: y % 6 === 5 ? TRIM : KEEP }), { floorEvery: 6, roof: true });
    b.battlements(-6, -9, 6, 3, 22, { mat: MAT.CANDY, color: TRIM });
    b.cylinder(0, -3, 22, 27, 2.6, { mat: MAT.CANDY, color: KEEP });
    b.cone(0, -3, 28, 7, 3.2, { mat: MAT.JELLY, color: 0xff5fa2 });
    flag(b, 0, 35, -3, 0xffd23f);
    b.hole(-1, 0, 3, 1, 3, 3);
    for (const wy of [8, 14])
      for (const wx of [-3, 2]) {
        b.hole(wx, wy, 3, wx + 1, wy + 2, 3);
        b.hole(wx, wy, -9, wx + 1, wy + 2, -9);
      }
    b.gift(0, 18, -3, 'treasure');
    // A row of TNT crates along the outside of the right-hand wall: set one off and the bangs run
    // down the line, blowing holes in the wall as they go. Two more wait in the courtyard.
    for (let z = -10; z <= 10; z += 4) tnt(b, 18, 0, z);
    tnt(b, -12, 0, 10);
    tnt(b, 10, 0, -12);
    // A few trees outside the walls.
    for (const [x, z] of [
      [-28, -6],
      [27, 4],
      [-24, 26],
      [26, -26],
      [12, 30],
    ])
      tree(b, x, z, 3);
  },
};
