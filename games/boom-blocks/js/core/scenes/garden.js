// Domino Garden: a giant block dinosaur, a rainbow line of dominoes snaking round the garden to a
// TNT crate at the end (knock the first one over and wait for the BOOM), and a pyramid of
// wooden crates to bowl over.
import { MAT } from '../materials.js';
import { RAINBOW } from '../builders.js';
import { tree } from './tower.js';

const DINO = 0x5fd35f;
const BELLY = 0xc9f27a;
const SPOTS = 0xb15cff;

const blob = (b, cx, cy, cz, rx, ry, rz, paint) => b.ellipsoid(cx, cy, cz, rx, ry, rz, paint);

// A friendly long-necked dinosaur made of blocks, facing +x.
function dino(b, ox, oz) {
  const skin = (x, y, z) => {
    if (y < 5 && Math.abs(z - oz) < 3) return { mat: MAT.PLASTIC, color: BELLY };
    const spot = Math.sin(x * 0.9) * Math.sin(z * 1.3 + y * 0.7) > 0.55;
    return { mat: MAT.PLASTIC, color: spot ? SPOTS : DINO };
  };
  for (const [lx, lz] of [
    [-4, -2],
    [-4, 2],
    [4, -2],
    [4, 2],
  ])
    b.box(ox + lx - 1, 0, oz + lz - 1, ox + lx + 1, 4, oz + lz + 1, { mat: MAT.PLASTIC, color: DINO });
  blob(b, ox, 8, oz, 8, 4.2, 4.2, skin);
  // The neck curves up and forward to the head.
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    blob(b, ox + 7 + t * 6, 10 + t * 9, oz, 2.2 - t * 0.5, 2.2 - t * 0.5, 2.2 - t * 0.5, skin);
  }
  blob(b, ox + 14.5, 19.5, oz, 2.8, 1.8, 1.9, { mat: MAT.PLASTIC, color: DINO });
  for (const s of [-1, 1]) {
    b.put(ox + 15, 20, oz + s * 2, { mat: MAT.PLASTIC, color: 0xffffff, flat: true });
    b.put(ox + 16, 20, oz + s * 2, { mat: MAT.PLASTIC, color: 0x163a63, flat: true });
  }
  b.put(ox + 17, 19, oz, { mat: MAT.PLASTIC, color: 0xff5fa2, flat: true });
  // The tail sweeps down and back.
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    blob(b, ox - 7 - t * 10, 8 - t * 5, oz + Math.sin(t * 3) * 2, 2.6 - t * 1.6, 2.6 - t * 1.6, 2.6 - t * 1.6, skin);
  }
  // Spikes down its back.
  for (let i = -5; i <= 5; i += 2) b.box(ox + i, 12, oz, ox + i, 13, oz, { mat: MAT.CANDY, color: 0xff9f1c });
}

// A smooth curve through the control points (Catmull-Rom), as a dense polyline.
function smooth(points, per = 12) {
  const out = [];
  const p = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++)
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const [a, b, c, d] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      const f = (j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  out.push(points[points.length - 1]);
  return out;
}

// Walks a polyline and returns points every `step` units, with the direction at each.
function along(points, step) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    let d = carry;
    for (; d < len; d += step) out.push({ x: ax + ((bx - ax) * d) / len, z: az + ((bz - az) * d) / len, yaw: Math.atan2(bz - az, bx - ax) });
    carry = d - len;
  }
  return out;
}

const DOMINO = [];
for (let y = 0; y < 7; y++) for (let z = 0; z < 3; z++) DOMINO.push([0, y, z]);

const CRATE = [];
for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) CRATE.push([x, y, z]);

export default {
  id: 'garden',
  icon: 'dominoes',
  camera: { target: [-2, 6, 2], yaw: 0.25, pitch: 0.52, dist: 88 },
  build(b) {
    dino(b, 2, -6);

    // The domino line: a rainbow S round the front and left of the garden.
    const path = along(
      smooth([
        [28, 20],
        [16, 26],
        [2, 23],
        [-12, 26],
        [-24, 20],
        [-29, 7],
        [-26, -5],
        [-20, -12],
      ]),
      3.1,
    );
    path.forEach((p, i) => {
      const color = RAINBOW[i % RAINBOW.length];
      // Dominoes face along the path: their thin side points the way they'll fall.
      b.prop(DOMINO.map(([x, y, z]) => [x, y, z, MAT.PLASTIC, y === 3 ? 0xffffff : color]), [p.x, 3.5, p.z], -p.yaw);
    });
    // At the end of the line, right where the last domino will land: a TNT crate.
    const last = path[path.length - 1];
    b.prop(CRATE.map(([x, y, z]) => [x, y, z, MAT.TNT, y ? 0xffffff : 0xff3b3b]), [last.x + Math.cos(last.yaw) * 3.4, 1, last.z + Math.sin(last.yaw) * 3.4], -last.yaw);

    // A pyramid of wooden crates to bowl over.
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4 - row; i++)
        b.prop(CRATE.map(([x, y, z]) => [x, y, z, MAT.WOOD, (x + y + z) % 2 ? 0xc98a4b : 0xb07a3e]), [20 + i * 2.05 + row * 1.02, 1 + row * 2, -18], 0.3);

    for (const [x, z] of [
      [26, 4],
      [-30, -24],
      [28, -28],
      [8, 12],
      [-10, 12],
    ])
      tree(b, x, z, 3);
  },
};
