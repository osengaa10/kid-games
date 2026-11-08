import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATIENTS, ORDER, pickWaiting } from '../js/patients.js';
import { rig, hotspots, inside, partAt, defaultPose, standingHeight, standingTop, FEET_Y } from '../js/rig.js';
import { ROOM } from '../js/layout.js';
import { rng } from '../js/rng.js';

const SPOTS = ['forehead', 'mouth', 'chest', 'tummy', 'earL', 'earR', 'arm', 'kneeL', 'kneeR', 'headTop'];

test('every patient has a name, a voice, a heart rate and every line it needs', () => {
  const names = new Set();
  for (const id of ORDER) {
    const sp = PATIENTS[id];
    assert.equal(sp.id, id);
    names.add(sp.name);
    assert.ok(sp.bpm >= 30 && sp.bpm <= 220, id);
    assert.ok(sp.pitch >= 0.5 && sp.pitch <= 2, id);
    for (const k of ['hello', 'thanks', 'nervous', 'ouch', 'notBad', 'brave', 'giggle', 'cold', 'whoa', 'big', 'ahh', 'hi', 'bye']) assert.ok(typeof sp[k] === 'string' && sp[k].length, `${id}.${k}`);
  }
  assert.equal(names.size, ORDER.length, 'names are all different');
  // the bunny's heart races and the elephant's thumps
  assert.ok(PATIENTS.bunny.bpm > PATIENTS.puppy.bpm && PATIENTS.puppy.bpm > PATIENTS.elephant.bpm);
});

for (const id of ORDER) {
  test(`${id}: every tool spot is on the patient, sitting and standing, ears lifted or not`, () => {
    const sp = PATIENTS[id];
    const poses = [
      ['sitting', defaultPose()],
      ['standing', { ...defaultPose(), stand: 1 }],
      ['ears lifted', { ...defaultPose(), earLift: [1, 1] }],
      ['deep breath, head tilted', { ...defaultPose(), puff: 1, tilt: 0.1 }],
      ['sick: drooping, holding the tummy', { ...defaultPose(), droop: 1, arm: [-0.95, 0] }],
    ];
    for (const [name, pose] of poses) {
      const r = rig(sp, pose);
      const hs = hotspots(sp, r);
      for (const k of SPOTS) assert.ok(hs[k], `${k} missing`);
      for (const k of SPOTS) {
        if (k === 'headTop' || k === 'forehead') continue;
        if (name === 'standing' && k.startsWith('knee')) continue;
        assert.ok(inside(r, hs[k].x, hs[k].y), `${name}: ${k} at ${hs[k].x.toFixed(2)},${hs[k].y.toFixed(2)} is off the patient`);
      }
      const f = hs.forehead;
      for (const x of [f.x0, f.x, f.x1]) assert.ok(inside(r, x, f.y), `${name}: forehead`);
      // the forehead is above the eyes and the mouth below them
      assert.ok(f.y < hs.mouth.y && hs.mouth.y < hs.chest.y && hs.chest.y < hs.tummy.y);
      // left is left
      assert.ok(hs.earL.x < hs.earR.x && hs.kneeL.x < hs.kneeR.x);
    }
  });

  test(`${id}: fits under the height chart and on the exam table`, () => {
    const sp = PATIENTS[id];
    assert.ok(standingTop(sp) < ROOM.chartH - ROOM.scaleH - 0.3, `standing top ${standingTop(sp)}`);
    assert.ok(standingHeight(sp) < standingTop(sp) + 1e-9);
    const r = rig(sp, defaultPose());
    const top = Math.min(r.head.y - r.head.ry, ...r.ears.map((e) => (e.k === 'el' ? e.cy - Math.max(e.rx, e.ry) : Math.min(...e.pts.map((p) => p[1])))));
    assert.ok(-top < ROOM.sitTop, `sitting top ${-top}`);
    // dangling feet stay above the floor
    assert.ok(FEET_Y * sp.size < ROOM.seatH);
  });
}

test('a mega kick swings the shin up and out, and the knee spot follows it', () => {
  const sp = PATIENTS.puppy;
  const a = hotspots(sp, rig(sp, defaultPose()));
  const r = rig(sp, { ...defaultPose(), kick: [0, 2] });
  const b = hotspots(sp, r);
  assert.ok(r.legs[1].ankle.x > a.kneeR.x + 0.5, 'the right foot goes out to the right');
  assert.ok(r.legs[1].ankle.y < 1, 'and up');
  assert.notDeepEqual(a.kneeR, b.kneeR);
  assert.deepEqual(a.kneeL, b.kneeL);
});

test('tapping the patient finds the nose, the head and the tummy', () => {
  const sp = PATIENTS.bear;
  const r = rig(sp, defaultPose());
  assert.equal(partAt(r, 0, -4.1 * sp.size), 'nose');
  assert.equal(partAt(r, 1.2 * sp.size, -5.3 * sp.size), 'head');
  assert.equal(partAt(r, 0, -1.0 * sp.size), 'tummy');
  assert.equal(partAt(r, 6, -1), null);
});

test('the waiting room puts an unfinished check-up first, then the patients seen least', () => {
  const seen = { puppy: 5, bunny: 0, bear: 2, kitty: 0, dino: 9, elephant: 1 };
  const w = pickWaiting(seen, 'dino', rng(3));
  assert.equal(w.length, 3);
  assert.equal(w[0], 'dino');
  assert.deepEqual(new Set(w.slice(1)), new Set(['bunny', 'kitty']));
  const fresh = pickWaiting(seen, null, rng(3));
  assert.deepEqual(new Set(fresh), new Set(['bunny', 'kitty', 'elephant']));
  assert.equal(new Set(pickWaiting({}, null, rng(9))).size, 3);
});
