// Rapier 0.21's ball-vs-voxels contact panics at some positions (it kills the whole physics
// world), so the game never uses ColliderDesc.ball: round things use a convex hull instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sphereHull } from '../js/physics/world.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

test('no ball colliders anywhere', () => {
  const bad = files(ROOT).filter((f) => f.endsWith('.js') && /ColliderDesc\.ball\(/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(bad, []);
});

test('sphere hull points sit on the sphere', () => {
  const pts = sphereHull(2);
  assert.equal(pts.length, 42 * 3);
  for (let i = 0; i < pts.length; i += 3) assert.ok(Math.abs(Math.hypot(pts[i], pts[i + 1], pts[i + 2]) - 2) < 1e-5);
});
