// The things he can decorate, as plain shapes. There's no canvas in here, so the tests can check them.
//
// Each item has its own units (the phone is 480 wide). A shape is a list of parts:
//   { rr: [x, y, w, h, r] }          a rounded rectangle
//   { el: [cx, cy, rx, ry, rot] }    an ellipse (rot in radians; positive turns clockwise on screen)
//   { poly: [[x, y], ...] }          a polygon
// The case is everything the parts cover, minus the holes (cameras, buttons): paint never lands there.

export const STYLES = ['plain', 'cat', 'bunny', 'bear', 'dino', 'cactus'];
export const STYLE_SAY = {
  plain: 'Plain',
  cat: 'Kitty ears',
  bunny: 'Bunny ears',
  bear: 'Teddy bear',
  dino: 'Dinosaur',
  cactus: 'Cactus',
};

// body: the case (with covers over the gadget's side buttons, so they get painted too).
// holes: where the gadget shows through and paint can't go (cameras, buttons, the earbuds).
// behind: bits of the gadget that stick out from behind the case (the controller's triggers).
// ears: where the two ears sit on the top edge, and how big they are.
// arms: the cactus arms come out of the left and right edges at height y.
// spikes: the dinosaur spikes run along the top edge from x0 to x1.
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

// The parts a style adds, plus where the cactus flowers go ([x, y, size]).
export function styleParts(itemId, style) {
  const it = ITEMS[itemId];
  const parts = [];
  const flowers = [];
  const { s } = it.ears;
  if (style === 'cat') {
    it.ears.at.forEach(([x, y], i) => {
      const dir = i === 0 ? -1 : 1;
      const base = s * 0.62;
      parts.push({ poly: roundedPoly([[x - base, y + s * 0.3], [x + dir * s * 0.16, y - s * 0.95], [x + base, y + s * 0.3]], s * 0.2) });
    });
  } else if (style === 'bunny') {
    it.ears.at.forEach(([x, y], i) => {
      const dir = i === 0 ? -1 : 1;
      parts.push({ el: [x + dir * s * 0.1, y - s * 0.55, s * 0.3, s * 0.85, dir * 0.2] });
    });
  } else if (style === 'bear') {
    it.ears.at.forEach(([x, y]) => parts.push({ el: [x, y + s * 0.02, s * 0.42, s * 0.42, 0] }));
  } else if (style === 'dino') {
    const { x0, x1, y, n, s: ss } = it.spikes;
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const h = ss * 0.55 * (0.72 + 0.28 * Math.sin((Math.PI * (i + 0.5)) / n));
      const xa = x0 + i * w;
      parts.push({ poly: roundedPoly([[xa - w * 0.05, y + ss * 0.22], [xa + w * 0.5, y - h], [xa + w * 1.05, y + ss * 0.22]], ss * 0.07) });
    }
  } else if (style === 'cactus') {
    const { xl, xr, y, s: as } = it.arms;
    const t = as * 0.42; // arm thickness
    parts.push({ rr: [xl - as * 0.75, y, as * 0.95, t, t / 2] }); // left: out...
    parts.push({ rr: [xl - as * 0.75, y - as * 0.9, t, as * 0.9 + t, t / 2] }); // ...and up
    parts.push({ rr: [xr - as * 0.2, y, as * 0.95, t, t / 2] });
    parts.push({ rr: [xr + as * 0.75 - t, y - as * 0.9, t, as * 0.9 + t, t / 2] });
    flowers.push([xl - as * 0.75 + t / 2, y - as * 0.9 + t * 0.15, as * 0.5]);
    flowers.push([xr + as * 0.75 - t / 2, y - as * 0.9 + t * 0.15, as * 0.5]);
    const top = it.ears.at[0];
    flowers.push([(it.ears.at[0][0] + it.ears.at[1][0]) / 2, top[1] + as * 0.08, as * 0.62]);
  }
  return { parts, flowers };
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
    body: it.body,
    parts: [...it.body, ...extra.parts],
    extra: extra.parts,
    holes: it.holes,
    behind: it.behind || [],
    flowers: extra.flowers,
    box: boxOf(itemId),
    area: it.area,
    u: unitOf(itemId),
  };
}

// On the case: inside the outline and not on a camera or button.
export const onCase = (shape, x, y) => inside(shape.parts, x, y) && !inside(shape.holes, x, y);
