// Turbo, the corgi pup, as a puppet: body, head, two ears, eyes, mouth, four legs, tail and the
// Pop-Pack with a nozzle for each weapon. Each part is baked once (engine/sprites.js) and the
// parts are posed every frame (drawTurbo), so he can squash, flop his ears and pull faces
// without any frame sheets. Facing right; the renderer flips him for left.
import { sprite } from '../engine/sprites.js';
import { ellipse, rrect, fillStroke, starPath, heartPath, LINE } from './style.js';
import { FURS, PACKS, DEFAULT_LOOK } from '../content/cosmetics.js';

export const INK = '#4a2408';
const STEEL = '#a7b2c4';
const STEEL_DARK = '#58627a';
const STRAP = '#2d6fe0';
const LENS = '#86e6ff';

// The Pup Closet look in use: fur palette and Pop-Pack paint (sprites are cached per look).
function palette(look) {
  const f = FURS.find((x) => x.id === look.fur) || FURS[0];
  const p = PACKS.find((x) => x.id === look.pack) || PACKS[0];
  return { key: `${f.id}-${p.id}`, fur: f.fur, deep: f.deep, dark: f.dark, cream: f.cream, ear: f.ear, pack: p.color, packDark: p.dark, hat: look.hat || 'none' };
}
let L = palette(DEFAULT_LOOK);

// ------------------------------------------------------------------------------------- parts

const body = () =>
  sprite(`t-body-${L.key}`, 1.2, 0.8, (g) => {
    ellipse(g, 0.6, 0.42, 0.47, 0.31, L.fur, L.dark);
    // darker back, cream chest and tummy
    g.save();
    g.beginPath();
    g.ellipse(0.6, 0.42, 0.47, 0.31, 0, 0, Math.PI * 2);
    g.clip();
    ellipse(g, 0.5, 0.18, 0.4, 0.12, L.deep);
    ellipse(g, 0.82, 0.56, 0.27, 0.22, L.cream);
    ellipse(g, 0.45, 0.68, 0.3, 0.1, L.cream);
    g.restore();
    g.beginPath();
    g.ellipse(0.6, 0.42, 0.47, 0.31, 0, 0, Math.PI * 2);
    g.lineWidth = LINE;
    g.strokeStyle = L.dark;
    g.stroke();
    // collar and tag
    g.beginPath();
    g.moveTo(0.8, 0.13);
    g.quadraticCurveTo(0.95, 0.22, 1.0, 0.36);
    g.lineWidth = 0.075;
    g.strokeStyle = '#2fbf71';
    g.stroke();
    ellipse(g, 0.97, 0.4, 0.05, 0.05, '#ffd23a', '#b5860a', 0.025);
  }, 0.6, 0.42);

const head = () =>
  sprite(`t-head-${L.key}`, 1.0, 0.9, (g) => {
    ellipse(g, 0.45, 0.48, 0.36, 0.33, L.fur, L.dark);
    g.save();
    g.beginPath();
    g.ellipse(0.45, 0.48, 0.36, 0.33, 0, 0, Math.PI * 2);
    g.clip();
    ellipse(g, 0.55, 0.72, 0.28, 0.16, L.cream); // cheeks
    ellipse(g, 0.6, 0.3, 0.05, 0.16, L.cream, null, 0, 0.25); // blaze
    g.restore();
    g.beginPath();
    g.ellipse(0.45, 0.48, 0.36, 0.33, 0, 0, Math.PI * 2);
    g.lineWidth = LINE;
    g.strokeStyle = L.dark;
    g.stroke();
    // muzzle and nose
    ellipse(g, 0.72, 0.6, 0.18, 0.13, L.cream, L.dark, 0.03);
    g.beginPath();
    g.moveTo(0.83, 0.5);
    g.quadraticCurveTo(0.93, 0.5, 0.92, 0.57);
    g.quadraticCurveTo(0.88, 0.62, 0.84, 0.6);
    g.quadraticCurveTo(0.79, 0.55, 0.83, 0.5);
    fillStroke(g, INK);
    ellipse(g, 0.86, 0.52, 0.02, 0.012, '#ffffff');
    // blush
    ellipse(g, 0.5, 0.64, 0.07, 0.04, 'rgba(255,110,110,0.45)');
    // goggles pushed up on the forehead
    g.beginPath();
    g.moveTo(0.12, 0.42);
    g.quadraticCurveTo(0.4, 0.17, 0.77, 0.26);
    g.lineWidth = 0.07;
    g.strokeStyle = STRAP;
    g.stroke();
    ellipse(g, 0.44, 0.22, 0.12, 0.1, LENS, STRAP, 0.045);
    ellipse(g, 0.41, 0.19, 0.035, 0.028, '#ffffff');
  }, 0.45, 0.5);

const ear = (front) =>
  sprite(`${front ? 't-ear-f' : 't-ear-b'}-${L.key}`, 0.36, 0.52, (g) => {
    g.beginPath();
    g.moveTo(0.03, 0.48);
    g.quadraticCurveTo(0.06, 0.12, 0.2, 0.03);
    g.quadraticCurveTo(0.33, 0.14, 0.33, 0.48);
    g.closePath();
    fillStroke(g, front ? L.fur : L.deep, L.dark);
    g.beginPath();
    g.moveTo(0.1, 0.46);
    g.quadraticCurveTo(0.12, 0.2, 0.2, 0.13);
    g.quadraticCurveTo(0.27, 0.22, 0.26, 0.46);
    g.closePath();
    fillStroke(g, front ? L.ear : L.deep);
  }, 0.18, 0.46);

export const EYES = ['open', 'blink', 'happy', 'hurt', 'wide'];
const eye = (kind) =>
  sprite(`t-eye-${kind}`, 0.26, 0.28, (g) => {
    g.lineCap = 'round';
    if (kind === 'blink' || kind === 'happy') {
      g.beginPath();
      if (kind === 'blink') g.arc(0.13, 0.11, 0.07, 0.25, Math.PI - 0.25);
      else g.arc(0.13, 0.18, 0.07, Math.PI + 0.3, -0.3);
      g.lineWidth = 0.04;
      g.strokeStyle = INK;
      g.stroke();
      return;
    }
    if (kind === 'hurt') {
      g.beginPath();
      g.moveTo(0.06, 0.07);
      g.lineTo(0.18, 0.14);
      g.lineTo(0.06, 0.21);
      g.lineWidth = 0.04;
      g.strokeStyle = INK;
      g.stroke();
      return;
    }
    const big = kind === 'wide';
    ellipse(g, 0.13, 0.14, 0.085, 0.11, '#ffffff', INK, 0.028);
    ellipse(g, 0.15, 0.15, big ? 0.045 : 0.058, big ? 0.06 : 0.076, INK);
    ellipse(g, 0.165, 0.12, 0.022, 0.024, '#ffffff');
    ellipse(g, 0.13, 0.19, 0.01, 0.011, '#ffffff');
  }, 0.13, 0.14);

export const MOUTHS = ['smile', 'open', 'grin', 'o'];
const mouth = (kind) =>
  sprite(`t-mouth-${kind}`, 0.28, 0.22, (g) => {
    g.lineCap = 'round';
    if (kind === 'smile') {
      g.beginPath();
      g.moveTo(0.05, 0.06);
      g.quadraticCurveTo(0.13, 0.15, 0.22, 0.06);
      g.lineWidth = 0.032;
      g.strokeStyle = INK;
      g.stroke();
      return;
    }
    if (kind === 'o') {
      ellipse(g, 0.14, 0.09, 0.04, 0.05, INK);
      return;
    }
    g.beginPath();
    const wide = kind === 'grin';
    g.moveTo(0.03, 0.05);
    g.quadraticCurveTo(0.14, wide ? 0.24 : 0.2, 0.25, 0.05);
    g.closePath();
    fillStroke(g, '#7a1f2b', INK, 0.025);
    ellipse(g, 0.15, wide ? 0.14 : 0.12, 0.05, 0.035, '#ff7a8c');
  }, 0.14, 0.05);

// Sunglasses: the grown-up's pup on the title screen.
const shades = () =>
  sprite('t-shades', 0.62, 0.3, (g) => {
    g.beginPath();
    g.moveTo(0.02, 0.1);
    g.lineTo(0.6, 0.08);
    g.lineWidth = 0.035;
    g.strokeStyle = '#1b1b2a';
    g.stroke();
    for (const x of [0.16, 0.44]) {
      rrect(g, x - 0.12, 0.06, 0.24, 0.17, 0.07);
      fillStroke(g, '#1b1b2a', '#000000', 0.02);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x - 0.07, 0.09, 0.06, 0.03);
    }
  }, 0.3, 0.12);

const pack = () =>
  sprite(`t-pack-${L.key}`, 0.5, 0.6, (g) => {
    rrect(g, 0.05, 0.08, 0.4, 0.46, 0.11);
    fillStroke(g, L.pack, L.packDark);
    rrect(g, 0.1, 0.13, 0.12, 0.36, 0.05);
    fillStroke(g, 'rgba(255,255,255,0.28)');
    // a dial and a little fin
    ellipse(g, 0.31, 0.38, 0.065, 0.065, '#ffe28a', L.packDark, 0.025);
    g.beginPath();
    g.moveTo(0.31, 0.38);
    g.lineTo(0.34, 0.34);
    g.lineWidth = 0.02;
    g.strokeStyle = L.packDark;
    g.stroke();
    g.beginPath();
    g.moveTo(0.06, 0.4);
    g.lineTo(-0.0, 0.56);
    g.lineTo(0.14, 0.5);
    g.closePath();
    fillStroke(g, L.packDark);
  }, 0.3, 0.3);

// The nozzle on top of the Pop-Pack shows which weapon he has, no reading needed.
export const NOZZLES = ['pop', 'bubble', 'spread', 'boing', 'frost', 'rockets'];
const nozzle = (kind) =>
  sprite(`t-noz-${kind}`, 0.4, 0.5, (g) => {
    if (kind === 'bubble') {
      rrect(g, 0.16, 0.22, 0.07, 0.26, 0.03);
      fillStroke(g, STEEL, STEEL_DARK, 0.025);
      ellipse(g, 0.195, 0.14, 0.12, 0.11, 'rgba(160,230,255,0.35)', '#2d8fe0', 0.045);
      ellipse(g, 0.16, 0.1, 0.03, 0.025, 'rgba(255,255,255,0.9)');
      return;
    }
    if (kind === 'boing') {
      g.beginPath();
      for (let i = 0; i <= 6; i++) g.lineTo(0.195 + (i % 2 ? 0.06 : -0.06), 0.46 - i * 0.04);
      g.lineWidth = 0.035;
      g.strokeStyle = STEEL_DARK;
      g.stroke();
      ellipse(g, 0.195, 0.14, 0.12, 0.12, '#ff4f6d', '#a0203a', 0.03);
      ellipse(g, 0.16, 0.1, 0.04, 0.03, '#ffffff');
      return;
    }
    if (kind === 'frost') {
      rrect(g, 0.14, 0.24, 0.11, 0.24, 0.04);
      fillStroke(g, STEEL, STEEL_DARK, 0.025);
      g.strokeStyle = '#3fb8f0';
      g.lineWidth = 0.035;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        g.beginPath();
        g.moveTo(0.195 + Math.cos(a) * 0.13, 0.15 + Math.sin(a) * 0.13);
        g.lineTo(0.195 - Math.cos(a) * 0.13, 0.15 - Math.sin(a) * 0.13);
        g.stroke();
      }
      ellipse(g, 0.195, 0.15, 0.04, 0.04, '#e6faff', '#3fb8f0', 0.02);
      return;
    }
    if (kind === 'rockets') {
      for (const [x, y] of [[0.1, 0.18], [0.2, 0.1], [0.3, 0.18]]) {
        rrect(g, x - 0.04, y, 0.08, 0.26, 0.03);
        fillStroke(g, '#ff8a2a', '#a04a00', 0.02);
        g.beginPath();
        g.moveTo(x - 0.04, y);
        g.lineTo(x, y - 0.07);
        g.lineTo(x + 0.04, y);
        g.closePath();
        fillStroke(g, '#ffd23a', '#a04a00', 0.02);
      }
      return;
    }
    if (kind === 'spread') {
      rrect(g, 0.13, 0.24, 0.13, 0.24, 0.04);
      fillStroke(g, STEEL, STEEL_DARK, 0.025);
      starPath(g, 0.195, 0.17, 0.15, 0.07);
      fillStroke(g, '#ffd23a', '#d27a00', 0.03);
      return;
    }
    rrect(g, 0.11, 0.12, 0.17, 0.36, 0.05);
    fillStroke(g, STEEL, STEEL_DARK, 0.03);
    rrect(g, 0.08, 0.06, 0.23, 0.1, 0.04);
    fillStroke(g, '#ffd23a', '#c98a00', 0.025);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(0.14, 0.18, 0.04, 0.26);
  }, 0.195, 0.46);

const tail = () =>
  sprite(`t-tail-${L.key}`, 0.42, 0.34, (g) => {
    ellipse(g, 0.2, 0.18, 0.18, 0.13, L.fur, L.dark, LINE, -0.3);
    ellipse(g, 0.1, 0.13, 0.08, 0.06, L.cream, null, 0, -0.3);
  }, 0.36, 0.2);

const leg = (front) =>
  sprite(`${front ? 't-leg-f' : 't-leg-b'}-${L.key}`, 0.24, 0.42, (g) => {
    rrect(g, 0.03, 0.0, 0.18, 0.36, 0.08);
    fillStroke(g, front ? L.fur : L.deep, L.dark, 0.035);
    ellipse(g, 0.12, 0.35, 0.11, 0.065, L.cream, L.dark, 0.03);
  }, 0.12, 0.04);

const propeller = () =>
  sprite('t-prop', 0.9, 0.36, (g) => {
    ellipse(g, 0.45, 0.18, 0.42, 0.13, 'rgba(255,243,220,0.6)', 'rgba(184,98,15,0.6)', 0.03);
    ellipse(g, 0.45, 0.18, 0.2, 0.06, 'rgba(242,149,44,0.6)');
  }, 0.45, 0.18);

// Hats from the Pup Closet, sitting on top of his head.
export const HAT_IDS = ['party', 'flower', 'crown', 'pirate', 'astro'];
export const hatSprite = (kind) => hat(kind);
const hat = (kind) =>
  sprite(`t-hat-${kind}`, 1.3, 1.3, (g) => {
    const cx = 0.65;
    if (kind === 'party') {
      g.beginPath();
      g.moveTo(cx - 0.2, 0.86);
      g.lineTo(cx + 0.04, 0.3);
      g.lineTo(cx + 0.22, 0.86);
      g.closePath();
      g.save();
      g.clip();
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? '#ffd23a' : '#4fc3ff';
        g.fillRect(cx - 0.3, 0.3 + i * 0.1, 0.6, 0.1);
      }
      g.restore();
      g.beginPath();
      g.moveTo(cx - 0.2, 0.86);
      g.lineTo(cx + 0.04, 0.3);
      g.lineTo(cx + 0.22, 0.86);
      g.closePath();
      g.lineWidth = 0.03;
      g.strokeStyle = '#2b5fa0';
      g.stroke();
      ellipse(g, cx + 0.04, 0.29, 0.07, 0.07, '#ff4f8a', '#a0204f', 0.02);
    } else if (kind === 'flower') {
      for (let i = 0; i < 5; i++) {
        const x = cx - 0.3 + i * 0.15;
        const y = 0.84 - Math.sin((i / 4) * Math.PI) * 0.1;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ellipse(g, x + Math.cos(a) * 0.045, y + Math.sin(a) * 0.045, 0.04, 0.04, ['#ff6fae', '#ffd23a', '#b48cff', '#ff9a3c', '#7be05a'][i], null);
        }
        ellipse(g, x, y, 0.03, 0.03, '#ffffff');
      }
    } else if (kind === 'crown') {
      g.beginPath();
      g.moveTo(cx - 0.22, 0.88);
      g.lineTo(cx - 0.24, 0.6);
      g.lineTo(cx - 0.12, 0.72);
      g.lineTo(cx, 0.55);
      g.lineTo(cx + 0.12, 0.72);
      g.lineTo(cx + 0.24, 0.6);
      g.lineTo(cx + 0.22, 0.88);
      g.closePath();
      fillStroke(g, '#ffd23a', '#b5860a', 0.03);
      for (const [x, c] of [[-0.12, '#ff4f6d'], [0, '#4fc3ff'], [0.12, '#7be05a']]) ellipse(g, cx + x, 0.8, 0.035, 0.035, c);
    } else if (kind === 'pirate') {
      g.beginPath();
      g.moveTo(cx - 0.38, 0.86);
      g.quadraticCurveTo(cx - 0.3, 0.52, cx, 0.55);
      g.quadraticCurveTo(cx + 0.3, 0.52, cx + 0.38, 0.86);
      g.quadraticCurveTo(cx, 0.76, cx - 0.38, 0.86);
      fillStroke(g, '#2a2440', '#100c1e', 0.03);
      // a little bone instead of a skull
      g.fillStyle = '#ffffff';
      g.fillRect(cx - 0.08, 0.66, 0.16, 0.04);
      for (const x of [-0.09, 0.09]) for (const y of [0.655, 0.705]) ellipse(g, cx + x, y, 0.025, 0.025, '#ffffff');
    } else if (kind === 'astro') {
      ellipse(g, cx, 0.72, 0.6, 0.58, 'rgba(190,235,255,0.28)', 'rgba(255,255,255,0.9)', 0.05);
      ellipse(g, cx - 0.25, 0.48, 0.12, 0.07, 'rgba(255,255,255,0.8)', null, 0, -0.6);
      rrect(g, cx - 0.5, 1.18, 1.0, 0.1, 0.04);
      fillStroke(g, '#c9d3e6', '#7d8aa8', 0.025);
    }
  }, 0.65, 0.95);

// A Heart Treat (also drawn in the HUD): a heart-shaped dog biscuit.
export const treatSprite = () =>
  sprite('t-treat', 0.8, 0.8, (g) => {
    heartPath(g, 0.4, 0.42, 0.3);
    fillStroke(g, '#e8a95c', '#9a5a1e', 0.045);
    for (const [x, y] of [[0.3, 0.38], [0.45, 0.33], [0.42, 0.52], [0.52, 0.42]]) ellipse(g, x, y, 0.025, 0.025, '#9a5a1e');
    heartPath(g, 0.4, 0.42, 0.11);
    g.fillStyle = '#ff3d5e';
    g.fill();
  }, 0.4, 0.42);

// --------------------------------------------------------------------------------- the pose
// A neutral pose; PlayerView fills in the moving parts each frame.
export function neutralPose() {
  return {
    bodyY: 0, bodyRot: 0, headX: 0, headY: 0, headRot: 0, earB: 0, earF: 0, tail: -0.2,
    legs: [0, 0, 0, 0], eye: 'open', mouth: 'smile', packKick: 0, nozzle: 'pop', flutter: null,
  };
}

// Draws Turbo with his feet at the origin, facing right, `ppt` pixels per tile.
// img(canvas, x, y, w, h) does the drawing so callers can count draws.
export function drawTurbo(g, ppt, pose, img) {
  const prev = L;
  if (pose.look) L = palette(pose.look);
  try {
    drawParts(g, ppt, pose, img);
  } finally {
    L = prev;
  }
}

function drawParts(g, ppt, pose, img) {
  const put = (s, x, y, rot = 0, sx = 1, sy = 1) => {
    g.save();
    g.translate(x * ppt, y * ppt);
    if (rot) g.rotate(rot);
    if (sx !== 1 || sy !== 1) g.scale(sx, sy);
    img(s.canvas, -s.ox * ppt, -s.oy * ppt, s.w * ppt, s.h * ppt);
    g.restore();
  };
  const by = pose.bodyY;
  const legs = pose.legs;
  // far legs (darker), then tail, pack and nozzle, body, head, near legs
  put(leg(false), -0.33, -0.36 + by * 0.5, legs[0]);
  put(leg(false), 0.12, -0.36 + by * 0.5, legs[1]);
  if (pose.flutter !== null) put(propeller(), -0.55, -0.82 + by, 0, Math.cos(pose.flutter) * 0.3 + 0.9, 1);
  else put(tail(), -0.5, -0.68 + by, pose.tail);
  g.save();
  g.translate(0, by * ppt);
  g.rotate(pose.bodyRot);
  put(nozzle(pose.nozzle), -0.24 - pose.packKick, -0.98, 0.45);
  put(pack(), -0.33 - pose.packKick, -0.74);
  put(body(), -0.05, -0.58);
  // head, with ears, eye and mouth riding on it
  g.save();
  g.translate((0.3 + pose.headX) * ppt, (-1.02 + pose.headY) * ppt);
  g.rotate(pose.headRot);
  put(ear(false), -0.2, -0.28, -0.25 + pose.earB);
  put(head(), 0, 0);
  put(ear(true), 0.07, -0.32, 0.12 + pose.earF);
  put(eye(pose.eye), 0.15, -0.05);
  if (pose.accessory === 'shades') put(shades(), 0.12, -0.06);
  const h = L.hat;
  if (h && h !== 'none') put(hat(h), h === 'astro' ? 0.02 : 0.02, h === 'astro' ? 0.18 : -0.12, h === 'astro' ? 0 : -0.1);
  put(mouth(pose.mouth), 0.27, 0.17);
  g.restore();
  g.restore();
  put(leg(true), -0.2, -0.36 + by * 0.5, legs[2]);
  put(leg(true), 0.24, -0.36 + by * 0.5, legs[3]);
}
