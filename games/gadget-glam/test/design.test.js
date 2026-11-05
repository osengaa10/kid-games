import test from 'node:test';
import assert from 'node:assert/strict';
import { newDesign, newHistory, addOp, replaceOp, removeOp, setStyle, clearStep, undo, canUndo, hasContent, isEmpty, encode, decode, nextSize, clone, orderedOps } from '../js/design.js';

test('a new design is empty', () => {
  const d = newDesign('phone');
  assert.ok(isEmpty(d));
  assert.equal(d.style, 'plain');
});

test('undo only takes back things from the step it is pressed in', () => {
  const d = newDesign('phone');
  const h = newHistory();
  addOp(d, h, 'spray', { k: 'spray', c: 'red', s: 1, p: [1, 2] });
  addOp(d, h, 'sticker', { k: 'sticker', e: '🐶', x: 5, y: 5, z: 1 });
  addOp(d, h, 'spray', { k: 'spray', c: 'blue', s: 2, p: [3, 4] });
  assert.ok(undo(d, h, 'spray'));
  assert.equal(d.layers.spray.length, 1);
  assert.equal(d.layers.sticker.length, 1);
  assert.ok(undo(d, h, 'spray'));
  assert.equal(d.layers.spray.length, 0);
  assert.equal(undo(d, h, 'spray'), false);
  assert.equal(d.layers.sticker.length, 1);
  assert.ok(canUndo(h, 'sticker'));
});

test('clearing a step can be undone, and clearing an empty step does nothing', () => {
  const d = newDesign('tablet');
  const h = newHistory();
  assert.equal(clearStep(d, h, 'marker'), false);
  addOp(d, h, 'marker', { k: 'marker', c: 'black', p: [0, 0, 10, 10] });
  addOp(d, h, 'marker', { k: 'marker', c: 'red', p: [0, 0, 20, 20] });
  assert.ok(clearStep(d, h, 'marker'));
  assert.equal(d.layers.marker.length, 0);
  assert.ok(undo(d, h, 'marker'));
  assert.equal(d.layers.marker.length, 2);
});

test('moving, resizing and removing a sticker can each be undone', () => {
  const d = newDesign('phone');
  const h = newHistory();
  const a = { k: 'sticker', e: '🐶', x: 5, y: 5, z: 1 };
  addOp(d, h, 'sticker', a);
  replaceOp(d, h, 'sticker', 0, { ...a, x: 50 });
  replaceOp(d, h, 'sticker', 0, { ...d.layers.sticker[0], z: nextSize(1) });
  assert.deepEqual([d.layers.sticker[0].x, d.layers.sticker[0].z], [50, 2]);
  removeOp(d, h, 'sticker', 0);
  assert.equal(d.layers.sticker.length, 0);
  undo(d, h, 'sticker');
  assert.equal(d.layers.sticker[0].z, 2);
  undo(d, h, 'sticker');
  assert.equal(d.layers.sticker[0].z, 1);
  undo(d, h, 'sticker');
  assert.equal(d.layers.sticker[0].x, 5);
});

test('style changes and undoes like any other step', () => {
  const d = newDesign('earbuds');
  const h = newHistory();
  assert.ok(setStyle(d, h, 'cat'));
  assert.equal(setStyle(d, h, 'cat'), false);
  assert.equal(setStyle(d, h, 'nonsense'), false);
  assert.ok(hasContent(d, 'style'));
  setStyle(d, h, 'cactus');
  undo(d, h, 'style');
  assert.equal(d.style, 'cat');
  clearStep(d, h, 'style');
  assert.equal(d.style, 'plain');
});

test('sticker sizes cycle small, medium, big, small', () => {
  assert.deepEqual([0, 1, 2].map(nextSize), [1, 2, 0]);
});

test('designs survive a save and load', () => {
  const d = newDesign('controller');
  const h = newHistory();
  setStyle(d, h, 'dino');
  addOp(d, h, 'spray', { k: 'spray', c: 'rainbow', s: 99, p: [1, 2, 3, 4] });
  addOp(d, h, 'gem', { k: 'gems', g: 'mix', s: 7, p: [10, 10, 60, 10] });
  assert.deepEqual(decode(encode(d)), d);
  assert.deepEqual(clone(d), d);
});

test('damaged saves load as nothing or drop the bad strokes', () => {
  assert.equal(decode('not json'), null);
  assert.equal(decode('{"v":1,"item":"toaster"}'), null);
  assert.equal(decode(null), null);
  const d = decode({ v: 1, item: 'phone', style: 'weird', layers: { spray: [null, 7, { k: 'spray', p: [] }], gem: 'x' } });
  assert.equal(d.style, 'plain');
  assert.equal(d.layers.spray.length, 1);
  assert.deepEqual(d.layers.gem, []);
});

test('a busy design stays small enough to save lots of them', () => {
  const d = newDesign('tablet');
  const h = newHistory();
  const pts = (n) => Array.from({ length: n * 2 }, (_, i) => Math.round(Math.random() * 900));
  for (let i = 0; i < 25; i++) addOp(d, h, 'spray', { k: 'spray', c: 'rainbow', s: i, p: pts(240) }); // 25 four-second sprays
  for (let i = 0; i < 25; i++) addOp(d, h, 'marker', { k: 'marker', c: 'red', p: pts(150) });
  for (let i = 0; i < 40; i++) addOp(d, h, 'sticker', { k: 'sticker', e: '🦄', x: 100, y: 100, z: 1, r: 0.12 });
  const kb = encode(d).length / 1024;
  assert.ok(kb < 250, `${kb.toFixed(0)} KB`);
});

const kinds = (d) => orderedOps(d).map((op) => op.c || op.e || op.k);

test('whatever he does last goes on top, whichever step it is in', () => {
  const d = newDesign('phone');
  const h = newHistory();
  addOp(d, h, 'spray', { k: 'spray', c: 'red', s: 1, p: [1, 2] });
  addOp(d, h, 'puffy', { k: 'puffy', c: 'white', p: [1, 2] });
  addOp(d, h, 'sticker', { k: 'sticker', e: 'S', x: 5, y: 5, z: 1 });
  addOp(d, h, 'spray', { k: 'spray', c: 'blue', s: 2, p: [3, 4] });
  assert.deepEqual(kinds(d), ['red', 'white', 'S', 'blue']);
  // Undo in the spray step takes back the last spray, and nothing else moves.
  undo(d, h, 'spray');
  assert.deepEqual(kinds(d), ['red', 'white', 'S']);
});

test('numbers are never reused, so things undone and brought back keep their place', () => {
  const d = newDesign('phone');
  const h = newHistory();
  addOp(d, h, 'spray', { k: 'spray', c: 'red', s: 1, p: [1, 2] });
  clearStep(d, h, 'spray');
  addOp(d, h, 'marker', { k: 'marker', c: 'black', p: [1, 2] });
  undo(d, h, 'spray');
  assert.deepEqual(kinds(d), ['red', 'black']);
  const ns = orderedOps(d).map((op) => op.n);
  assert.equal(new Set(ns).size, ns.length);
});

test('a sticker moved or resized is stuck back on top', () => {
  const d = newDesign('phone');
  const h = newHistory();
  addOp(d, h, 'sticker', { k: 'sticker', e: 'A', x: 5, y: 5, z: 1 });
  addOp(d, h, 'spray', { k: 'spray', c: 'red', s: 1, p: [1, 2] });
  replaceOp(d, h, 'sticker', 0, { ...d.layers.sticker[0], x: 60 }, { top: true });
  assert.deepEqual(kinds(d), ['red', 'A']);
  undo(d, h, 'sticker');
  assert.deepEqual(kinds(d), ['A', 'red']);
});

test('saves from before numbering load in the old layer order', () => {
  const old = {
    v: 1,
    item: 'phone',
    style: 'plain',
    layers: {
      gem: [{ k: 'gems', g: 'pearl', s: 1, p: [1, 1] }],
      sticker: [{ k: 'sticker', e: 'S', x: 1, y: 1, z: 1 }],
      marker: [{ k: 'marker', c: 'black', p: [1, 1] }],
      puffy: [{ k: 'puffy', c: 'white', p: [1, 1] }],
      spray: [{ k: 'spray', c: 'red', s: 1, p: [1, 1] }, { k: 'spray', c: 'blue', s: 1, p: [1, 1] }],
    },
  };
  const d = decode(JSON.stringify(old));
  assert.deepEqual(kinds(d), ['red', 'blue', 'white', 'black', 'S', 'gems']);
  // New strokes go on top of all of them.
  addOp(d, newHistory(), 'spray', { k: 'spray', c: 'green', s: 1, p: [1, 1] });
  assert.equal(kinds(d).at(-1), 'green');
});
