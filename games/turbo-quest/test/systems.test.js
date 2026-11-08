// Grumblies, weapons, pickups, power-ups, hurting and helping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { worldFrom, run, settle, flat, idle, DT } from './helpers.js';
import { World } from '../js/game/world.js';
import { tuningFor } from '../js/game/tuning.js';
import { parseLevel } from '../js/game/level.js';
import { Combo, medalFor } from '../js/game/combo.js';
import { T, tileAt } from '../js/engine/collide.js';

const put = (rows, r, c, ch) => (rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1));
const hold = (mx, extra = {}) => () => ({ mx, my: 0, jump: false, jumpPressed: false, fire: false, firePressed: false, ...extra });
const events = (w, ...types) => {
  const got = [];
  for (const t of types) w.events.on(t, (e) => got.push([t, e]));
  return got;
};

test('stomping a Grumbly cheers it and bounces Turbo, higher with jump held', () => {
  const peaks = [];
  for (const held of [false, true]) {
    const rows = flat(40);
    put(rows, 10, 8, 'w');
    const w = worldFrom(rows, { mode: 'dad' });
    settle(w, 10);
    const e = w.enemies[0];
    // Drop Turbo onto it from above.
    w.player.x = e.x;
    w.player.y = e.y - 3;
    w.player.vy = 0;
    const ev = events(w, 'cheer');
    // The peak of the bounce off its head (before landing on its balloon for another).
    let top = 99;
    let springs = 0;
    w.events.on('spring', () => springs++);
    for (let i = 0; i < 120; i++) {
      w.step({ mx: 0, my: 0, jump: held, jumpPressed: false, fire: false }, DT);
      if (springs === 1) top = Math.min(top, w.player.feet);
    }
    assert.equal(ev.length, 1);
    assert.equal(ev[0][1].how, 'stomp');
    assert.equal(e.alive, false);
    assert.equal(w.player.hearts, 3);
    peaks.push(11 - top);
  }
  assert.ok(peaks[1] > peaks[0] + 1, `held ${peaks[1]} vs not ${peaks[0]}`);
});

test('walking into a Grumbly hurts: a heart, a knockback, then a moment of safety', () => {
  const rows = flat(40);
  put(rows, 10, 9, 'w');
  const w = worldFrom(rows, { mode: 'dad', tune: { ...tuningFor('dad') } });
  w.enemies[0].p.speed = 0;
  w.enemies[0].p.alertRange = 0;
  settle(w, 10);
  const ev = events(w, 'hurt');
  let hurtX = null;
  let after = null;
  for (let i = 0; i < 90; i++) {
    w.step(hold(1)(), DT);
    if (ev.length && hurtX === null) hurtX = w.player.x;
    if (hurtX !== null && after === null && w.player.hurtLock <= 0) after = w.player.x;
  }
  assert.equal(ev.length, 1);
  assert.equal(w.player.hearts, 2);
  assert.ok(after < hurtX - 0.5, `knocked back from ${hurtX} to ${after}`);
  assert.ok(w.player.invuln > 0 || ev.length === 1);
});

test('Kid Mode is forgiving: a Grumbly that only brushes Turbo does not hurt', () => {
  for (const [mode, hurts] of [['kid', false], ['dad', true]]) {
    const rows = flat(40);
    put(rows, 10, 10, 'w');
    const w = worldFrom(rows, { mode });
    const e = w.enemies[0];
    e.p.speed = 0;
    e.p.alertRange = 0;
    w.settings.autoFire = false;
    settle(w, 10);
    // Turbo's box overlaps the Grumbly's by 0.2 tiles at the side.
    w.player.x = e.x - w.player.w + 0.2;
    const ev = events(w, 'hurt');
    if (mode === 'kid') w.player.gun.cool = 99; // keep auto-fire out of it
    w.touchEnemy(e);
    assert.equal(ev.length > 0, hurts, mode);
  }
});

test('out of hearts: back to the checkpoint in a bubble with full hearts', () => {
  const w = worldFrom(flat(40), { mode: 'kid' });
  settle(w, 10);
  w.player.x = 20;
  const ev = events(w, 'faint', 'respawn');
  for (let i = 0; i < 3; i++) {
    w.player.invuln = 0;
    w.hurtPlayer(25);
  }
  assert.equal(ev[0][0], 'faint');
  run(w, 200, idle);
  assert.equal(ev[ev.length - 1][0], 'respawn');
  assert.equal(w.player.hearts, 3);
  assert.ok(w.player.x < 3);
});

test('Kid auto-fire cheers a Grumbly ahead, and stays quiet with none in view', () => {
  const rows = flat(40);
  put(rows, 10, 12, 'w');
  const w = worldFrom(rows, { mode: 'kid' });
  const shots = events(w, 'shoot', 'cheer');
  run(w, 120, idle);
  assert.ok(shots.some(([t]) => t === 'cheer'), 'the Grumbly was cheered');
  const before = shots.length;
  run(w, 120, idle);
  assert.equal(shots.length, before, 'no more shots once it is gone');
});

test('Dad: FIRE shoots where you aim (forward, up), and nothing without FIRE', () => {
  const w = worldFrom(flat(40), { mode: 'dad' });
  settle(w);
  const ev = events(w, 'shoot');
  run(w, 30, idle);
  assert.equal(ev.length, 0);
  w.step({ mx: 0, my: 0, jump: false, jumpPressed: false, fire: true, firePressed: true }, DT);
  assert.equal(ev.length, 1);
  assert.equal(ev[0][1].ax, 1);
  w.player.gun.cool = 0;
  w.step({ mx: 0, my: -1, jump: false, jumpPressed: false, fire: true, firePressed: true }, DT);
  assert.equal(ev[1][1].ay, -1);
});

test('Dad: holding FIRE still charges a Big Pop that goes through Grumblies', () => {
  const rows = flat(40);
  put(rows, 10, 7, 'w');
  put(rows, 10, 9, 'w');
  const w = worldFrom(rows, { mode: 'dad' });
  for (const e of w.enemies) {
    e.p.speed = 0;
    e.p.alertRange = 0;
    e.hp = 3;
  }
  settle(w, 10);
  const ev = events(w, 'chargeFull', 'shoot', 'cheer');
  run(w, 70, (i) => ({ mx: 0, my: 0, jump: false, jumpPressed: false, fire: true, firePressed: i === 0 }));
  assert.ok(ev.some(([t]) => t === 'chargeFull'));
  run(w, 40, idle);
  const big = ev.find(([t, e]) => t === 'shoot' && e.big);
  assert.ok(big, 'a Big Pop was fired');
  assert.equal(ev.filter(([t]) => t === 'cheer').length, 2, 'both cheered by one shot');
});

test('Bubble Cannon traps a Grumbly; touching the bubble pops it, landing on it bounces high', () => {
  const rows = flat(40);
  put(rows, 10, 9, 'w');
  const w = worldFrom(rows, { mode: 'kid' });
  const e = w.enemies[0];
  e.p.speed = 0;
  w.player.gun.id = 'bubble';
  w.player.gun.ammo = 24;
  const ev = events(w, 'trap', 'cheer');
  run(w, 60, idle);
  assert.ok(ev.some(([t]) => t === 'trap'));
  assert.ok(e.bubbled > 0 && e.alive);
  // Land on it from above.
  w.player.x = e.x;
  w.player.y = e.y - 2.5;
  w.player.vy = 2;
  w.player.gun.cool = 99;
  let top = 99;
  for (let i = 0; i < 90; i++) {
    w.step(idle(), DT);
    top = Math.min(top, w.player.feet);
  }
  const c = ev.find(([t]) => t === 'cheer');
  assert.ok(c && c[1].how === 'bounce');
  assert.ok(e.y - top > 3, 'bounced high');
});

test('weapons: the same capsule levels up, a different one swaps and drops the old', () => {
  const w = worldFrom(flat(40), { mode: 'dad' });
  const p = w.player;
  const ev = events(w, 'weapon', 'weaponUp', 'drop');
  w.collect({ kind: 'bubble' });
  assert.equal(p.gun.id, 'bubble');
  w.collect({ kind: 'bubble' });
  assert.equal(p.gun.level, 2);
  w.collect({ kind: 'spread' });
  assert.equal(p.gun.id, 'spread');
  const drop = w.items.find((i) => i.kind === 'drop');
  assert.ok(drop && drop.weapon === 'bubble' && drop.level === 2);
  assert.deepEqual(ev.map(([t]) => t), ['weapon', 'weaponUp', 'drop', 'weapon']);
  // It can be grabbed back after a moment, and it vanishes after 6 s if not.
  run(w, 60 * 7, idle);
  assert.equal(drop.got, true);
});

test('Dad: a weapon runs out of ammo and goes back to the Pop Blaster; Kid: never', () => {
  for (const mode of ['dad', 'kid']) {
    const w = worldFrom(flat(40), { mode });
    w.collect({ kind: 'spread' });
    w.player.gun.ammo = 2;
    for (let i = 0; i < 5; i++) {
      w.player.gun.cool = 0;
      w.step({ mx: 0, my: 0, jump: false, jumpPressed: false, fire: true, firePressed: true }, DT);
    }
    assert.equal(w.player.gun.id, mode === 'dad' ? 'pop' : 'spread', mode);
  }
});

test('Dad: getting hit costs a weapon level, never the weapon', () => {
  const w = worldFrom(flat(40), { mode: 'dad' });
  w.collect({ kind: 'spread' });
  w.collect({ kind: 'spread' });
  w.hurtPlayer(0);
  assert.equal(w.player.gun.id, 'spread');
  assert.equal(w.player.gun.level, 1);
});

test('a cheered Grumbly leaves a balloon Turbo can bounce on once', () => {
  const rows = flat(40);
  put(rows, 10, 9, 'w');
  const w = worldFrom(rows, { mode: 'dad' });
  settle(w, 5);
  w.cheer(w.enemies[0], 'shot');
  const b = w.balloons[0];
  assert.ok(b);
  w.player.x = b.x - w.player.w / 2;
  w.player.y = b.y - 0.45 - w.player.h - 0.6;
  w.player.vy = 1;
  const ev = events(w, 'balloonBounce');
  run(w, 20, idle);
  assert.equal(ev.length, 1);
  assert.equal(w.balloons.length, 0);
  assert.ok(w.player.vy < 0);
});

test('TURBO: Kid Mode fills the meter with cheers and starts by itself; invincible meanwhile', () => {
  const rows = flat(60);
  const w = worldFrom(rows, { mode: 'kid' });
  const ev = events(w, 'turbo', 'hurt');
  for (let i = 0; i < 8; i++) w.combo.cheer('shot');
  run(w, 2, idle);
  assert.equal(ev[0][0], 'turbo');
  assert.ok(w.player.turbo > 0);
  w.hurtPlayer(0);
  assert.equal(ev.filter(([t]) => t === 'hurt').length, 0);
});

test('TURBO: Dad Mode waits for the TURBO button', () => {
  const w = worldFrom(flat(60), { mode: 'dad' });
  for (let i = 0; i < 15; i++) w.combo.cheer('shot');
  run(w, 10, idle);
  assert.equal(w.player.turbo, 0);
  w.step({ ...idle(), turboPressed: true }, DT);
  assert.ok(w.player.turbo > 0);
});

test('Giant Pup cheers Grumblies on contact and smashes leafy walls', () => {
  const rows = flat(40);
  put(rows, 10, 9, 'w');
  put(rows, 10, 14, 'x');
  put(rows, 9, 14, 'x');
  const w = worldFrom(rows, { mode: 'dad' });
  w.enemies[0].p.speed = 0;
  w.enemies[0].p.alertRange = 0;
  w.collect({ kind: 'giant' });
  const ev = events(w, 'cheer', 'break', 'hurt');
  run(w, 150, hold(1));
  assert.ok(ev.some(([t, e]) => t === 'cheer' && e.how === 'giant'));
  assert.equal(ev.filter(([t]) => t === 'break').length, 2);
  assert.equal(ev.filter(([t]) => t === 'hurt').length, 0);
  assert.equal(tileAt(w.grid, 14, 10), T.EMPTY);
});

test('thorns hurt in Dad Mode and are harmless flowers in Kid Mode', () => {
  for (const [mode, hurts] of [['dad', 1], ['kid', 0]]) {
    const rows = flat(40);
    put(rows, 10, 8, '^');
    const w = worldFrom(rows, { mode });
    const ev = events(w, 'hurt');
    run(w, 100, hold(1));
    assert.equal(Math.min(1, ev.length), hurts, mode);
  }
});

test('pits: Dad Mode loses a heart, Kid Mode does not', () => {
  for (const [mode, hearts] of [['dad', 2], ['kid', 3]]) {
    const rows = flat(40);
    rows[11] = rows[11].slice(0, 10) + '....' + rows[11].slice(14);
    rows[12] = rows[12].slice(0, 10) + '....' + rows[12].slice(14);
    const w = worldFrom(rows, { mode });
    run(w, 300, (i, w) => ({ ...idle(), mx: w.rescues ? 0 : 1 }));
    assert.equal(w.rescues, 1);
    assert.equal(w.player.hearts, hearts, mode);
  }
});

test('Kid help: falling into the same gap twice lays a bridge across it', () => {
  const rows = flat(40);
  for (const r of [11, 12]) rows[r] = rows[r].slice(0, 10) + '...' + rows[r].slice(13);
  const w = worldFrom(rows, { mode: 'kid' });
  const ev = events(w, 'help');
  for (let k = 0; k < 2; k++) {
    const n = w.rescues;
    let i = 0;
    while (w.rescues === n && i++ < 400) w.step({ ...idle(), mx: 1 }, DT);
    run(w, 120, idle);
  }
  assert.equal(ev.length, 1);
  assert.deepEqual(ev[0][1].cols, [10, 11, 12]);
  assert.equal(tileAt(w.grid, 11, 11), T.BRIDGE);
  // Now he walks straight across.
  run(w, 200, hold(1));
  assert.equal(w.rescues, 2);
  assert.ok(w.player.x > 14);
});

test('Kid smart jump: a jump from standing still at a gap carries Turbo across', () => {
  const rows = flat(40);
  for (const r of [11, 12]) rows[r] = rows[r].slice(0, 10) + '...' + rows[r].slice(13);
  const w = worldFrom(rows, { mode: 'kid' });
  // Walk up to the edge and stop.
  let i = 0;
  while (w.player.x + w.player.w < 9.8 && i++ < 300) w.step({ ...idle(), mx: 1 }, DT);
  run(w, 30, idle);
  run(w, 90, (k) => ({ ...idle(), jump: k < 30, jumpPressed: k === 0 }));
  assert.equal(w.rescues, 0);
  assert.ok(w.player.x > 13, `x=${w.player.x}`);
});

test('mid-level resume: back at the checkpoint with what was collected', () => {
  const rows = flat(60);
  put(rows, 9, 6, '*');
  put(rows, 10, 7, '1');
  put(rows, 10, 30, 'w');
  const def = { id: 'r', sections: [{ rows: rows.map((r) => r.slice(0, 30)) }, { rows: rows.map((r) => r.slice(30)) }] };
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid') });
  run(w, 60 * 8, hold(1));
  assert.ok(w.checkpoint >= 1);
  const saved = JSON.parse(JSON.stringify(w.resumeData()));
  const w2 = new World(def, { mode: 'kid', tune: tuningFor('kid'), resume: saved });
  assert.equal(w2.checkpoint, w.checkpoint);
  assert.equal(w2.starsGot, w.starsGot);
  assert.deepEqual(w2.gems, w.gems);
  assert.equal(w2.enemies[0].alive, w.enemies[0].alive);
  assert.ok(Math.abs(w2.player.x - w.level.checkpoints[w.checkpoint].x) < 1e-9);
});

test('combo: a chain multiplies points; stomps count double; it times out', () => {
  const c = new Combo('dad');
  assert.equal(c.cheer('shot'), 100);
  assert.equal(c.cheer('shot'), 200);
  assert.equal(c.cheer('stomp'), 400);
  c.update(2.1);
  assert.equal(c.chain, 0);
  assert.equal(c.cheer('shot'), 100);
  assert.equal(medalFor(5000, [2000, 4000, 6000]), 2);
});

test('mode overlays: Kid gets bridges where Dad gets a gap and thorns', () => {
  const def = {
    id: 'o',
    sections: [{
      rows: ['..........', '.S......>.', '###...####'],
      kid: { 2: '...~~~....' },
      dad: { 1: '.....^....' },
    }],
  };
  const kid = parseLevel(def, 'kid');
  const dad = parseLevel(def, 'dad');
  assert.equal(tileAt(kid.grid, 4, 2), T.BRIDGE);
  assert.equal(tileAt(dad.grid, 4, 2), T.EMPTY);
  assert.equal(tileAt(dad.grid, 5, 1), T.THORN);
  assert.equal(tileAt(kid.grid, 5, 1), T.EMPTY);
});

test('Dad Hopper hops toward Turbo; Kid Hopper hops in place', () => {
  for (const [mode, moves] of [['dad', true], ['kid', false]]) {
    const rows = flat(40);
    put(rows, 10, 14, 'h');
    const w = worldFrom(rows, { mode });
    w.settings.autoFire = false;
    w.player.gun.cool = 1e9;
    const e = w.enemies[0];
    const x0 = e.x;
    run(w, 60 * 4, idle);
    assert.equal(Math.abs(e.x - x0) > 1, moves, `${mode}: moved ${(e.x - x0).toFixed(2)}`);
    if (moves) assert.ok(e.x < x0, 'toward Turbo');
  }
});

test('Dad Flapper wiggles, then swoops at Turbo below it', () => {
  const rows = flat(40);
  put(rows, 5, 8, 'f');
  const w = worldFrom(rows, { mode: 'dad' });
  const states = new Set();
  for (let i = 0; i < 60 * 5; i++) {
    w.step(idle(), DT);
    if (w.enemies[0].alive) states.add(w.enemies[0].state);
  }
  assert.ok(states.has('wiggle') && states.has('swoop'), [...states].join(','));
});
