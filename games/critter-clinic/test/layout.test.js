import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examLayout, waitingLayout, ROOM } from '../js/layout.js';
import { PATIENTS, ORDER } from '../js/patients.js';
import { standingTop } from '../js/rig.js';

const SIZES = [
  ['iPad sideways', 1180, 820],
  ['iPad upright', 820, 1180],
  ['iPad mini sideways', 1133, 744],
  ['older iPad', 1024, 768],
  ['iPad Pro upright', 1024, 1366],
  ['phone upright', 390, 844],
  ['phone sideways', 844, 390],
];

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const sitBox = (L) => ({ x: L.table.x - 2.6 * L.u, y: L.table.y - ROOM.sitTop * L.u, w: 5.2 * L.u, h: (ROOM.sitTop + 2) * L.u });

for (const [name, w, h] of SIZES) {
  test(`exam room, ${name}: tray, clipboard, monitor and patient don't overlap and stay on screen`, () => {
    const L = examLayout(w, h);
    const home = { x: L.home.x, y: L.home.y, w: L.home.s, h: L.home.s };
    const parts = { tray: L.tray, clip: L.clip, monitor: L.monitor, patient: sitBox(L), home };
    const keys = Object.keys(parts);
    for (let i = 0; i < keys.length; i++) {
      const p = parts[keys[i]];
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= w + 0.5 && p.y + p.h <= h + 0.5, `${keys[i]} off screen`);
      for (let j = i + 1; j < keys.length; j++) assert.ok(!overlap(p, parts[keys[j]]), `${keys[i]} overlaps ${keys[j]}`);
    }
    // the clipboard has room for its eight boxes
    assert.ok(L.clip.box * 8 + L.clip.head <= L.clip.h, 'clipboard boxes fit');
  });

  test(`exam room, ${name}: the tallest patient fits under the chart, standing on the scale`, () => {
    const L = examLayout(w, h);
    for (const id of ORDER) {
      const top = L.scale.y - standingTop(PATIENTS[id]) * L.u;
      assert.ok(top >= L.chart.top - 1, `${id} pokes out of the top of the chart`);
      assert.ok(top >= 0, `${id} off the top of the screen`);
    }
    // the scale is above the tray, so feet on it can be seen
    assert.ok(L.scale.y < L.tray.y);
  });

  test(`waiting room, ${name}: three chairs on screen`, () => {
    const W = waitingLayout(w, h);
    assert.equal(W.chairs.length, 3);
    for (const c of W.chairs) {
      assert.ok(c.x - 3.9 * W.u >= -1 && c.x + 3.9 * W.u <= w + 1, 'an elephant fits on every chair');
      assert.ok(c.y - 8.6 * W.u > 0, 'heads on screen');
    }
  });
}

test('tray buttons are big enough for small fingers on an iPad', () => {
  for (const [name, w, h] of SIZES.filter(([n]) => n.includes('iPad'))) {
    const L = examLayout(w, h);
    assert.ok(L.tray.slot >= 64, `${name}: ${L.tray.slot}px`);
    assert.ok(L.clip.box >= 40, `${name}: clipboard box ${L.clip.box}px`);
  }
});

test('safe-area insets push things in from the edges', () => {
  const a = examLayout(1180, 820);
  const b = examLayout(1180, 820, { t: 24, r: 0, b: 20, l: 0 });
  assert.ok(b.home.y > a.home.y && b.tray.y < a.tray.y);
});
