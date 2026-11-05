// Painters: each kind of stroke drawn onto a canvas whose transform is already set to item units.
// The same function paints a stroke while he draws it and again when a design is replayed (undo,
// loading from the shelf), so the two always match. Random bits come from the stroke's seed.
import { COLORS, GLITTER, GEM, GEM_IDS, STICKER_SIZES, hexRGB, rainbowRGB, shade, css } from './palette.js';
import { rng } from './rng.js';
import { patternLines, popitDomes, lineLengths } from './patterns.js';
import { onCase } from './items.js';

// Tool sizes in item units (times the item's unit scale u). A stroke made while zoomed in
// remembers the zoom (op.zm), and its brush is that much finer: brushes stay the same size on
// screen, so zooming in is for fine detail. Stickers and gems keep their real size.
export const SIZE = {
  spray: 66, // radius of a spray puff
  marker: 19,
  glitterPen: 16,
  puffy: 27,
  stamp: 46, // stamp radius
  stampGap: 100,
  gem: 31, // gem radius
  gemGap: 68,
  shaker: 72,
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// The color a stroke paints with. Rainbow strokes step through the colors as t grows.
export function rgbAt(c, t = 0) {
  if (c === 'rainbow') return rainbowRGB(t);
  return hexRGB((COLORS[c] || COLORS.red).hex);
}

// ---------------------------------------------------------------------------------- spray paint

const brushes = new Map();
function brush(rgb) {
  const key = rgb.join();
  let b = brushes.get(key);
  if (!b) {
    b = makeCanvas(96, 96);
    const g = b.getContext('2d');
    const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, css(rgb, 1));
    gr.addColorStop(0.5, css(rgb, 0.82));
    gr.addColorStop(1, css(rgb, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 96, 96);
    if (brushes.size > 160) brushes.clear();
    brushes.set(key, b);
  }
  return b;
}

// Spray frame i of a spray stroke: a soft puff where the paint lands (a row of them if the can
// moved fast, each lighter, the way real spray thins out), plus a few droplets around it. Paint
// builds up while the can stays still. `R` is the stroke's random generator, called the same
// number of times per frame whatever happens, so replays match.
export function sprayFrame(g, op, i, u, R, sparks, onCover) {
  u /= op.zm || 1;
  const p = op.p;
  const x = p[i * 2];
  const y = p[i * 2 + 1];
  const px = i ? p[i * 2 - 2] : x;
  const py = i ? p[i * 2 - 1] : y;
  const r = SIZE.spray * u;
  const glitter = op.c === 'glitter';
  const rgb = op.c === 'rainbow' ? rainbowRGB(Math.round(i * 0.18) / 4) : glitter ? [238, 236, 250] : rgbAt(op.c);
  const n = Math.min(24, Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / (r * 0.35))));
  const b = brush(rgb);
  g.globalAlpha = (glitter ? 0.14 : 0.3) / Math.sqrt(n);
  for (let j = 1; j <= n; j++) {
    const sx = px + ((x - px) * j) / n;
    const sy = py + ((y - py) * j) / n;
    g.drawImage(b, sx - r, sy - r, r * 2, r * 2);
    onCover?.(sx, sy, r);
  }
  const drops = glitter ? 9 : 3;
  for (let k = 0; k < drops; k++) {
    const a = R() * Math.PI * 2;
    const d = r * (0.3 + R() * 0.95);
    const s = u * (glitter ? 1.4 + R() * 2.6 : 0.9 + R() * 2.1);
    const col = glitter ? hexRGB(GLITTER[Math.floor(R() * GLITTER.length)]) : rgb;
    g.globalAlpha = 0.5 + R() * 0.45;
    g.fillStyle = css(col);
    g.beginPath();
    g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, Math.PI * 2);
    g.fill();
  }
  if (glitter) {
    const a = R() * Math.PI * 2;
    const d = R() * r;
    if (R() < 0.35) sparks?.push(spark(x + Math.cos(a) * d, y + Math.sin(a) * d, u, R()));
  }
  g.globalAlpha = 1;
}

const spark = (x, y, u, ph) => ({ x, y, s: (7 + ph * 6) * u, ph: ph * 20 });

// ------------------------------------------------------------------------------------- markers

function polyline(g, p) {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
}

function dot(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

// Stroke a line in one color, or segment by segment when the color changes along it (rainbow).
function strokeLine(g, p, w, color) {
  g.lineWidth = w;
  if (typeof color !== 'function') {
    g.strokeStyle = color;
    g.fillStyle = color;
    if (p.length <= 2) dot(g, p[0], p[1], w / 2);
    else {
      polyline(g, p);
      g.stroke();
    }
    return;
  }
  let dist = 0;
  if (p.length <= 2) {
    g.fillStyle = color(0);
    dot(g, p[0], p[1], w / 2);
    return;
  }
  for (let i = 2; i < p.length; i += 2) {
    const d = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    g.strokeStyle = color(dist + d / 2);
    dist += d;
    g.beginPath();
    g.moveTo(p[i - 2], p[i - 1]);
    g.lineTo(p[i], p[i + 1]);
    g.stroke();
  }
}

export function paintMarker(g, op, u, sparks) {
  u /= op.zm || 1;
  const p = op.p;
  if (!p?.length) return;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (op.c === 'glitter') {
    const w = SIZE.glitterPen * u;
    strokeLine(g, p, w, '#f2b51d');
    strokeLine(g, p, w * 0.45, 'rgba(255,240,170,0.9)');
    // Glitter along the line, the same every time.
    const R = rng(op.s || 1);
    let carry = 0;
    for (let i = 0; i < p.length; i += 2) {
      const d = i ? Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]) : 1;
      carry += d;
      while (carry >= 7 * u) {
        carry -= 7 * u;
        const a = R() * Math.PI * 2;
        const rr = R() * w * 0.75;
        g.fillStyle = GLITTER[Math.floor(R() * GLITTER.length)];
        const s = u * (1.2 + R() * 1.8);
        g.fillRect(p[i] + Math.cos(a) * rr - s / 2, p[i + 1] + Math.sin(a) * rr - s / 2, s, s);
        if (R() < 0.12) sparks?.push(spark(p[i], p[i + 1], u, R()));
      }
    }
    return;
  }
  const w = SIZE.marker * u;
  const color = op.c === 'rainbow' ? (d) => css(rainbowRGB(d / (70 * u))) : css(rgbAt(op.c));
  strokeLine(g, p, w, color);
}

// -------------------------------------------------------------------------------------- stamps

const SHAPES = {};
function shapePath(kind) {
  if (SHAPES[kind]) return SHAPES[kind];
  const path = new Path2D();
  if (kind === 'heart') {
    for (let k = 0; k <= 40; k++) {
      const t = (k / 40) * Math.PI * 2;
      const x = (16 * Math.sin(t) ** 3) / 17;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.08;
      if (k) path.lineTo(x, y);
      else path.moveTo(x, y);
    }
  } else if (kind === 'star') {
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 0.45 : 1;
      if (k) path.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.02 + 0.06);
      else path.moveTo(Math.cos(a) * r, Math.sin(a) * r + 0.06);
    }
  } else if (kind === 'paw') {
    path.ellipse(0, 0.32, 0.5, 0.42, 0, 0, Math.PI * 2);
    for (const [x, y, rx, ry, rot] of [[-0.62, -0.18, 0.2, 0.26, -0.4], [-0.24, -0.6, 0.21, 0.28, -0.12], [0.24, -0.6, 0.21, 0.28, 0.12], [0.62, -0.18, 0.2, 0.26, 0.4]]) {
      path.moveTo(x + rx, y);
      path.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    }
  } else {
    path.arc(0, 0, 1, 0, Math.PI * 2);
  }
  path.closePath();
  SHAPES[kind] = path;
  return path;
}

// A stamp stroke: one stamp where he touched, and more along the way if he dragged.
export function paintStamps(g, op, u) {
  u /= op.zm || 1;
  const R = rng(op.s || 1);
  const r = SIZE.stamp * u;
  const path = shapePath(op.sh);
  for (let i = 0; i < op.p.length; i += 2) {
    const rot = (R() - 0.5) * 0.7;
    const wob = 0.9 + R() * 0.2;
    const rgb = op.c === 'rainbow' ? rainbowRGB(i / 2 + R() * 0.5) : op.c === 'glitter' ? [245, 190, 40] : rgbAt(op.c);
    g.save();
    g.translate(op.p[i], op.p[i + 1]);
    g.rotate(rot);
    g.scale(r * wob, r * wob);
    g.fillStyle = css(rgb, 0.94);
    g.fill(path);
    g.lineWidth = 0.06;
    g.strokeStyle = css(shade(rgb, -0.3), 0.7);
    g.stroke(path);
    if (op.c === 'glitter') {
      for (let k = 0; k < 14; k++) {
        g.fillStyle = GLITTER[Math.floor(R() * GLITTER.length)];
        g.fillRect((R() - 0.5) * 1.2, (R() - 0.5) * 1.2, 0.09, 0.09);
      }
    }
    g.restore();
  }
}

// -------------------------------------------------------------------------------- puffy paint

// Raised glossy lines: a soft shadow, the color with a darker rim, then a shiny highlight along
// the top-left of the line, the way squeezed puffy paint catches the light.
export function paintPuffyLines(g, lines, colorOf, u) {
  const w = SIZE.puffy * u;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const pass = (dx, dy, width, col) => {
    g.save();
    g.translate(dx, dy);
    lines.forEach((l, i) => strokeLine(g, l, width, col(i)));
    g.restore();
  };
  const fn = (i, f) => {
    const c = colorOf(i);
    return typeof c === 'function' ? (d) => f(c(d)) : f(c);
  };
  pass(1.5 * u, 4 * u, w * 1.04, () => 'rgba(20,10,40,0.25)');
  pass(0, 0, w, (i) => fn(i, (rgb) => css(shade(rgb, -0.18))));
  pass(-w * 0.04, -w * 0.06, w * 0.78, (i) => fn(i, (rgb) => css(rgb)));
  pass(-w * 0.17, -w * 0.19, w * 0.3, (i) => fn(i, (rgb) => css(shade(rgb, 0.6), 0.85)));
}

const puffyColor = (c, u) => (i) => (c === 'rainbow' ? (d) => rainbowRGB(i * 1.5 + d / (90 * u)) : rgbAt(c));

export function paintPuffy(g, op, u) {
  u /= op.zm || 1;
  if (op.p?.length) paintPuffyLines(g, [op.p], puffyColor(op.c, u), u);
}

// Part of a pattern: the first `dist` units of its lines, and the point the gun is at.
function cutLines(lines, lens, dist) {
  const out = [];
  let tip = null;
  for (let j = 0; j < lines.length && dist > 0; j++) {
    const l = lines[j];
    if (dist >= lens[j]) {
      out.push(l);
      dist -= lens[j];
      tip = [l[l.length - 2], l[l.length - 1]];
      continue;
    }
    const part = [l[0], l[1]];
    for (let i = 2; i < l.length; i += 2) {
      const d = Math.hypot(l[i] - l[i - 2], l[i + 1] - l[i - 1]);
      if (d >= dist) {
        const f = dist / d;
        part.push(l[i - 2] + (l[i] - l[i - 2]) * f, l[i - 1] + (l[i + 1] - l[i - 1]) * f);
        break;
      }
      part.push(l[i], l[i + 1]);
      dist -= d;
    }
    out.push(part);
    tip = [part[part.length - 2], part[part.length - 1]];
    dist = 0;
  }
  return { lines: out, tip };
}

// A pattern the glue gun draws by itself. prog (0..1) is how far it has got; returns where the
// gun's tip is.
export function paintPattern(g, op, shape, u, prog = 1) {
  if (op.pat === 'popit') return paintPopit(g, op, shape, prog);
  const lines = patternLines(shape, op.pat);
  const lens = lineLengths(lines);
  const total = lens.reduce((a, b) => a + b, 0);
  const cut = prog >= 1 ? { lines, tip: null } : cutLines(lines, lens, total * prog);
  const color = op.c === 'rainbow' ? (i) => rainbowRGB(i * 1.3) : () => rgbAt(op.c);
  paintPuffyLines(g, cut.lines, color, u);
  return cut.tip;
}

// One pop-it bubble. Pushed in, it's lit from the other side, so it looks hollow.
export function dome(g, x, y, r, rgb, pushed = false) {
  g.fillStyle = css(shade(rgb, -0.35), 0.5);
  g.beginPath();
  g.arc(x + r * 0.05, y + r * 0.12, r * 1.05, 0, Math.PI * 2);
  g.fill();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
  if (pushed) {
    gr.addColorStop(0, css(shade(rgb, -0.32)));
    gr.addColorStop(0.6, css(shade(rgb, -0.1)));
    gr.addColorStop(1, css(shade(rgb, 0.35)));
  } else {
    gr.addColorStop(0, css(shade(rgb, 0.7)));
    gr.addColorStop(0.42, css(rgb));
    gr.addColorStop(1, css(shade(rgb, -0.28)));
  }
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = r * 0.07;
  g.strokeStyle = css(shade(rgb, -0.22), 0.8);
  g.stroke();
  if (!pushed) {
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.ellipse(x - r * 0.36, y - r * 0.4, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2);
    g.fill();
  }
}

export const popitColor = (op, d) => (op.c === 'rainbow' ? rainbowRGB(d.col * 2 + 0.5) : rgbAt(op.c));

// Pop-it: a silicone grid of cells, each with a bubble. prog brings the bubbles in one by one.
export function paintPopit(g, op, shape, prog = 1, pushed = null) {
  const domes = popitDomes(shape);
  const n = Math.ceil(domes.length * prog);
  for (let i = 0; i < n; i++) {
    const d = domes[i];
    const rgb = popitColor(op, d);
    const h = d.cell / 2;
    g.fillStyle = css(shade(rgb, 0.12));
    g.fillRect(d.x - h, d.y - h, d.cell, d.cell);
    g.lineWidth = d.cell * 0.035;
    g.strokeStyle = css(shade(rgb, -0.18), 0.7);
    g.strokeRect(d.x - h + g.lineWidth, d.y - h + g.lineWidth, d.cell - 2 * g.lineWidth, d.cell - 2 * g.lineWidth);
  }
  for (let i = 0; i < n; i++) {
    const d = domes[i];
    dome(g, d.x, d.y, d.r, popitColor(op, d), pushed?.has(i));
  }
  const last = domes[n - 1];
  return prog < 1 && last ? [last.x, last.y] : null;
}

// ----------------------------------------------------------------------------- glitter shaker

// The flecks a shake of glitter leaves on the case (ones that miss the case fall off). Done a
// little at a time while he shakes: `state` remembers how far it got.
export function flecksFor(op, shape, u, state = { n: 0, R: null, out: [], sparks: [] }) {
  state.R ||= rng(op.s || 1);
  const R = state.R;
  const pts = op.p.length / 2;
  for (; state.n < pts; state.n++) {
    const x0 = op.p[state.n * 2];
    const y0 = op.p[state.n * 2 + 1];
    for (let k = 0; k < 7; k++) {
      const a = R() * Math.PI * 2;
      const d = (Math.sqrt(R()) * SIZE.shaker * u) / (op.zm || 1);
      const x = x0 + Math.cos(a) * d;
      const y = y0 + Math.sin(a) * d;
      const s = u * (2.2 + R() * 3.6);
      const c = Math.floor(R() * GLITTER.length);
      const tw = R();
      if (!onCase(shape, x, y)) continue;
      state.out.push([x, y, s, c]);
      if (tw < 0.07) state.sparks.push(spark(x, y, u, tw * 14));
    }
  }
  return state;
}

export function paintFlecks(g, flecks) {
  for (let c = 0; c < GLITTER.length; c++) {
    g.fillStyle = GLITTER[c];
    for (const f of flecks) if (f[3] === c) g.fillRect(f[0] - f[2] / 2, f[1] - f[2] / 2, f[2], f[2]);
  }
}

// ---------------------------------------------------------------------------- twinkles

let twinkleImg = null;
function twinkleSprite() {
  if (twinkleImg) return twinkleImg;
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,240,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(32, 0);
  g.quadraticCurveTo(35, 29, 64, 32);
  g.quadraticCurveTo(35, 35, 32, 64);
  g.quadraticCurveTo(29, 35, 0, 32);
  g.quadraticCurveTo(29, 29, 32, 0);
  g.fill();
  twinkleImg = c;
  return c;
}

// Glitter twinkles: each one flashes now and then, at its own moment.
export function drawTwinkles(g, sparks, t) {
  const img = twinkleSprite();
  for (const s of sparks) {
    const v = Math.sin(t * 2.6 + s.ph);
    if (v < 0.6) continue;
    const a = (v - 0.6) / 0.4;
    const size = s.s * (0.7 + a * 1.4);
    g.globalAlpha = a;
    g.drawImage(img, s.x - size, s.y - size, size * 2, size * 2);
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------------------------ stickers

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const stickerSprites = new Map();

// An emoji with a white die-cut border, like a real sticker, and its shadow.
export function stickerSprite(e) {
  let sp = stickerSprites.get(e);
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
  stickerSprites.set(e, sp);
  return sp;
}

export const stickerSize = (op, u) => STICKER_SIZES[op.z ?? 1] * u;

export function drawSticker(g, op, u, scale = 1, lifted = false) {
  const size = stickerSize(op, u) * scale;
  const sp = stickerSprite(op.e);
  g.save();
  g.translate(op.x, op.y);
  g.rotate(op.r || 0);
  const off = (lifted ? 14 : 3) * u;
  g.globalAlpha = lifted ? 0.22 : 0.3;
  g.drawImage(sp.shadow, -size / 2 + off * 0.6, -size / 2 + off * 1.4, size, size);
  g.globalAlpha = 1;
  g.drawImage(sp.img, -size / 2, -size / 2, size, size);
  g.restore();
}

// ---------------------------------------------------------------------------------------- gems

const gemSprites = new Map();

function gemOutline(shape, r) {
  const p = new Path2D();
  if (shape === 'heart' || shape === 'star') {
    const base = shapePath(shape);
    p.addPath(base, new DOMMatrix([r, 0, 0, r, 0, 0]));
  } else p.arc(0, 0, r, 0, Math.PI * 2);
  return p;
}

// A shiny gem drawn once at 128 px, then stamped wherever it goes.
export function gemSprite(id) {
  let c = gemSprites.get(id);
  if (c) return c;
  const gem = GEM[id] || GEM.diamond;
  const S = 128;
  c = makeCanvas(S, S);
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const r = 50;
  const rgb = hexRGB(gem.color);
  if (gem.shape === 'pearl') {
    g.fillStyle = 'rgba(40,20,50,0.3)';
    g.beginPath();
    g.arc(3, 6, r * 0.86, 0, Math.PI * 2);
    g.fill();
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 0.9);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.5, '#fbeef6');
    gr.addColorStop(0.85, '#e6d0de');
    gr.addColorStop(1, '#bfa2b6');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.ellipse(-r * 0.3, -r * 0.34, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2);
    g.fill();
  } else {
    const path = gemOutline(gem.shape, r);
    g.save();
    g.translate(3, 6);
    g.fillStyle = 'rgba(30,10,50,0.32)';
    g.fill(path);
    g.restore();
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r * 1.1);
    gr.addColorStop(0, css(shade(rgb, 0.8)));
    gr.addColorStop(0.4, css(shade(rgb, 0.15)));
    gr.addColorStop(0.78, css(rgb));
    gr.addColorStop(1, css(shade(rgb, -0.5)));
    g.fillStyle = gr;
    g.fill(path);
    // Facets: a flat top in the middle and cuts running out to the edge.
    g.save();
    g.clip(path);
    g.strokeStyle = css(shade(rgb, 0.65), 0.55);
    g.lineWidth = 2;
    const table = gemOutline(gem.shape, r * 0.52);
    g.fillStyle = css(shade(rgb, 0.45), 0.35);
    g.fill(table);
    g.stroke(table);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      g.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.moveTo(-r, -r);
    g.lineTo(r * 0.1, -r);
    g.lineTo(-r, r * 0.1);
    g.fill();
    g.restore();
    g.lineWidth = 2.5;
    g.strokeStyle = css(shade(rgb, -0.55), 0.5);
    g.stroke(path);
    // A bright glint.
    g.fillStyle = '#fff';
    g.translate(-r * 0.32, -r * 0.36);
    g.beginPath();
    g.moveTo(0, -12);
    g.quadraticCurveTo(1.5, -1.5, 12, 0);
    g.quadraticCurveTo(1.5, 1.5, 0, 12);
    g.quadraticCurveTo(-1.5, 1.5, -12, 0);
    g.quadraticCurveTo(-1.5, -1.5, 0, -12);
    g.fill();
  }
  gemSprites.set(id, c);
  return c;
}

// Where the gems of a gem stroke are: [{ id, x, y, rot, r }]. Cached per stroke.
const gemCache = new WeakMap();
export function gemsOf(op, u) {
  let c = gemCache.get(op);
  if (c && c.n === op.p.length) return c.list;
  const R = rng(op.s || 1);
  const list = [];
  for (let i = 0; i < op.p.length; i += 2) {
    const pick = R();
    const rot = (R() - 0.5) * 0.5;
    const id = op.g === 'mix' ? GEM_IDS[Math.floor(pick * GEM_IDS.length)] : op.g;
    const r = SIZE.gem * u * (id === 'pearl' ? 0.85 : 1);
    list.push({ id, x: op.p[i], y: op.p[i + 1], rot, r });
  }
  c = { n: op.p.length, list };
  gemCache.set(op, c);
  return list;
}

// Gems set into the picture. lastScale pops the newest one in while a trail is being laid.
export function paintGems(g, op, u, lastScale = 1) {
  const list = gemsOf(op, u);
  list.forEach((gm, i) => {
    const r = gm.r * (i === list.length - 1 ? lastScale : 1);
    g.save();
    g.translate(gm.x, gm.y);
    g.rotate(gm.rot);
    g.drawImage(gemSprite(gm.id), -r * 1.28, -r * 1.28, r * 2.56, r * 2.56);
    g.restore();
  });
}

// Now and then a gem catches the light: drawn fresh every frame, over everything.
export function drawGemGlints(g, op, u, t) {
  const img = twinkleSprite();
  gemsOf(op, u).forEach((gm, i) => {
    const ph = (t * 0.9 + i * 0.61 + gm.rot * 7) % 5;
    if (ph >= 0.4) return;
    const a = Math.sin((ph / 0.4) * Math.PI);
    const sz = gm.r * (0.5 + a);
    g.globalAlpha = a;
    g.drawImage(img, gm.x - gm.r * 0.4 - sz, gm.y - gm.r * 0.4 - sz, sz * 2, sz * 2);
    g.globalAlpha = 1;
  });
}

// The slap-down bounce of something just placed: big, then settling to normal size.
export function popIn(age) {
  if (age < 0 || age > 0.5) return 1;
  return 1 + 0.35 * Math.exp(-age * 9) * Math.cos(age * 22);
}
