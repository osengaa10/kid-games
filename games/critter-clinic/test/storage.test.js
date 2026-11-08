import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, load, store, migrate, defaultSave, withVisit, finishVisit, BOOK_MAX } from '../js/storage.js';

function memory(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('an empty, missing or broken save starts fresh', () => {
  assert.deepEqual(load(memory()), defaultSave());
  assert.deepEqual(load(null), defaultSave());
  assert.deepEqual(load(memory({ [KEY]: '{oops' })), defaultSave());
  assert.deepEqual(load({ getItem: () => { throw new Error('no'); } }), defaultSave());
  assert.deepEqual(migrate('nonsense'), defaultSave());
});

test('a save round-trips', () => {
  const s = memory();
  let d = defaultSave();
  d = withVisit(d, { p: 'bunny', done: ['temp', 'heart'], shot: { stage: 'needle', bandage: null } });
  d = finishVisit(d, 'puppy', '🦄', 123);
  assert.ok(store(s, d));
  assert.deepEqual(load(s), d);
  assert.equal(store({ setItem: () => { throw new Error('full'); } }, d), false);
});

test('finishing a check-up puts the sticker first in the book and counts the patient', () => {
  let d = withVisit(defaultSave(), { p: 'bear', done: ['measure'] });
  d = finishVisit(d, 'bear', '⭐', 1);
  d = finishVisit(d, 'bear', '🚀', 2);
  assert.deepEqual(d.book.map((b) => b.e), ['🚀', '⭐']);
  assert.equal(d.seen.bear, 2);
  assert.equal(d.visit, null);
});

test('the sticker book keeps the newest stickers when it is full', () => {
  let d = defaultSave();
  for (let i = 0; i < BOOK_MAX + 25; i++) d = finishVisit(d, 'kitty', '⭐', i);
  assert.equal(d.book.length, BOOK_MAX);
  assert.equal(d.book[0].t, BOOK_MAX + 24);
});

test('partial and damaged saves keep what they can', () => {
  const d = migrate({
    book: [{ e: '⭐', p: 'puppy', t: 5 }, { e: 42 }, null, { e: '🐸', p: 'dino' }],
    seen: { puppy: 3, bunny: -2, dragon: 4, bear: 'lots' },
    visit: { p: 'puppy', done: ['temp', 'temp', 'juggle', 'shot'], shot: { stage: 'wipe' } },
  });
  assert.deepEqual(d.book, [{ e: '⭐', p: 'puppy', t: 5 }, { e: '🐸', p: 'dino', t: 0 }]);
  assert.deepEqual(d.seen, { puppy: 3 });
  assert.deepEqual(d.visit.done, ['temp', 'shot']);
  assert.equal(d.visit.shot.stage, 'done', 'a finished shot keeps its bandage');
  assert.equal(migrate({ visit: { p: 'dragon', done: [] } }).visit, null);
});

test('a check-up saved half-way through pushing the plunger comes back with the needle ready', () => {
  const d = migrate({ visit: { p: 'bunny', done: [], shot: { stage: 'push', bandage: null } } });
  assert.equal(d.visit.shot.stage, 'needle');
  assert.equal(migrate({ visit: { p: 'bunny', done: [], shot: { stage: 'flying' } } }).visit.shot, null);
});
