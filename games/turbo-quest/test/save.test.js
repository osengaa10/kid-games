import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, KEY, defaultSave, migrate } from '../js/engine/save.js';

// An in-memory stand-in for localStorage.
function memory(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    map: m,
  };
}

const result = (over = {}) => ({ level: 'w1-1', mode: 'kid', stars: 40, starsTotal: 82, gems: [true, false, false], time: 150, score: 9000, medal: 0, noHit: false, kinds: ['waddler', 'hopper'], ...over });

test('a fresh store has two players and nothing chosen yet', () => {
  const s = new Store(memory());
  assert.equal(s.data.lastProfile, null);
  assert.equal(s.profile('kid').mode, 'kid');
  assert.equal(s.profile('dad').mode, 'dad');
  assert.deepEqual(s.profile('kid').unlocked, ['w1-1']);
});

test('saves and loads back', () => {
  const mem = memory();
  const a = new Store(mem);
  a.choose('dad');
  a.profile('dad').leftHanded = true;
  a.flush();
  const b = new Store(mem);
  assert.equal(b.data.lastProfile, 'dad');
  assert.equal(b.profile('dad').leftHanded, true);
});

test('a finished level keeps the best per mode, all gems ever found, and adds stars and stickers', () => {
  const s = new Store(memory());
  const r1 = s.recordResult('kid', result());
  assert.deepEqual(r1.firstStickers, ['waddler', 'hopper']);
  s.recordResult('kid', result({ stars: 30, gems: [false, false, true], kinds: ['waddler', 'flapper'] }));
  const p = s.profile('kid');
  assert.deepEqual(p.levels['w1-1'].gems, [true, false, true]);
  assert.equal(p.levels['w1-1'].best.kid.stars, 40);
  assert.equal(p.stars, 70);
  assert.deepEqual(p.stickers, { waddler: 2, hopper: 1, flapper: 1 });
  s.recordResult('kid', result({ mode: 'dad', score: 12000, medal: 1 }));
  assert.equal(p.levels['w1-1'].best.dad.score, 12000);
  assert.equal(p.levels['w1-1'].best.kid.stars, 40, 'switching mode keeps the other mode\'s best');
});

test('finishing a level clears the mid-level resume point', () => {
  const s = new Store(memory());
  s.setResume('kid', { level: 'w1-1', checkpoint: 3 });
  assert.equal(s.profile('kid').resume.checkpoint, 3);
  s.recordResult('kid', result());
  assert.equal(s.profile('kid').resume, null);
});

test('corrupt save: kept aside, and the backup is used', () => {
  const good = new Store(memory());
  good.recordResult('kid', result());
  const backup = good.storage.getItem(`${KEY}:backup`);
  const mem = memory({ [KEY]: '{not json', [`${KEY}:backup`]: backup });
  const s = new Store(mem);
  assert.equal(s.profile('kid').stars, 40);
  assert.equal(mem.getItem(`${KEY}:corrupt`), '{not json');
});

test('corrupt save with no backup starts fresh', () => {
  const s = new Store(memory({ [KEY]: '][' }));
  assert.deepEqual(s.data, defaultSave());
});

test('migration fills in anything missing and keeps what is there', () => {
  const m = migrate({ v: 0, profiles: { kid: { stars: 12, stickers: { waddler: 3 } } }, settings: { music: 0.2 } });
  assert.equal(m.v, 1);
  assert.equal(m.profiles.kid.stars, 12);
  assert.equal(m.profiles.kid.stickers.waddler, 3);
  assert.equal(m.profiles.kid.mode, 'kid');
  assert.equal(m.settings.music, 0.2);
  assert.equal(m.settings.sfx, 1);
  assert.equal(m.profiles.dad.mode, 'dad');
});

test('no storage at all (blocked): the game still works', () => {
  const s = new Store(null);
  s.choose('kid');
  s.flush();
  assert.equal(s.profile().id, 'kid');
});
