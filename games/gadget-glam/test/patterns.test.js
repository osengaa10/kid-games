import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_IDS, STYLES, shapeOf, onCase } from '../js/items.js';
import { PATTERNS, patternLines, popitDomes, lineLengths } from '../js/patterns.js';

for (const id of ITEM_IDS) {
  test(`${id}: every pattern has lines inside the pattern area`, () => {
    for (const st of STYLES) {
      const sh = shapeOf(id, st);
      const [ax, ay, aw, ah] = sh.area;
      const slack = 40 * sh.u; // zigzags and hearts bulge a little past their row
      for (const pat of PATTERNS.filter((p) => p !== 'popit')) {
        const lines = patternLines(sh, pat);
        assert.ok(lines.length > 0, `${id} ${pat} is empty`);
        assert.ok(lineLengths(lines).every((d) => d > 0));
        for (const l of lines) {
          for (let i = 0; i < l.length; i += 2) {
            assert.ok(l[i] >= ax - slack && l[i] <= ax + aw + slack, `${id} ${pat} x out of range`);
            assert.ok(l[i + 1] >= ay - slack && l[i + 1] <= ay + ah + slack, `${id} ${pat} y out of range`);
          }
        }
      }
    }
  });

  test(`${id}: pop-it bubbles stay on the case and clear of cameras and buttons`, () => {
    const sh = shapeOf(id);
    const domes = popitDomes(sh);
    assert.ok(domes.length >= 6, `${id} only has ${domes.length} bubbles`);
    for (const d of domes) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        assert.ok(onCase(sh, d.x + Math.cos(a) * d.r, d.y + Math.sin(a) * d.r), `${id}: a bubble runs off the case`);
      }
    }
  });
}
