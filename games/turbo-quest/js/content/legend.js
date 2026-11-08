// What each character in a level map means. Symbols are terrain, uppercase letters and digits
// are pickups and markers, lowercase letters are Grumblies, and a few are scenery.
import { T } from '../engine/collide.js';

export const TILE_GLYPHS = {
  '#': T.SOLID, // ground (grass on top, dirt below, edges worked out automatically)
  '=': T.ONEWAY, // bamboo platform: jump up through it
  o: T.BOUNCE, // bounce flower
  x: T.BREAK, // leafy wall: shoot it (or Giant Pup it) to open a secret
  '~': T.BRIDGE, // rope-bridge plank (usually in a section's kid overlay)
  '^': T.THORN, // brambles: hurt in Dad Mode, harmless flowers in Kid Mode
  '-': T.WATER, // river water: falling in is like a pit
  r: T.ROCK, // a mossy river rock (solid)
};

export const ENEMY_GLYPHS = { w: 'waddler', h: 'hopper', f: 'flapper', s: 'spitter', b: 'bonker', c: 'charger', M: 'bigbonker' };

export const PICKUP_GLYPHS = {
  '*': 'star',
  1: 'gem',
  2: 'gem',
  3: 'gem',
  H: 'heart',
  B: 'bubble', // Bubble Cannon capsule
  R: 'spread', // Star Spread capsule
  O: 'boing', // Boing Balls capsule
  F: 'frost', // Frosty Ray capsule
  K: 'rockets', // Fizz Rockets capsule
  '@': 'shield', // Shield Bubble
  G: 'giant', // Mega Bone: Giant Pup
  Y: 'zoom', // Zoom Boots
  U: 'magnet', // Magnet Collar (a horseshoe U)
  T: 'treat', // Heart Treat: one more heart for good (Dad Mode)
};

export const DECOR_GLYPHS = { p: 'palm', '%': 'fern', t: 'tiki', ',': 'flowers' };

// Markers: S start, > goal (Party Popper), m moving log, n raft (rides the river when stood on),
// Z the boss (Tiki Tumble), . empty.
export const MARKERS = new Set(['S', '>', 'm', 'n', 'Z', '.', ' ']);
