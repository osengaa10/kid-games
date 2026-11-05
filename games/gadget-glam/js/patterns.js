// The puffy-paint patterns the glue gun draws by itself, as plain point lists in item units.
// A pattern is a list of lines; each line is a flat array [x0, y0, x1, y1, ...]. The gun draws
// them in order, so neighboring lines run in opposite directions (no long jumps between them).
import { ITEMS, onCase } from './items.js';

export const PATTERNS = ['grid', 'hearts', 'dots', 'zigzag', 'popit'];
export const PATTERN_SAY = { grid: 'Waffle', hearts: 'Hearts', dots: 'Polka dots', zigzag: 'Zig zag', popit: 'Pop it' };

const cache = new Map();

export function patternLines(shape, pat) {
  const key = `${shape.item}:${shape.style}:${pat}`;
  if (!cache.has(key)) cache.set(key, build(shape, pat));
  return cache.get(key);
}

function build(shape, pat) {
  const [ax, ay, aw, ah] = shape.area;
  const u = shape.u;
  const lines = [];
  if (pat === 'grid') {
    const nx = Math.max(3, Math.round(aw / (105 * u)));
    const cw = aw / nx;
    const ny = Math.max(3, Math.round(ah / cw));
    const ch = ah / ny;
    for (let j = 0; j <= ny; j++) {
      const y = ay + j * ch;
      lines.push(j % 2 ? [ax + aw, y, ax, y] : [ax, y, ax + aw, y]);
    }
    for (let i = 0; i <= nx; i++) {
      const x = ax + i * cw;
      lines.push(i % 2 ? [x, ay, x, ay + ah] : [x, ay + ah, x, ay]);
    }
  } else if (pat === 'zigzag') {
    const gap = 120 * u;
    const amp = 32 * u;
    const wave = 82 * u;
    const rows = Math.max(2, Math.floor(ah / gap));
    const y0 = ay + (ah - (rows - 1) * gap) / 2;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j * gap;
      const pts = [];
      for (let x = ax, k = 0; x <= ax + aw + 0.01; x += wave / 2, k++) pts.push(x, y + (k % 2 ? amp : -amp));
      if (j % 2) reverse(pts);
      lines.push(pts);
    }
  } else if (pat === 'hearts' || pat === 'dots') {
    const hearts = pat === 'hearts';
    const gap = (hearts ? 160 : 88) * u;
    const size = hearts ? 42 * u : 9 * u;
    const rows = Math.max(1, Math.floor(ah / gap));
    const y0 = ay + (ah - (rows - 1) * gap) / 2;
    for (let j = 0; j < rows; j++) {
      const off = j % 2 ? gap / 2 : 0;
      const row = [];
      for (let x = ax + gap / 2 + off - gap / 4; x < ax + aw; x += gap) {
        const y = y0 + j * gap;
        if (!onCase(shape, x, y)) continue;
        row.push(hearts ? heart(x, y, size) : circle(x, y, size));
      }
      if (j % 2) row.reverse();
      lines.push(...row);
    }
  }
  return lines;
}

function reverse(flat) {
  const pairs = [];
  for (let i = 0; i < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
  pairs.reverse();
  flat.length = 0;
  for (const [x, y] of pairs) flat.push(x, y);
}

function heart(cx, cy, s) {
  const pts = [];
  for (let k = 0; k <= 28; k++) {
    const t = Math.PI + (k / 28) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push(cx + (x / 16) * s, cy + (y / 16) * s);
  }
  return pts;
}

function circle(cx, cy, r) {
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

// Pop-it bubbles: a grid of round domes, leaving out any that would hang off the edge or run
// into a camera or button. [{ x, y, r, col, row }]
const domeCache = new Map();
export function popitDomes(shape) {
  const key = `${shape.item}:${shape.style}`;
  if (domeCache.has(key)) return domeCache.get(key);
  const [ax, ay, aw, ah] = shape.area;
  const nx = Math.max(3, Math.round(aw / ((ITEMS[shape.item].popit || 112) * shape.u)));
  const cell = aw / nx;
  const ny = Math.max(1, Math.floor(ah / cell));
  const y0 = ay + (ah - ny * cell) / 2;
  const r = cell * 0.37;
  const domes = [];
  for (let row = 0; row < ny; row++) {
    for (let col = 0; col < nx; col++) {
      const x = ax + (col + 0.5) * cell;
      const y = y0 + (row + 0.5) * cell;
      let fits = onCase(shape, x, y);
      for (let k = 0; fits && k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        fits = onCase(shape, x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2);
      }
      if (fits) domes.push({ x, y, r, col, row, cell });
    }
  }
  domeCache.set(key, domes);
  return domes;
}

// Total length of a pattern, and the point a given distance along it (where the glue gun is).
export function lineLengths(lines) {
  return lines.map((l) => {
    let d = 0;
    for (let i = 2; i < l.length; i += 2) d += Math.hypot(l[i] - l[i - 2], l[i + 1] - l[i - 1]);
    return d;
  });
}
