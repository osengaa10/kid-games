// The Pup Closet: hats, fur colors and Pop-Pack paint. Each unlocks when the player's all-time
// star count reaches its number (stars are never spent, so nothing can be wasted). Picture-only.

export const HATS = [
  { id: 'none', stars: 0 },
  { id: 'party', stars: 40 },
  { id: 'flower', stars: 110 },
  { id: 'crown', stars: 220 },
  { id: 'pirate', stars: 360 },
  { id: 'astro', stars: 560 },
];

export const FURS = [
  { id: 'classic', stars: 0, fur: '#f2952c', deep: '#d97a18', dark: '#b8620f', cream: '#fff3dc', ear: '#ffc4a3' },
  { id: 'choco', stars: 70, fur: '#9a5c34', deep: '#814a26', dark: '#5a3115', cream: '#f5e3cc', ear: '#e3a888' },
  { id: 'snow', stars: 160, fur: '#f4f1ea', deep: '#e2dccf', dark: '#a89e8a', cream: '#ffffff', ear: '#ffd0c4' },
  { id: 'midnight', stars: 300, fur: '#5a6478', deep: '#4a5366', dark: '#2c3242', cream: '#e6eaf2', ear: '#c9a3b8' },
  { id: 'candy', stars: 480, fur: '#f7a6c9', deep: '#ee8db8', dark: '#b8527f', cream: '#fff1f7', ear: '#ffd6e8' },
];

export const PACKS = [
  { id: 'red', stars: 0, color: '#e8463d', dark: '#9e2520' },
  { id: 'blue', stars: 50, color: '#3b8ff0', dark: '#1f56a8' },
  { id: 'green', stars: 140, color: '#42c25a', dark: '#24803a' },
  { id: 'purple', stars: 260, color: '#9a5ae8', dark: '#5f2aa8' },
  { id: 'gold', stars: 420, color: '#ffc93a', dark: '#b8860a' },
];

export const DEFAULT_LOOK = { hat: 'none', fur: 'classic', pack: 'red' };

export const CLOSET = { hat: HATS, fur: FURS, pack: PACKS };

export const isUnlocked = (item, stars) => stars >= item.stars;

// The next thing to unlock (for the star bar), or null when everything is.
export function nextUnlock(stars) {
  const all = [...HATS, ...FURS, ...PACKS].filter((i) => i.stars > stars).sort((a, b) => a.stars - b.stars);
  return all[0] || null;
}
