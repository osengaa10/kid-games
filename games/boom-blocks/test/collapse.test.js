// Collapse checks on real playgrounds: a building cut through (even where the camera can't see
// what's left holding it) comes down, and one leaning on what's left tips that way, while craters,
// nicks and built overhangs stay up. Cuts are made the way the tools make them (carve.js), and
// checked the way the game does (every second cut plane plus the top of the hole).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid, BLOCK, gridX, gridY, gridZ } from '../js/core/grid.js';
import { MAT } from '../js/core/materials.js';
import { Structure } from '../js/core/connect.js';
import { SCENES, buildScene, sceneById } from '../js/core/scenes/index.js';
import { carveCapsule, carveSphere } from '../js/core/carve.js';
import { rng } from '../js/core/rng.js';

const GAME = { step: 2, minMass: 40 };
// Pieces this big are buildings coming down, not crumbs off a crater's rim.
const BIG = 300;

function scene(id) {
  const g = new Grid();
  buildScene(g, sceneById(id), 1);
  return { g, s: new Structure(g) };
}

function bbox(g, cells) {
  const r = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -1, y1: -1, z1: -1 };
  for (const c of cells) {
    const x = g.cx(c);
    const y = g.cy(c);
    const z = g.cz(c);
    r.x0 = Math.min(r.x0, x);
    r.y0 = Math.min(r.y0, y);
    r.z0 = Math.min(r.z0, z);
    r.x1 = Math.max(r.x1, x);
    r.y1 = Math.max(r.y1, y);
    r.z1 = Math.max(r.z1, z);
  }
  return r;
}

function removeAll(g, cells) {
  for (const c of cells) if (g.mat[c]) g.remove(c);
}

// Times every structure check a test makes, for the log.
const timing = { n: 0, total: 0, worst: 0 };
function check(s, region) {
  const t = performance.now();
  const out = s.weakNecks(region, GAME);
  const ms = performance.now() - t;
  timing.n++;
  timing.total += ms;
  timing.worst = Math.max(timing.worst, ms);
  return out;
}

// A laser dragged across the -z face of a round tower (world centre cx, cz, radius R) at height Y,
// from its left edge to `upTo` of the way across. It cuts the way laser.js does: a thin capsule
// 2.9 units into the surface, so a wide tower's back wall is never touched.
// every: run the game's check after each cut (and take down what it finds). Returns the big
// pieces found and where (share of the way across) the first was found.
function laser(g, s, { cx = 0, cz = 0, R, Y, upTo = 1, every = true, seed = 5 }) {
  const rand = rng(seed);
  const found = [];
  let at = null;
  let last = null;
  for (let wx = cx - R + 0.1; wx <= cx - R + 2 * R * upTo; wx += 0.35) {
    const surf = cz - Math.sqrt(Math.max(0, R * R - (wx - cx) ** 2));
    const cut = carveCapsule(g, gridX(wx), gridY(Y), gridZ(surf - 0.3), gridX(wx), gridY(Y), gridZ(surf + 2.6), 1.05 / BLOCK, rand, { shellChance: 0.15 });
    const cells = cut.core.concat(cut.shell);
    if (!cells.length) continue;
    removeAll(g, cells);
    last = bbox(g, cells);
    if (!every) continue;
    for (const w of check(s, last)) {
      if (w.mass < BIG) continue;
      found.push(w);
      at ??= (wx - cx + R) / (2 * R);
      removeAll(g, w.cells);
    }
  }
  return { found, at, last };
}

// A meteor or bomb's crater. Returns the big pieces that came loose (and takes them away).
function blast(g, s, x, y, z, radius, seed = 7) {
  const cut = carveSphere(g, gridX(x), gridY(y), gridZ(z), radius / BLOCK, rng(seed), { shellChance: 0.85 });
  const cells = cut.core.concat(cut.shell);
  removeAll(g, cells);
  const big = check(s, bbox(g, cells)).filter((w) => w.mass >= BIG);
  for (const w of big) removeAll(g, w.cells);
  return big;
}

const centre = { x: gridX(0), z: gridZ(0) };

test('a laser across the front of the big tower brings its top down, toward the cut', () => {
  for (const Y of [20, 12]) {
    const { g, s } = scene('tower');
    const { found, at } = laser(g, s, { R: 6.5, Y });
    assert.ok(found.length >= 1, `the top never came down (y ${Y})`);
    // Not at the first nick, but before it's cut right through: most of the way across.
    assert.ok(at > 0.55 && at < 0.98, `came down at ${Math.round(at * 100)}% across (y ${Y})`);
    const top = found[0];
    assert.ok(top.mass > 3000, `only ${top.mass} blocks came down`);
    for (const c of top.cells) assert.ok(g.cy(c) >= gridY(Y) - 6, 'took the tower below the cut with it');
    // It leans toward the front (-z), where its support went, not toward the back wall.
    assert.ok(top.lost.cz < centre.z - 2, `leans toward z ${top.lost.cz.toFixed(1)}`);
  }
});

test('one check after the front is cut finds the top resting on the back wall', () => {
  const { g, s } = scene('tower');
  const { last } = laser(g, s, { R: 6.5, Y: 20, upTo: 0.95, every: false });
  const big = check(s, last).filter((w) => w.mass >= BIG);
  assert.equal(big.length, 1);
  assert.ok(big[0].mass > 3000);
  assert.ok(big[0].lost.cz < centre.z - 2, 'leans toward the cut');
});

test('a cut all round except a strip at the back still brings the top down', () => {
  const { g, s } = scene('tower');
  const y0 = 40;
  const y1 = 42;
  const cells = [];
  for (let y = y0; y <= y1; y++)
    for (let z = 0; z < g.sz; z++)
      for (let x = 0; x < g.sx; x++) {
        const c = g.index(x, y, z);
        if (!g.mat[c] || Math.hypot(x + 0.5 - centre.x, z + 0.5 - centre.z) > 14) continue;
        // Leave a strip 2 units wide at the back (+z).
        if (z > centre.z && Math.abs(x + 0.5 - centre.x) <= 2) continue;
        cells.push(c);
      }
  removeAll(g, cells);
  const big = check(s, bbox(g, cells)).filter((w) => w.mass >= BIG);
  assert.equal(big.length, 1);
  assert.ok(big[0].lost.cz < centre.z, 'leans away from the strip');
});

test('a laser cut half way across leaves the big tower standing', () => {
  const { g, s } = scene('tower');
  assert.equal(laser(g, s, { R: 6.5, Y: 20, upTo: 0.5 }).found.length, 0);
});

test('one meteor anywhere round its base leaves the big tower standing; a row of craters across its front topples it', () => {
  for (let a = 0; a < 8; a++)
    for (const y of [0.4, 1.5]) {
      const { g, s } = scene('tower');
      const ang = (a * Math.PI) / 4 + 0.2;
      assert.equal(blast(g, s, Math.cos(ang) * 6.7, y, Math.sin(ang) * 6.7, 4, a).length, 0, `fell to a meteor at ${a * 45}° y ${y}`);
    }
  const { g, s } = scene('tower');
  const falls = [-2.3, -0.85, -1.57, -1.95, -1.2, -2.6].map((a, i) => blast(g, s, Math.cos(a) * 6.7, 1, Math.sin(a) * 6.7, 4, i));
  assert.equal(falls[0].length + falls[1].length, 0, 'fell to one or two meteors');
  const big = falls.flat();
  assert.equal(big.length, 1, 'a row of craters across the front left it standing');
  assert.ok(big[0].lost.cz < centre.z, 'leans toward the craters');
});

test('castle: a corner tower cut above the walls falls, the walls shrug off a bomb', () => {
  let { g, s } = scene('castle');
  const { found, at } = laser(g, s, { cx: -16, cz: -16, R: 4.2, Y: 12 });
  assert.ok(found.length >= 1 && at < 0.98, 'the corner tower top stayed up');
  ({ g, s } = scene('castle'));
  assert.equal(blast(g, s, 0, 4, -16, 5.8).length, 0);
});

test('castle: a bomb in a corner tower leaves its top hanging by a thread, and it falls', () => {
  const { g, s } = scene('castle');
  const big = blast(g, s, -16, 4, -16, 5.8);
  assert.ok(big.length >= 1, 'the tower top stayed up on what was left at the crater rim');
  // Only the corner tower's top, not the walls or the rest of the castle.
  for (const w of big) for (const c of w.cells) assert.ok(g.cx(c) < gridX(-6) && g.cz(c) < gridZ(-6));
});

// A wall with a slab on top, and a tall tower standing on the slab's left end.
function topHeavy() {
  const g = new Grid(40, 80, 40);
  for (let y = 0; y < 10; y++) for (let z = 10; z <= 13; z++) for (let x = 10; x <= 21; x++) g.set(x, y, z, y < 8 ? MAT.BRICK : MAT.PLASTIC);
  for (let y = 10; y < 70; y++) for (let z = 10; z <= 13; z++) for (let x = 10; x <= 11; x++) g.set(x, y, z, MAT.PLASTIC);
  g.markSupport();
  return g;
}

test('a top-heavy piece left standing on its far side tips over', () => {
  const g = topHeavy();
  const s = new Structure(g);
  // Knock out the wall's top under the tower end: two thirds of the base is left, all of it on
  // the far side from the tower.
  const cells = [];
  for (let z = 10; z <= 13; z++) for (let x = 10; x <= 13; x++) cells.push(g.index(x, 7, z));
  removeAll(g, cells);
  const weak = s.weakNecks(bbox(g, cells));
  assert.equal(weak.length, 1);
  assert.ok(weak[0].support >= weak[0].wanted * 0.65, 'enough support by area: it fell for its balance');
  assert.ok(weak[0].lost.cx < 14);
});

test('a nick at the root of a built overhang does not drop it', () => {
  const g = new Grid(40, 30, 40);
  for (let y = 0; y < 10; y++) for (let z = 10; z <= 13; z++) for (let x = 10; x <= 13; x++) g.set(x, y, z, MAT.PLASTIC);
  // A slab sticking far out past the column it's built on.
  for (let y = 10; y < 12; y++) for (let z = 10; z <= 13; z++) for (let x = 10; x <= 24; x++) g.set(x, y, z, MAT.WOOD);
  g.markSupport();
  const s = new Structure(g);
  const cells = [];
  for (let z = 10; z <= 13; z++) cells.push(g.index(13, 9, z));
  removeAll(g, cells);
  assert.equal(s.weakNecks(bbox(g, cells)).length, 0);
});

test('every playground stands untouched (no plane anywhere is a weak neck)', () => {
  for (const sc of SCENES) {
    const g = new Grid();
    buildScene(g, sc, 1);
    const s = new Structure(g);
    const all = { x0: 0, z0: 0, x1: g.sx - 1, y0: 0, y1: g.top - 1, z1: g.sz - 1 };
    assert.equal(s.weakNecks(all, GAME).length, 0, sc.id);
  }
});

test('structure check timing (log only)', (t) => {
  t.diagnostic(`${timing.n} checks: ${timing.total.toFixed(1)} ms total, worst ${timing.worst.toFixed(2)} ms`);
});
