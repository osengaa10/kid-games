import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_IDS, STYLES, shapeOf, inside, bounds, boxOf, onCase } from '../js/items.js';

const within = (b, box) => b[0] >= box.x && b[1] >= box.y && b[2] <= box.x + box.w && b[3] <= box.y + box.h;

for (const id of ITEM_IDS) {
  test(`${id}: every style fits the item's box`, () => {
    const box = boxOf(id);
    for (const st of STYLES) {
      const sh = shapeOf(id, st);
      assert.ok(sh.parts.length >= ITEMS[id].body.length);
      assert.ok(within(bounds(sh.parts), box), `${id} ${st} sticks out of its box`);
      for (const [x, y] of sh.flowers) assert.ok(x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h);
    }
  });

  test(`${id}: the middle is on the case and far away is not`, () => {
    const sh = shapeOf(id);
    const [x0, y0, x1, y1] = bounds(sh.body);
    // Look near the middle for a spot that isn't a button (the controller has some there).
    let found = false;
    for (let dx = -60; dx <= 60 && !found; dx += 20) found = onCase(sh, (x0 + x1) / 2 + dx, (y0 + y1) / 2 + 40);
    assert.ok(found);
    assert.equal(onCase(sh, x1 + 500, y1 + 500), false);
    assert.equal(onCase(sh, x0 - 500, y0 - 500), false);
  });

  test(`${id}: holes are not paintable`, () => {
    const sh = shapeOf(id);
    for (const h of sh.holes) {
      const [x0, y0, x1, y1] = bounds([h]);
      assert.equal(onCase(sh, (x0 + x1) / 2, (y0 + y1) / 2), false);
    }
  });

  test(`${id}: ears, spikes and arms join onto the body`, () => {
    // Do two sets of parts overlap somewhere?
    const touch = (a, b) => {
      const [x0, y0, x1, y1] = bounds(a);
      for (let i = 0; i <= 24; i++) {
        for (let j = 0; j <= 24; j++) {
          const x = x0 + ((x1 - x0) * i) / 24;
          const y = y0 + ((y1 - y0) * j) / 24;
          if (inside(a, x, y) && inside(b, x, y)) return true;
        }
      }
      return false;
    };
    for (const st of ['cat', 'bunny', 'bear', 'dino', 'cactus']) {
      const sh = shapeOf(id, st);
      // Each added part reaches the body, directly or through other parts, so the case is one piece.
      const joined = [...sh.body];
      let left = [...sh.extra];
      for (let grew = true; grew && left.length; ) {
        const next = left.filter((p) => !touch([p], joined));
        grew = next.length < left.length;
        joined.push(...left.filter((p) => !next.includes(p)));
        left = next;
      }
      assert.equal(left.length, 0, `${id} ${st}: a part floats away from the body`);
    }
  });
}

test('inside works for each kind of part', () => {
  assert.ok(inside([{ rr: [0, 0, 100, 100, 20] }], 50, 50));
  assert.ok(!inside([{ rr: [0, 0, 100, 100, 20] }], 2, 2)); // the rounded corner is cut off
  assert.ok(inside([{ el: [0, 0, 50, 10, 0] }], 45, 0));
  assert.ok(!inside([{ el: [0, 0, 50, 10, 0] }], 0, 20));
  assert.ok(inside([{ el: [0, 0, 50, 10, Math.PI / 2] }], 0, 45)); // turned on its side
  assert.ok(inside([{ poly: [[0, 0], [10, 0], [0, 10]] }], 2, 2));
  assert.ok(!inside([{ poly: [[0, 0], [10, 0], [0, 10]] }], 8, 8));
});

test('the earbud case is open: lid, a gap with the earbuds, then the case', () => {
  const sh = shapeOf('earbuds');
  assert.ok(onCase(sh, 280, 60), 'lid');
  assert.equal(onCase(sh, 280, 146), false, 'gap between lid and case');
  assert.equal(onCase(sh, 200, 200), false, 'the insert the earbuds sit in');
  assert.ok(onCase(sh, 280, 420), 'case');
});

test('the side buttons of a phone are covered by the case', () => {
  const sh = shapeOf('phone');
  assert.ok(onCase(sh, 484, 300), 'volume');
  assert.ok(onCase(sh, -4, 360), 'power');
  assert.equal(onCase(sh, 484, 700), false);
});
