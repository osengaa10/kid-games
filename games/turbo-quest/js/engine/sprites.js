// Art drawn in code is painted once onto a small canvas at the current size, then stamped with
// drawImage every frame (the same idea as Coaster Doodle's sprite cache). Paint functions draw in
// tiles: 1 unit = 1 tile. Everything is repainted when the tile size changes (a resize or a new
// quality tier). The cache counts its own memory, so the debug overlay can show it.

let ppt = 64; // pixels per tile
const cache = new Map();
let bytes = 0;
let ns = ''; // cache namespace while baking at another size (see withTileSize)

export function setTileSize(px) {
  if (Math.abs(px - ppt) < 0.01) return;
  ppt = px;
  clearSprites();
}

export const tileSize = () => ppt;

// Runs fn with sprites baked at `px` pixels per tile, cached separately (e.g. a big Turbo on the
// title screen stays sharp without throwing away the in-game sprites).
export function withTileSize(px, fn) {
  const oldPpt = ppt;
  const oldNs = ns;
  ppt = px;
  ns = `${Math.round(px)}|`;
  try {
    return fn();
  } finally {
    ppt = oldPpt;
    ns = oldNs;
  }
}

export function clearSprites() {
  cache.clear();
  bytes = 0;
}

export const spriteBytes = () => bytes;
export const spriteCount = () => cache.size;

// A sprite w × h tiles; (ox, oy) is where its anchor is, in tiles from its top-left.
// paint(ctx) draws in tiles. Returns { canvas, w, h, ox, oy }.
export function sprite(key, w, h, paint, ox = 0, oy = 0, px = ppt) {
  key = ns + key;
  let s = cache.get(key);
  if (s) return s;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * px));
  c.height = Math.max(1, Math.ceil(h * px));
  const g = c.getContext('2d');
  g.scale(c.width / w, c.height / h);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  paint(g);
  s = { canvas: c, w, h, ox, oy };
  cache.set(key, s);
  bytes += c.width * c.height * 4;
  return s;
}
