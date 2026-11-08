// The stickers he gives out at the end of a check-up: emoji with a white die-cut border, like a
// real sticker sheet (the sprite is Gadget Glam's stickerSprite). Each one has a word to say.
import { EMOJI_FONT } from './style.js';

export const STICKERS = [
  ['⭐', 'A gold star'], ['🦄', 'A unicorn'], ['🚀', 'A rocket'], ['🌈', 'A rainbow'],
  ['🦖', 'A dinosaur'], ['🚒', 'A fire truck'], ['🍭', 'A lollipop'], ['🐶', 'A puppy'],
  ['🏆', 'A trophy'], ['🦋', 'A butterfly'], ['🚜', 'A tractor'], ['🍓', 'A strawberry'],
  ['🐸', 'A froggy'], ['⚽', 'A ball'], ['🦁', 'A lion'], ['🍩', 'A donut'],
  ['🎈', 'A balloon'], ['🐳', 'A whale'], ['🌻', 'A sunflower'], ['🏎️', 'A race car'],
  ['🐙', 'An octopus'], ['🧁', 'A cupcake'], ['🦕', 'A long-neck dino'], ['🎉', 'A party'],
];
export const STICKER_SAY = Object.fromEntries(STICKERS);

// Four different stickers to pick from, using the rand you give it.
export function sheet(rand = Math.random, n = 4) {
  const pool = STICKERS.map(([e]) => e);
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const sprites = new Map();

// An emoji with a white die-cut border, like a real sticker, and its shadow.
export function stickerSprite(e) {
  let sp = sprites.get(e);
  if (sp) return sp;
  const S = 256;
  const b = 13;
  const em = makeCanvas(S, S);
  const g = em.getContext('2d');
  g.font = `${Math.round(S * 0.66)}px ${EMOJI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(e, S / 2, S / 2 + S * 0.035);
  const img = makeCanvas(S, S);
  const o = img.getContext('2d');
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    o.drawImage(em, Math.cos(a) * b, Math.sin(a) * b);
  }
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = '#fff';
  o.fillRect(0, 0, S, S);
  o.globalCompositeOperation = 'source-over';
  o.drawImage(em, 0, 0);
  const shadow = makeCanvas(S, S);
  const s = shadow.getContext('2d');
  s.drawImage(img, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = 'rgb(30,20,60)';
  s.fillRect(0, 0, S, S);
  sp = { img, shadow };
  sprites.set(e, sp);
  return sp;
}

// A sticker `size` px across centered on (x, y), with a small drop shadow; lifted makes it float.
export function drawSticker(g, e, x, y, size, rot = 0, lifted = false) {
  const sp = stickerSprite(e);
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const off = size * (lifted ? 0.08 : 0.025);
  g.globalAlpha = lifted ? 0.25 : 0.3;
  g.drawImage(sp.shadow, -size / 2 + off * 0.4, -size / 2 + off, size, size);
  g.globalAlpha = 1;
  g.drawImage(sp.img, -size / 2, -size / 2, size, size);
  g.restore();
}
