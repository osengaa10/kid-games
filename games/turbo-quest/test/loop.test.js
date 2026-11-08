import test from 'node:test';
import assert from 'node:assert/strict';
import { Stepper, STEP } from '../js/engine/loop.js';
import { FrameStats } from '../js/engine/stats.js';
import { Pool } from '../js/engine/pool.js';

test('60 Hz frames with jitter run exactly one step each', () => {
  const s = new Stepper();
  const jitter = [0.0162, 0.0171, 0.0166, 0.0169, 0.0164];
  for (let i = 0; i < 300; i++) assert.equal(s.advance(jitter[i % jitter.length]), 1);
});

test('30 Hz frames run two steps each', () => {
  const s = new Stepper();
  for (let i = 0; i < 100; i++) assert.equal(s.advance(1 / 30), 2);
});

test('120 Hz frames run a step every other frame', () => {
  const s = new Stepper();
  let n = 0;
  for (let i = 0; i < 120; i++) n += s.advance(1 / 120);
  assert.ok(Math.abs(n - 60) <= 1, `${n}`);
});

test('a long gap does not fast-forward the game', () => {
  const s = new Stepper();
  assert.equal(s.advance(3), 0);
  assert.equal(s.advance(STEP), 1);
});

test('a slow stretch is capped at a few steps per frame', () => {
  const s = new Stepper({ maxSteps: 4 });
  assert.equal(s.advance(0.2), 4);
});

test('frame stats', () => {
  const f = new FrameStats(100);
  for (let i = 0; i < 95; i++) f.add(1 / 60);
  for (let i = 0; i < 5; i++) f.add(0.04);
  const s = f.summary();
  assert.equal(s.frames, 100);
  assert.ok(Math.abs(s.good - 0.95) < 1e-9);
  assert.ok(Math.abs(s.worst - 40) < 0.01);
  assert.ok(s.fps > 50 && s.fps < 60);
});

test('pool reuses items and swaps on free', () => {
  const p = new Pool(() => ({ v: 0 }), 3);
  const a = p.alloc();
  const b = p.alloc();
  const c = p.alloc();
  assert.equal(p.alloc(), null);
  a.v = 1;
  b.v = 2;
  c.v = 3;
  p.free(0);
  assert.equal(p.count, 2);
  assert.equal(p.items[0].v, 3);
});
