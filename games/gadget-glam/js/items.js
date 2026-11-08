// The things he can decorate, as plain shapes. There's no canvas in here, so the tests can check them.
//
// Each item has its own units (the phone is 480 wide). A shape is a list of parts:
//   { rr: [x, y, w, h, r] }          a rounded rectangle
//   { el: [cx, cy, rx, ry, rot] }    an ellipse (rot in radians; positive turns clockwise on screen)
//   { poly: [[x, y], ...] }          a polygon
// The case is everything the parts cover, minus the holes (cameras, buttons): paint never lands there.

// The shapes he can start from, a page of them at a time in the tray (the arrows show the rest):
// cute animals first, then creatures and things.
export const STYLE_PAGES = [
  ['plain', 'cat', 'bunny', 'bear', 'unicorn', 'butterfly'],
  ['dino', 'shark', 'cactus', 'robot', 'rocket', 'crown'],
];
export const STYLES = STYLE_PAGES.flat();
export const STYLE_SAY = {
  plain: 'Plain',
  cat: 'Kitty ears',
  bunny: 'Bunny ears',
  bear: 'Teddy bear',
  unicorn: 'Unicorn',
  butterfly: 'Butterfly',
  dino: 'Dinosaur',
  shark: 'Shark',
  cactus: 'Cactus',
  robot: 'Robot',
  rocket: 'Rocket ship',
  crown: 'Crown',
};

// The color of the plastic, before he paints it.
const WHITE = '#f8f7fc';
export const STYLE_PLASTIC = {
  plain: WHITE,
  cat: WHITE,
  bunny: WHITE,
  bear: WHITE,
  unicorn: '#fbf3ff',
  butterfly: '#efe4ff',
  dino: '#8fdc6c',
  shark: '#93b9de',
  cactus: '#57c86a',
  robot: '#d9e0ea',
  rocket: WHITE,
  crown: WHITE,
};

const PINK = '#ffb6d2'; // inside the ears
const GOLD = '#ffc83d';

// body: the case (with covers over the gadget's side buttons, so they get painted too).
// holes: where the gadget shows through and paint can't go (cameras, buttons, the earbuds).
// behind: bits of the gadget that stick out from behind the case (the controller's triggers).
// ears: where the two ears sit on the top edge, and how big they are.
// arms: the cactus arms (and the butterfly's wings, the robot's bolts) come out of the left and
//   right edges at height y.
// spikes: the dinosaur spikes (and the crown) run along the top edge from x0 to x1.
// fins: the shark's and the rocket's fins come out of the left and right edges lower down, at y.
// Nothing a style adds reaches further than the bunny ears (about 1.38 ears.s above the top) or
// the cactus arms (0.75 arms.s out to the side), or below the bottom: the item's box fits every
// style, so going further would make every case smaller on screen.
// area: the rectangle the puffy-paint patterns fill.
// popit: how big a pop-it bubble's cell is (smaller on the controller, to fit round its buttons).
export const ITEMS = {
  phone: {
    say: 'Phone',
    // Seen from the back: camera top left, power button on the left, volume on the right.
    body: [
      { rr: [0, 0, 480, 980, 84] },
      { rr: [-8, 300, 16, 140, 7] }, // power
      { rr: [472, 180, 16, 52, 7] }, // action button
      { rr: [472, 262, 16, 96, 7] }, // volume up
      { rr: [472, 374, 16, 96, 7] }, // volume down
    ],
    holes: [{ rr: [30, 30, 200, 200, 50] }],
    area: [24, 24, 432, 932],
    ears: { at: [[118, 0], [362, 0]], s: 150 },
    arms: { xl: 0, xr: 480, y: 470, s: 140 },
    spikes: { x0: 84, x1: 396, y: 0, n: 5, s: 140 },
    fins: { xl: 0, xr: 480, y: 760, s: 150 },
  },
  tablet: {
    say: 'Tablet',
    body: [
      { rr: [0, 0, 960, 700, 64] },
      { rr: [130, -8, 120, 16, 7] }, // top button
      { rr: [700, -8, 76, 16, 7] }, // volume
      { rr: [790, -8, 76, 16, 7] },
    ],
    holes: [
      { rr: [28, 28, 124, 124, 36] },
      // three little connector dots near the bottom
      { el: [456, 668, 7, 7, 0] },
      { el: [480, 668, 7, 7, 0] },
      { el: [504, 668, 7, 7, 0] },
    ],
    area: [24, 24, 912, 652],
    ears: { at: [[240, 0], [720, 0]], s: 210 },
    arms: { xl: 0, xr: 960, y: 300, s: 190 },
    spikes: { x0: 110, x1: 850, y: 0, n: 7, s: 180 },
    fins: { xl: 0, xr: 960, y: 430, s: 190 },
  },
  earbuds: {
    say: 'Earbud case',
    // Flipped open: the lid tipped back at the top, the case below, and the earbuds sitting in
    // the white insert between them.
    body: [
      { rr: [20, 0, 520, 132, 60] }, // the lid
      { rr: [0, 160, 560, 380, 110] }, // the case
    ],
    holes: [{ rr: [40, 160, 480, 110, 50] }], // the insert the earbuds sit in
    area: [30, 14, 500, 512],
    ears: { at: [[150, 2], [410, 2]], s: 130 },
    arms: { xl: 0, xr: 560, y: 330, s: 130 },
    spikes: { x0: 100, x1: 460, y: 2, n: 4, s: 120 },
    fins: { xl: 0, xr: 560, y: 330, s: 130 },
  },
  controller: {
    say: 'Game controller',
    body: [
      { rr: [90, 30, 820, 320, 150] },
      { el: [235, 330, 140, 190, 0.38] },
      { el: [765, 330, 140, 190, -0.38] },
    ],
    holes: [
      // D-pad
      { poly: [[228, 132], [272, 132], [272, 168], [308, 168], [308, 212], [272, 212], [272, 248], [228, 248], [228, 212], [192, 212], [192, 168], [228, 168]] },
      // four round buttons
      { el: [750, 132, 27, 27, 0] },
      { el: [806, 190, 27, 27, 0] },
      { el: [750, 248, 27, 27, 0] },
      { el: [694, 190, 27, 27, 0] },
      // two thumbsticks
      { el: [392, 292, 50, 50, 0] },
      { el: [608, 292, 50, 50, 0] },
      // two little middle buttons, and the home button
      { rr: [440, 150, 48, 24, 12] },
      { rr: [512, 150, 48, 24, 12] },
      { el: [500, 228, 22, 22, 0] },
    ],
    // Triggers and bumpers, peeking out over the top edge.
    behind: [
      { rr: [175, -24, 160, 64, 30] },
      { rr: [665, -24, 160, 64, 30] },
      { rr: [150, 4, 212, 60, 28] },
      { rr: [638, 4, 212, 60, 28] },
    ],
    area: [110, 46, 780, 420],
    popit: 78,
    ears: { at: [[300, 30], [700, 30]], s: 170 },
    arms: { xl: 92, xr: 908, y: 160, s: 150 },
    spikes: { x0: 250, x1: 750, y: 30, n: 5, s: 150 },
    fins: { xl: 100, xr: 900, y: 300, s: 140 },
  },
};
export const ITEM_IDS = Object.keys(ITEMS);

// A polygon with its corners rounded off (each corner becomes a little curve of points).
export function roundedPoly(verts, r, steps = 6) {
  const out = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const a = verts[(i + n - 1) % n];
    const v = verts[i];
    const b = verts[(i + 1) % n];
    const la = Math.hypot(a[0] - v[0], a[1] - v[1]);
    const lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const rr = Math.min(r, la * 0.45, lb * 0.45);
    const p1 = [v[0] + ((a[0] - v[0]) / la) * rr, v[1] + ((a[1] - v[1]) / la) * rr];
    const p2 = [v[0] + ((b[0] - v[0]) / lb) * rr, v[1] + ((b[1] - v[1]) / lb) * rr];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const s = 1 - t;
      out.push([s * s * p1[0] + 2 * s * t * v[0] + t * t * p2[0], s * s * p1[1] + 2 * s * t * v[1] + t * t * p2[1]]);
    }
  }
  return out;
}

// Twice the area of a polygon, signed: positive when it goes round clockwise on screen, the same
// way as the rounded rectangles and ellipses.
export function polyArea(v) {
  let a = 0;
  for (let i = 0; i < v.length; i++) {
    const [x0, y0] = v[i];
    const [x1, y1] = v[(i + 1) % v.length];
    a += x0 * y1 - x1 * y0;
  }
  return a;
}

// Every part has to go round the same way, or where two overlap, a path made of all of them (see
// unionPath) would have a hole there.
const clockwise = (v) => (polyArea(v) < 0 ? [...v].reverse() : v);
const rpoly = (verts, r) => ({ poly: roundedPoly(clockwise(verts), r) });

// A polygon shrunk toward its middle, and moved down by dy (the inside of a kitty ear).
function shrink({ poly }, k, dy) {
  const n = poly.length;
  const cx = poly.reduce((a, q) => a + q[0], 0) / n;
  const cy = poly.reduce((a, q) => a + q[1], 0) / n;
  return { poly: poly.map(([x, y]) => [cx + (x - cx) * k, cy + dy + (y - cy) * k]) };
}

// What a style adds to the item:
//   parts:   more outline (ears, horns, fins, wings...). A part can have a `tag`, to find it again.
//   accents: { part, c } areas of another color on the plastic, which paint covers like the rest.
//            `under` tucks it under the item's body, so it only shows where it sticks out (fins,
//            wings, the horn); `front` leaves it off the inside of the case (seen in 3D).
//   trims:   { k, x, y, s } bits that are never painted, drawn on top (see trims.js).
export function styleParts(itemId, style) {
  const it = ITEMS[itemId];
  const parts = [];
  const accents = [];
  const trims = [];
  const add = (part, c, opts) => {
    parts.push(part);
    if (c) accents.push({ part, c, ...opts });
    return part;
  };
  const accent = (part, c, opts) => accents.push({ part, c, ...opts });
  const { s } = it.ears;
  const [[xa, ty], [xb]] = it.ears.at;
  const tx = (xa + xb) / 2; // the middle of the top edge
  // Each side, as [the edge, which way is out].
  const sides = (a) => [[a.xl, -1], [a.xr, 1]];
  const catEar = (x, y, dir, k = 1) => {
    const base = s * 0.62 * k;
    return rpoly([[x - base, y + s * 0.3 * k], [x + dir * s * 0.16 * k, y - s * 0.95 * k], [x + base, y + s * 0.3 * k]], s * 0.2 * k);
  };

  if (style === 'cat') {
    it.ears.at.forEach(([x, y], i) => {
      const ear = add(catEar(x, y, i ? 1 : -1));
      accent(shrink(ear, 0.55, -s * 0.07), PINK, { front: true });
    });
  } else if (style === 'bunny') {
    it.ears.at.forEach(([x, y], i) => {
      const dir = i ? 1 : -1;
      const [cx, cy, rx, ry, rot] = add({ el: [x + dir * s * 0.1, y - s * 0.55, s * 0.3, s * 0.85, dir * 0.2] }).el;
      accent({ el: [cx, cy - ry * 0.08, rx * 0.5, ry * 0.72, rot] }, PINK, { front: true });
    });
  } else if (style === 'bear') {
    it.ears.at.forEach(([x, y]) => {
      const [cx, cy, r] = add({ el: [x, y + s * 0.02, s * 0.42, s * 0.42, 0] }).el;
      accent({ el: [cx, cy - r * 0.12, r * 0.55, r * 0.55, 0] }, '#ffc9a6', { front: true });
    });
  } else if (style === 'unicorn') {
    // A tall golden horn in the middle, and two little ears.
    const horn = add(rpoly([[tx - s * 0.24, ty + s * 0.22], [tx + s * 0.04, ty - s * 1.3], [tx + s * 0.24, ty + s * 0.22]], s * 0.08), GOLD, { under: true });
    horn.tag = 'horn';
    it.ears.at.forEach(([x, y], i) => {
      const ear = add(catEar(x, y, i ? 1 : -1, 0.6));
      accent(shrink(ear, 0.55, -s * 0.04), PINK, { front: true });
    });
  } else if (style === 'butterfly') {
    // Wings out of each side, a big one up top and a little one below, each with a spot.
    const { y, s: as } = it.arms;
    for (const [x, dir] of sides(it.arms)) {
      add({ el: [x + dir * as * 0.12, y - as * 0.7, as * 0.55, as * 0.75, -dir * 0.35] }, '#ffb3dc', { under: true });
      add({ el: [x + dir * as * 0.08, y + as * 0.5, as * 0.45, as * 0.5, dir * 0.4] }, '#c3b2ff', { under: true });
      accent({ el: [x + dir * as * 0.3, y - as * 0.85, as * 0.16, as * 0.22, -dir * 0.35] }, '#fff3a6');
      accent({ el: [x + dir * as * 0.22, y + as * 0.6, as * 0.12, as * 0.14, dir * 0.4] }, '#ffffff');
    }
    // Antennae with a ball on the end.
    it.ears.at.forEach(([x, y], i) => {
      const dir = i ? 1 : -1;
      add({ el: [x + dir * s * 0.18, y - s * 0.42, s * 0.045, s * 0.55, dir * 0.35] }, '#9a6bff', { under: true });
      add({ el: [x + dir * s * 0.37, y - s * 0.95, s * 0.13, s * 0.13, 0] }, '#ff7fbf');
    });
  } else if (style === 'dino') {
    const { x0, x1, y, n, s: ss } = it.spikes;
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const h = ss * 0.55 * (0.72 + 0.28 * Math.sin((Math.PI * (i + 0.5)) / n));
      const xa0 = x0 + i * w;
      add(rpoly([[xa0 - w * 0.05, y + ss * 0.22], [xa0 + w * 0.5, y - h], [xa0 + w * 1.05, y + ss * 0.22]], ss * 0.07), '#5fbf4a');
    }
  } else if (style === 'shark') {
    // A fin on top that sweeps back, and a fin out of each side.
    const fin = '#6f98c4';
    add(rpoly([
      [tx - s * 0.5, ty + s * 0.25], [tx - s * 0.2, ty - s * 0.55], [tx + s * 0.1, ty - s * 1.05], [tx + s * 0.38, ty - s * 1.25],
      [tx + s * 0.3, ty - s * 0.75], [tx + s * 0.38, ty - s * 0.3], [tx + s * 0.55, ty + s * 0.25],
    ], s * 0.08), fin, { under: true });
    const { y, s: fs } = it.fins;
    for (const [x, dir] of sides(it.fins)) {
      const out = (o) => x + dir * o * fs;
      add(rpoly([[out(-0.1), y - fs * 0.1], [out(0.65), y + fs * 0.55], [out(0.45), y + fs * 0.68], [out(-0.1), y + fs * 0.45]], fs * 0.08), fin, { under: true });
    }
    // A pale belly along the bottom.
    const [ax, ay, aw, ah] = it.area;
    accent({ el: [ax + aw / 2, ay + ah, aw * 0.62, Math.min(aw, ah) * 0.32, 0] }, '#e8f2fb', { front: true });
  } else if (style === 'cactus') {
    const { xl, xr, y, s: as } = it.arms;
    const t = as * 0.42; // arm thickness
    add({ rr: [xl - as * 0.75, y, as * 0.95, t, t / 2] }); // left: out...
    add({ rr: [xl - as * 0.75, y - as * 0.9, t, as * 0.9 + t, t / 2] }); // ...and up
    add({ rr: [xr - as * 0.2, y, as * 0.95, t, t / 2] });
    add({ rr: [xr + as * 0.75 - t, y - as * 0.9, t, as * 0.9 + t, t / 2] });
    trims.push({ k: 'flower', x: xl - as * 0.75 + t / 2, y: y - as * 0.9 + t * 0.15, s: as * 0.5 });
    trims.push({ k: 'flower', x: xr + as * 0.75 - t / 2, y: y - as * 0.9 + t * 0.15, s: as * 0.5 });
    trims.push({ k: 'flower', x: tx, y: ty + as * 0.08, s: as * 0.62 });
  } else if (style === 'robot') {
    // An antenna with a blinking light on top, and a bolt on each side.
    const steel = '#a9b3c2';
    const dark = '#8d98a8';
    add({ rr: [tx - s * 0.055, ty - s * 0.9, s * 0.11, s * 1.1, s * 0.055] }, steel, { under: true });
    add({ el: [tx, ty - s * 0.95, s * 0.17, s * 0.17, 0] }, dark);
    trims.push({ k: 'light', x: tx, y: ty - s * 0.95, s: s * 0.12 });
    const { y, s: as } = it.arms;
    for (const [x, dir] of sides(it.arms)) {
      const span = (o0, o1) => [Math.min(x + dir * o0 * as, x + dir * o1 * as), (o1 - o0) * as];
      const [bx, bw] = span(-0.18, 0.32);
      add({ rr: [bx, y - as * 0.38, bw, as * 0.76, as * 0.14] }, steel, { under: true });
      const [kx, kw] = span(0.28, 0.5);
      add({ rr: [kx, y - as * 0.2, kw, as * 0.4, as * 0.1] }, dark);
    }
  } else if (style === 'rocket') {
    // A red nose cone with a round window, and a fin out of each side.
    const red = '#ff4b5c';
    const w0 = (xb - xa) / 2 + s * 0.35;
    add(rpoly([[tx - w0, ty + s * 0.3], [tx, ty - s * 1.3], [tx + w0, ty + s * 0.3]], s * 0.12), red, { under: true });
    trims.push({ k: 'window', x: tx, y: ty - s * 0.4, s: s * 0.2 });
    const { y, s: fs } = it.fins;
    for (const [x, dir] of sides(it.fins)) {
      const out = (o) => x + dir * o * fs;
      add(rpoly([[out(-0.1), y - fs * 0.35], [out(0.6), y + fs * 0.5], [out(0.62), y + fs * 0.85], [out(-0.1), y + fs * 0.55]], fs * 0.07), red, { under: true });
    }
  } else if (style === 'crown') {
    // A golden crown across the top, a ball on every point and a jewel under each one.
    const { x0, x1, y, n, s: ss } = it.spikes;
    const w = (x1 - x0) / (n - 1);
    const pts = [[x0 - w * 0.1, y + ss * 0.28]];
    const balls = [];
    for (let i = 0; i < n; i++) {
      const h = ss * (0.6 + 0.25 * Math.sin((Math.PI * i) / (n - 1)));
      const px = x0 + i * w + (i === 0 ? -w * 0.12 : i === n - 1 ? w * 0.12 : 0);
      if (i) pts.push([x0 + (i - 0.5) * w, y - ss * 0.15]);
      pts.push([px, y - h]);
      balls.push({ el: [px, y - h - ss * 0.03, ss * 0.09, ss * 0.09, 0] });
      const d = Math.round(Math.abs(i - (n - 1) / 2));
      trims.push({ k: 'jewel', id: ['ruby', 'sapphire', 'emerald', 'sapphire'][d % 4], x: x0 + i * w, y: y + ss * 0.06, s: ss * 0.38 });
    }
    pts.push([x1 + w * 0.1, y + ss * 0.28]);
    add(rpoly(pts, ss * 0.05), GOLD);
    for (const b of balls) add(b, '#ffe27a');
  }
  return { parts, accents, trims };
}

// Is the point inside any of the parts?
export function inside(parts, x, y) {
  for (const p of parts) {
    if (p.rr) {
      const [rx, ry, w, h, r] = p.rr;
      if (x < rx || y < ry || x > rx + w || y > ry + h) continue;
      const cx = Math.min(Math.max(x, rx + r), rx + w - r);
      const cy = Math.min(Math.max(y, ry + r), ry + h - r);
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) return true;
    } else if (p.el) {
      const [cx, cy, rx, ry, rot = 0] = p.el;
      const c = Math.cos(-rot);
      const s = Math.sin(-rot);
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;
      if ((lx / rx) ** 2 + (ly / ry) ** 2 <= 1) return true;
    } else if (p.poly) {
      let inPoly = false;
      const v = p.poly;
      for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
        if (v[i][1] > y !== v[j][1] > y && x < ((v[j][0] - v[i][0]) * (y - v[i][1])) / (v[j][1] - v[i][1]) + v[i][0]) inPoly = !inPoly;
      }
      if (inPoly) return true;
    }
  }
  return false;
}

// [minX, minY, maxX, maxY] of a list of parts.
export function bounds(parts) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  const add = (x0, y0, x1, y1) => {
    b = [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)];
  };
  for (const p of parts) {
    if (p.rr) add(p.rr[0], p.rr[1], p.rr[0] + p.rr[2], p.rr[1] + p.rr[3]);
    else if (p.el) {
      const [cx, cy, rx, ry, rot = 0] = p.el;
      const hw = Math.hypot(rx * Math.cos(rot), ry * Math.sin(rot));
      const hh = Math.hypot(rx * Math.sin(rot), ry * Math.cos(rot));
      add(cx - hw, cy - hh, cx + hw, cy + hh);
    } else if (p.poly) for (const [x, y] of p.poly) add(x, y, x, y);
  }
  return b;
}

// The area an item's pictures cover, whichever style it has, so changing the style never moves
// or resizes it on screen. A little margin keeps antialiased edges off the canvas border.
const boxes = {};
export function boxOf(itemId) {
  if (!boxes[itemId]) {
    const all = [...ITEMS[itemId].body, ...(ITEMS[itemId].behind || [])];
    for (const st of STYLES) all.push(...styleParts(itemId, st).parts);
    const [x0, y0, x1, y1] = bounds(all);
    const m = 16;
    boxes[itemId] = { x: Math.floor(x0 - m), y: Math.floor(y0 - m), w: Math.ceil(x1 - x0 + 2 * m), h: Math.ceil(y1 - y0 + 2 * m) };
  }
  return boxes[itemId];
}

// Tool sizes scale with the item, so a spray puff looks the same size on screen on every item.
export const unitOf = (itemId) => {
  const b = boxOf(itemId);
  return Math.max(b.w, b.h) / 1200;
};

export function shapeOf(itemId, style = 'plain') {
  const it = ITEMS[itemId];
  const extra = styleParts(itemId, style);
  return {
    item: itemId,
    style,
    plastic: STYLE_PLASTIC[style],
    body: it.body,
    parts: [...it.body, ...extra.parts],
    extra: extra.parts,
    accents: extra.accents,
    holes: it.holes,
    behind: it.behind || [],
    trims: extra.trims,
    box: boxOf(itemId),
    area: it.area,
    u: unitOf(itemId),
  };
}

// On the case: inside the outline and not on a camera or button.
export const onCase = (shape, x, y) => inside(shape.parts, x, y) && !inside(shape.holes, x, y);
