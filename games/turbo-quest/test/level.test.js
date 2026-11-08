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

// A grown-up player: right and FIRE most of the time; jumps gaps, walls and shockwaves; stands still
// on a raft (jumping the rocks); hops onto the mini-boss; and at Tiki Tumble keeps its distance,
// then aims up at the weak spot while it's dizzy.
export function dadBot(def, maxSeconds = 240) {
  const w = new World(def, { mode: 'dad', tune: tuningFor('dad') });
  let hold = 0;
  let steps = 0;
  const solidAt = (c, r) => [T.SOLID, T.BOUNCE, T.BREAK, T.ROCK].includes(tileAt(w.grid, c, r));
  while (!w.won && steps < 60 * maxSeconds) {
    const p = w.player;
    let mx = 1;
    let my = 0;
    let press = false;
    const feet = Math.floor(p.feet + 0.02);
    // On the raft, or in the air after jumping off it: keep pace with it.
    const raft = p.riding && p.riding.kind === 'raft' ? p.riding : !p.grounded && p.lastRaft && p.carryVx ? p.lastRaft : null;
    const foe = w.bigFoe(p);
    const lr = p.lastRaft;
    if (raft && !raft.done) {
      // On the raft: stand still; jump a rock coming up.
      mx = 0;
      const ahead = Math.floor(p.x + p.w + 0.9);
      press = p.grounded && (solidAt(ahead, feet - 1) || solidAt(ahead, feet - 2));
    } else if (lr && lr.started && !lr.done && p.grounded && !p.riding) {
      // Landed on a river rock: step back onto the raft as it passes under.
      mx = lr.x <= p.x + p.w + 0.2 && lr.x + lr.w >= p.x + p.w + 0.4 ? 1 : 0;
    } else if (foe && foe === w.boss) {
      const d = foe.cx - p.cx;
      if (foe.vulnerable) {
        // stand about 3.5 tiles off and shoot diagonally up at the top block
        if (Math.abs(d) > 4.4) mx = Math.sign(d);
        else if (Math.abs(d) < 3.0) mx = -Math.sign(d);
        else if (foe.h > 1.8) {
          mx = Math.sign(d) * 0.6;
          my = -1;
        } else mx = Math.sign(d) * 0.15; // short now: face it and shoot straight ahead
      } else if (foe.state === 'hop') {
        // out from under where it will land (toward the middle when backed into a wall)
        const mid = (w.arena.x0 + w.arena.x1) / 2;
        const cornered = p.cx < w.arena.x0 + 4 || p.cx > w.arena.x1 - 4;
        const away = cornered ? Math.sign(mid - p.cx) : Math.sign(p.cx - foe.landX) || 1;
        mx = Math.abs(p.cx - foe.landX) < 3 || cornered ? away : 0;
      } else mx = Math.abs(d) < 4 ? -Math.sign(d) : Math.abs(d) > 6 ? Math.sign(d) : 0;
      // Coconuts: step away from where one will come down.
      for (let i = 0; i < w.enemyShots.count; i++) {
        const c = w.enemyShots.items[i];
        if (c.kind !== 'coconut') continue;
        const floorY = p.feet - 0.3;
        const disc = c.vy * c.vy + 2 * c.gravity * (floorY - c.y);
        if (disc < 0) continue;
        const t = (-c.vy + Math.sqrt(disc)) / c.gravity;
        const landX = c.x + c.vx * t;
        if (t < 1.2 && Math.abs(landX - p.cx) < 1.3) {
          mx = Math.sign(p.cx - landX) || 1;
          my = 0;
        }
      }
    } else if (foe) {
      const d = foe.cx - p.cx;
      mx = Math.sign(d) || 1;
      press = p.grounded && Math.abs(d) < 2.6;
    } else {
      const ahead = Math.floor(p.x + p.w + 0.6);
      let gap = true;
      for (let cy = feet; cy <= feet + 3; cy++) if (isStandable(tileAt(w.grid, ahead, cy))) gap = false;
      // A raft waiting at the bank is somewhere to walk onto, not a gap to jump.
      for (const pl of w.platforms) if (pl.kind === 'raft' && !pl.started && ahead + 0.5 >= pl.x && ahead + 0.5 <= pl.x + pl.w) gap = false;
      const wall = solidAt(ahead, Math.floor(p.feet - 0.1));
      const thorn = tileAt(w.grid, ahead, feet - 1) === T.THORN;
      if (gap && !p.riding && w.platforms.some((pl) => pl.kind === 'raft' && !pl.started && pl.x > p.x && pl.x - p.x < 3)) mx = 0.4;
      press = p.grounded && (gap || wall || thorn);
    }
    if (w.waveNear(p) && p.grounded) press = true;
    // The goal behind (it opened after a boss): go back to it.
    if (!foe && w.goalOpen && w.level.goal.x + 0.5 < p.cx - 0.2 && !raft) mx = -1;
    press = press && hold === 0;
    if (press) hold = 24;
    // FIRE in quick taps (holding it still would charge the Big Pop instead).
    w.step({ mx, my, jump: hold > 0, jumpPressed: press, fire: steps % 6 < 3, firePressed: steps % 6 === 0 }, DT);
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
      assert.equal(L.checkpoints.length, def.sections.filter((s) => s.checkpoint !== false).length, `${mode}: a checkpoint in every section`);
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
    // A pit column has nothing to stand on anywhere in it (a rope bridge or bamboo counts; the
    // river, where the raft goes, doesn't count as a pit).
    const pit = (x) => {
      for (let r = 0; r < L.height; r++) {
        const t = tileAt(L.grid, x, r);
        if (isStandable(t) || t === T.WATER) return false;
      }
      return true;
    };
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
