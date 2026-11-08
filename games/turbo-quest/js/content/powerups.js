// Pickups and power-ups (one timed power-up at a time; a new one replaces the old).

export const POWERUPS = {
  shield: { hits: { kid: 3, dad: 1 } }, // a bubble round Turbo that takes hits for him
  giant: { time: 7, scale: 1.8 }, // Mega Bone: walk through Grumblies, smash leafy walls
  turbo: { time: 6, speedMul: 1.3, rateMul: 2, meter: { kid: 8, dad: 15 } }, // earned by cheering
};

export const HEARTS = { kid: 3, dad: 3, regen: { kid: 8 } }; // Kid Mode gets a heart back every 8 s without a hit

// Points (Dad Mode shows them; Kid Mode never does).
export const POINTS = { cheer: 100, star: 10, gem: 1000, heart: 50, noHit: 2000, timeBonus: 50, maxChain: 10, chainTime: 2 };
