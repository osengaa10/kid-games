import test from 'node:test';
import assert from 'node:assert/strict';
import { T, makeGrid, setTile, moveX, moveY, MOVE, boxFree, groundUnder, fullySupported, tileAt } from '../js/engine/collide.js';

function grid(rows) {
  const g = makeGrid(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => setTile(g, x, y, ch === '#' ? T.SOLID : ch === '=' ? T.ONEWAY : ch === 'o' ? T.BOUNCE : T.EMPTY)));
  return g;
}
const out = () => ({});

test('the level edges are walls, above and below are open', () => {
  const g = grid(['....', '####']);
  assert.equal(tileAt(g, -1, 0), T.SOLID);
  assert.equal(tileAt(g, 4, 0), T.SOLID);
  assert.equal(tileAt(g, 0, -3), T.EMPTY);
  assert.equal(tileAt(g, 0, 9), T.EMPTY);
});

test('falling lands on top of solid ground', () => {
  const g = grid(['....', '....', '####']);
  const b = { x: 1.1, y: 0.5, w: 0.8, h: 1.2 };
  const r = moveY(b, 0.5, g, {}, out());
  assert.equal(r.landed, true);
  assert.equal(r.tile, T.SOLID);
  assert.ok(Math.abs(b.y + b.h - 2) < 1e-9);
});

test('a one-way platform catches feet from above but lets heads through from below', () => {
  const g = grid(['....', '.==.', '....', '####']);
  const up = { x: 1.1, y: 2.05, w: 0.8, h: 0.9 };
  const r1 = moveY(up, -0.3, g, {}, out());
  assert.equal(r1.ceiling, false);
  const down = { x: 1.1, y: 1 - 1.2 - 0.01, w: 0.8, h: 1.2 };
  const r2 = moveY(down, 0.2, g, {}, out());
  assert.equal(r2.landed, true);
  assert.equal(r2.tile, T.ONEWAY);
  // ...unless dropping through.
  const drop = { x: 1.1, y: 1 - 1.2 - 0.01, w: 0.8, h: 1.2 };
  assert.equal(moveY(drop, 0.2, g, { dropThrough: true }, out()).landed, false);
});

test('walls stop sideways movement', () => {
  const g = grid(['..#.', '..#.', '####']);
  const b = { x: 1.0, y: 0.8, w: 0.8, h: 1.2 };
  assert.equal(moveX(b, 0.5, g), MOVE.WALL);
  assert.ok(Math.abs(b.x + b.w - 2) < 1e-9);
});

test('ledge assist lifts feet that are just below a ledge onto it', () => {
  const g = grid(['....', '....', '..##', '####']);
  // Feet 0.2 below the ledge top (row 2), moving right into it.
  const b = { x: 1.0, y: 2.2 - 1.2, w: 0.8, h: 1.2 };
  assert.equal(moveX(b, 0.3, g, 0.3), MOVE.STEPPED);
  assert.ok(Math.abs(b.y + b.h - 2) < 1e-9);
  // Too far below: it's a wall.
  const c = { x: 1.0, y: 2.6 - 1.2, w: 0.8, h: 1.2 };
  assert.equal(moveX(c, 0.3, g, 0.3), MOVE.WALL);
});

test('corner correction slides a head round a ceiling corner it barely clips', () => {
  const g = grid(['#...', '....', '....', '####']);
  // Head overlaps the block at column 0 by 0.2.
  const b = { x: 0.8, y: 1.05, w: 0.8, h: 1.2 };
  const r = moveY(b, -0.2, g, { corner: 0.35 }, out());
  assert.equal(r.ceiling, false);
  assert.ok(b.x >= 1);
  // A big overlap is a real bump.
  const c = { x: 0.3, y: 1.05, w: 0.8, h: 1.2 };
  assert.equal(moveY(c, -0.2, g, { corner: 0.35 }, out()).ceiling, true);
});

test('ground checks', () => {
  const g = grid(['....', '....', '#.##']);
  const on = { x: 2.1, y: 2 - 1.2, w: 0.8, h: 1.2 };
  assert.equal(groundUnder(on, g), T.SOLID);
  assert.equal(fullySupported(on, g), true);
  const edge = { x: 0.6, y: 2 - 1.2, w: 0.8, h: 1.2 };
  assert.equal(fullySupported(edge, g), false);
  assert.equal(boxFree(g, 1.1, 1.0, 0.8, 0.9), true);
  assert.equal(boxFree(g, 0.5, 1.5, 0.8, 0.9), false);
});
