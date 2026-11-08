import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, STEP_INFO, nextStep, isComplete, markDone } from '../js/checklist.js';

test('there are seven steps, in the order a real check-up goes, each with words to say', () => {
  assert.deepEqual(STEPS, ['measure', 'temp', 'heart', 'ears', 'ahh', 'reflex', 'shot']);
  for (const id of STEPS) {
    assert.ok(STEP_INFO[id].name && STEP_INFO[id].prompt && STEP_INFO[id].cheer && STEP_INFO[id].label, id);
  }
});

test('any order works, and the check-up is complete once every step is done', () => {
  let done = [];
  for (const id of [...STEPS].reverse()) {
    assert.equal(isComplete(done), false);
    done = markDone(done, id);
  }
  assert.equal(isComplete(done), true);
  assert.equal(nextStep(done), null);
});

test('the suggested next step follows the check-up order and skips done ones', () => {
  assert.equal(nextStep([]), 'measure');
  assert.equal(nextStep(['measure']), 'temp');
  assert.equal(nextStep(['measure', 'heart']), 'temp');
  assert.equal(nextStep(['measure', 'temp', 'heart', 'ears', 'ahh', 'reflex']), 'shot');
});

test('doing a step again does not count it twice, and unknown steps are ignored', () => {
  const once = markDone([], 'heart');
  assert.equal(markDone(once, 'heart'), once);
  assert.deepEqual(markDone(once, 'juggling'), ['heart']);
});
