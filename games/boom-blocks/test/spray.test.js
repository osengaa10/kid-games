import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid, BLOCK, cellX, cellY, cellZ } from '../js/core/grid.js';
import { MAT } from '../js/core/materials.js';
import { BlockSpray } from '../js/physics/spray.js';

// Drawing goes nowhere in tests.
const sink = () => ({ color() {}, writeOne() {}, hide() {}, setCount() {}, flush() {} });
const HALF = BLOCK / 2;
const DT = 1 / 60;

function run(spray, seconds) {
  for (let t = 0; t < seconds; t += DT) spray.update(DT);
}

// Every live block's centre is outside the standing blocks.
function noneInside(spray, grid) {
  for (let i = 0; i < spray.hi; i++) {
    if (!spray.state[i]) continue;
    assert.equal(spray.cellAt(spray.px[i], spray.py[i], spray.pz[i]), -1, `block ${i} is inside a standing block`);
  }
}

test('a dropped block lands, settles flat and rests on the ground', () => {
  const g = new Grid(32, 32, 32);
  const s = new BlockSpray(g, sink(), 16);
  assert.ok(s.emit(cellX(10), 6, cellZ(10), 0, 0, 0, 0xff0000, MAT.PLASTIC, null, 10));
  run(s, 4);
  assert.equal(s.resting, 1);
  assert.ok(Math.abs(s.py[0] - HALF) < 1e-4, `rests at ${s.py[0]}`);
  // Flat: one of its axes points straight up.
  const { qx: [x], qy: [y], qz: [z], qw: [w] } = s;
  const ups = [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)].map(Math.abs);
  assert.ok(Math.max(...ups) > 0.999, `up parts ${ups}`);
});

test('a block thrown at a wall bounces back and never ends up inside it', () => {
  const g = new Grid(32, 32, 32);
  // A wall across x = 16, 10 blocks high.
  for (let y = 0; y < 10; y++) for (let z = 0; z < 32; z++) g.set(16, y, z, MAT.STONE);
  const s = new BlockSpray(g, sink(), 16);
  s.emit(cellX(12), cellY(4), cellZ(10), 18, 2, 0, 0xffffff, MAT.PLASTIC);
  let bounced = false;
  for (let t = 0; t < 3; t += DT) {
    s.update(DT);
    if (s.vx[0] < 0) bounced = true;
    noneInside(s, g);
  }
  assert.ok(bounced, 'it came back off the wall');
  assert.ok(s.px[0] < cellX(16) - HALF, `ended at x ${s.px[0]}`);
});

test('blocks dropped on one spot pile up', () => {
  const g = new Grid(32, 32, 32);
  const s = new BlockSpray(g, sink(), 16);
  s.emit(cellX(10), 2, cellZ(10), 0, 0, 0, 0xff0000, MAT.STONE, null, 0);
  run(s, 2);
  s.emit(cellX(10), 4, cellZ(10), 0, 0, 0, 0x00ff00, MAT.STONE, null, 0);
  run(s, 2);
  assert.equal(s.resting, 2);
  const ys = [s.py[0], s.py[1]].sort((a, b) => a - b);
  assert.ok(Math.abs(ys[0] - HALF) < 1e-3 && Math.abs(ys[1] - (HALF + BLOCK)) < 1e-3, `heights ${ys}`);
});

test('a block lying on a standing block falls when that block goes, and so does one on top of it', () => {
  const g = new Grid(32, 32, 32);
  // A pillar 6 high.
  for (let y = 0; y < 6; y++) g.set(10, y, 10, MAT.BRICK);
  const s = new BlockSpray(g, sink(), 16);
  s.emit(cellX(10), 5, cellZ(10), 0, 0, 0, 0xff0000, MAT.PLASTIC, null, 0);
  run(s, 2);
  s.emit(cellX(10), 6, cellZ(10), 0, 0, 0, 0x00ff00, MAT.PLASTIC, null, 0);
  run(s, 2);
  assert.equal(s.resting, 2);
  assert.ok(Math.abs(Math.min(s.py[0], s.py[1]) - (6 * BLOCK + HALF)) < 1e-3, 'the lower one lies on the pillar top');
  // Knock the whole pillar out.
  for (let y = 0; y < 6; y++) g.remove(g.index(10, y, 10));
  s.groundChanged();
  run(s, 3);
  assert.equal(s.resting, 2, 'both settle again');
  assert.ok(Math.max(s.py[0], s.py[1]) < 2 * BLOCK + 1e-3, `now at ${s.py[0]}, ${s.py[1]}`);
});

test('a full pool makes room by taking the oldest rubble', () => {
  const g = new Grid(32, 32, 32);
  const s = new BlockSpray(g, sink(), 4);
  for (let k = 0; k < 4; k++) assert.ok(s.emit(cellX(4 + k * 3), 1, cellZ(8), 0, 0, 0, 0xffffff, MAT.PLASTIC, null, 0));
  run(s, 1.5);
  // (Keeping headroom, the oldest may already be shrinking away.)
  for (let k = 0; k < 4; k++) assert.ok(s.emit(cellX(20), 3, cellZ(20), 0, 0, 0, 0xffffff, MAT.PLASTIC), `emit ${k}`);
  assert.equal(s.count, 4);
  assert.equal(s.resting, 0, 'all four old ones made way');
  // With nothing resting and no room, it says no.
  const t = new BlockSpray(g, sink(), 2);
  assert.ok(t.emit(0, 5, 0, 0, 0, 0, 0, MAT.PLASTIC));
  assert.ok(t.emit(0, 5, 0, 0, 0, 0, 0, MAT.PLASTIC));
  assert.equal(t.emit(0, 5, 0, 0, 0, 0, 0, MAT.PLASTIC), false);
});

test('a block thrown off the island splashes into the sea and is gone', () => {
  const g = new Grid(32, 32, 32);
  const s = new BlockSpray(g, sink(), 4);
  let splashed = 0;
  s.events.splash = () => splashed++;
  s.emit(42, 3, 0, 12, 4, 0, 0xffffff, MAT.PLASTIC);
  run(s, 3);
  assert.equal(splashed, 1);
  assert.equal(s.count, 0);
});

test('a blast kicks resting rubble back into the air', () => {
  const g = new Grid(32, 32, 32);
  const s = new BlockSpray(g, sink(), 4);
  s.emit(cellX(10), 1, cellZ(10), 0, 0, 0, 0xffffff, MAT.PLASTIC, null, 0);
  run(s, 1.5);
  assert.equal(s.resting, 1);
  s.blast(cellX(10) - 1, 0, cellZ(10), 4, 9, 0.8);
  assert.equal(s.resting, 0);
  assert.ok(s.vx[0] > 0 && s.vy[0] > 0);
  run(s, 4);
  assert.equal(s.resting, 1, 'and it lands again');
});
