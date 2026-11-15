import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../js/core/grid.js';
import { MAT, MATERIALS } from '../js/core/materials.js';
import { carveSphere, carveCapsule, carveColumn, raycastGrid } from '../js/core/carve.js';
import { Structure } from '../js/core/connect.js';
import { clumps } from '../js/core/chunker.js';
import { greedyBoxes, boundedBoxes, innerBoxes } from '../js/core/boxes.js';
import { Combo } from '../js/core/combo.js';
import { evictions, tidy, shatterPlan } from '../js/core/budget.js';
import { rng } from '../js/core/rng.js';

const small = () => new Grid(32, 48, 32);

// A hollow square tower w×w, h tall, walls 1 thick, at (x0, z0).
function tower(g, x0, z0, w, h, mat = MAT.PLASTIC) {
  for (let y = 0; y < h; y++)
    for (let z = z0; z < z0 + w; z++)
      for (let x = x0; x < x0 + w; x++) if (x === x0 || z === z0 || x === x0 + w - 1 || z === z0 + w - 1) g.set(x, y, z, mat, 0xff0000);
  g.markSupport();
}

test('grid set/remove keeps the count', () => {
  const g = small();
  g.set(1, 2, 3, MAT.BRICK);
  g.set(1, 2, 3, MAT.STONE);
  g.set(4, 0, 4, MAT.WOOD);
  assert.equal(g.count, 2);
  assert.equal(g.get(1, 2, 3), MAT.STONE);
  const i = g.index(1, 2, 3);
  assert.deepEqual([g.cx(i), g.cy(i), g.cz(i)], [1, 2, 3]);
  assert.equal(g.remove(i), MAT.STONE);
  assert.equal(g.count, 1);
  assert.equal(g.remove(i), 0);
});

test('every material has the fields the game reads', () => {
  for (const id of Object.values(MAT)) {
    if (!id) continue;
    const m = MATERIALS[id];
    for (const k of ['density', 'restitution', 'friction', 'crumbs', 'shape', 'dust', 'sparkle', 'neck', 'strength', 'sound']) assert.ok(m[k] !== undefined, `${m.name}.${k}`);
    assert.ok(m.chunk[0] >= 1 && m.chunk[1] >= m.chunk[0], m.name);
    assert.ok(m.neck > 0 && m.neck < 1, m.name);
  }
});

test('a sphere carve takes a core and loosens a shell, only filled cells', () => {
  const g = small();
  for (let y = 0; y < 10; y++) for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) g.set(x, y, z, MAT.PLASTIC);
  const out = carveSphere(g, 10, 5, 10, 3, rng(1));
  assert.ok(out.core.length > 60 && out.core.length < 200, `core ${out.core.length}`);
  assert.ok(out.shell.length > 10, `shell ${out.shell.length}`);
  const all = new Set([...out.core, ...out.shell]);
  assert.equal(all.size, out.core.length + out.shell.length, 'no cell in both lists');
  for (const i of all) assert.ok(g.mat[i]);
  // Nothing far away.
  for (const i of out.core) assert.ok(Math.hypot(g.cx(i) + 0.5 - 10, g.cy(i) + 0.5 - 5, g.cz(i) + 0.5 - 10) < 3 * 1.3);
});

test('capsule and column carves', () => {
  const g = small();
  for (let y = 0; y < 10; y++) for (let x = 0; x < 20; x++) g.set(x, y, 5, MAT.BRICK);
  const cap = carveCapsule(g, 0, 5, 5.5, 20, 5, 5.5, 1, rng(2));
  assert.ok(cap.core.length >= 15, `capsule core ${cap.core.length}`);
  const col = carveColumn(g, 10.5, 5.5, 1, 4, rng(3));
  assert.ok(col.core.length > 0);
  for (const i of [...col.core, ...col.shell]) assert.ok(g.cy(i) >= 5 && g.cy(i) <= 9);
});

test('raycastGrid finds the first block', () => {
  const g = small();
  g.set(10, 3, 10, MAT.STONE);
  g.set(12, 3, 10, MAT.STONE);
  assert.equal(raycastGrid(g, 0.5, 3.5, 10.5, 1, 0, 0), g.index(10, 3, 10));
  assert.equal(raycastGrid(g, 20.5, 3.5, 10.5, -1, 0, 0), g.index(12, 3, 10));
  assert.equal(raycastGrid(g, 0.5, 30.5, 10.5, 1, 0, 0), -1);
});

test('cutting a tower in half leaves the top floating', () => {
  const g = small();
  tower(g, 10, 10, 4, 20);
  const s = new Structure(g);
  const seeds = [];
  for (let z = 10; z < 14; z++)
    for (let x = 10; x < 14; x++) {
      const i = g.index(x, 8, z);
      if (g.mat[i]) {
        g.remove(i);
        seeds.push(g.index(x, 9, z), g.index(x, 7, z));
      }
    }
  const pieces = s.floating(seeds);
  assert.equal(pieces.length, 1);
  assert.equal(pieces[0].length, 12 * 11);
  for (const c of pieces[0]) assert.ok(g.cy(c) >= 9);
});

test('a hole that leaves the tower standing finds nothing floating', () => {
  const g = small();
  tower(g, 10, 10, 4, 20);
  const s = new Structure(g);
  const i = g.index(10, 8, 11);
  g.remove(i);
  assert.equal(s.floating([g.index(10, 9, 11), g.index(10, 7, 11), g.index(10, 8, 10), g.index(10, 8, 12)]).length, 0);
});

test('two separate pieces cut loose are found separately', () => {
  const g = small();
  tower(g, 2, 2, 3, 12);
  tower(g, 20, 20, 3, 12);
  const s = new Structure(g);
  const seeds = [];
  for (const [x0, z0] of [
    [2, 2],
    [20, 20],
  ])
    for (let z = z0; z < z0 + 3; z++)
      for (let x = x0; x < x0 + 3; x++) {
        const i = g.index(x, 5, z);
        if (g.mat[i]) {
          g.remove(i);
          seeds.push(g.index(x, 6, z));
        }
      }
  assert.equal(s.floating(seeds).length, 2);
});

test('cutting most of one side of a tall tower makes its top a weak neck', () => {
  const g = small();
  tower(g, 10, 10, 6, 30);
  const s = new Structure(g);
  // Remove the whole x = 10 wall and most of the z walls at layers 4..5.
  for (let y = 4; y <= 5; y++)
    for (let z = 10; z < 16; z++)
      for (let x = 10; x < 14; x++) {
        const i = g.index(x, y, z);
        if (g.mat[i]) g.remove(i);
      }
  const weak = s.weakNecks({ x0: 10, y0: 4, z0: 10, x1: 14, y1: 5, z1: 15 });
  assert.ok(weak.length >= 1, 'found a weak neck');
  const top = weak[0];
  assert.ok(top.support < top.wanted);
  // It's everything above the cut (the lowest weak plane may take the leftover stub with it).
  for (const c of top.cells) assert.ok(g.cy(c) >= 4);
  assert.ok(top.cells.some((c) => g.cy(c) === 29), 'includes the top of the tower');
});

test('one small bite out of a fat tower is not a weak neck, a big one is', () => {
  const g = small();
  tower(g, 8, 8, 12, 24);
  const s = new Structure(g);
  for (let y = 3; y <= 5; y++) for (let x = 8; x <= 10; x++) g.remove(g.index(x, y, 8));
  assert.equal(s.weakNecks({ x0: 8, y0: 3, z0: 8, x1: 10, y1: 5, z1: 8 }).length, 0);
  for (let y = 3; y <= 5; y++) for (let x = 8; x <= 19; x++) for (const z of [8, 9, 10, 11]) if (g.mat[g.index(x, y, z)]) g.remove(g.index(x, y, z));
  for (let y = 3; y <= 5; y++) for (let z = 8; z <= 14; z++) for (const x of [8, 19]) if (g.mat[g.index(x, y, z)]) g.remove(g.index(x, y, z));
  assert.equal(s.weakNecks({ x0: 8, y0: 3, z0: 8, x1: 19, y1: 5, z1: 14 }).length, 1);
});

test('a tower joined to another by a thin bridge falls on its own', () => {
  const g = new Grid(64, 48, 32);
  tower(g, 4, 10, 6, 30);
  tower(g, 40, 10, 6, 30);
  // A bridge from one to the other, 2 wide and 1 thick, at y = 18.
  for (let x = 10; x < 40; x++) for (const z of [12, 13]) g.set(x, 18, z, MAT.WOOD);
  g.markSupport();
  const s = new Structure(g);
  for (let y = 3; y <= 5; y++) for (let z = 10; z < 16; z++) for (let x = 4; x < 10; x++) if (g.mat[g.index(x, y, z)]) g.remove(g.index(x, y, z));
  const weak = s.weakNecks({ x0: 4, y0: 3, z0: 10, x1: 9, y1: 5, z1: 15 });
  assert.equal(weak.length, 1);
  // Only the damaged tower (and its end of the bridge) comes down, not the other tower.
  for (const c of weak[0].cells) assert.ok(g.cx(c) < 30);
});

test('a small nick in a wide wall is not a weak neck', () => {
  const g = small();
  for (let y = 0; y < 8; y++) for (let x = 2; x < 28; x++) g.set(x, y, 10, MAT.BRICK);
  g.markSupport();
  const s = new Structure(g);
  g.remove(g.index(14, 2, 10));
  g.remove(g.index(15, 2, 10));
  assert.equal(s.weakNecks({ x0: 14, y0: 2, z0: 10, x1: 15, y1: 2, z1: 10 }).length, 0);
});

test('clumps cover every block once and respect the size limits and groups', () => {
  const xs = [];
  const ys = [];
  const zs = [];
  const groups = [];
  for (let x = 0; x < 6; x++)
    for (let y = 0; y < 4; y++)
      for (let z = 0; z < 3; z++) {
        xs.push(x);
        ys.push(y);
        zs.push(z);
        groups.push(x < 3 ? 1 : 2);
      }
  const out = clumps(xs, ys, zs, 2, 5, rng(7), groups);
  const seen = new Set();
  for (const c of out) {
    assert.ok(c.length >= 1 && c.length <= 5);
    for (const i of c) {
      assert.ok(!seen.has(i));
      seen.add(i);
      assert.equal(groups[i], groups[c[0]]);
    }
  }
  assert.equal(seen.size, xs.length);
});

test('greedy boxes cover blocks exactly', () => {
  const r = rng(11);
  const xs = [];
  const ys = [];
  const zs = [];
  const want = new Set();
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 6; y++)
      for (let z = 0; z < 5; z++)
        if (r() < 0.6) {
          xs.push(x);
          ys.push(y);
          zs.push(z);
          want.add(`${x},${y},${z}`);
        }
  const boxes = greedyBoxes(xs, ys, zs);
  const got = new Set();
  for (const b of boxes)
    for (let x = b.x0; x < b.x1; x++)
      for (let y = b.y0; y < b.y1; y++)
        for (let z = b.z0; z < b.z1; z++) {
          const k = `${x},${y},${z}`;
          assert.ok(!got.has(k), 'no overlap');
          got.add(k);
        }
  assert.deepEqual([...got].sort(), [...want].sort());
  assert.ok(boxes.length < xs.length);
});

test('bounded boxes stay under the cap and still cover every block', () => {
  const r = rng(5);
  const xs = [];
  const ys = [];
  const zs = [];
  for (let i = 0; i < 600; i++) {
    xs.push(Math.floor(r() * 20));
    ys.push(Math.floor(r() * 20));
    zs.push(Math.floor(r() * 20));
  }
  const boxes = boundedBoxes(xs, ys, zs, 30);
  assert.ok(boxes.length <= 30, `${boxes.length}`);
  for (let i = 0; i < xs.length; i++) assert.ok(boxes.some((b) => xs[i] >= b.x0 && xs[i] < b.x1 && ys[i] >= b.y0 && ys[i] < b.y1 && zs[i] >= b.z0 && zs[i] < b.z1));
});

test('combo tiers and windows', () => {
  const c = new Combo(1);
  assert.equal(c.add(500, 0), 0);
  assert.equal(c.add(150, 0.5), 1);
  assert.ok(c.live(1.2));
  assert.ok(!c.live(1.6));
  assert.equal(c.add(10, 3), 0, 'a new burst starts from zero');
  assert.equal(c.count, 10);
  assert.equal(c.rate(3.5), 10);
});

test('evictions only ever take settled pieces, longest-settled and small first', () => {
  const ids = evictions(
    [
      { id: 'moving', blocks: 3, asleepFor: 0, age: 1 },
      { id: 'old-small', blocks: 1, asleepFor: 6, age: 9 },
      { id: 'old-big', blocks: 300, asleepFor: 6, age: 9 },
      { id: 'new-asleep', blocks: 2, asleepFor: 0.6, age: 2 },
      { id: 'falling', blocks: 9000, asleepFor: 0, age: 30 },
    ],
    10,
  );
  assert.ok(!ids.includes('moving') && !ids.includes('falling'), 'never anything still moving');
  assert.equal(ids[0], 'old-small');
  assert.equal(ids.length, 3);
  assert.ok(tidy({ blocks: 2, asleepFor: 12 }));
  assert.ok(!tidy({ blocks: 2, asleepFor: 1 }));
  assert.ok(!tidy({ blocks: 40, asleepFor: 50 }));
});

test('a shatter plan keeps every block and fits the room', () => {
  const r = rng(4);
  // A long tower lying along x, hit at one end: distances from 0 to 40.
  const n = 12000;
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = r() * 40;
  for (const room of [70, 20, 5, 1]) {
    const plan = shatterPlan(dist, room, { near: 4, mid: 10 });
    assert.equal(plan.zone.length, n);
    assert.equal(plan.counts[0] + plan.counts[1] + plan.counts[2], n, 'every block is in a zone');
    assert.ok(plan.pieces <= room, `room ${room}: ${plan.pieces} pieces`);
    for (const [lo, hi] of plan.sizes) assert.ok(lo >= 1 && hi >= lo);
  }
  // With plenty of room the near end breaks small and the far end stays in a few slabs.
  const roomy = shatterPlan(dist, 1000, { near: 4, mid: 10 });
  assert.ok(roomy.sizes[0][1] <= 24);
  assert.ok(roomy.sizes[2][0] > 1000);
  // Small pieces just break into small bits.
  const tiny = shatterPlan(new Float32Array(50).fill(9), 100, { eq: 6 });
  assert.equal(tiny.counts[0], 50);
  assert.deepEqual(tiny.sizes[0], [1, 5]);
});

test('inner boxes never cover a spot that has no block', () => {
  const r = rng(9);
  const xs = [];
  const ys = [];
  const zs = [];
  const have = new Set();
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(r() * 10);
    const y = Math.floor(r() * 10);
    const z = Math.floor(r() * 10);
    if (have.has(`${x},${y},${z}`)) continue;
    have.add(`${x},${y},${z}`);
    xs.push(x);
    ys.push(y);
    zs.push(z);
  }
  const boxes = innerBoxes(xs, ys, zs, 8);
  assert.ok(boxes.length <= 8);
  for (const b of boxes) for (let x = b.x0; x < b.x1; x++) for (let y = b.y0; y < b.y1; y++) for (let z = b.z0; z < b.z1; z++) assert.ok(have.has(`${x},${y},${z}`));
});

// A square tower (walls only) with a top floor, and a roof wider than the tower on top of it.
function roofedTower() {
  const g = new Grid(40, 40, 40);
  for (let y = 0; y < 20; y++)
    for (let z = 15; z <= 20; z++)
      for (let x = 15; x <= 20; x++) if (y === 19 || x === 15 || x === 20 || z === 15 || z === 20) g.set(x, y, z, MAT.PLASTIC);
  for (let y = 20; y < 24; y++) for (let z = 13; z <= 22; z++) for (let x = 13; x <= 22; x++) g.set(x, y, z, MAT.JELLY);
  g.markSupport();
  return g;
}

function carveBox(g, x0, y0, z0, x1, y1, z1, keep = () => false) {
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const i = g.index(x, y, z);
        if (g.mat[i] && !keep(x, y, z)) g.remove(i);
      }
  return { x0, y0, z0, x1, y1, z1 };
}

test('a crater in a wide roof does not snap the tower holding it up', () => {
  const g = roofedTower();
  const s = new Structure(g);
  const region = carveBox(g, 15, 21, 15, 19, 23, 19);
  for (const w of s.weakNecks(region)) for (const c of w.cells) assert.ok(g.cy(c) >= 20, `tower body broke at y ${g.cy(c)}`);
  // Even when the checked planes reach down into the tower's top.
  for (const w of s.weakNecks({ ...region, y0: 18 })) for (const c of w.cells) assert.ok(g.cy(c) >= 20);
});

test('a roof whose own support is mostly cut comes loose', () => {
  const g = roofedTower();
  const s = new Structure(g);
  // Knock out the tower's top layer except two blocks in one corner.
  const region = carveBox(g, 15, 19, 15, 20, 19, 20, (x, y, z) => x === 15 && z <= 16);
  const weak = s.weakNecks(region);
  assert.equal(weak.length, 1);
  assert.ok(weak[0].cells.some((c) => g.cy(c) === 23), 'takes the roof with it');
  for (const c of weak[0].cells) assert.ok(g.cy(c) >= 19);
});

// ---------- visible sides ----------
import { hiddenFaces, OpenAir, ALL_HIDDEN } from '../js/core/faces.js';

test('hiddenFaces: a 3×3×3 cube buries its middle and hides the sides between blocks', () => {
  const xs = [];
  const ys = [];
  const zs = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) xs.push(x + 10), ys.push(y - 5), zs.push(z);
  const h = hiddenFaces(xs, ys, zs);
  const at = (x, y, z) => h[x * 9 + y * 3 + z];
  assert.equal(at(1, 1, 1), ALL_HIDDEN);
  // A corner block shows exactly three sides: -x, -y, -z (bits 2, 8, 32) at the 0,0,0 corner.
  assert.equal(at(0, 0, 0), ALL_HIDDEN & ~(2 | 8 | 32));
  // A lone block hides nothing.
  assert.deepEqual([...hiddenFaces([4], [4], [4])], [0]);
});

test('OpenAir: a sealed hollow box shows only its outside until a hole opens it', () => {
  const g = new Grid(12, 12, 12);
  // A 6×6×6 box with walls one block thick, sitting on the ground, hollow inside.
  for (let x = 2; x < 8; x++) for (let y = 0; y < 6; y++) for (let z = 2; z < 8; z++) {
    const wall = x === 2 || x === 7 || y === 0 || y === 5 || z === 2 || z === 7;
    if (wall) g.set(x, y, z, 1);
  }
  g.markSupport();
  const air = new OpenAir(g);
  air.fill();
  const shown = () => {
    let k = 0;
    for (let i = 0; i < g.top * g.layer; i++) if (g.mat[i]) for (let d = 0; d < 6; d++) if (air.sideOpen(i, d)) k++;
    return k;
  };
  // Outside of a 6×6×6 box with no bottom: 5 sides of 36 squares.
  assert.equal(shown(), 5 * 36);
  // The middle of the box is air, but closed in.
  assert.equal(air.isOpen(g.index(4, 3, 4)), false);
  // Knock a hole in a wall: the inside comes into view.
  const hole = g.index(2, 3, 4);
  g.remove(hole);
  const opened = [];
  air.open([hole], (cell, d) => opened.push([cell, d]));
  assert.equal(air.isOpen(g.index(4, 3, 4)), true);
  // The inside: 4 walls of 4×4, the ceiling 4×4 and the floor 4×4, less the hole's own square,
  // plus the 4 rims of the hole.
  assert.equal(opened.length, 6 * 16 - 1 + 4);
  assert.equal(shown(), 5 * 36 - 1 + 6 * 16 - 1 + 4);
});

test('OpenAir: air under an overhang is open; the ground is never a side', () => {
  const g = new Grid(10, 10, 10);
  // A table: four legs and a top.
  for (const [x, z] of [[2, 2], [2, 6], [6, 2], [6, 6]]) for (let y = 0; y < 3; y++) g.set(x, y, z, 1);
  for (let x = 2; x <= 6; x++) for (let z = 2; z <= 6; z++) g.set(x, 3, z, 1);
  g.markSupport();
  const air = new OpenAir(g);
  air.fill();
  assert.equal(air.isOpen(g.index(4, 1, 4)), true);
  // The top's underside shows (+y = 2, -y = 3); a leg's bottom doesn't.
  assert.equal(air.sideOpen(g.index(4, 3, 4), 3), true);
  assert.equal(air.sideOpen(g.index(2, 0, 2), 3), false);
});
