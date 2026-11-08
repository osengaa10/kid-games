// Level checks that need no screen: where Turbo can get to with a mode's jump. A search over
// the places he can stand, linked by walks, drops and jumps worked out from the tuning (bounce
// flowers jump higher). It's optimistic (it ignores ceilings and assumes leafy walls are shot),
// so the tests pair it with bots that really play the level. No DOM.
import { T, tileAt, isStandable } from '../engine/collide.js';
import { derive } from './tuning.js';
import { PLAYER_H } from './player.js';

const passable = (t) => t === T.EMPTY || t === T.ONEWAY || t === T.THORN || t === T.BREAK;

function standable(grid, c, r) {
  const t = tileAt(grid, c, r);
  if (!(isStandable(t) || t === T.BREAK)) return false;
  return passable(tileAt(grid, c, r - 1)) && passable(tileAt(grid, c, r - 2));
}

function fallTime(drop, t) {
  const g = t.fallGravity;
  if (Math.sqrt(2 * g * drop) <= t.maxFall) return Math.sqrt((2 * drop) / g);
  const d1 = (t.maxFall * t.maxFall) / (2 * g);
  return t.maxFall / g + (drop - d1) / t.maxFall;
}

// Horizontal reach (tiles) for a move that ends `up` tiles higher, with a jump of height h.
function reach(up, h, t) {
  if (up > h - 0.1) return -1;
  const d = derive(t);
  const v0 = Math.sqrt(2 * t.riseGravity * h);
  const tUp = v0 / t.riseGravity;
  const tDown = fallTime(Math.max(0, h - up), t);
  void d;
  const jump = t.runSpeed * (tUp + tDown) * 0.9 + 0.8;
  const walkOff = up < 0 ? t.runSpeed * fallTime(-up, t) + 1 : 0;
  return Math.max(jump, walkOff);
}

// The set of standing places ("c,r" with r the tile row under his feet) reachable from the start.
export function reachableCells(level, t) {
  const grid = level.grid;
  const cells = [];
  for (let r = 0; r < grid.h; r++) for (let c = 0; c < grid.w; c++) if (standable(grid, c, r)) cells.push([c, r]);
  // Anywhere a raft or log travels is somewhere to stand.
  for (const p of level.platforms) {
    const r = Math.round(p.y0);
    const span = p.kind === 'raft' ? p.range + p.w : p.axis === 'x' ? p.range + p.w : p.w;
    for (let c = Math.floor(p.x0); c < p.x0 + span; c++) cells.push([c, r]);
  }
  const start = [Math.floor(level.start.x + 0.4), Math.round(level.start.y + PLAYER_H)];
  const key = (c, r) => `${c},${r}`;
  const seen = new Set([key(...start)]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    const h = tileAt(grid, c, r) === T.BOUNCE ? t.bounceHeight : t.jumpHeight;
    for (const [c2, r2] of cells) {
      const k = key(c2, r2);
      if (seen.has(k)) continue;
      const dist = reach(r - r2, h, t);
      if (dist >= 0 && Math.abs(c2 - c) <= dist) {
        seen.add(k);
        queue.push([c2, r2]);
      }
    }
  }
  return seen;
}

// Can a pickup at (x, y) (tile centre) be grabbed from somewhere reachable?
export function canReach(level, t, cells, x, y) {
  for (const k of cells) {
    const [c, r] = k.split(',').map(Number);
    const h = tileAt(level.grid, c, r) === T.BOUNCE ? t.bounceHeight : t.jumpHeight;
    if (Math.abs(c + 0.5 - x) <= 1.6 && y <= r && y >= r - h - 1.4) return true;
  }
  return false;
}
