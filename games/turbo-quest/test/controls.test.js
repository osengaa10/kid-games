import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutControls, hitControls, TouchControls } from '../js/engine/controls.js';

const W = 1180;
const H = 820;
const item = (layout, id) => layout.items.find((i) => i.id === id);

function controls(scheme, opts) {
  const c = new TouchControls();
  c.setLayout(layoutControls(scheme, W, H, opts));
  return c;
}

test('kid: the arrows and jump are where the plan puts them, big enough for small thumbs', () => {
  const L = layoutControls('kid', W, H);
  const left = item(L, 'left');
  const right = item(L, 'right');
  const jump = item(L, 'jump');
  assert.ok(left.cx < right.cx && right.cx < W * 0.4);
  assert.ok(jump.cx > W * 0.8 && jump.cy > H * 0.7);
  assert.equal(left.r * 2, 120);
  assert.equal(right.r * 2, 150);
  assert.equal(jump.r * 2, 180);
  // Everything is at least 24 pt from the edges.
  for (const it of L.items) {
    assert.ok(it.cx - it.r >= 24 && it.cx + it.r <= W - 24 && it.cy - it.r >= 24 && it.cy + it.r <= H - 24, it.id);
  }
});

test('kid: a thumb sliding from ◀ to ▶ switches direction', () => {
  const c = controls('kid');
  const L = c.layout;
  c.down(1, item(L, 'left').cx, item(L, 'left').cy);
  assert.equal(c.held('left'), true);
  c.move(1, item(L, 'right').cx, item(L, 'right').cy);
  assert.equal(c.held('left'), false);
  assert.equal(c.held('right'), true);
  c.up(1);
  assert.equal(c.held('right'), false);
});

test('kid: the jump zone is much bigger than the jump button', () => {
  const L = layoutControls('kid', W, H);
  assert.deepEqual(hitControls(L, W * 0.7, H * 0.45, { isDown: true }), ['jump']);
  assert.deepEqual(hitControls(L, W * 0.5, H * 0.2, { isDown: true }), []);
});

test('kid: moving and jumping at the same time (two thumbs)', () => {
  const c = controls('kid');
  const L = c.layout;
  c.down(1, item(L, 'right').cx, item(L, 'right').cy);
  c.down(2, item(L, 'jump').cx, item(L, 'jump').cy);
  assert.equal(c.held('right'), true);
  assert.equal(c.held('jump'), true);
  assert.equal(c.presses.jump, 1);
  c.up(2);
  c.down(3, item(L, 'jump').cx, item(L, 'jump').cy);
  assert.equal(c.presses.jump, 2);
  assert.equal(c.held('right'), true);
});

test('kidAuto: a tap anywhere is a jump, but pause is still pause', () => {
  const L = layoutControls('kidAuto', W, H);
  assert.deepEqual(hitControls(L, W * 0.3, H * 0.3, { isDown: true }), ['jump']);
  assert.deepEqual(hitControls(L, 10, H - 10, { isDown: true }), ['jump']);
  const p = item(L, 'pause');
  assert.deepEqual(hitControls(L, p.cx, p.cy, { isDown: true }), ['pause']);
});

test('pause only presses on touch-down, not by sliding onto it', () => {
  const c = controls('kid');
  const p = item(c.layout, 'pause');
  c.down(1, W / 2, H / 2);
  c.move(1, p.cx, p.cy);
  assert.equal(c.held('pause'), false);
});

test('dad: a thumb on the seam between FIRE and JUMP presses both', () => {
  const L = layoutControls('dad', W, H);
  const j = item(L, 'jump');
  const f = item(L, 'fire');
  const mx = (j.cx + f.cx) / 2;
  const my = (j.cy + f.cy) / 2;
  assert.deepEqual(hitControls(L, mx, my, { isDown: true }).sort(), ['fire', 'jump']);
  assert.deepEqual(hitControls(L, j.cx + 20, j.cy + 20, { isDown: true }), ['jump']);
});

test('dad: the stick appears where the thumb lands and reads its push', () => {
  const c = controls('dad');
  c.down(1, 200, 600);
  const s0 = c.stick();
  assert.ok(s0 && s0.ox === 200 && s0.oy === 600 && s0.x === 0);
  c.move(1, 200 + 70, 600);
  assert.ok(Math.abs(c.stick().x - 1) < 1e-9);
  c.move(1, 200 + 35, 600);
  assert.ok(Math.abs(c.stick().x - 0.5) < 1e-9);
  // Dragging far pulls the stick's middle along, still full push.
  c.move(1, 600, 600);
  assert.ok(Math.abs(c.stick().x - 1) < 1e-9);
  c.up(1);
  assert.equal(c.stick(), null);
});

test('dad: hidden buttons (dash, turbo before they are earned) cannot be pressed', () => {
  const L = layoutControls('dad', W, H);
  const d = item(L, 'dash');
  assert.ok(d.hidden);
  assert.ok(!hitControls(L, d.cx, d.cy, { isDown: true }).includes('dash'));
  const L2 = layoutControls('dad', W, H, { abilities: { dash: true } });
  const d2 = item(L2, 'dash');
  assert.ok(hitControls(L2, d2.cx, d2.cy, { isDown: true }).includes('dash'));
});

test('left-handed mirrors the layout but keeps ◀ left of ▶', () => {
  const L = layoutControls('kid', W, H, { leftHanded: true });
  const left = item(L, 'left');
  const right = item(L, 'right');
  const jump = item(L, 'jump');
  assert.ok(jump.cx < W * 0.3, 'jump on the left');
  assert.ok(left.cx > W * 0.6 && left.cx < right.cx, 'arrows on the right, in order');
  assert.deepEqual(hitControls(L, left.cx, left.cy, { isDown: true }), ['left']);
  assert.deepEqual(hitControls(L, right.cx, right.cy, { isDown: true }), ['right']);
  const D = layoutControls('dad', W, H, { leftHanded: true });
  assert.ok(D.stick.x > W * 0.5);
});

test('layouts scale with the screen (iPad mini, old iPad)', () => {
  for (const [w, h] of [[1133, 744], [1024, 768], [1366, 1024]]) {
    const L = layoutControls('kid', w, h);
    for (const it of L.items) assert.ok(it.cx + it.r <= w && it.cy + it.r <= h && it.cx - it.r >= 0, `${w}x${h} ${it.id}`);
    const jr = item(L, 'jump').r;
    assert.ok(jr >= 80, `jump stays big: ${jr}`);
  }
});

test('a reused finger id replaces the old finger instead of leaving its button held', () => {
  const c = controls('kid');
  const L = c.layout;
  c.down(1, item(L, 'right').cx, item(L, 'right').cy);
  // The lift for finger 1 never arrived; iOS hands out id 1 again for a touch on the sky.
  c.down(1, W / 2, H * 0.2);
  assert.equal(c.held('right'), false);
  c.up(1);
  assert.equal(c.held('right'), false);
});

test('two fingers on the same button: it stays held until both lift', () => {
  const c = controls('kid');
  const j = item(c.layout, 'jump');
  c.down(1, j.cx, j.cy);
  c.down(2, j.cx + 10, j.cy);
  c.up(1);
  assert.equal(c.held('jump'), true);
  c.up(2);
  assert.equal(c.held('jump'), false);
});
