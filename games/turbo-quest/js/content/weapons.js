// Weapons as data. The Pop Blaster is always there; any other is carried until its ammo runs
// out (in Kid Mode it never does). Picking up the same weapon levels it up (to 3) and refills
// it; a different one swaps, and the old one floats nearby for 6 s to grab back.
// rate: shots per second; speed in tiles/s; life in s; r: radius in tiles; arc: total spread;
// range: how far it reaches (auto-fire only aims at Grumblies this close); drag and rise: how
// fast a shot slows down and floats up (bubbles).

export const WEAPONS = {
  pop: {
    rate: { kid: 4, dad: 7 },
    speed: 17,
    life: 0.55,
    range: 9,
    r: 0.16,
    dmg: 1,
    count: 1,
    // Dad Mode: hold FIRE while standing still to charge a Big Pop.
    charge: { time: 0.7, speed: 15, life: 0.8, r: 0.42, dmg: 3, pierce: 2 },
  },
  bubble: {
    ammo: 24,
    rate: { kid: 2, dad: 2.6 },
    speed: 9,
    life: 1.3,
    drag: 0.6,
    rise: 0.6,
    range: 7.5,
    r: 0.42,
    dmg: 0,
    effect: 'trap', // traps a Grumbly in a bubble you can pop or bounce on
    count: 1,
    levels: [{}, { r: 0.55 }, { count: 2, arc: 0.3, r: 0.5 }],
  },
  spread: {
    ammo: 30,
    rate: { kid: 3, dad: 4.5 },
    speed: 14,
    life: 0.5,
    range: 7,
    r: 0.2,
    dmg: 1,
    count: 3,
    arc: 0.45,
    levels: [{}, { count: 5, arc: 0.8 }, { count: 5, arc: 0.9, life: 0.75, range: 10 }],
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS);

// The numbers for one weapon at one level.
export function weaponSpec(id, level = 1) {
  const w = WEAPONS[id];
  const lv = (w.levels && w.levels[Math.max(0, Math.min(level, w.levels.length) - 1)]) || {};
  return { ...w, ...lv };
}
