// Turbo, the corgi pup, as a puppet: body, head, two ears, eyes, mouth, four legs, tail and the
// Pop-Pack with a nozzle for each weapon. Each part is baked once (engine/sprites.js) and the
// parts are posed every frame (drawTurbo), so he can squash, flop his ears and pull faces
// without any frame sheets. Facing right; the renderer flips him for left.
import { sprite } from '../engine/sprites.js';
import { ellipse, rrect, fillStroke, starPath, LINE } from './style.js';

export const FUR = '#f2952c';
export const FUR_DARK = '#b8620f';
export const FUR_DEEP = '#d97a18';
export const CREAM = '#fff3dc';
export const INK = '#4a2408';
const PACK = '#e8463d';
const PACK_DARK = '#9e2520';
const STEEL = '#a7b2c4';
const STEEL_DARK = '#58627a';
const STRAP = '#2d6fe0';
const LENS = '#86e6ff';

// ------------------------------------------------------------------------------------- parts

const body = () =>
  sprite('t-body', 1.2, 0.8, (g) => {
    ellipse(g, 0.6, 0.42, 0.47, 0.31, FUR, FUR_DARK);
    // darker back, cream chest and tummy
    g.save();
    g.beginPath();
    g.ellipse(0.6, 0.42, 0.47, 0.31, 0, 0, Math.PI * 2);
    g.clip();
    ellipse(g, 0.5, 0.18, 0.4, 0.12, FUR_DEEP);
    ellipse(g, 0.82, 0.56, 0.27, 0.22, CREAM);
    ellipse(g, 0.45, 0.68, 0.3, 0.1, CREAM);
    g.restore();
    g.beginPath();
    g.ellipse(0.6, 0.42, 0.47, 0.31, 0, 0, Math.PI * 2);
    g.lineWidth = LINE;
    g.strokeStyle = FUR_DARK;
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
  sprite('t-head', 1.0, 0.9, (g) => {
    ellipse(g, 0.45, 0.48, 0.36, 0.33, FUR, FUR_DARK);
    g.save();
    g.beginPath();
    g.ellipse(0.45, 0.48, 0.36, 0.33, 0, 0, Math.PI * 2);
    g.clip();
    ellipse(g, 0.55, 0.72, 0.28, 0.16, CREAM); // cheeks
    ellipse(g, 0.6, 0.3, 0.05, 0.16, CREAM, null, 0, 0.25); // blaze
    g.restore();
    g.beginPath();
    g.ellipse(0.45, 0.48, 0.36, 0.33, 0, 0, Math.PI * 2);
    g.lineWidth = LINE;
    g.strokeStyle = FUR_DARK;
    g.stroke();
    // muzzle and nose
    ellipse(g, 0.72, 0.6, 0.18, 0.13, CREAM, FUR_DARK, 0.03);
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
  sprite(front ? 't-ear-f' : 't-ear-b', 0.36, 0.52, (g) => {
    g.beginPath();
    g.moveTo(0.03, 0.48);
    g.quadraticCurveTo(0.06, 0.12, 0.2, 0.03);
    g.quadraticCurveTo(0.33, 0.14, 0.33, 0.48);
    g.closePath();
    fillStroke(g, front ? FUR : FUR_DEEP, FUR_DARK);
    g.beginPath();
    g.moveTo(0.1, 0.46);
    g.quadraticCurveTo(0.12, 0.2, 0.2, 0.13);
    g.quadraticCurveTo(0.27, 0.22, 0.26, 0.46);
    g.closePath();
    fillStroke(g, front ? '#ffc4a3' : '#e8a17d');
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
  sprite('t-pack', 0.5, 0.6, (g) => {
    rrect(g, 0.05, 0.08, 0.4, 0.46, 0.11);
    fillStroke(g, PACK, PACK_DARK);
    rrect(g, 0.1, 0.13, 0.12, 0.36, 0.05);
    fillStroke(g, 'rgba(255,255,255,0.28)');
    // a dial and a little fin
    ellipse(g, 0.31, 0.38, 0.065, 0.065, '#ffe28a', PACK_DARK, 0.025);
    g.beginPath();
    g.moveTo(0.31, 0.38);
    g.lineTo(0.34, 0.34);
    g.lineWidth = 0.02;
    g.strokeStyle = PACK_DARK;
    g.stroke();
    g.beginPath();
    g.moveTo(0.06, 0.4);
    g.lineTo(-0.0, 0.56);
    g.lineTo(0.14, 0.5);
    g.closePath();
    fillStroke(g, PACK_DARK);
  }, 0.3, 0.3);

// The nozzle on top of the Pop-Pack shows which weapon he has, no reading needed.
export const NOZZLES = ['pop', 'bubble', 'spread'];
const nozzle = (kind) =>
  sprite(`t-noz-${kind}`, 0.4, 0.5, (g) => {
    if (kind === 'bubble') {
      rrect(g, 0.16, 0.22, 0.07, 0.26, 0.03);
      fillStroke(g, STEEL, STEEL_DARK, 0.025);
      ellipse(g, 0.195, 0.14, 0.12, 0.11, 'rgba(160,230,255,0.35)', '#2d8fe0', 0.045);
      ellipse(g, 0.16, 0.1, 0.03, 0.025, 'rgba(255,255,255,0.9)');
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
  sprite('t-tail', 0.42, 0.34, (g) => {
    ellipse(g, 0.2, 0.18, 0.18, 0.13, FUR, FUR_DARK, LINE, -0.3);
    ellipse(g, 0.1, 0.13, 0.08, 0.06, CREAM, null, 0, -0.3);
  }, 0.36, 0.2);

const leg = (front) =>
  sprite(front ? 't-leg-f' : 't-leg-b', 0.24, 0.42, (g) => {
    rrect(g, 0.03, 0.0, 0.18, 0.36, 0.08);
    fillStroke(g, front ? FUR : FUR_DEEP, FUR_DARK, 0.035);
    ellipse(g, 0.12, 0.35, 0.11, 0.065, CREAM, FUR_DARK, 0.03);
  }, 0.12, 0.04);

const propeller = () =>
  sprite('t-prop', 0.9, 0.36, (g) => {
    ellipse(g, 0.45, 0.18, 0.42, 0.13, 'rgba(255,243,220,0.6)', 'rgba(184,98,15,0.6)', 0.03);
    ellipse(g, 0.45, 0.18, 0.2, 0.06, 'rgba(242,149,44,0.6)');
  }, 0.45, 0.18);

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
  const put = (s, x, y, rot = 0, sx = 1, sy = 1) => {
    g.save();
    g.translate(x * ppt, y * ppt);
    if (rot) g.rotate(rot);
    if (sx !== 1 || sy !== 1) g.scale(sx, sy);
    img(s.canvas, -s.ox * ppt, -s.oy * ppt, s.w * ppt, s.h * ppt);
    g.restore();
  };
  const by = pose.bodyY;
  const L = pose.legs;
  // far legs (darker), then tail, pack and nozzle, body, head, near legs
  put(leg(false), -0.33, -0.36 + by * 0.5, L[0]);
  put(leg(false), 0.12, -0.36 + by * 0.5, L[1]);
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
  put(mouth(pose.mouth), 0.27, 0.17);
  g.restore();
  g.restore();
  put(leg(true), -0.2, -0.36 + by * 0.5, L[2]);
  put(leg(true), 0.24, -0.36 + by * 0.5, L[3]);
}
