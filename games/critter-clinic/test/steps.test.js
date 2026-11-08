import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newStep, updateStep, toolOf, progress, TEMP_BINS, EAR_TIME, AHH_TIME, PUSH_TIME, OUCH_AT, RUB, TOOL_SPOTS, STICKY } from '../js/steps.js';
import { PATIENTS, ORDER } from '../js/patients.js';
import { rng } from '../js/rng.js';

const DT = 1 / 60;

// Runs a step for `secs` seconds with the same input every frame; returns every event.
function run(st, input, secs) {
  const out = [];
  for (let t = 0; t < secs; t += DT) out.push(...updateStep(st, typeof input === 'function' ? input(t) : input, DT));
  return out;
}
const types = (evs) => evs.map((e) => e.type);
// Exactly n frames.
function frames(st, input, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(...updateStep(st, input, DT));
  return out;
}

test('thermometer: done after sweeping three quarters of the forehead, not before, and not off it', () => {
  const st = newStep('temp', PATIENTS.puppy);
  run(st, { spot: null, along: 0.5 }, 2);
  assert.equal(st.covered, 0);
  run(st, (t) => ({ spot: 'forehead', along: Math.min(0.6, t) }), 1);
  assert.equal(st.done, false);
  const evs = run(st, (t) => ({ spot: 'forehead', along: 0.6 + t }), 0.5);
  assert.equal(st.done, true);
  assert.ok(types(evs).includes('done'));
  assert.ok(st.covered >= TEMP_BINS * 0.75);
});

test('thermometer: one fast swipe that skips over the middle still counts all of it', () => {
  const st = newStep('temp', PATIENTS.puppy);
  updateStep(st, { spot: 'forehead', along: 0.02 }, DT);
  const evs = updateStep(st, { spot: 'forehead', along: 0.98 }, DT);
  assert.equal(st.done, true);
  assert.equal(types(evs).filter((t) => t === 'beep').length, TEMP_BINS - 1);
});

test('stethoscope: three heartbeats on the chest, at the species heart rate', () => {
  for (const id of ORDER) {
    const sp = PATIENTS[id];
    const st = newStep('heart', sp);
    const at = [];
    for (let i = 0; i < 60 * 8 && !st.done; i++) for (const e of updateStep(st, { spot: 'chest' }, DT)) if (e.type === 'beat') at.push(i * DT);
    assert.equal(st.done, true, id);
    assert.ok(at.length >= 3, `${id}: ${at.length} beats`);
    assert.ok(at[0] < 0.3, 'the first beat comes right away');
    for (let k = 1; k < at.length; k++) assert.ok(Math.abs(at[k] - at[k - 1] - 60 / sp.bpm) <= DT * 1.5, `${id}: beat ${k} gap`);
  }
});

test('stethoscope: nothing counts off the chest; the tummy gurgles and giggles once', () => {
  const st = newStep('heart', PATIENTS.bunny);
  const evs = run(st, { spot: 'tummy' }, 5);
  assert.equal(st.done, false);
  assert.equal(st.beats, 0);
  assert.ok(types(evs).filter((t) => t === 'gurgle').length >= 3);
  assert.equal(types(evs).filter((t) => t === 'giggle').length, 1);
});

test('stethoscope: a racing bunny heart still takes a couple of seconds', () => {
  const st = newStep('heart', PATIENTS.bunny);
  run(st, { spot: 'chest' }, 1.5);
  assert.equal(st.done, false);
  run(st, { spot: 'chest' }, 1.6);
  assert.equal(st.done, true);
});

test('ear camera: needs a look in each ear; time in one ear is kept if he wanders off', () => {
  const st = newStep('ears', PATIENTS.puppy, rng(1));
  run(st, { spot: 'earL' }, EAR_TIME * 0.6);
  run(st, { spot: null }, 1);
  const a = run(st, { spot: 'earL' }, EAR_TIME * 0.5);
  assert.deepEqual(st.seen, [true, false]);
  assert.ok(a.some((e) => e.type === 'ear' && e.other === 1));
  run(st, { spot: 'earL' }, 3);
  assert.equal(st.done, false);
  const b = run(st, { spot: 'earR' }, EAR_TIME + 0.1);
  assert.equal(st.done, true);
  assert.ok(types(b).includes('done'));
});

test('ear camera: the peek-a-boo surprise comes out the same for the same seed', () => {
  const pick = (seed) => newStep('ears', PATIENTS.puppy, rng(seed)).surprise;
  for (let s = 1; s < 20; s++) assert.equal(pick(s), pick(s));
  const all = Array.from({ length: 400 }, (_, s) => pick(s + 1));
  const share = all.filter((x) => x >= 0).length / all.length;
  assert.ok(share > 0.2 && share < 0.4, `surprise share ${share}`);
  // when there is one, it waves after half a second in that ear
  const s = Array.from({ length: 50 }, (_, i) => i + 1).find((i) => pick(i) === 0);
  const st = newStep('ears', PATIENTS.puppy, rng(s));
  assert.ok(types(run(st, { spot: 'earL' }, 0.7)).includes('surprise'));
});

test('say ahh: two seconds at the mouth; the mouth opens and closes with the light', () => {
  const st = newStep('ahh', PATIENTS.bear);
  assert.deepEqual(types(run(st, { spot: 'mouth' }, 0.5)), ['open']);
  assert.deepEqual(types(run(st, { spot: null }, 0.2)), ['close']);
  run(st, { spot: 'mouth' }, AHH_TIME - 0.5 + 0.05);
  assert.equal(st.done, true);
});

test('reflex hammer: a tap on each knee; holding still taps again; about one in four is a mega kick', () => {
  const st = newStep('reflex', PATIENTS.puppy, rng(7));
  const a = run(st, { spot: 'kneeL' }, 2.5);
  assert.ok(a.filter((e) => e.type === 'tap' && e.side === 0).length >= 2, 'taps again while held there');
  assert.equal(st.done, false);
  // moving straight over: the second knee taps as soon as the hammer has swung back
  run(st, { spot: 'kneeR' }, 0.6);
  run(st, { spot: null }, 1);
  assert.equal(st.done, true);
  let megas = 0;
  let taps = 0;
  for (let s = 1; s <= 200; s++) {
    const r = newStep('reflex', PATIENTS.puppy, rng(s));
    for (const e of run(r, (t) => ({ spot: t < 0.3 ? 'kneeL' : 'kneeR' }), 0.6)) {
      if (e.type === 'tap') {
        taps++;
        megas += e.mega ? 1 : 0;
      }
    }
  }
  assert.ok(megas / taps > 0.15 && megas / taps < 0.35, `mega share ${megas / taps}`);
});

test('shot: wipe, then the needle, then hold to push, then a bandage, always in that order', () => {
  const st = newStep('shot', PATIENTS.puppy);
  assert.equal(toolOf(st), 'cotton');
  // the needle does nothing before the arm is clean, and the plunger can't be pushed yet
  assert.deepEqual(types(run(st, { spot: 'arm', pressing: true }, 1)), ['cold']);
  assert.equal(st.stage, 'wipe');
  const w = frames(st, { spot: 'arm', rub: RUB / 20 + 1e-6 }, 20);
  assert.deepEqual(types(w), ['clean']);
  assert.equal(st.stage, 'needle');
  assert.equal(toolOf(st), 'syringe');
  assert.deepEqual(types(run(st, { spot: 'arm' }, DT)), ['poke']);
  assert.equal(st.stage, 'push');
  const p = run(st, { spot: 'arm', pressing: true }, PUSH_TIME + 0.1);
  assert.deepEqual(types(p), ['ouch', 'pushed']);
  assert.equal(toolOf(st), 'bandage');
  assert.deepEqual(types(updateStep(st, { placed: 'dinos' }, DT)), ['bandaged', 'done']);
  assert.equal(st.bandage, 'dinos');
});

test('shot: letting go of the plunger only pauses it, it never goes back', () => {
  const st = newStep('shot', PATIENTS.puppy);
  st.stage = 'push';
  run(st, { spot: 'arm', pressing: true }, PUSH_TIME * 0.5);
  const half = st.push;
  assert.ok(half > OUCH_AT && half < 0.6);
  run(st, { spot: 'arm', pressing: false }, 3);
  assert.equal(st.push, half);
  run(st, { spot: null, pressing: true }, 3); // pulled off the arm: no pushing into thin air
  assert.equal(st.push, half);
  const evs = run(st, { spot: 'arm', pressing: true }, PUSH_TIME);
  assert.ok(!types(evs).includes('ouch'), 'only one ouch');
  assert.equal(st.stage, 'bandage');
});

test('height bar: done the moment it touches the head, only once the patient is on the scale', () => {
  const st = newStep('measure', PATIENTS.dino);
  assert.deepEqual(updateStep(st, { touch: true }, DT), []);
  st.stage = 'bar';
  assert.deepEqual(updateStep(st, { touch: false }, DT), []);
  assert.deepEqual(types(updateStep(st, { touch: true }, DT)), ['touch', 'done']);
  assert.deepEqual(updateStep(st, { touch: true }, DT), []);
});

test('progress only ever goes up, and every tool knows its spots', () => {
  const st = newStep('ahh', PATIENTS.puppy);
  let last = 0;
  for (let i = 0; i < 200; i++) {
    updateStep(st, { spot: i % 3 ? 'mouth' : null }, DT);
    const p = progress(st);
    assert.ok(p >= last);
    last = p;
  }
  for (const kind of ['temp', 'heart', 'ears', 'ahh', 'reflex', 'cotton', 'syringe', 'bandage']) assert.ok(TOOL_SPOTS[kind].length > 0, kind);
  assert.ok(STICKY.has('heart') && !STICKY.has('reflex'));
});
