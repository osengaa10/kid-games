// Every playground must start fully standing (nothing floating), fit in the grid, and stay
// within the block budget the iPad can draw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../js/core/grid.js';
import { Structure } from '../js/core/connect.js';
import { SCENES, buildScene } from '../js/core/scenes/index.js';

// Little blocks (each scene unit is 2×2×2 of them), after hollowing.
const MAX_BLOCKS = 60000;

for (const scene of SCENES) {
  test(`${scene.id}: builds grounded and within budget`, () => {
    const g = new Grid();
    const b = buildScene(g, scene, 1234);
    assert.ok(g.count > 500, `only ${g.count} blocks`);
    assert.ok(g.count <= MAX_BLOCKS, `${g.count} blocks is over ${MAX_BLOCKS}`);
    const floating = new Structure(g).floating(g.filled());
    assert.equal(floating.length, 0, `floating pieces at ${floating.map((p) => `${g.cx(p[0])},${g.cy(p[0])},${g.cz(p[0])} (${p.length})`).join('; ')}`);
    for (const gift of b.gifts) assert.ok(typeof gift.kind === 'string');
    assert.ok(scene.camera && scene.camera.target.length === 3);
  });

  test(`${scene.id}: same seed, same scene`, () => {
    const a = new Grid();
    const c = new Grid();
    buildScene(a, scene, 99);
    buildScene(c, scene, 99);
    assert.deepEqual(a.color, c.color);
  });
}

// Props (dominoes, crates) must not start overlapping each other, or the physics shoves them
// apart the moment the scene is built and the domino run starts by itself.
for (const scene of SCENES) {
  test(`${scene.id}: props don't overlap`, () => {
    const g = new Grid();
    const b = buildScene(g, scene, 7);
    const boxes = b.props.map(({ cells, center, yaw }) => {
      // Footprint corners of each prop (x/z), rotated by yaw around its center.
      const xs = cells.map((c) => c[0]);
      const zs = cells.map((c) => c[2]);
      const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2;
      const cz = (Math.min(...zs) + Math.max(...zs) + 1) / 2;
      const hx = (Math.max(...xs) - Math.min(...xs) + 1) / 2 - 0.05;
      const hz = (Math.max(...zs) - Math.min(...zs) + 1) / 2 - 0.05;
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      const ys = cells.map((k) => k[1]);
      const hy = (Math.max(...ys) - Math.min(...ys) + 1) / 2;
      return { x: center[0], z: center[2], y0: center[1] - hy, y1: center[1] + hy, axes: [[c, -s], [s, c]], h: [hx, hz], _: [cx, cz] };
    });
    // Separating-axis test on the 2D footprints, for props whose heights overlap.
    const proj = (b, ax) => b.h[0] * Math.abs(b.axes[0][0] * ax[0] + b.axes[0][1] * ax[1]) + b.h[1] * Math.abs(b.axes[1][0] * ax[0] + b.axes[1][1] * ax[1]);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i];
        const B = boxes[j];
        if (A.y1 <= B.y0 + 0.01 || B.y1 <= A.y0 + 0.01) continue;
        const d = [B.x - A.x, B.z - A.z];
        const separated = [...A.axes, ...B.axes].some((ax) => Math.abs(d[0] * ax[0] + d[1] * ax[1]) >= proj(A, ax) + proj(B, ax));
        assert.ok(separated, `props ${i} and ${j} overlap`);
      }
  });
}

test('the domino garden has a long domino run', () => {
  const g = new Grid();
  const b = buildScene(g, SCENES.find((s) => s.id === 'garden'), 1);
  const dominoes = b.props.filter((p) => p.cells.length === 21);
  assert.ok(dominoes.length >= 30, `${dominoes.length} dominoes`);
});
