// Boxes against a grid of tiles, measured in tiles (1 tile ≈ 68 pt on an iPad), y pointing down.
// Bodies are { x, y, w, h } with x, y the top-left corner. Moves are done one axis at a time.
// No DOM, so all of it runs under node --test.

// SOLID ground, ONEWAY platforms (jump up through them), BOUNCE flowers (solid, springy),
// BREAK leafy walls (solid until shot), BRIDGE planks (solid; Kid Mode's extra help), THORN
// brambles (not solid; they hurt in Dad Mode and are harmless flowers in Kid Mode), WATER (not
// solid: falling in is like a pit), ROCK (solid, drawn as a mossy boulder: river rocks).
export const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, BOUNCE: 3, BREAK: 4, BRIDGE: 5, THORN: 6, WATER: 7, ROCK: 8 };

const EPS = 1e-6;
const ONEWAY_SLACK = 0.02; // how far below a one-way platform's top the feet may have been last step

export const isSolid = (t) => t === T.SOLID || t === T.BOUNCE || t === T.BREAK || t === T.BRIDGE || t === T.ROCK;
// Something to stand on (solid, or a one-way platform from above).
export const isStandable = (t) => isSolid(t) || t === T.ONEWAY;

// grid: { w, h, tiles: Uint8Array }. The level's left and right edges are walls; above the top
// and below the bottom is open (falling out of the bottom is a pit).
export function tileAt(grid, cx, cy) {
  if (cx < 0 || cx >= grid.w) return T.SOLID;
  if (cy < 0 || cy >= grid.h) return T.EMPTY;
  return grid.tiles[cy * grid.w + cx];
}

export function makeGrid(w, h) {
  return { w, h, tiles: new Uint8Array(w * h) };
}

export function setTile(grid, cx, cy, t) {
  if (cx >= 0 && cx < grid.w && cy >= 0 && cy < grid.h) grid.tiles[cy * grid.w + cx] = t;
}

// True when no solid tile overlaps the box.
export function boxFree(grid, x, y, w, h) {
  const x0 = Math.floor(x + EPS);
  const x1 = Math.floor(x + w - EPS);
  const y0 = Math.floor(y + EPS);
  const y1 = Math.floor(y + h - EPS);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (isSolid(tileAt(grid, cx, cy))) return false;
  return true;
}

export const MOVE = { FREE: 0, WALL: 1, STEPPED: 2 };

// Moves the body sideways by dx (|dx| < 1). Returns MOVE.WALL when it was stopped by a wall, or
// MOVE.STEPPED when ledge assist lifted it onto a ledge that was at most `stepUp` above its feet.
export function moveX(b, dx, grid, stepUp = 0) {
  if (dx === 0) return MOVE.FREE;
  b.x += dx;
  const cx = dx > 0 ? Math.floor(b.x + b.w - EPS) : Math.floor(b.x + EPS);
  const y0 = Math.floor(b.y + EPS);
  const y1 = Math.floor(b.y + b.h - EPS);
  for (let cy = y0; cy <= y1; cy++) {
    if (!isSolid(tileAt(grid, cx, cy))) continue;
    // cy is the highest blocked row in that column, since rows are checked top-down.
    const lift = b.y + b.h - cy;
    if (stepUp > 0 && lift > 0 && lift <= stepUp && boxFree(grid, b.x, cy - b.h, b.w, b.h)) {
      b.y = cy - b.h;
      return MOVE.STEPPED;
    }
    b.x = dx > 0 ? cx - b.w : cx + 1;
    return MOVE.WALL;
  }
  return MOVE.FREE;
}

// Moves the body up or down by dy (|dy| < 1) and fills `out`:
//   landed: hit ground (or a one-way platform from above); tile: what it landed on
//   ceiling: bumped its head; shifted: corner correction slid it sideways around a ceiling corner
// opts: { dropThrough: ignore one-way platforms, corner: max sideways slide when rising }
export function moveY(b, dy, grid, opts, out) {
  out.landed = false;
  out.ceiling = false;
  out.shifted = 0;
  out.tile = T.EMPTY;
  if (dy === 0) return out;
  const prevBottom = b.y + b.h;
  b.y += dy;
  const x0 = Math.floor(b.x + EPS);
  const x1 = Math.floor(b.x + b.w - EPS);
  if (dy > 0) {
    const cy = Math.floor(b.y + b.h - EPS);
    const mid = Math.floor(b.x + b.w / 2);
    for (let cx = x0; cx <= x1; cx++) {
      const t = tileAt(grid, cx, cy);
      const lands = isSolid(t) || (t === T.ONEWAY && !opts.dropThrough && prevBottom <= cy + ONEWAY_SLACK);
      if (!lands) continue;
      out.landed = true;
      // What's under the middle of the feet wins (a bounce flower under one toe doesn't count).
      if (out.tile === T.EMPTY || cx === mid) out.tile = t;
    }
    if (out.landed) b.y = cy - b.h;
    return out;
  }
  const cy = Math.floor(b.y + EPS);
  let first = -1;
  let last = -1;
  for (let cx = x0; cx <= x1; cx++) {
    if (!isSolid(tileAt(grid, cx, cy))) continue;
    if (first < 0) first = cx;
    last = cx;
  }
  if (first < 0) return out;
  // Corner correction: only the very edge of the head clipped a corner, so slide around it.
  const corner = opts.corner || 0;
  if (corner > 0) {
    if (first === x0 && last === x0 && x1 > x0) {
      const push = x0 + 1 - b.x;
      if (push <= corner && boxFree(grid, b.x + push + EPS, b.y, b.w, b.h)) {
        b.x += push + EPS;
        out.shifted = push;
        return out;
      }
    }
    if (first === x1 && last === x1 && x1 > x0) {
      const push = b.x + b.w - x1;
      if (push <= corner && boxFree(grid, b.x - push - EPS, b.y, b.w, b.h)) {
        b.x -= push + EPS;
        out.shifted = -push;
        return out;
      }
    }
  }
  b.y = cy + 1;
  out.ceiling = true;
  return out;
}

// What the body is standing on (T.EMPTY when it isn't), checking just under its feet.
export function groundUnder(b, grid, dropThrough = false) {
  const feet = b.y + b.h;
  const cy = Math.floor(feet + 0.02);
  if (feet < cy - 0.03) return T.EMPTY;
  const x0 = Math.floor(b.x + EPS);
  const x1 = Math.floor(b.x + b.w - EPS);
  let found = T.EMPTY;
  for (let cx = x0; cx <= x1; cx++) {
    const t = tileAt(grid, cx, cy);
    if (isSolid(t) || (t === T.ONEWAY && !dropThrough)) found = found === T.EMPTY ? t : found;
  }
  return found;
}

// True when both bottom corners rest on something: a safe place to put a rescued player back.
export function fullySupported(b, grid) {
  const cy = Math.floor(b.y + b.h + 0.02);
  const a = tileAt(grid, Math.floor(b.x + EPS), cy);
  const c = tileAt(grid, Math.floor(b.x + b.w - EPS), cy);
  const safe = (t) => t === T.SOLID || t === T.ONEWAY || t === T.BRIDGE;
  return safe(a) && safe(c);
}
