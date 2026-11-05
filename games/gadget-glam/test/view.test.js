import test from 'node:test';
import assert from 'node:assert/strict';
import { clampView, pinchView, zoomAt, zoomOf, MAX_ZOOM } from '../js/view.js';
import { faceMatrix, facing, unproject, depthDir } from '../js/view3d.js';

const fit = { scale: 0.5, ox: 100, oy: 50 };
const rect = { x: 0, y: 0, w: 1000, h: 800 };
const frame = { x: 0, y: 0, w: 1000, h: 1400 };
const toUnits = (v, [x, y]) => [(x - v.ox) / v.scale, (y - v.oy) / v.scale];
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('pinching keeps the spot under the fingers in place', () => {
  const m = [400, 300];
  const before = toUnits(fit, m);
  const v = pinchView(fit, m, 100, m, 200, fit, rect, frame);
  close(zoomOf(v, fit), 2);
  const after = toUnits(v, m);
  close(after[0], before[0]);
  close(after[1], before[1]);
});

test('two fingers moving together pan the case', () => {
  const zoomed = pinchView(fit, [500, 400], 100, [500, 400], 200, fit, rect, frame);
  const v = pinchView(zoomed, [500, 400], 100, [450, 380], 100, fit, rect, frame);
  close(v.ox, zoomed.ox - 50);
  close(v.oy, zoomed.oy - 20);
});

test('zoom stays between the fitted size and the most', () => {
  assert.deepEqual(pinchView(fit, [0, 0], 100, [0, 0], 20, fit, rect, frame), fit);
  close(zoomOf(pinchView(fit, [0, 0], 10, [0, 0], 1000, fit, rect, frame), fit), MAX_ZOOM);
  close(zoomOf(zoomAt(fit, [300, 300], 1.5, fit, rect, frame), fit), 1.5);
});

test('the middle of the case is never pushed off screen', () => {
  const zoomed = { scale: 1, ox: -5000, oy: 9000 };
  const v = clampView(zoomed, fit, rect, frame);
  const cx = v.ox + (frame.x + frame.w / 2) * v.scale;
  const cy = v.oy + (frame.y + frame.h / 2) * v.scale;
  assert.ok(cx >= rect.x && cx <= rect.x + rect.w);
  assert.ok(cy >= rect.y && cy <= rect.y + rect.h);
});

test('3D: straight on, nothing changes; turned halfway, it shows its back', () => {
  assert.deepEqual(faceMatrix(0, 0, 25).map((n) => Math.round(n * 1e9) / 1e9 + 0), [1, 0, 0, 1, 0, 0]);
  close(facing(0, 0), 1);
  close(facing(Math.PI, 0), -1);
  assert.ok(facing(Math.PI / 2 - 0.01, 0) > 0 && facing(Math.PI / 2 + 0.01, 0) < 0);
  // A quarter turn: the face is edge on, and the thickness runs sideways.
  close(faceMatrix(Math.PI / 2, 0, 0)[0], 0);
  close(depthDir(Math.PI / 2, 0)[0], 1);
});

test('3D: a tap on a turned case finds the spot it landed on', () => {
  for (const [yaw, pitch] of [[0.4, 0.2], [-0.9, -0.3], [2.6, 0.5]]) {
    const m = faceMatrix(yaw, pitch, 20);
    const [x, y] = [37, -112];
    const X = m[0] * x + m[2] * y + m[4];
    const Y = m[1] * x + m[3] * y + m[5];
    const back = unproject(m, X, Y);
    close(back[0], x, 1e-6);
    close(back[1], y, 1e-6);
  }
  assert.equal(unproject(faceMatrix(Math.PI / 2, 0, 0), 5, 5), null);
});
