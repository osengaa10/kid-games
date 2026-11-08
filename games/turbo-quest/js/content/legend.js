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
};

export const ENEMY_GLYPHS = { w: 'waddler', h: 'hopper', f: 'flapper' };

export const PICKUP_GLYPHS = {
  '*': 'star',
  1: 'gem',
  2: 'gem',
  3: 'gem',
  H: 'heart',
  B: 'bubble', // Bubble Cannon capsule
  R: 'spread', // Star Spread capsule
  '@': 'shield', // Shield Bubble
  G: 'giant', // Mega Bone: Giant Pup
};

export const DECOR_GLYPHS = { p: 'palm', '%': 'fern', t: 'tiki', ',': 'flowers' };

// Markers: S start, > goal (Party Popper), m moving log, . empty.
export const MARKERS = new Set(['S', '>', 'm', '.', ' ']);
