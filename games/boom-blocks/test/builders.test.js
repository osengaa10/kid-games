// The builder's beams and rings must come out in one piece, joined face to face: a slanted thin
// beam whose little blocks only touched at their corners would fall apart the moment a scene
// is built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../js/core/grid.js';
import { Builder } from '../js/core/builders.js';
import { MAT } from '../js/core/materials.js';
import { rng } from '../js/core/rng.js';

// Number of face-connected groups among the filled cells.
function groups(g) {
  const seen = new Set();
  let n = 0;
  for (const start of g.filled()) {
    if (seen.has(start)) continue;
    n++;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const i = stack.pop();
      const x = g.cx(i);
      const y = g.cy(i);
      const z = g.cz(i);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        if (!g.get(x + dx, y + dy, z + dz)) continue;
        const j = g.index(x + dx, y + dy, z + dz);
        if (!seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
  }
  return n;
}

const paint = { mat: MAT.WOOD, color: 0x996633 };

for (const w of [0.5, 0.75, 1, 1.5]) {
  test(`a slanted beam ${w} units thick is one piece`, () => {
    const g = new Grid();
    const b = new Builder(g, rng(1));
    b.beam(-6.3, 2.2, -4.1, 7.7, 13.6, 5.3, paint, w);
    assert.ok(g.count > 10);
    assert.equal(groups(g), 1);
  });
}

test('rings are one piece, standing either way', () => {
  for (const across of ['x', 'z']) {
    const g = new Grid();
    const b = new Builder(g, rng(1));
    b.ring(0, 15, 0, 11, paint, { w: 0.75, across });
    assert.equal(groups(g), 1, across);
  }
});
