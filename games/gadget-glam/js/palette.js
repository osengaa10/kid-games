// Colors, stickers and gems, each with the word the game says when he picks it.

export const COLORS = {
  red: { hex: '#ff3347', say: 'Red' },
  orange: { hex: '#ff8a1c', say: 'Orange' },
  yellow: { hex: '#ffd60a', say: 'Yellow' },
  green: { hex: '#2fc75a', say: 'Green' },
  sky: { hex: '#29c4ff', say: 'Sky blue' },
  blue: { hex: '#2f5bff', say: 'Blue' },
  purple: { hex: '#9a45ff', say: 'Purple' },
  pink: { hex: '#ff5cb6', say: 'Pink' },
  white: { hex: '#ffffff', say: 'White' },
  black: { hex: '#2b2b38', say: 'Black' },
  rainbow: { hex: '#ff3347', say: 'Rainbow!' },
  glitter: { hex: '#ffd34d', say: 'Glitter!' },
};

export const SPRAY = ['red', 'orange', 'yellow', 'green', 'sky', 'blue', 'purple', 'pink', 'rainbow', 'glitter'];
export const PUFFY = ['white', 'red', 'yellow', 'green', 'blue', 'purple', 'pink', 'rainbow'];
export const MARKER = ['black', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'rainbow', 'glitter'];
export const STAMPS = ['heart', 'star', 'paw'];
export const STAMP_SAY = { heart: 'Heart stamp', star: 'Star stamp', paw: 'Paw print' };

// Glitter flecks and sparkly specks come in these.
export const GLITTER = ['#ffd34d', '#ffffff', '#ff7ad9', '#6fe7ff', '#b98cff', '#9dff8a'];

export function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hslRGB(h, s = 0.92, l = 0.56) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// A rainbow that steps through the colors (t is any number; one step per unit).
export const rainbowRGB = (t) => hslRGB((((t * 30) % 360) + 360) % 360);

// Mix toward white (amt > 0) or black (amt < 0).
export function shade([r, g, b], amt) {
  const t = amt > 0 ? 255 : 0;
  const a = Math.abs(amt);
  return [r + (t - r) * a, g + (t - g) * a, b + (t - b) * a].map(Math.round);
}

export const css = ([r, g, b], a = 1) => (a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`);

// Stickers: emoji with a white die-cut edge, in pages of eight.
export const STICKER_PAGES = [
  [
    ['🐶', 'Puppy'], ['🐱', 'Kitty'], ['🐰', 'Bunny'], ['🦄', 'Unicorn'],
    ['🐼', 'Panda'], ['🦊', 'Fox'], ['🐸', 'Froggy'], ['🐵', 'Monkey'],
  ],
  [
    ['🚚', 'Truck'], ['🚒', 'Fire truck'], ['🚜', 'Tractor'], ['🏎️', 'Race car'],
    ['🚀', 'Rocket'], ['🚁', 'Helicopter'], ['🚂', 'Train'], ['🛸', 'Flying saucer'],
  ],
  [
    ['🍕', 'Pizza'], ['🍩', 'Donut'], ['🍦', 'Ice cream'], ['🍓', 'Strawberry'],
    ['🍉', 'Watermelon'], ['🧁', 'Cupcake'], ['🍪', 'Cookie'], ['🍭', 'Lollipop'],
  ],
  [
    ['😀', 'Happy'], ['😎', 'So cool'], ['🤩', 'Star eyes'], ['😜', 'Silly'],
    ['🥳', 'Party'], ['👻', 'Ghost'], ['🤖', 'Robot'], ['👽', 'Alien'],
  ],
  [
    ['⭐', 'Star'], ['🌈', 'Rainbow'], ['☀️', 'Sunshine'], ['🌙', 'Moon'],
    ['🪐', 'Planet'], ['🌸', 'Flower'], ['⚡', 'Lightning'], ['❤️', 'Heart'],
  ],
  [
    ['🦖', 'Dinosaur'], ['🦕', 'Long neck'], ['🐙', 'Octopus'], ['🦋', 'Butterfly'],
    ['🐢', 'Turtle'], ['🦈', 'Shark'], ['🐝', 'Bee'], ['🐞', 'Ladybug'],
  ],
];
export const STICKER_SAY = Object.fromEntries(STICKER_PAGES.flat());

// Sticker sizes in item units (times the item's unit scale).
export const STICKER_SIZES = [150, 215, 290];

// Gems: [id, shape, color, word]. "mix" picks a different gem for each one in a trail.
export const GEMS = [
  ['diamond', 'round', '#dff4ff', 'Diamond'],
  ['pinkheart', 'heart', '#ff6fb5', 'Pink heart'],
  ['sapphire', 'round', '#3f7bff', 'Blue gem'],
  ['emerald', 'round', '#28d07a', 'Green gem'],
  ['purplestar', 'star', '#a65bff', 'Purple star'],
  ['goldstar', 'star', '#ffc929', 'Gold star'],
  ['ruby', 'heart', '#ff2e45', 'Red heart'],
  ['pearl', 'pearl', '#fff6fb', 'Pearl'],
  ['mix', 'mix', '#ffffff', 'Rainbow gems!'],
];
export const GEM = Object.fromEntries(GEMS.map(([id, shape, color, say]) => [id, { id, shape, color, say }]));
export const GEM_IDS = GEMS.map((g) => g[0]).filter((id) => id !== 'mix');
