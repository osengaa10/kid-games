// How many loose pieces the physics may juggle, which ones to tidy away when there are too many,
// and how a big piece breaks up when it lands.
//
// Moving pieces are what cost physics time; pieces lying still cost almost nothing. So only
// settled pieces are ever tidied away (never one that's still flying or falling), and only when
// the total gets large: rubble piles stay where they fell.

// pieces: [{ id, blocks, asleepFor, age }]. Returns the ids of up to `need` settled pieces to
// remove: settled longest first, small before big.
export function evictions(pieces, need) {
  if (need <= 0) return [];
  const ranked = pieces
    .filter((p) => p.asleepFor >= SETTLED)
    .map((p) => ({ id: p.id, score: p.asleepFor * 10 + p.age - Math.min(p.blocks, 400) * 0.5 }))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, need).map((p) => p.id);
}

// A piece counts as settled after lying still this long.
export const SETTLED = 0.5;

// The tiniest bits (a few little blocks) still get tidied away in a puff after lying still a
// while, so the ground doesn't fill up with physics bodies the size of crumbs.
export const TIDY_AFTER = 10;
export const TIDY_MAX_BLOCKS = 3;
export const tidy = (p) => p.blocks <= TIDY_MAX_BLOCKS && p.asleepFor >= TIDY_AFTER;

// How a piece breaks when it lands, by each block's distance from where it hit (world units):
//   zone 0, near the hit: small clumps (and some crumbs)
//   zone 1, a bit further: medium chunks
//   zone 2, far away: a few big slabs that keep falling and break when they land themselves
// room: how many new pieces there's room for. Clumps grow until the expected count fits, so
// nothing ever has to be thrown away. eq: the piece's size in old-size blocks (small pieces just
// break into small bits). Returns { zone (per block), sizes: [[lo, hi] ×3], counts, pieces }.
export function shatterPlan(dist, room, { near = 3, mid = 8, eq = Infinity } = {}) {
  const n = dist.length;
  const zone = new Uint8Array(n);
  const counts = [0, 0, 0];
  const small = eq <= 12;
  for (let i = 0; i < n; i++) {
    const z = small ? 0 : dist[i] < near ? 0 : dist[i] < mid ? 1 : 2;
    zone[i] = z;
    counts[z]++;
  }
  const slabs = Math.max(1, Math.min(4, Math.ceil(counts[2] / 1500)));
  const farSize = Math.max(1, Math.round(counts[2] / slabs));
  let sizes = [small ? [1, 5] : [6, 24], [40, 160], [Math.max(1, Math.round(farSize * 0.7)), Math.max(1, Math.round(farSize * 1.3))]];
  const expected = (s) => counts.reduce((sum, c, z) => sum + (c ? Math.ceil(c / ((s[z][0] + s[z][1]) / 2)) : 0), 0);
  room = Math.max(1, room);
  // Not enough room: make the near and middle pieces bigger, a step at a time.
  for (let k = 0; k < 8 && expected(sizes) > room; k++) sizes = [sizes[0].map((v) => v * 2), sizes[1].map((v) => v * 2), sizes[2]];
  // Still too many: the whole thing becomes `room` even slabs.
  if (expected(sizes) > room) {
    zone.fill(2);
    counts[0] = counts[1] = 0;
    counts[2] = n;
    const size = Math.max(1, Math.ceil(n / room));
    sizes = [
      [size, size],
      [size, size],
      [size, size],
    ];
  }
  return { zone, sizes, counts, pieces: expected(sizes) };
}
