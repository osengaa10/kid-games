import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AILMENTS, AILMENT_IDS, pickAilment, sickLevel, betterLine, helloLine, Symptoms, SYMPTOM_MIN, restArm } from '../js/sickness.js';
import { STEPS } from '../js/checklist.js';
import { PATIENTS } from '../js/patients.js';
import { migrate, withVisit, defaultSave } from '../js/storage.js';
import { rng } from '../js/rng.js';

test('three illnesses, each with what the patient says and its own symptom', () => {
  assert.deepEqual(AILMENT_IDS, ['cold', 'fever', 'tummy']);
  for (const id of AILMENT_IDS) assert.ok(AILMENTS[id].hello && AILMENTS[id].narr && AILMENTS[id].symptom, id);
  assert.match(helloLine(PATIENTS.puppy, 'cold'), /Biscuit.*cold/);
  assert.equal(helloLine(PATIENTS.puppy, 'nonsense'), PATIENTS.puppy.hello);
});

test('every illness comes up', () => {
  const r = rng(5);
  const seen = new Set(Array.from({ length: 60 }, () => pickAilment(r)));
  assert.deepEqual([...seen].sort(), ['cold', 'fever', 'tummy']);
});

test('sick on arrival, a little better with every step, all better at the end', () => {
  assert.equal(sickLevel(0), 1);
  assert.equal(sickLevel(STEPS.length), 0);
  for (let n = 1; n <= STEPS.length; n++) assert.ok(sickLevel(n) < sickLevel(n - 1), `step ${n} helps`);
});

test('the patient says it feels better three times along the way, in order, and only once each', () => {
  const said = [];
  for (let n = 1; n <= STEPS.length; n++) {
    const line = betterLine(n - 1, n);
    if (line) said.push([n, line]);
  }
  assert.deepEqual(said.map(([n]) => n), [2, 5, 7]);
  assert.match(said[0][1], /little better/);
  assert.match(said[2][1], /all better/);
  assert.equal(betterLine(2, 3), null);
});

test('symptoms come now and then, more often when sicker, and stop when mostly better', () => {
  const count = (level, ail = 'cold') => {
    const s = new Symptoms(ail, rng(2));
    let n = 0;
    for (let t = 0; t < 120; t += 1 / 30) if (s.update(t, level)) n++;
    return n;
  };
  assert.equal(count(SYMPTOM_MIN - 0.01), 0);
  assert.ok(count(1) > count(0.5), 'sicker, more often');
  assert.ok(count(1) >= 8 && count(1) <= 25, `${count(1)} in two minutes`);
  const s = new Symptoms('fever', rng(1));
  let kinds = new Set();
  for (let t = 0; t < 60; t += 1 / 30) {
    const k = s.update(t, 1);
    if (k) kinds.add(k);
  }
  assert.deepEqual([...kinds], ['shiver']);
});

test('a sneeze winds up, snaps forward, then settles', () => {
  const s = new Symptoms('cold', rng(3));
  let t = 0;
  while (!s.update(t, 1)) t += 1 / 30;
  assert.equal(s.anim(t + 0.3).mood, 'achoo');
  assert.ok(s.anim(t + 0.3).headDy < 0);
  assert.equal(s.anim(t + 0.65).mood, 'sneeze');
  assert.ok(s.anim(t + 0.65).headDy > 0);
  assert.equal(s.anim(t + 1.5).mood, null);
});

test('a sore tummy gets held, and lets go as it gets better', () => {
  assert.ok(restArm(1, 'tummy') < -0.5);
  assert.equal(restArm(0, 'tummy'), 0);
  assert.equal(restArm(1, 'cold'), 0);
});

test('what the patient is sick with is saved with an unfinished check-up', () => {
  const d = withVisit(defaultSave(), { p: 'bunny', done: ['temp'], ail: 'fever' });
  assert.equal(d.visit.ail, 'fever');
  assert.equal(migrate(JSON.parse(JSON.stringify(d))).visit.ail, 'fever');
  assert.equal(migrate({ visit: { p: 'bunny', done: [], ail: 'plague' } }).visit.ail, undefined);
});
