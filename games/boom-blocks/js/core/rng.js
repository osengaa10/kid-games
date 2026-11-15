// A small seeded random number generator (mulberry32), so a rebuild with the same seed cracks
// the same way and the tests can replay it. Each rebuild gets a fresh seed for variety.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

// A stable 0..1 hash of an integer (and a seed): the same cell always gets the same wobble.
export function hash01(n, seed = 0) {
  let h = Math.imul((n | 0) ^ Math.imul(seed | 0, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const range = (r, a, b) => a + (b - a) * r();
export const pick = (r, list) => list[Math.floor(r() * list.length)];
