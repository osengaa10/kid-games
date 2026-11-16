// What blocks are made of, and how each kind breaks. Every number here is a feel knob:
//   density, restitution, friction: how pieces weigh, bounce and slide (physics).
//   chunk [min, max]: how many blocks a loosened piece holds.
//   crumbs: little bits thrown per block that gets pulverized.
//   shape: the crumb look ('cube', 'shard' flat and glinty, 'splinter' long and thin, 'gem').
//   dust, sparkle: how much dust cloud and glitter a hit on it makes (0..1).
//   neck: the share of its original support a section needs to keep standing (weak-neck check).
//   strength: 0..1, shrinks a hit's reach a little and keeps more blocks attached.
//   pulverize: true = never makes chunks, only crumbs (glass).
//   sound: which crunch family plays.
export const MAT = {
  EMPTY: 0,
  PLASTIC: 1,
  BRICK: 2,
  STONE: 3,
  WOOD: 4,
  GLASS: 5,
  JELLY: 6,
  CANDY: 7,
  GOLD: 8,
  METAL: 9,
  LEAF: 10,
  TNT: 11,
  GIFT: 12,
  CLOTH: 13,
  SNOW: 14,
  ICE: 15,
  DIRT: 16,
};

const base = {
  density: 1,
  restitution: 0.18,
  friction: 0.75,
  chunk: [2, 6],
  crumbs: 3,
  shape: 'cube',
  dust: 0.6,
  sparkle: 0,
  neck: 0.62,
  strength: 0.1,
  pulverize: false,
  sound: 'plastic',
  special: null,
};

const table = {
  [MAT.PLASTIC]: { name: 'plastic', chunk: [2, 7], dust: 0.35, sparkle: 0.1, neck: 0.62 },
  [MAT.BRICK]: { name: 'brick', density: 1.4, chunk: [3, 8], dust: 0.9, neck: 0.6, strength: 0.12, sound: 'stone' },
  [MAT.STONE]: { name: 'stone', density: 1.8, restitution: 0.1, chunk: [4, 10], crumbs: 2, dust: 1, neck: 0.56, strength: 0.2, sound: 'stone' },
  [MAT.WOOD]: { name: 'wood', density: 0.7, chunk: [2, 5], crumbs: 3, shape: 'splinter', dust: 0.4, neck: 0.66, strength: 0.05, sound: 'wood' },
  [MAT.GLASS]: { name: 'glass', density: 0.9, crumbs: 5, shape: 'shard', dust: 0.05, sparkle: 1, neck: 0.7, strength: 0, pulverize: true, sound: 'glass' },
  [MAT.JELLY]: { name: 'jelly', density: 0.6, restitution: 0.75, friction: 0.5, chunk: [2, 5], crumbs: 3, dust: 0, sparkle: 0.3, neck: 0.62, strength: 0.05, sound: 'jelly' },
  [MAT.CANDY]: { name: 'candy', density: 0.9, chunk: [2, 6], dust: 0.3, sparkle: 0.4, neck: 0.62, sound: 'plastic' },
  [MAT.GOLD]: { name: 'gold', density: 2, chunk: [1, 3], crumbs: 4, shape: 'gem', dust: 0.1, sparkle: 1, neck: 0.58, strength: 0.15, sound: 'glass' },
  [MAT.METAL]: { name: 'metal', density: 2.2, restitution: 0.25, chunk: [3, 7], crumbs: 2, dust: 0.2, sparkle: 0.5, neck: 0.55, strength: 0.25, sound: 'metal' },
  [MAT.LEAF]: { name: 'leaf', density: 0.4, chunk: [2, 5], crumbs: 4, shape: 'shard', dust: 0.2, neck: 0.6, strength: 0, sound: 'wood' },
  // TNT and gifts are always caught by a hit (never flung away as chunks), so they always go off.
  [MAT.TNT]: { name: 'tnt', chunk: [1, 1], crumbs: 3, dust: 0.5, neck: 0.4, pulverize: true, special: 'tnt' },
  [MAT.GIFT]: { name: 'gift', chunk: [1, 1], crumbs: 4, shape: 'gem', dust: 0.1, sparkle: 1, neck: 0.4, pulverize: true, special: 'gift' },
  [MAT.CLOTH]: { name: 'cloth', density: 0.3, chunk: [1, 3], crumbs: 3, shape: 'shard', dust: 0, neck: 0.5, strength: 0, sound: 'wood' },
  // Snow: light, falls apart in white puffs, lands with a soft whump.
  [MAT.SNOW]: { name: 'snow', density: 0.5, restitution: 0.04, friction: 0.95, chunk: [2, 6], crumbs: 4, dust: 1, sparkle: 0.25, neck: 0.6, strength: 0, sound: 'snow' },
  // Ice: breaks into glinting shards, and its chunks skate across the grass.
  [MAT.ICE]: { name: 'ice', density: 0.9, restitution: 0.12, friction: 0.05, chunk: [2, 6], crumbs: 4, shape: 'shard', dust: 0.05, sparkle: 0.9, neck: 0.64, strength: 0.05, sound: 'glass' },
  // Dirt: crumbly and very dusty, with a soft crunch.
  [MAT.DIRT]: { name: 'dirt', density: 1.2, restitution: 0.05, friction: 0.95, chunk: [2, 5], crumbs: 4, dust: 1, neck: 0.6, strength: 0, sound: 'snow' },
};

// MATERIALS[id] is the full entry; index 0 (empty) is null.
export const MATERIALS = [];
for (const id of Object.values(MAT)) {
  MATERIALS[id] = id ? { id, ...base, ...table[id] } : null;
}

export const material = (id) => MATERIALS[id] || MATERIALS[MAT.PLASTIC];
