// Levels are written as ASCII, in sections laid side by side (each section is one checkpoint
// span). Sections line up along their bottom rows. No DOM. The glyphs are in content/legend.js.
//
// A section can change things for one mode with an overlay: { rowIndex: 'string' }, where '.'
// (or a space) keeps what's there and anything else replaces it, e.g.
//   rows: [ ..., '#####...#####' ],
//   kid:  { 12: '.....~~~.....' },   // planks bridge the gap in Kid Mode
//   dad:  { 11: '..........h..' },   // an extra Hopper in Dad Mode
// params: per-glyph settings for that section, e.g. { m: { w: 3, range: 4 }, w: { speed: 2 } }.
import { T, makeGrid, setTile, tileAt, isStandable } from '../engine/collide.js';
import { TILE_GLYPHS, ENEMY_GLYPHS, PICKUP_GLYPHS, DECOR_GLYPHS, MARKERS } from '../content/legend.js';
import { PLAYER_H, PLAYER_W } from './player.js';

const PLATFORM = { w: 3, range: 4, axis: 'x', speed: 2 };

// The rows of a section as seen in one mode (its overlay applied).
export function sectionRows(s, mode) {
  const over = s[mode];
  if (!over) return s.rows;
  return s.rows.map((row, r) => {
    const o = over[r];
    if (!o) return row;
    let out = '';
    for (let c = 0; c < row.length; c++) out += o[c] && o[c] !== '.' && o[c] !== ' ' ? o[c] : row[c];
    return out;
  });
}

export function parseLevel(def, mode = 'kid') {
  const sections = def.sections;
  const height = Math.max(...sections.map((s) => s.rows.length));
  const widths = sections.map((s) => Math.max(...s.rows.map((r) => r.length)));
  const width = widths.reduce((a, b) => a + b, 0);
  const grid = makeGrid(width, height);
  const level = {
    id: def.id, name: def.name || def.id, world: def.world || 'jungle', music: def.music || null, par: def.par || 120,
    medals: def.medals || null, width, height, grid, mode,
    start: null, goal: null, stars: [], items: [], enemies: [], decor: [], platforms: [], checkpoints: [], sections: [],
  };

  let ox = 0;
  sections.forEach((s, si) => {
    const rows = sectionRows(s, mode);
    const oy = height - rows.length;
    const params = s.params || {};
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const x = ox + c;
        const y = oy + r;
        const where = `section ${si}, row ${r}, column ${c}`;
        if (TILE_GLYPHS[ch] !== undefined) setTile(grid, x, y, TILE_GLYPHS[ch]);
        else if (ch === '*') level.stars.push({ x: x + 0.5, y: y + 0.5, id: `s${x},${y}` });
        else if (PICKUP_GLYPHS[ch]) {
          const kind = PICKUP_GLYPHS[ch];
          level.items.push({ kind, x: x + 0.5, y: y + 0.5, id: `${kind}${x},${y}`, gem: kind === 'gem' ? Number(ch) : 0, section: si });
        } else if (ENEMY_GLYPHS[ch]) {
          level.enemies.push({ kind: ENEMY_GLYPHS[ch], x: x + 0.5, y: y + 1, id: `${ch}${x},${y}`, params: params[ch] || null, section: si });
        } else if (DECOR_GLYPHS[ch]) {
          level.decor.push({ kind: DECOR_GLYPHS[ch], x: x + 0.5, y: y + 1, seed: x * 7 + y * 13 });
        } else if (ch === 'S') level.start = { x: x + 0.5 - PLAYER_W / 2, y: y + 1 - PLAYER_H };
        else if (ch === '>') level.goal = { x, y: y + 1 };
        else if (ch === 'm') {
          const p = { ...PLATFORM, ...(params.m || {}) };
          level.platforms.push({ x0: x, y0: y, x, y, w: p.w, h: 0.5, axis: p.axis, range: p.range, speed: p.speed, phase: 0, dx: 0, dy: 0 });
        } else if (!MARKERS.has(ch)) throw new Error(`level ${def.id}: unknown glyph '${ch}' (${where})`);
      }
    });
    level.sections.push({ x0: ox, x1: ox + widths[si], name: s.name || `section ${si}` });
    ox += widths[si];
  });
  if (!level.start) throw new Error(`level ${def.id}: no start (S)`);
  if (!level.goal) throw new Error(`level ${def.id}: no goal (>)`);

  // A checkpoint at the start of every section: the first spot near its left edge with ground.
  level.checkpoints.push({ x: level.start.x, y: level.start.y, section: 0 });
  for (let si = 1; si < level.sections.length; si++) {
    const { x0, x1 } = level.sections[si];
    for (let cx = x0 + 1; cx < Math.min(x1, x0 + 8); cx++) {
      const top = surfaceTop(grid, cx);
      if (top !== null) {
        level.checkpoints.push({ x: cx + 0.5 - PLAYER_W / 2, y: top - PLAYER_H, section: si });
        break;
      }
    }
  }
  return level;
}

// Which section an x position is in.
export function sectionAt(level, x) {
  for (let i = level.sections.length - 1; i >= 0; i--) if (x >= level.sections[i].x0) return i;
  return 0;
}

// The highest standable surface in a column (with room above to stand), or null.
export function surfaceTop(grid, cx) {
  for (let cy = 0; cy < grid.h; cy++) {
    const t = tileAt(grid, cx, cy);
    if (isStandable(t) && t !== T.BOUNCE) return tileAt(grid, cx, cy - 1) === T.EMPTY && tileAt(grid, cx, cy - 2) === T.EMPTY ? cy : null;
  }
  return null;
}

// Moving platforms swing smoothly back and forth: top speed `speed`, `range` tiles end to end.
export function movePlatform(p, dt) {
  const omega = (2 * p.speed) / Math.max(0.1, p.range);
  p.phase += omega * dt;
  const off = ((1 - Math.cos(p.phase)) / 2) * p.range;
  const nx = p.axis === 'x' ? p.x0 + off : p.x0;
  const ny = p.axis === 'y' ? p.y0 + off : p.y0;
  p.dx = nx - p.x;
  p.dy = ny - p.y;
  p.x = nx;
  p.y = ny;
}
