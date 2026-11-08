// A decorated example of each item, for the pictures on the home screen (and the Kid Games card).
// They're ordinary designs, built from strokes like the ones he makes.
import { newDesign, decode } from './design.js';
import { shapeOf } from './items.js';

// A spray stroke sweeping back and forth over part of the case, like a careful painter.
function sweep(item, style, c, seed, from = 0, to = 1, rows = 8) {
  const sh = shapeOf(item, style);
  const [ax, ay, aw, ah] = sh.area;
  const p = [];
  const step = 16 * sh.u;
  for (let r = 0; r < rows; r++) {
    const y = ay + ah * (from + ((to - from) * (r + 0.5)) / rows);
    const xs = [];
    for (let x = ax - 30 * sh.u; x <= ax + aw + 30 * sh.u; x += step) xs.push(x);
    if (r % 2) xs.reverse();
    for (const x of xs) p.push(Math.round(x), Math.round(y));
  }
  return { k: 'spray', c, s: seed, p };
}

const sticker = (e, x, y, z = 1, r = 0) => ({ k: 'sticker', e, x, y, z, r });
const gems = (g, s, pts) => ({ k: 'gems', g, s, p: pts.flat() });

export function demoDesign(item) {
  const d = newDesign(item);
  const L = d.layers;
  if (item === 'phone') {
    d.style = 'cat';
    L.spray.push(sweep(item, d.style, 'rainbow', 3, 0, 1, 12));
    L.puffy.push({ k: 'pattern', pat: 'hearts', c: 'white' });
    L.sticker.push(sticker('🦄', 250, 600, 2, -0.12), sticker('⭐', 360, 330, 1, 0.2));
    L.gem.push(gems('pinkheart', 5, [[90, 900], [160, 915], [240, 920], [320, 915], [390, 900]]));
  } else if (item === 'tablet') {
    d.style = 'robot';
    L.spray.push(sweep(item, d.style, 'sky', 4, 0, 0.55, 6), sweep(item, d.style, 'purple', 5, 0.45, 1, 6));
    L.puffy.push({ k: 'pattern', pat: 'dots', c: 'white' });
    L.sticker.push(sticker('🚀', 640, 380, 2, 0.3), sticker('🪐', 330, 300, 2, -0.1), sticker('👽', 470, 560, 1, 0.1));
  } else if (item === 'earbuds') {
    d.style = 'cactus';
    L.puffy.push({ k: 'pattern', pat: 'popit', c: 'rainbow' });
    L.sticker.push(sticker('😎', 420, 430, 1, -0.08));
  } else if (item === 'controller') {
    d.style = 'dino';
    L.spray.push(sweep(item, d.style, 'orange', 6, 0, 0.6, 5), sweep(item, d.style, 'yellow', 7, 0.55, 1, 5));
    L.marker.push({ k: 'marker', c: 'black', s: 1, p: [140, 380, 180, 340, 220, 380, 260, 340, 300, 380] });
    L.sticker.push(sticker('🦖', 500, 96, 1, 0.1));
    L.gem.push(gems('goldstar', 8, [[200, 420], [800, 420], [345, 96]]));
  }
  // Number the strokes so they stack spray, puffy paint, markers, stickers, then gems.
  return decode(d);
}
