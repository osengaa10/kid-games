// M2: the new Grumblies, weapons, power-ups, the raft, double jump, the mini-boss and Tiki Tumble.
import test from 'node:test';
import assert from 'node:assert/strict';
import { worldFrom, run, settle, flat, idle, DT } from './helpers.js';
import { World } from '../js/game/world.js';
import { tuningFor } from '../js/game/tuning.js';
import { T, tileAt } from '../js/engine/collide.js';

const put = (rows, r, c, ch) => (rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1));
const hold = (extra = {}) => () => ({ mx: 0, my: 0, jump: false, jumpPressed: false, fire: false, firePressed: false, ...extra });
const events = (w, ...types) => {
  const got = [];
  for (const t of types) w.events.on(t, (e) => got.push([t, e]));
  return got;
};
const count = (ev, t) => ev.filter(([x]) => x === t).length;
const fireOnce = (w, extra = {}) => {
  w.player.gun.cool = 0;
  w.step({ mx: 0, my: 0, jump: false, jumpPressed: false, fire: true, firePressed: true, ...extra }, DT);
};
const noAuto = (w) => (w.player.gun.cool = 1e9);

// ------------------------------------------------------------------------------- Spitter
test('Spitter (Kid): puffs its cheeks, then spits one slow seed straight at Turbo\'s side', () => {
  const rows = flat(40);
  put(rows, 10, 9, 's');
  const w = worldFrom(rows, { mode: 'kid' });
  noAuto(w);
  const ev = events(w, 'puff', 'spit');
  run(w, 60 * 4.5, idle);
  assert.ok(count(ev, 'puff') >= 1 && count(ev, 'spit') >= 1);
  const s = w.enemyShots.items[0];
  assert.ok(s.vx < 0 && Math.abs(s.vy) < 1e-9, 'flies straight toward Turbo');
  assert.ok(Math.abs(s.vx) <= 3.3, 'slow');
});

test('Spitter (Dad): a burst of three aimed shots', () => {
  const rows = flat(40);
  put(rows, 7, 8, 's');
  for (let c = 6; c <= 10; c++) put(rows, 8, c, '#');
  const w = worldFrom(rows, { mode: 'dad' });
  const ev = events(w, 'spit');
  run(w, 60 * 3, idle);
  assert.ok(count(ev, 'spit') >= 3);
  const s = w.enemyShots.items[0];
  assert.ok(s.vy > 0.5, 'aimed down at Turbo');
});

test('a seed hurts, and Turbo\'s shots pop seeds', () => {
  const w = worldFrom(flat(40), { mode: 'dad' });
  settle(w);
  const ev = events(w, 'hurt', 'popShot');
  w.spawnEnemyShot({ x: w.player.cx + 3, y: w.player.y + 0.6, vx: -4, kind: 'seed', r: 0.25 });
  run(w, 60, idle);
  assert.equal(count(ev, 'hurt'), 1);
  w.player.invuln = 0;
  w.spawnEnemyShot({ x: w.player.cx + 5, y: w.player.y + 0.45, vx: -2, kind: 'seed', r: 0.25 });
  fireOnce(w);
  run(w, 40, idle);
  assert.equal(count(ev, 'popShot'), 1);
  assert.equal(count(ev, 'hurt'), 1);
});

// ------------------------------------------------------------------------- Shield Bonker
test('Shield Bonker: shots from the front clang off; from behind they cheer', () => {
  const rows = flat(40);
  put(rows, 10, 10, 'b');
  const w = worldFrom(rows, { mode: 'dad' });
  const e = w.enemies[0];
  e.p.speed = 0;
  e.p.faceYou = 0;
  e.facing = -1;
  settle(w, 5);
  const ev = events(w, 'blocked', 'cheer');
  fireOnce(w);
  run(w, 40, idle);
  assert.equal(count(ev, 'blocked'), 1);
  assert.ok(e.alive);
  // Now from behind.
  w.player.x = e.x + 4;
  w.player.facing = -1;
  fireOnce(w, { mx: -0.05 });
  run(w, 40, idle);
  assert.equal(count(ev, 'cheer'), 1);
});

test('Shield Bonker (Kid): the lid falls off after two clangs', () => {
  const rows = flat(40);
  put(rows, 10, 10, 'b');
  const w = worldFrom(rows, { mode: 'kid' });
  const e = w.enemies[0];
  e.p.speed = 0;
  const ev = events(w, 'blocked', 'shieldBreak', 'cheer');
  run(w, 60 * 4, idle);
  assert.equal(count(ev, 'shieldBreak'), 1);
  assert.equal(count(ev, 'cheer'), 1, 'then auto-fire cheers it');
});

test('Shield Bonker (Dad): turns to keep its lid toward Turbo', () => {
  const rows = flat(40);
  put(rows, 10, 7, 'b');
  const w = worldFrom(rows, { mode: 'dad' });
  const e = w.enemies[0];
  e.facing = 1;
  run(w, 60, idle);
  assert.equal(e.facing, -1);
});

test('Boing Balls bounce along the ground and drop onto a shield from above', () => {
  const rows = flat(40);
  put(rows, 10, 11, 'b');
  const w = worldFrom(rows, { mode: 'dad' });
  const e = w.enemies[0];
  e.p.speed = 0;
  e.p.faceYou = 0;
  e.facing = -1;
  settle(w, 5);
  w.collect({ kind: 'boing' });
  const ev = events(w, 'boing', 'cheer');
  fireOnce(w);
  run(w, 80, idle);
  assert.ok(count(ev, 'boing') >= 1, 'bounced');
  assert.equal(count(ev, 'cheer'), 1, 'got past the shield');
});

// --------------------------------------------------------------------------------- Charger
test('Charger (Dad): paws the ground, charges, and is dizzy after a wall', () => {
  const rows = flat(40);
  put(rows, 10, 14, 'c');
  for (const r of [9, 10]) put(rows, r, 1, '#');
  const w = worldFrom(rows, { mode: 'dad' });
  const e = w.enemies[0];
  const states = new Set();
  w.player.reset(6, w.player.y);
  for (let i = 0; i < 60 * 4; i++) {
    w.step(idle(), DT);
    w.player.invuln = 10; // keep him out of the way
    w.player.x = 6;
    if (e.alive) states.add(e.state);
  }
  assert.ok(['paw', 'rush', 'dizzy'].every((s) => states.has(s)), [...states].join(','));
});

test('Charger (Kid): just walks, no charging', () => {
  const rows = flat(40);
  put(rows, 10, 14, 'c');
  const w = worldFrom(rows, { mode: 'kid' });
  noAuto(w);
  const states = new Set();
  for (let i = 0; i < 60 * 3; i++) {
    w.step(idle(), DT);
    w.player.invuln = 10;
    states.add(w.enemies[0].state);
  }
  assert.ok(!states.has('rush'));
});

// -------------------------------------------------------------------------------- Frosty Ray
test('Frosty Ray: a frozen Grumbly is an ice block to stand on, then thaws', () => {
  const rows = flat(40);
  put(rows, 10, 5, 'w');
  const w = worldFrom(rows, { mode: 'dad' });
  const e = w.enemies[0];
  e.p.speed = 0;
  e.p.alertRange = 0;
  settle(w, 5);
  w.collect({ kind: 'frost' });
  const ev = events(w, 'freeze', 'thaw');
  fireOnce(w);
  run(w, 10, idle);
  assert.equal(count(ev, 'freeze'), 1);
  assert.ok(e.frozen > 0);
  // Stand on it.
  w.player.x = e.x;
  w.player.y = e.y - 2;
  w.player.vy = 0;
  run(w, 40, idle);
  assert.equal(w.player.riding, e);
  assert.equal(w.player.hearts, 3);
  run(w, 60 * 4, idle);
  assert.equal(count(ev, 'thaw'), 1);
});

test('Frosty Ray: kicking an ice block sends it sliding through other Grumblies, then it shatters', () => {
  const rows = flat(40);
  put(rows, 10, 8, 'w');
  put(rows, 10, 14, 'w');
  for (const r of [9, 10]) put(rows, r, 20, '#');
  const w = worldFrom(rows, { mode: 'dad' });
  for (const e of w.enemies) {
    e.p.speed = 0;
    e.p.alertRange = 0;
  }
  settle(w, 5);
  w.enemies[0].freeze(4);
  const ev = events(w, 'kick', 'cheer');
  run(w, 120, hold({ mx: 1 }));
  assert.equal(count(ev, 'kick'), 1);
  const hows = ev.filter(([t]) => t === 'cheer').map(([, e]) => e.how).sort();
  assert.deepEqual(hows, ['kick', 'shatter']);
});

// ---------------------------------------------------------------------------- Fizz Rockets
test('Fizz Rockets steer to a Grumbly off to the side and burst through a shield', () => {
  const rows = flat(40);
  put(rows, 4, 12, 'f');
  put(rows, 10, 12, 'b');
  const w = worldFrom(rows, { mode: 'dad' });
  for (const e of w.enemies) {
    e.p.speed = 0;
    e.p.faceYou = 0;
    e.p.swoop = false;
  }
  settle(w, 5);
  w.collect({ kind: 'rockets' });
  const ev = events(w, 'blast', 'cheer');
  fireOnce(w);
  run(w, 120, idle);
  assert.ok(count(ev, 'blast') >= 1);
  assert.ok(count(ev, 'cheer') >= 1);
});

// ---------------------------------------------------------------------------- power-ups
test('Zoom Boots: faster running for a while', () => {
  const w = worldFrom(flat(80), { mode: 'kid' });
  settle(w);
  w.collect({ kind: 'zoom' });
  run(w, 30, hold({ mx: 1 }));
  assert.ok(w.player.vx > tuningFor('kid').runSpeed * 1.3);
});

test('Magnet Collar: stars far away fly to Turbo; and power-ups replace each other', () => {
  const rows = flat(40);
  put(rows, 7, 6, '*');
  const w = worldFrom(rows, { mode: 'dad' });
  settle(w);
  w.collect({ kind: 'magnet' });
  run(w, 60, idle);
  assert.equal(w.starsGot, 1);
  w.collect({ kind: 'giant' });
  assert.equal(w.player.magnet, 0);
  assert.ok(w.player.giant > 0);
});

test('Heart Treat: one more heart for good in Dad Mode (up to 5), remembered next time', () => {
  const rows = flat(40);
  put(rows, 10, 6, 'T');
  const w = worldFrom(rows, { mode: 'dad' });
  const ev = events(w, 'treat');
  run(w, 60, hold({ mx: 1 }));
  assert.equal(count(ev, 'treat'), 1);
  assert.equal(w.player.maxHearts, 4);
  const id = w.results().treats[0];
  const again = new World({ id: 'test', sections: [{ rows }] }, { mode: 'dad', tune: tuningFor('dad'), treats: [id] });
  assert.equal(again.player.maxHearts, 4);
  assert.ok(again.items.find((i) => i.kind === 'treat').got, 'already eaten');
});

// ---------------------------------------------------------------------------- double jump
test('double jump: a second jump in the air once it is unlocked, none before', () => {
  for (const unlocked of [false, true]) {
    const def = { id: 'dj', sections: [{ rows: flat(40) }] };
    const w = new World(def, { mode: 'dad', tune: tuningFor('dad'), abilities: { doubleJump: unlocked } });
    settle(w);
    const ev = events(w, 'doubleJump');
    let top = w.player.feet;
    for (let i = 0; i < 90; i++) {
      w.step({ mx: 0, my: 0, jump: i < 70, jumpPressed: i === 0 || i === 22 }, DT);
      top = Math.min(top, w.player.feet);
    }
    assert.equal(count(ev, 'doubleJump'), unlocked ? 1 : 0);
    if (unlocked) assert.ok(11 - top > tuningFor('dad').jumpHeight + 1.5, `peak ${11 - top}`);
  }
});

// ----------------------------------------------------------------------------------- raft
function river() {
  const W = 50;
  const rows = flat(W);
  for (const r of [11, 12]) rows[r] = '#'.repeat(6) + '-'.repeat(W - 12) + '#'.repeat(6);
  put(rows, 11, 6, 'n');
  return rows;
}

test('the raft starts when Turbo stands on it and floats downriver', () => {
  const rows = river();
  const def = { id: 'raft', sections: [{ rows, params: { n: { w: 4, range: 36, speed: 3 } } }] };
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid') });
  const raft = w.platforms[0];
  run(w, 30, idle);
  assert.equal(raft.started, false);
  run(w, 90, hold({ mx: 1 }));
  run(w, 60, idle);
  assert.equal(raft.started, true);
  assert.equal(w.player.riding, raft);
  const x0 = w.player.x;
  run(w, 60, idle);
  assert.ok(w.player.x > x0 + 2.5, 'carried along');
});

test('falling off the raft into the river floats Turbo back onto the raft (and costs a heart in Dad Mode)', () => {
  for (const [mode, hearts] of [['kid', 3], ['dad', 2]]) {
    const rows = river();
    const def = { id: 'raft', sections: [{ rows, params: { n: { w: 4, range: 36, speed: 2 } } }] };
    const w = new World(def, { mode, tune: tuningFor(mode) });
    const raft = w.platforms[0];
    run(w, 150, (i, w) => ({ ...idle(), mx: w.player.riding === raft ? 0 : 1 }));
    run(w, 30, idle);
    assert.equal(w.player.riding, raft);
    // Run off the front of the raft into the water.
    const ev = events(w, 'splash', 'respawn');
    run(w, 60, hold({ mx: 1 }));
    run(w, 120, idle);
    assert.equal(count(ev, 'splash'), 1, mode);
    assert.equal(w.player.state, 'play');
    assert.equal(w.player.riding, raft, `${mode}: back on the raft`);
    assert.equal(w.player.hearts, hearts);
  }
});

test('Auto-Go on the raft: stands still, asks for a jump when a rock comes, and the jump keeps pace', () => {
  const rows = river();
  for (const r of [10, 11, 12]) put(rows, r, 22, 'r');
  const def = { id: 'raft', sections: [{ rows, params: { n: { w: 4, range: 36, speed: 2.8 } } }] };
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid'), autoGo: true });
  const raft = w.platforms[0];
  let i = 0;
  while (!raft.started && i++ < 400) w.step(idle(), DT);
  run(w, 30, idle);
  assert.equal(w.player.waiting, false, 'no hint while nothing is coming');
  const x0 = w.player.x - raft.x;
  run(w, 30, idle);
  assert.ok(Math.abs(w.player.x - raft.x - x0) < 0.01, 'stands still on the raft');
  i = 0;
  while (!w.player.waiting && i++ < 600) w.step(idle(), DT);
  assert.ok(w.player.waiting, 'a rock coming: jump!');
  run(w, 90, (k) => ({ ...idle(), jump: k < 15, jumpPressed: k === 0 }));
  run(w, 60, idle);
  assert.equal(w.rescues, 0);
  assert.equal(w.player.riding, raft);
});

// ---------------------------------------------------------------------- the mini-boss
function arenaRows(boss) {
  const W = 30;
  const rows = flat(W);
  for (const r of [7, 8, 9, 10]) {
    put(rows, r, 0, '#');
    put(rows, r, W - 1, '#');
  }
  put(rows, 10, 22, boss);
  rows[10] = rows[10].replace('>', '.');
  put(rows, 10, 15, '>');
  return rows;
}

test('Big Bonker (Dad): three hits with a moment of safety between, and slams send shockwaves', () => {
  const w = worldFrom(arenaRows('M'), { mode: 'dad' });
  const e = w.enemies[0];
  w.player.reset(12, w.player.y);
  const ev = events(w, 'slam', 'cheer', 'enemyHit');
  // let it slam once
  for (let i = 0; i < 60 * 5; i++) {
    w.step(idle(), DT);
    w.player.invuln = 10;
  }
  assert.ok(count(ev, 'slam') >= 1);
  assert.ok(w.enemyShots.count >= 0);
  w.damageBoss(e, 1);
  w.damageBoss(e, 1); // ignored: still safe
  assert.equal(e.hp, 2);
  e.safe = 0;
  w.damageBoss(e, 1);
  e.safe = 0;
  w.damageBoss(e, 1);
  assert.equal(e.alive, false);
  assert.equal(w.minibossBeaten, true);
});

test('a shockwave hurts Turbo standing in its way, not one who jumps it', () => {
  for (const jumps of [false, true]) {
    const w = worldFrom(flat(40), { mode: 'dad' });
    settle(w);
    const ev = events(w, 'hurt');
    w.spawnWave(w.player.cx + 4, w.player.feet, -1, 5);
    for (let i = 0; i < 90; i++) w.step({ ...idle(), jump: jumps && i > 20 && i < 45, jumpPressed: jumps && i === 21 }, DT);
    assert.equal(count(ev, 'hurt'), jumps ? 0 : 1, jumps ? 'jumped' : 'stood');
  }
});

// ------------------------------------------------------------------------- Tiki Tumble
function bossLevel() {
  const W = 34;
  const a = flat(10);
  const b = arenaRows('Z').map((r) => r.slice(0, 24).replace('S', '.'));
  for (const r of [7, 8, 9]) a[r] = a[r].slice(0, 9) + '.';
  a[10] = a[10].replace('>', '.');
  return { id: 'boss', sections: [{ rows: a }, { rows: b.map((r, i) => (i === 10 ? r.replace('>', '.') : r)), arena: true }], W };
}

test('Tiki Tumble sleeps until Turbo comes in, then hops, thumps (shockwaves) and gets dizzy', () => {
  const def = bossLevel();
  def.sections[1].rows[10] = def.sections[1].rows[10].slice(0, 10) + '>' + def.sections[1].rows[10].slice(11);
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid') });
  const b = w.boss;
  assert.ok(b && b.blocks === 3);
  run(w, 60, idle);
  assert.equal(b.state, 'sleep');
  const ev = events(w, 'bossWake', 'slam', 'arena');
  w.player.reset(13, w.player.y);
  const states = new Set();
  for (let i = 0; i < 60 * 8; i++) {
    w.step(idle(), DT);
    w.player.invuln = 10;
    states.add(b.state);
  }
  assert.equal(count(ev, 'bossWake'), 1);
  assert.equal(count(ev, 'arena'), 1);
  assert.ok(['crouch', 'hop', 'dizzy'].every((s) => states.has(s)), [...states].join(','));
  assert.ok(count(ev, 'slam') >= 1);
});

test('Tiki Tumble: only the weak spot while dizzy counts; each hit pops a block; then the goal opens', () => {
  const def = bossLevel();
  def.sections[1].rows[10] = def.sections[1].rows[10].slice(0, 10) + '>' + def.sections[1].rows[10].slice(11);
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid') });
  const b = w.boss;
  const ev = events(w, 'bossHit', 'bossDefeated', 'goalAppear');
  assert.equal(w.goalOpen, false);
  b.setState('idle');
  w.hitBoss();
  assert.equal(b.blocks, 3, 'not while it is not dizzy');
  for (let k = 0; k < 3; k++) {
    b.setState('dizzy');
    w.hitBoss();
  }
  assert.equal(count(ev, 'bossHit'), 3);
  assert.equal(count(ev, 'bossDefeated'), 1);
  assert.equal(w.goalOpen, true);
  assert.equal(w.results().ability, 'doubleJump');
});

test('Tiki Tumble: Kid Mode keeps lost blocks after a faint; Dad Mode starts it whole again', () => {
  for (const [mode, left] of [['kid', 2], ['dad', 4]]) {
    const def = bossLevel();
    def.sections[1].rows[10] = def.sections[1].rows[10].slice(0, 10) + '>' + def.sections[1].rows[10].slice(11);
    const w = new World(def, { mode, tune: tuningFor(mode) });
    w.player.reset(14, w.player.y);
    run(w, 30, idle);
    const b = w.boss;
    b.setState('dizzy');
    w.hitBoss();
    w.player.hearts = 1;
    w.player.invuln = 0;
    w.hurtPlayer(0);
    assert.equal(b.blocks, left, mode);
  }
});

test('Kid auto-fire hits the weak spot while Tiki Tumble is dizzy', () => {
  const def = bossLevel();
  def.sections[1].rows[10] = def.sections[1].rows[10].slice(0, 10) + '>' + def.sections[1].rows[10].slice(11);
  const w = new World(def, { mode: 'kid', tune: tuningFor('kid') });
  const b = w.boss;
  w.player.reset(b.cx - 5, w.player.y);
  run(w, 10, idle);
  b.setState('dizzy');
  b.p.dizzy = 99;
  run(w, 60, idle);
  assert.ok(b.blocks < 3);
});

// ------------------------------------------------------------------------------- badges
test('badges: no-hit, all gems, under par and paws only', () => {
  const rows = flat(30);
  put(rows, 10, 8, '1');
  const def = { id: 'b', par: 60, sections: [{ rows }] };
  const w = new World(def, { mode: 'dad', tune: tuningFor('dad') });
  let i = 0;
  while (!w.won && i++ < 600) w.step(hold({ mx: 1 })(), DT);
  assert.ok(w.won);
  assert.deepEqual(w.results().badges.sort(), ['allGems', 'noHit', 'pawsOnly', 'underPar']);
});
