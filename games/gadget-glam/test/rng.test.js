import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../js/rng.js';

test('the same seed gives the same numbers', () => {
  const a = rng(42);
  const b = rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('different seeds give different numbers, all in [0, 1)', () => {
  const a = rng(1);
  const b = rng(2);
  let same = 0;
  for (let i = 0; i < 100; i++) {
    const x = a();
    const y = b();
    assert.ok(x >= 0 && x < 1 && y >= 0 && y < 1);
    if (x === y) same++;
  }
  assert.ok(same < 3);
});
