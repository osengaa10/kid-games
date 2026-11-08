// Pictures for the tray buttons: spray cans, paint bottles, markers, patterns, stamps (as SVG),
// little canvas pictures of each style, sticker and gem, and the display cabinet that stands for
// his collection. No words anywhere.
import { COLORS, GLITTER } from './palette.js';
import { shapeOf, bounds } from './items.js';
import { partPath } from './shapes.js';
import { drawFixed, drawBehind, drawBuds } from './devices.js';
import { drawPlastic, drawTrim } from './trims.js';
import { makeCanvas, stickerSprite, gemSprite } from './paint.js';
import { drawShaker } from './tools.js';

let uid = 0;
const RAINBOW = ['#ff3347', '#ff8a1c', '#ffd60a', '#2fc75a', '#29c4ff', '#9a45ff'];

// A fill for an SVG shape: a plain color, or a rainbow / glitter gradient defined alongside it.
function fill(c, vertical = false) {
  if (c !== 'rainbow' && c !== 'glitter') return { defs: '', paint: COLORS[c].hex };
  const id = `g${++uid}`;
  const stops = c === 'rainbow' ? RAINBOW : ['#fff2b0', '#ffd34d', '#f2b51d', '#ffe98a', '#d99a10'];
  const [x2, y2] = vertical ? [0, 1] : [1, 0];
  const defs = `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((s, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${s}"/>`).join('')}</linearGradient>`;
  return { defs, paint: `url(#${id})` };
}

function sparkles(x, y, w, h, n = 10) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const px = x + (((i * 37) % 100) / 100) * w;
    const py = y + (((i * 59) % 100) / 100) * h;
    out += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="2.4" height="2.4" fill="${GLITTER[i % GLITTER.length]}"/>`;
  }
  return out;
}

// A spray can: domed metal shoulder, a nozzle button, a paint-splash label, and a puff of mist
// coming out of the nozzle.
export function canIcon(c) {
  const glitter = c === 'glitter';
  const f = glitter ? { defs: '', paint: '#cdbcff' } : fill(c);
  const id = ++uid;
  const mist = c === 'rainbow' ? RAINBOW : glitter ? GLITTER : [COLORS[c].hex];
  const dots = [[4, 5, 1.5], [9, 3, 1.1], [3, 12, 1.2], [10, 17, 1.4], [6, 20, 1], [14, 2, 1], [1, 9, 1]]
    .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${mist[i % mist.length]}"/>`).join('');
  return `<svg viewBox="0 0 52 64"><defs>${f.defs}
      <linearGradient id="m${id}" x1="0" x2="1"><stop offset="0" stop-color="#8d93a0"/><stop offset=".4" stop-color="#f4f6fa"/><stop offset="1" stop-color="#737986"/></linearGradient>
      <linearGradient id="c${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".3" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
    <g opacity=".9"><circle cx="14" cy="9" r="7" fill="${mist[0]}" opacity=".25"/><circle cx="8" cy="13" r="5.5" fill="${mist[mist.length > 1 ? 2 : 0]}" opacity=".2"/><circle cx="17" cy="14" r="4" fill="${mist[mist.length > 1 ? 4 : 0]}" opacity=".25"/>${dots}</g>
    <rect x="27" y="2" width="12" height="9" rx="2.5" fill="#4d525e"/><circle cx="27.6" cy="6.2" r="1.7" fill="#15161b"/>
    <path d="M18.5 21Q18.5 10.5 30 10H36Q47.5 10.5 47.5 21Z" fill="url(#m${id})"/>
    <rect x="18" y="20" width="30" height="42" rx="4" fill="${f.paint}"/>
    ${glitter ? sparkles(20, 22, 26, 38, 18) : ''}
    <rect x="18" y="30" width="30" height="17" fill="#fff" opacity=".9"/>
    <path d="M28 33c3-2 5 1 8-1s5 2 3 4 1 4-2 5-4 2-7 1-5 0-4-3-2-4 2-6z" fill="${glitter ? '#ffd34d' : f.paint}"/>
    <rect x="18" y="20" width="30" height="42" rx="4" fill="url(#c${id})"/>
    <rect x="18" y="58" width="30" height="4" rx="2" fill="url(#m${id})"/>
    <rect x="18" y="20" width="30" height="42" rx="4" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1"/></svg>`;
}

// A squeeze bottle of puffy paint: a long pointed nozzle with a shiny blob of paint on the tip,
// and a label with a raised puffy squiggle.
export function bottleIcon(c) {
  const f = fill(c, true);
  const id = ++uid;
  const blob = c === 'rainbow' ? '#9a45ff' : COLORS[c].hex;
  return `<svg viewBox="0 0 44 64"><defs>${f.defs}
      <linearGradient id="b${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".3" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
    <path d="M20.3 4L17 17H27L23.7 4Z" fill="#e8e9f0" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>
    <circle cx="22" cy="4.4" r="4.2" fill="${blob}" stroke="${c === 'white' ? 'rgba(0,0,0,.25)' : 'none'}" stroke-width=".8"/><circle cx="20.6" cy="3" r="1.3" fill="#fff" opacity=".85"/>
    <rect x="12" y="16" width="20" height="6" rx="2" fill="#f4f4f8" stroke="rgba(0,0,0,.15)" stroke-width=".8"/>
    <path d="M9 30Q9 22 15 22H29Q35 22 35 30Q33 42 35 54Q35 62 28 62H16Q9 62 9 54Q11 42 9 30Z" fill="${f.paint}" stroke="rgba(0,0,0,.2)" stroke-width="1"/>
    <rect x="12" y="34" width="20" height="14" rx="3" fill="#fff" opacity=".92"/>
    <path d="M15 43Q18 36 22 41T29 39" fill="none" stroke="${c === 'white' ? '#c9cbd6' : f.paint}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M15 42.2Q18 35.2 22 40.2T29 38.2" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".8"/>
    <path d="M9 30Q9 22 15 22H29Q35 22 35 30Q33 42 35 54Q35 62 28 62H16Q9 62 9 54Q11 42 9 30Z" fill="url(#b${id})"/></svg>`;
}

export function markerIcon(c) {
  const f = fill(c, true);
  return `<svg viewBox="0 0 40 64"><defs>${f.defs}</defs>
    <path d="M16 12L20 2L24 12Z" fill="${f.paint}"/>
    <rect x="13" y="11" width="14" height="7" rx="2" fill="#d8d9e2"/>
    <rect x="11" y="17" width="18" height="45" rx="5" fill="#f4f4f8" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/>
    <rect x="11" y="17" width="18" height="15" rx="5" fill="${f.paint}"/>
    ${c === 'glitter' ? sparkles(12, 19, 15, 12, 8) : ''}
    <rect x="11" y="50" width="18" height="5" fill="${f.paint}"/>
    <rect x="14" y="34" width="3" height="14" rx="1.5" fill="#fff" opacity=".8"/></svg>`;
}

const PATTERN_ART = {
  grid: (s) => `<path d="M8 8H56M8 24H56M8 40H56M8 56H56M8 8V56M24 8V56M40 8V56M56 8V56" ${s} stroke-width="4" fill="none" stroke-linecap="round"/>`,
  zigzag: (s) => `<path d="M6 14L16 22L26 14L36 22L46 14L58 22M6 34L16 42L26 34L36 42L46 34L58 42M6 52L16 58L26 52L36 58L46 52L58 58" ${s} stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`,
  dots: (s) => [14, 32, 50].flatMap((y, j) => [12, 32, 52].map((x) => `<circle cx="${x + (j % 2 ? 8 : 0)}" cy="${y}" r="5.5" ${s.replace('stroke=', 'fill=')}/>`)).join(''),
  hearts: (s) => [[18, 20], [46, 20], [32, 46]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0 9C-9 2-11-4-6-8S2-6 0-3C2-6 6-12 6-8S9 2 0 9Z" ${s} stroke-width="3.5" fill="none" stroke-linejoin="round"/>`).join(''),
  popit: (s) => [14, 32, 50].flatMap((y) => [14, 32, 50].map((x) => `<circle cx="${x}" cy="${y}" r="7" ${s.replace('stroke=', 'fill=')}/><circle cx="${x - 2.4}" cy="${y - 2.6}" r="2.2" fill="#fff" opacity=".7"/>`)).join(''),
};

export function patternIcon(pat, c) {
  const f = fill(c);
  return `<svg viewBox="0 0 64 64"><defs>${f.defs}</defs><rect x="1" y="1" width="62" height="62" rx="14" fill="#5a3fd1"/>${PATTERN_ART[pat](`stroke="${f.paint}"`)}</svg>`;
}

const STAMP_ART = {
  heart: 'M32 54C10 38 6 26 12 16S30 8 32 18C34 8 46 6 52 16S54 38 32 54Z',
  star: 'M32 6L39 23L57 24L43 36L48 54L32 44L16 54L21 36L7 24L25 23Z',
  paw: 'M32 34C42 34 50 42 48 50S38 58 32 56S18 58 16 50S22 34 32 34ZM14 22A6 8 0 1 0 14.1 22ZM26 12A6 8 0 1 0 26.1 12ZM38 12A6 8 0 1 0 38.1 12ZM50 22A6 8 0 1 0 50.1 22Z',
};

export function stampIcon(shape, c) {
  const f = c === 'black' ? { defs: '', paint: '#2b2b38' } : fill(c);
  return `<svg viewBox="0 0 64 64"><defs>${f.defs}</defs><rect x="1" y="1" width="62" height="62" rx="14" fill="#fff3df" stroke="#c98a4b" stroke-width="2"/><path d="${STAMP_ART[shape]}" fill="${f.paint}" fill-rule="nonzero"/></svg>`;
}

// ------------------------------------------------------------------------------ canvas icons

function iconCanvas(px = 96) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = makeCanvas(px * dpr, px * dpr);
  return { c, g: c.getContext('2d'), S: px * dpr };
}

// A little picture of the item in a style: its plastic with a purple outline, and its cameras
// and buttons.
export function styleIcon(item, style) {
  const { c, g, S } = iconCanvas(96);
  const sh = shapeOf(item, style);
  const [x0, y0, x1, y1] = bounds([...sh.parts, ...sh.behind]);
  const s = (S * 0.84) / Math.max(x1 - x0, y1 - y0);
  g.translate(S / 2 - ((x0 + x1) / 2) * s, S / 2 - ((y0 + y1) / 2) * s);
  g.scale(s, s);
  const parts = sh.parts.map(partPath);
  drawBehind(g, sh);
  // A purple outline round the whole shape: the shape drawn a few px out in every direction.
  const o = (S * 0.035) / s;
  g.fillStyle = '#7b4dff';
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.save();
    g.translate(Math.cos(a) * o, Math.sin(a) * o);
    for (const p of parts) g.fill(p);
    g.restore();
  }
  // The plastic with its colored bits and trims, just like on the case.
  drawPlastic(g, sh);
  for (const t of sh.trims) drawTrim(g, t);
  drawFixed(g, sh);
  drawBuds(g, sh);
  return c;
}

export function stickerIcon(e) {
  const { c, g, S } = iconCanvas(96);
  const sp = stickerSprite(e);
  g.globalAlpha = 0.25;
  g.drawImage(sp.shadow, S * 0.04, S * 0.08, S * 0.92, S * 0.92);
  g.globalAlpha = 1;
  g.drawImage(sp.img, 0, 0, S * 0.92, S * 0.92);
  return c;
}

export function gemIcon(id) {
  const { c, g, S } = iconCanvas(96);
  if (id === 'mix') {
    g.drawImage(gemSprite('pinkheart'), 0, S * 0.3, S * 0.6, S * 0.6);
    g.drawImage(gemSprite('sapphire'), S * 0.4, S * 0.3, S * 0.6, S * 0.6);
    g.drawImage(gemSprite('goldstar'), S * 0.2, 0, S * 0.6, S * 0.6);
  } else g.drawImage(gemSprite(id), S * 0.05, S * 0.05, S * 0.9, S * 0.9);
  return c;
}

export function shakerIcon() {
  const { c, g, S } = iconCanvas(96);
  g.translate(S * 0.5, S * 0.12);
  g.rotate(Math.PI - 2.5);
  drawShaker(g, 0, 0, S * 0.95);
  return c;
}

// ------------------------------------------------------------------------- the collection

// A wooden display cabinet with glass doors and two shelves, holding little pictures of his
// latest cases (dashed outlines in the empty spots) and a badge with how many he's made.
// thumbs: loaded <img>s of his cases, newest first.
export function drawCabinet(c, thumbs, count) {
  const g = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#efe4ff';
  g.fillRect(0, 0, W, H);
  const path = (x, y, w, h, r) => partPath({ rr: [x, y, w, h, r] });
  const x = W * 0.09;
  const y = H * 0.1;
  const w = W * 0.82;
  const h = H * 0.84;
  // Shadow, wooden frame with a little crown on top, and the back panel.
  g.fillStyle = 'rgba(60,20,90,0.25)';
  g.fill(path(x + W * 0.015, y + H * 0.03, w, h, W * 0.05));
  const wood = g.createLinearGradient(x, y, x + w, y + h);
  wood.addColorStop(0, '#d99a58');
  wood.addColorStop(0.5, '#b8773a');
  wood.addColorStop(1, '#8e5526');
  g.fillStyle = wood;
  g.fill(path(x, y, w, h, W * 0.05));
  g.fill(path(x - W * 0.03, y - H * 0.04, w + W * 0.06, H * 0.07, W * 0.03));
  g.strokeStyle = 'rgba(80,40,10,0.18)';
  g.lineWidth = Math.max(1, W * 0.004);
  for (let i = 1; i < 6; i++) {
    g.beginPath();
    g.moveTo(x + w * (i / 6), y);
    g.bezierCurveTo(x + w * (i / 6) + W * 0.02, y + h * 0.3, x + w * (i / 6) - W * 0.02, y + h * 0.7, x + w * (i / 6), y + h);
    g.stroke();
  }
  const ix = x + W * 0.055;
  const iy = y + H * 0.05;
  const iw = w - W * 0.11;
  const ih = h - H * 0.1;
  const back = g.createLinearGradient(0, iy, 0, iy + ih);
  back.addColorStop(0, '#fbeedb');
  back.addColorStop(1, '#ecd1a9');
  g.fillStyle = back;
  g.fill(path(ix, iy, iw, ih, W * 0.025));
  // Two shelves, three spots on each.
  const shelfH = ih / 2;
  const plank = H * 0.035;
  for (let row = 0; row < 2; row++) {
    const floor = iy + shelfH * (row + 1) - plank;
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col;
      const sw = iw / 3;
      const sx = ix + sw * col;
      const room = { w: sw * 0.84, h: shelfH * 0.8 };
      const img = thumbs[i];
      if (img && img.naturalWidth) {
        const k = Math.min(room.w / img.naturalWidth, room.h / img.naturalHeight);
        const tw = img.naturalWidth * k;
        const th = img.naturalHeight * k;
        g.drawImage(img, sx + (sw - tw) / 2, floor - th + plank * 0.25, tw, th);
      } else {
        g.save();
        g.setLineDash([W * 0.015, W * 0.012]);
        g.lineWidth = Math.max(1.5, W * 0.006);
        g.strokeStyle = 'rgba(150,100,50,0.45)';
        g.stroke(path(sx + sw * 0.28, floor - room.h * 0.8, sw * 0.44, room.h * 0.78, W * 0.02));
        g.restore();
      }
    }
    const pl = g.createLinearGradient(0, floor, 0, floor + plank);
    pl.addColorStop(0, '#c98a4b');
    pl.addColorStop(1, '#8a5124');
    g.fillStyle = pl;
    g.fillRect(ix, floor, iw, plank);
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fillRect(ix, floor, iw, plank * 0.2);
  }
  // Glass doors: a line down the middle, shine across the glass, two gold knobs.
  g.fillStyle = 'rgba(200,230,255,0.12)';
  g.fill(path(ix, iy, iw, ih, W * 0.025));
  g.strokeStyle = 'rgba(140,90,40,0.8)';
  g.lineWidth = W * 0.012;
  g.beginPath();
  g.moveTo(ix + iw / 2, iy);
  g.lineTo(ix + iw / 2, iy + ih);
  g.stroke();
  g.save();
  g.clip(path(ix, iy, iw, ih, W * 0.025));
  g.fillStyle = 'rgba(255,255,255,0.28)';
  for (const [a, b] of [[0.05, 0.13], [0.2, 0.24], [0.55, 0.63], [0.7, 0.74]]) {
    g.beginPath();
    g.moveTo(ix + iw * a, iy + ih);
    g.lineTo(ix + iw * (a + 0.25), iy);
    g.lineTo(ix + iw * (b + 0.25), iy);
    g.lineTo(ix + iw * b, iy + ih);
    g.fill();
  }
  g.restore();
  for (const kx of [ix + iw / 2 - W * 0.035, ix + iw / 2 + W * 0.035]) {
    const knob = g.createRadialGradient(kx - W * 0.006, iy + ih * 0.5 - W * 0.006, 1, kx, iy + ih * 0.5, W * 0.02);
    knob.addColorStop(0, '#fff6c2');
    knob.addColorStop(1, '#d19a1a');
    g.fillStyle = knob;
    g.beginPath();
    g.arc(kx, iy + ih * 0.5, W * 0.018, 0, Math.PI * 2);
    g.fill();
  }
  // How many he's made.
  if (count > 0) {
    const r = W * 0.1;
    const bx = x + w - r * 0.3;
    const by = y + r * 0.2;
    g.fillStyle = '#ff3d8b';
    g.beginPath();
    g.arc(bx, by, r, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = W * 0.014;
    g.strokeStyle = '#fff';
    g.stroke();
    g.fillStyle = '#fff';
    g.font = `900 ${Math.round(r * (count > 99 ? 0.8 : 1.1))}px ui-rounded, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(count), bx, by + r * 0.06);
  }
}
