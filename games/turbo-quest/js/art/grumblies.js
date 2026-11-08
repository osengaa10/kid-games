// The Grumblies: squishy purple blobs with grumpy brows and a tiny rain cloud each. Kinds differ
// by hat and how they move (feet, big hopping feet, wings). Faces: grumpy, alert (wide eyes, the
// warning before they act), happy (on the balloon after being cheered). Silly, never scary.
import { sprite } from '../engine/sprites.js';
import { ellipse, rrect, fillStroke, LINE } from './style.js';
import { GRUMBLY_COLORS } from '../content/enemies.js';

const INK = '#2c1450';

// The body blob: 1.2 × 1.2 sprite, anchored at the middle of its bottom.
export const grumblyBody = (kind) =>
  sprite(`g-body-${kind}`, 1.2, 1.2, (g) => {
    const c = GRUMBLY_COLORS[kind];
    const squat = kind === 'hopper';
    const rx = squat ? 0.52 : 0.46;
    const ry = squat ? 0.38 : 0.44;
    const cy = 1.15 - ry;
    ellipse(g, 0.6, cy, rx, ry, c.body, c.dark, LINE * 1.1);
    g.save();
    g.beginPath();
    g.ellipse(0.6, cy, rx, ry, 0, 0, Math.PI * 2);
    g.clip();
    ellipse(g, 0.6, cy + ry * 0.75, rx * 0.75, ry * 0.5, c.belly);
    ellipse(g, 0.42, cy - ry * 0.45, rx * 0.32, ry * 0.2, 'rgba(255,255,255,0.35)', null, 0, -0.5);
    g.restore();
    g.beginPath();
    g.ellipse(0.6, cy, rx, ry, 0, 0, Math.PI * 2);
    g.lineWidth = LINE * 1.1;
    g.strokeStyle = c.dark;
    g.stroke();
    hat(g, kind, cy - ry);
  }, 0.6, 1.15);

function hat(g, kind, top) {
  if (kind === 'waddler') {
    // half a coconut shell
    g.beginPath();
    g.ellipse(0.6, top + 0.13, 0.27, 0.18, 0, Math.PI, 0);
    g.closePath();
    fillStroke(g, '#8a5a2b', '#4e2f12', 0.035);
    g.strokeStyle = 'rgba(78,47,18,0.6)';
    g.lineWidth = 0.02;
    for (const x of [0.48, 0.6, 0.72]) {
      g.beginPath();
      g.moveTo(x, top + 0.0);
      g.lineTo(x + 0.03, top + 0.11);
      g.stroke();
    }
  } else if (kind === 'hopper') {
    // a big leaf
    g.beginPath();
    g.moveTo(0.56, top + 0.06);
    g.quadraticCurveTo(0.42, top - 0.2, 0.7, top - 0.26);
    g.quadraticCurveTo(0.78, top - 0.05, 0.56, top + 0.06);
    fillStroke(g, '#5fcf4a', '#2f8f3a', 0.03);
    g.beginPath();
    g.moveTo(0.57, top + 0.03);
    g.lineTo(0.68, top - 0.18);
    g.lineWidth = 0.02;
    g.strokeStyle = '#2f8f3a';
    g.stroke();
  } else {
    // a flower
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ellipse(g, 0.62 + Math.cos(a) * 0.09, top - 0.02 + Math.sin(a) * 0.09, 0.07, 0.07, '#ff8fc8', '#c23f86', 0.02);
    }
    ellipse(g, 0.62, top - 0.02, 0.055, 0.055, '#ffe14d', '#c99a00', 0.02);
  }
}

// Faces, drawn over the body: 0.8 × 0.5 sprite centred on the eyes.
export const grumblyFace = (mood) =>
  sprite(`g-face-${mood}`, 0.8, 0.5, (g) => {
    g.lineCap = 'round';
    const eyeY = 0.24;
    for (const x of [0.27, 0.53]) {
      if (mood === 'happy') {
        g.beginPath();
        g.arc(x, eyeY + 0.04, 0.06, Math.PI + 0.3, -0.3);
        g.lineWidth = 0.04;
        g.strokeStyle = INK;
        g.stroke();
      } else {
        const r = mood === 'alert' ? 0.085 : 0.07;
        ellipse(g, x, eyeY, r, r * 1.1, '#ffffff', INK, 0.025);
        ellipse(g, x + 0.015, eyeY + 0.01, r * 0.5, r * 0.6, INK);
        ellipse(g, x + 0.03, eyeY - 0.02, 0.016, 0.016, '#ffffff');
      }
    }
    if (mood === 'grumpy') {
      // grumpy brows slanting in
      g.beginPath();
      g.moveTo(0.17, 0.1);
      g.lineTo(0.35, 0.16);
      g.moveTo(0.63, 0.1);
      g.lineTo(0.45, 0.16);
      g.lineWidth = 0.045;
      g.strokeStyle = INK;
      g.stroke();
      g.beginPath();
      g.moveTo(0.32, 0.42);
      g.quadraticCurveTo(0.4, 0.36, 0.48, 0.42);
      g.lineWidth = 0.035;
      g.stroke();
    } else if (mood === 'alert') {
      g.beginPath();
      g.moveTo(0.17, 0.06);
      g.lineTo(0.35, 0.03);
      g.moveTo(0.63, 0.06);
      g.lineTo(0.45, 0.03);
      g.lineWidth = 0.04;
      g.strokeStyle = INK;
      g.stroke();
      ellipse(g, 0.4, 0.41, 0.05, 0.06, INK);
    } else {
      ellipse(g, 0.15, 0.36, 0.06, 0.035, 'rgba(255,120,170,0.6)');
      ellipse(g, 0.65, 0.36, 0.06, 0.035, 'rgba(255,120,170,0.6)');
      g.beginPath();
      g.moveTo(0.3, 0.34);
      g.quadraticCurveTo(0.4, 0.47, 0.5, 0.34);
      g.closePath();
      fillStroke(g, '#7a1f4b', INK, 0.025);
    }
  }, 0.4, 0.24);

export const grumblyFoot = (kind) =>
  sprite(`g-foot-${kind}`, 0.36, 0.2, (g) => {
    const c = GRUMBLY_COLORS[kind];
    const big = kind === 'hopper';
    ellipse(g, 0.18, 0.1, big ? 0.16 : 0.12, big ? 0.08 : 0.07, c.dark, '#1f0f3a', 0.025);
  }, 0.18, 0.1);

export const grumblyWing = () =>
  sprite('g-wing', 0.7, 0.4, (g) => {
    g.beginPath();
    g.moveTo(0.05, 0.3);
    g.quadraticCurveTo(0.2, -0.05, 0.62, 0.08);
    g.quadraticCurveTo(0.5, 0.32, 0.05, 0.3);
    fillStroke(g, 'rgba(200,240,255,0.75)', '#5a8fd6', 0.025);
    g.beginPath();
    g.moveTo(0.08, 0.28);
    g.lineTo(0.5, 0.12);
    g.lineWidth = 0.015;
    g.strokeStyle = 'rgba(90,143,214,0.7)';
    g.stroke();
  }, 0.05, 0.3);

// The little rain cloud that follows every grumpy Grumbly about.
export const rainCloud = () =>
  sprite('g-cloud', 0.7, 0.45, (g) => {
    for (const [x, y, r] of [[0.2, 0.22, 0.12], [0.36, 0.16, 0.15], [0.52, 0.22, 0.12]]) ellipse(g, x, y, r, r, '#c7cbe0');
    for (const [x, y, r] of [[0.2, 0.2, 0.1], [0.36, 0.14, 0.13], [0.52, 0.2, 0.1]]) ellipse(g, x, y, r, r, '#e6e9f5');
    g.fillStyle = '#7fb4ff';
    for (const [x, y] of [[0.26, 0.38], [0.46, 0.41]]) {
      g.beginPath();
      g.moveTo(x, y - 0.06);
      g.quadraticCurveTo(x + 0.035, y, x, y + 0.025);
      g.quadraticCurveTo(x - 0.035, y, x, y - 0.06);
      g.fill();
    }
  }, 0.36, 0.22);

// A cheered Grumbly: a balloon in its color with a happy face, floating away.
export const balloon = (kind) =>
  sprite(`g-balloon-${kind}`, 1.1, 1.5, (g) => {
    const c = GRUMBLY_COLORS[kind];
    g.beginPath();
    g.moveTo(0.55, 1.0);
    g.quadraticCurveTo(0.5, 1.2, 0.6, 1.48);
    g.lineWidth = 0.02;
    g.strokeStyle = '#8a7aa8';
    g.stroke();
    ellipse(g, 0.55, 0.5, 0.42, 0.47, c.body, c.dark, LINE);
    g.beginPath();
    g.moveTo(0.5, 0.95);
    g.lineTo(0.6, 0.95);
    g.lineTo(0.55, 1.02);
    g.closePath();
    fillStroke(g, c.dark);
    ellipse(g, 0.38, 0.28, 0.08, 0.13, 'rgba(255,255,255,0.55)', null, 0, -0.4);
  }, 0.55, 0.5);

// A white copy of any sprite, for the hit flash (made once, then cached).
export function flashOf(s) {
  if (s.flash) return s.flash;
  const c = document.createElement('canvas');
  c.width = s.canvas.width;
  c.height = s.canvas.height;
  const g = c.getContext('2d');
  g.drawImage(s.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  s.flash = { canvas: c, w: s.w, h: s.h, ox: s.ox, oy: s.oy };
  return s.flash;
}

// Draws one Grumbly with its feet at the origin. pose: { kind, mood, squash, step, wing, cloudY,
// flash }. img(canvas, x, y, w, h) does the drawing.
export function drawGrumbly(g, ppt, pose, img) {
  const put = (s, x, y, rot = 0, sx = 1, sy = 1) => {
    g.save();
    g.translate(x * ppt, y * ppt);
    if (rot) g.rotate(rot);
    if (sx !== 1 || sy !== 1) g.scale(sx, sy);
    img(s.canvas, -s.ox * ppt, -s.oy * ppt, s.w * ppt, s.h * ppt);
    g.restore();
  };
  const k = pose.kind;
  const flash = pose.flash;
  const sq = pose.squash || 1;
  if (k === 'flapper') {
    const flap = Math.sin(pose.wing) * 0.5;
    put(grumblyWing(), -0.1, -0.68, -0.6 - flap, -1, 1);
  } else {
    const st = pose.step || 0;
    put(grumblyFoot(k), -0.2 + Math.sin(st) * 0.06, -0.08 + Math.min(0, Math.cos(st)) * 0.05);
    put(grumblyFoot(k), 0.2 - Math.sin(st) * 0.06, -0.08 + Math.min(0, -Math.cos(st)) * 0.05);
  }
  g.save();
  g.scale(1 / Math.sqrt(sq), sq);
  const b = grumblyBody(k);
  put(flash ? flashOf(b) : b, 0, 0);
  const faceY = k === 'hopper' ? -0.5 : -0.62;
  if (!flash) put(grumblyFace(pose.mood || 'grumpy'), 0.06, faceY);
  g.restore();
  if (k === 'flapper') {
    const flap = Math.sin(pose.wing) * 0.5;
    put(grumblyWing(), 0.1, -0.68, -0.6 - flap);
  }
  if (pose.cloudY !== undefined) put(rainCloud(), 0.05, pose.cloudY);
}
