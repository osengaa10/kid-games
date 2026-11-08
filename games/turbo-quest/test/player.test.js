import test from 'node:test';
import assert from 'node:assert/strict';
import { worldFrom, run, settle, flat, idle, DT } from './helpers.js';
import { TUNING, tuningFor, jumpReach, derive } from '../js/game/tuning.js';

const MODES = ['kid', 'dad'];

// Highest point of a jump with jump held for `holdSteps` steps (from standing).
function jumpPeak(mode, holdSteps) {
  const w = worldFrom(flat(), { mode });
  settle(w);
  const floor = w.player.feet;
  let best = floor;
  run(w, 120, (i) => ({ mx: 0, my: 0, jump: i < holdSteps, jumpPressed: i === 0 }));
  // run again tracking the peak
  const w2 = worldFrom(flat(), { mode });
  settle(w2);
  for (let i = 0; i < 120; i++) {
    w2.step({ mx: 0, my: 0, jump: i < holdSteps, jumpPressed: i === 0 }, DT);
    best = Math.min(best, w2.player.feet);
  }
  return floor - best;
}

for (const mode of MODES) {
  const t = TUNING[mode];

  test(`${mode}: a held jump reaches the tuned height (±5 %)`, () => {
    const h = jumpPeak(mode, 200);
    assert.ok(Math.abs(h - t.jumpHeight) / t.jumpHeight < 0.05, `got ${h.toFixed(2)}, want ${t.jumpHeight}`);
  });

  test(`${mode}: a tapped jump is the small jump (±10 %)`, () => {
    const h = jumpPeak(mode, 0);
    assert.ok(Math.abs(h - t.minJumpHeight) / t.minJumpHeight < 0.1, `got ${h.toFixed(2)}, want ${t.minJumpHeight}`);
  });

  test(`${mode}: holding longer jumps higher`, () => {
    const a = jumpPeak(mode, 3);
    const b = jumpPeak(mode, 12);
    const c = jumpPeak(mode, 200);
    assert.ok(a < b && b <= c + 1e-9, `${a} ${b} ${c}`);
  });

  test(`${mode}: reaches top speed in about the tuned time`, () => {
    const w = worldFrom(flat(80), { mode });
    settle(w);
    const steps = Math.ceil(t.accelTime / DT - 1e-9);
    run(w, steps, () => ({ mx: 1, my: 0, jump: false, jumpPressed: false }));
    assert.ok(Math.abs(w.player.vx - t.runSpeed) < 0.01, `vx ${w.player.vx}`);
  });

  test(`${mode}: a running jump goes about as far as jumpReach says`, () => {
    const w = worldFrom(flat(120), { mode });
    settle(w);
    run(w, 40, () => ({ mx: 1, my: 0, jump: false, jumpPressed: false }));
    const x0 = w.player.x;
    let i = 0;
    // Jump held on the way up, let go at the top (what jumpReach measures).
    w.step({ mx: 1, my: 0, jump: true, jumpPressed: true }, DT);
    while (!w.player.grounded && i < 300) {
      w.step({ mx: 1, my: 0, jump: w.player.vy < 0, jumpPressed: false }, DT);
      i++;
    }
    const dist = w.player.x - x0;
    const want = jumpReach(tuningFor(mode)).distance;
    assert.ok(Math.abs(dist - want) / want < 0.08, `went ${dist.toFixed(2)}, expected ${want.toFixed(2)}`);
  });

  test(`${mode}: coyote time lets a jump happen just after running off a ledge`, () => {
    for (const late of [0.5, 1.5]) {
      const rows = flat(40);
      // A ledge: cut the floor away from column 8 on.
      rows[11] = rows[11].slice(0, 8) + '.'.repeat(32);
      rows[12] = rows[12].slice(0, 8) + '.'.repeat(32);
      const w = worldFrom(rows, { mode });
      settle(w);
      // Walk until he leaves the ground.
      let k = 0;
      while (w.player.grounded && k++ < 200) w.step({ mx: 1, my: 0, jump: false, jumpPressed: false }, DT);
      const wait = Math.round((late * t.coyote) / DT);
      run(w, wait, () => ({ mx: 1, my: 0, jump: false, jumpPressed: false }));
      w.step({ mx: 1, my: 0, jump: true, jumpPressed: true }, DT);
      const jumped = w.player.vy < -1;
      assert.equal(jumped, late < 1, `late ${late}: jumped=${jumped}`);
    }
  });

  test(`${mode}: jump buffering jumps on landing when pressed a moment early`, () => {
    for (const early of [0.5, 1.6]) {
      const w = worldFrom(flat(), { mode });
      settle(w);
      // Big jump, then press again shortly before landing.
      w.step({ mx: 0, my: 0, jump: true, jumpPressed: true }, DT);
      let s = 0;
      // Simulate ahead on a copy to find the landing step.
      const probe = worldFrom(flat(), { mode });
      settle(probe);
      probe.step({ mx: 0, my: 0, jump: true, jumpPressed: true }, DT);
      while (!probe.player.grounded && s < 400) {
        probe.step({ mx: 0, my: 0, jump: true, jumpPressed: false }, DT);
        s++;
      }
      const pressAt = s - Math.round((early * t.buffer) / DT);
      let rejumped = false;
      for (let i = 0; i < s + 6; i++) {
        const press = i === pressAt;
        w.step({ mx: 0, my: 0, jump: i < pressAt ? true : i >= pressAt && i < pressAt + 30, jumpPressed: press }, DT);
        if (i >= s - 1 && w.player.vy < -1) rejumped = true;
      }
      assert.equal(rejumped, early < 1, `early ${early}: rejumped=${rejumped}`);
    }
  });

  test(`${mode}: never falls through a thin platform at full fall speed`, () => {
    const rows = flat(30);
    // Start high above a one-way plank.
    rows[0] = '..S' + '.'.repeat(27);
    rows[10] = rows[10].replace('..S', '...');
    rows[9] = '.=====' + '.'.repeat(24);
    const w = worldFrom(rows, { mode });
    run(w, 240, idle);
    assert.equal(w.player.grounded, true);
    assert.ok(Math.abs(w.player.feet - 9) < 1e-6, `feet at ${w.player.feet}`);
  });

  test(`${mode}: falling into a pit floats back to safe ground`, () => {
    const rows = flat(40);
    rows[11] = rows[11].slice(0, 10) + '....' + rows[11].slice(14);
    rows[12] = rows[12].slice(0, 10) + '....' + rows[12].slice(14);
    const w = worldFrom(rows, { mode });
    settle(w);
    const events = [];
    w.events.on('rescue', () => events.push('rescue'));
    w.events.on('respawn', () => events.push('respawn'));
    // Walk right until he falls in, then let go.
    run(w, 400, (i, w) => ({ mx: w.rescues === 0 && w.player.state === 'play' && !events.length ? 1 : 0, my: 0, jump: false, jumpPressed: false }));
    assert.deepEqual(events, ['rescue', 'respawn']);
    assert.equal(w.player.state, 'play');
    assert.ok(w.player.x < 10, 'back on the near side');
    settle(w);
    assert.equal(w.player.grounded, true);
  });
}

test('kid: holding jump while falling flutters (slower fall)', () => {
  const w = worldFrom(flat(), { mode: 'kid' });
  settle(w);
  w.step({ mx: 0, my: 0, jump: true, jumpPressed: true }, DT);
  let maxFall = 0;
  for (let i = 0; i < 70; i++) {
    w.step({ mx: 0, my: 0, jump: true, jumpPressed: false }, DT);
    if (w.player.fluttering) maxFall = Math.max(maxFall, w.player.vy);
  }
  assert.ok(maxFall > 0 && maxFall <= TUNING.kid.flutterFall + 1e-9, `flutter fall ${maxFall}`);
});

test('dad: no flutter', () => {
  const w = worldFrom(flat(), { mode: 'dad' });
  settle(w);
  w.step({ mx: 0, my: 0, jump: true, jumpPressed: true }, DT);
  for (let i = 0; i < 60; i++) {
    w.step({ mx: 0, my: 0, jump: true, jumpPressed: false }, DT);
    assert.equal(w.player.fluttering, false);
  }
});

test('dad: down + jump drops through a one-way platform', () => {
  const rows = flat(30);
  rows[0] = '..S' + '.'.repeat(27);
  rows[10] = rows[10].replace('..S', '...');
  rows[7] = '.=====' + '.'.repeat(24);
  const w = worldFrom(rows, { mode: 'dad' });
  settle(w, 200);
  assert.ok(Math.abs(w.player.feet - 7) < 1e-6);
  w.step({ mx: 0, my: 1, jump: true, jumpPressed: true }, DT);
  settle(w, 120);
  assert.ok(Math.abs(w.player.feet - 11) < 1e-6, `feet ${w.player.feet}`);
});

test('a bounce flower throws Turbo higher than a jump', () => {
  // A flower block standing on the ground (its top is at y = 10).
  const rows = flat(30);
  rows[10] = rows[10].slice(0, 7) + 'o' + rows[10].slice(8);
  const w = worldFrom(rows, { mode: 'kid' });
  settle(w);
  let bounced = false;
  w.events.on('bounce', () => (bounced = true));
  // Walk up to the flower, hop onto it, then let go.
  let top = w.player.feet;
  for (let i = 0; i < 240; i++) {
    const p = w.player;
    w.step({ mx: p.x < 7 ? 1 : 0, my: 0, jump: i >= 50 && i < 60, jumpPressed: i === 50 }, DT);
    top = Math.min(top, w.player.feet);
  }
  assert.ok(bounced);
  assert.ok(10 - top > TUNING.kid.jumpHeight + 1, `peak ${10 - top}`);
});

test('kid Auto-Go stops at a gap and waits, then crosses on a jump', () => {
  const rows = flat(40);
  rows[11] = rows[11].slice(0, 12) + '...' + rows[11].slice(15);
  rows[12] = rows[12].slice(0, 12) + '...' + rows[12].slice(15);
  const w = worldFrom(rows, { mode: 'kid', autoGo: true });
  settle(w);
  run(w, 240, idle);
  assert.equal(w.player.waiting, true);
  assert.ok(w.player.x + w.player.w <= 12.05, `stopped at ${w.player.x + w.player.w}`);
  assert.equal(w.player.state, 'play');
  run(w, 100, (i) => ({ mx: 0, my: 0, jump: i < 20, jumpPressed: i === 0 }));
  assert.ok(w.player.x > 15, `crossed: x=${w.player.x}`);
  assert.equal(w.rescues, 0);
});

test('derived jump numbers are sane for both modes', () => {
  for (const mode of MODES) {
    const d = derive(TUNING[mode]);
    assert.ok(d.jumpVel > d.cutVel && d.cutVel > 0);
    const reach = jumpReach(TUNING[mode]);
    assert.ok(reach.distance > 4 && reach.distance < 7, `${mode} reach ${reach.distance}`);
  }
});
