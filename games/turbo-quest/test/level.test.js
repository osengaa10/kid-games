import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../js/content/levels/index.js';
import { parseLevel } from '../js/game/level.js';
import { World } from '../js/game/world.js';
import { tuningFor, jumpReach } from '../js/game/tuning.js';
import { reachableCells, canReach } from '../js/game/lint.js';
import { T, tileAt, isStandable } from '../js/engine/collide.js';
import { ENEMIES } from '../js/content/enemies.js';
import { DT } from './helpers.js';

// The "4-year-old with one button": Auto-Go walks him right, auto-fire handles the Grumblies,
// and he presses jump whenever Turbo stops and waits.
export function kidBot(def, maxSeconds = 240) {
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid'), autoGo: true });
  let hold = 0;
  let steps = 0;
  while (!w.won && steps < 60 * maxSeconds) {
    const press = w.player.waiting && hold === 0;
    if (press) hold = 18;
    w.step({ mx: 0, my: 0, jump: hold > 0, jumpPressed: press, fire: false, firePressed: false }, DT);
    if (hold > 0) hold--;
    steps++;
  }
  return { w, seconds: steps * DT };
}

// A grown-up holding right and FIRE, jumping at gaps and walls.
export function dadBot(def, maxSeconds = 240) {
  const w = new World(def, { mode: 'dad', tune: tuningFor('dad') });
  let hold = 0;
  let steps = 0;
  while (!w.won && steps < 60 * maxSeconds) {
    const p = w.player;
    const ahead = Math.floor(p.x + p.w + 0.6);
    const feet = Math.floor(p.feet + 0.02);
    let gap = true;
    for (let cy = feet; cy <= feet + 3; cy++) if (isStandable(tileAt(w.grid, ahead, cy))) gap = false;
    const t = tileAt(w.grid, ahead, Math.floor(p.feet - 0.1));
    const wall = t === T.SOLID || t === T.BOUNCE || t === T.BREAK;
    const thorn = tileAt(w.grid, ahead, feet - 1) === T.THORN;
    const press = p.grounded && (gap || wall || thorn) && hold === 0;
    if (press) hold = 24;
    w.step({ mx: 1, my: 0, jump: hold > 0, jumpPressed: press, fire: true, firePressed: steps % 8 === 0 }, DT);
    if (hold > 0) hold--;
    steps++;
  }
  return { w, seconds: steps * DT };
}

for (const [id, def] of Object.entries(LEVELS)) {
  test(`${id}: parses in both modes, with a start, a goal and a checkpoint per section`, () => {
    for (const mode of ['kid', 'dad']) {
      const L = parseLevel(def, mode);
      assert.ok(L.start && L.goal);
      assert.equal(L.checkpoints.length, def.sections.length, `${mode}: a checkpoint in every section`);
      for (const s of def.sections) {
        assert.equal(new Set(s.rows.map((r) => r.length)).size, 1, `${s.name}: rows are the same length`);
        for (const m of ['kid', 'dad']) for (const r of Object.values(s[m] || {})) assert.equal(r.length, s.rows[0].length, `${s.name}: ${m} overlay row length`);
      }
      assert.equal(new Set(def.sections.map((s) => s.rows.length)).size, 1, 'sections are the same height');
    }
  });

  test(`${id}: Kid Mode pits are narrower than a Kid jump with room to spare`, () => {
    const L = parseLevel(def, 'kid');
    const kid = jumpReach(tuningFor('kid'));
    // A pit column has nothing to stand on in its bottom three rows (a rope bridge counts).
    const pit = (x) => ![1, 2, 3].some((k) => isStandable(tileAt(L.grid, x, L.height - k)));
    let gap = 0;
    for (let x = 0; x < L.width; x++) {
      if (pit(x)) gap++;
      else {
        assert.ok(gap <= 3 && gap <= kid.distance * 0.7, `pit of ${gap} tiles before column ${x}`);
        gap = 0;
      }
    }
  });

  test(`${id}: nothing hazardous within 3 tiles of a checkpoint`, () => {
    for (const mode of ['kid', 'dad']) {
      const L = parseLevel(def, mode);
      for (const cp of L.checkpoints) {
        for (const e of L.enemies) if (ENEMIES[e.kind].move !== 'fly') assert.ok(Math.abs(e.x - cp.x) > 3, `${mode}: ${e.kind} at ${e.x} by the checkpoint at ${cp.x}`);
        for (let c = Math.floor(cp.x) - 3; c <= cp.x + 3; c++) for (let r = 0; r < L.height; r++) assert.notEqual(tileAt(L.grid, c, r), T.THORN);
      }
    }
  });

  test(`${id}: the goal and the gems can be reached with each mode's jump`, () => {
    for (const mode of ['kid', 'dad']) {
      const L = parseLevel(def, mode);
      const t = tuningFor(mode);
      const cells = reachableCells(L, t);
      assert.ok(canReach(L, t, cells, L.goal.x + 0.5, L.goal.y - 0.5), `${mode}: goal`);
      // Gem 2 is the skill gem (a bubble or balloon bounce), so it isn't checked here.
      for (const it of L.items) if (it.kind === 'gem' && it.gem !== 2) assert.ok(canReach(L, t, cells, it.x, it.y), `${mode}: gem ${it.gem}`);
    }
  });

  test(`${id}: Auto-Go plus jump-when-waiting finishes the level (Kid Mode)`, () => {
    const { w, seconds } = kidBot(def);
    assert.ok(w.won, `stuck at x=${w.player.x.toFixed(1)} after ${seconds.toFixed(0)} s`);
    assert.ok(w.rescues <= 1, `${w.rescues} rescues`);
    assert.equal(w.faints, 0, 'never ran out of hearts');
    assert.ok(seconds < 200, `took ${seconds.toFixed(0)} s`);
  });

  test(`${id}: a Dad-mode runner holding right and FIRE finishes the level`, () => {
    const { w, seconds } = dadBot(def);
    assert.ok(w.won, `stuck at x=${w.player.x.toFixed(1)} after ${seconds.toFixed(0)} s`);
  });
}

test('w1-1: three gems, a goal at the end, and both modes differ only where the overlays say', () => {
  const kid = parseLevel(LEVELS['w1-1'], 'kid');
  const dad = parseLevel(LEVELS['w1-1'], 'dad');
  assert.deepEqual(kid.items.filter((i) => i.kind === 'gem').map((i) => i.gem).sort(), [1, 2, 3]);
  assert.ok(dad.enemies.length > kid.enemies.length);
  assert.ok(kid.goal.x > kid.width - 20);
});

test('stars are collected and counted', () => {
  const w = new World(LEVELS.greybox, { mode: 'kid', tune: tuningFor('kid'), autoGo: true });
  let got = 0;
  w.events.on('star', () => got++);
  for (let i = 0; i < 60 * 8; i++) w.step({ mx: 0, my: 0, jump: false, jumpPressed: false }, DT);
  assert.ok(got >= 3);
  assert.equal(got, w.starsGot);
});
