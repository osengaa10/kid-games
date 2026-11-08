// Pickups and power-ups (one timed power-up at a time; a new one replaces the old).

export const POWERUPS = {
  shield: { hits: { kid: 3, dad: 1 } }, // a bubble round Turbo that takes hits for him
  giant: { time: 7, scale: 1.8 }, // Mega Bone: walk through Grumblies, smash leafy walls
  turbo: { time: 6, speedMul: 1.3, rateMul: 2, meter: { kid: 8, dad: 15 } }, // earned by cheering
  zoom: { time: 8, speedMul: 1.4, jumpMul: 1.08 }, // Zoom Boots
  magnet: { time: 15, radius: 6 }, // Magnet Collar: stars this close fly to Turbo
  freeze: { kid: 6, dad: 4 }, // how long a Frosty Ray ice block lasts
};

// Kid Mode gets a heart back every 8 s without a hit. Heart Treats add one heart for good, up to 5.
export const HEARTS = { kid: 3, dad: 3, max: 5, regen: { kid: 8 } };

// Points (Dad Mode shows them; Kid Mode never does).
export const POINTS = { cheer: 100, star: 10, gem: 1000, heart: 50, noHit: 2000, timeBonus: 50, maxChain: 10, chainTime: 2, boss: 5000, miniboss: 2000 };

// The abilities bosses give for good (both modes).
export const ABILITIES = { doubleJump: { from: 'w1-b', height: { kid: 2.6, dad: 2.4 } } };
