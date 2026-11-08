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
  if (kind === 'spitter') {
    // a collar of petals round the top
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      ellipse(g, 0.6 + Math.cos(a) * 0.36, top + 0.2 + Math.sin(a) * 0.2, 0.09, 0.06, i % 2 ? '#ff8fc8' : '#ffb3d9', '#c23f86', 0.02, a);
    }
    return;
  }
  if (kind === 'bonker' || kind === 'bigbonker') {
    // a little pot on its head
    rrect(g, 0.42, top - 0.06, 0.36, 0.16, 0.05);
    fillStroke(g, '#9aa6b8', '#56606f', 0.03);
    ellipse(g, 0.6, top - 0.08, 0.05, 0.035, '#56606f');
    if (kind === 'bigbonker') {
      g.beginPath();
      g.moveTo(0.46, top - 0.06);
      g.lineTo(0.48, top - 0.24);
      g.lineTo(0.54, top - 0.14);
      g.lineTo(0.6, top - 0.28);
      g.lineTo(0.66, top - 0.14);
      g.lineTo(0.72, top - 0.24);
      g.lineTo(0.74, top - 0.06);
      g.closePath();
      fillStroke(g, '#ffd23a', '#b5860a', 0.02);
    }
    return;
  }
  if (kind === 'charger') {
    // a beetle horn
    g.beginPath();
    g.moveTo(0.78, top + 0.25);
    g.quadraticCurveTo(1.08, top + 0.05, 1.02, top - 0.18);
    g.quadraticCurveTo(0.96, top + 0.0, 0.7, top + 0.12);
    g.closePath();
    fillStroke(g, '#ffe0a8', '#a87a2a', 0.03);
    return;
  }
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
    if (mood === 'dizzy') {
      g.lineWidth = 0.03;
      g.strokeStyle = INK;
      for (const x of [0.27, 0.53]) {
        g.beginPath();
        for (let a = 0; a < 9; a += 0.4) g.lineTo(x + Math.cos(a) * a * 0.009, eyeY + Math.sin(a) * a * 0.009);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(0.3, 0.4);
      g.quadraticCurveTo(0.35, 0.36, 0.4, 0.4);
      g.quadraticCurveTo(0.45, 0.44, 0.5, 0.4);
      g.stroke();
    } else if (mood === 'puff') {
      ellipse(g, 0.12, 0.38, 0.12, 0.1, 'rgba(255,140,200,0.7)');
      ellipse(g, 0.68, 0.38, 0.12, 0.1, 'rgba(255,140,200,0.7)');
      ellipse(g, 0.4, 0.4, 0.08, 0.07, INK);
      g.beginPath();
      g.moveTo(0.17, 0.08);
      g.lineTo(0.35, 0.14);
      g.moveTo(0.63, 0.08);
      g.lineTo(0.45, 0.14);
      g.lineWidth = 0.04;
      g.strokeStyle = INK;
      g.stroke();
    } else if (mood === 'grumpy') {
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
    } else if (mood === 'spit') {
      ellipse(g, 0.4, 0.4, 0.06, 0.06, INK);
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

// The pot-lid shield, held out in front.
export const shieldSprite = (big) =>
  sprite(`g-shield${big ? 'big' : ''}`, 0.5, 0.9, (g) => {
    ellipse(g, 0.25, 0.45, 0.16, 0.4, '#b7c2d4', '#56606f', 0.04);
    ellipse(g, 0.22, 0.45, 0.08, 0.3, '#d9e0ea');
    ellipse(g, 0.28, 0.45, 0.05, 0.05, '#56606f');
  }, 0.1, 0.45);

// Frozen by the Frosty Ray: an ice block round the Grumbly.
export const iceBlock = () =>
  sprite('g-ice', 1.2, 1.2, (g) => {
    rrect(g, 0.05, 0.05, 1.1, 1.1, 0.14);
    fillStroke(g, 'rgba(170,230,255,0.55)', '#5fb8e8', 0.05);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.moveTo(0.18, 0.15);
    g.lineTo(0.5, 0.15);
    g.lineTo(0.18, 0.5);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 0.025;
    g.beginPath();
    g.moveTo(0.8, 0.9);
    g.lineTo(0.95, 0.75);
    g.stroke();
  }, 0.6, 1.15);

// A cheered Grumbly: a balloon in its color with a happy face, floating away.
const TIKI = { body: '#c47a3c', dark: '#6b3a14', belly: '#e0a066' };
export const balloon = (kind) =>
  sprite(`g-balloon-${kind}`, 1.1, 1.5, (g) => {
    const c = GRUMBLY_COLORS[kind] || TIKI;
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
  const big = pose.scale || 1;
  if (big !== 1) g.scale(big, big);
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
  if (pose.shield) put(shieldSprite(k === 'bigbonker'), 0.42, -0.5);
  if (pose.cloudY !== undefined && !pose.frozen) put(rainCloud(), 0.05, pose.cloudY);
  if (pose.frozen) put(iceBlock(), 0, 0.05);
}

// ------------------------------------------------------------------------------ Tiki Tumble
// A stack of grumpy tiki blocks. The top block wears a leaf crown; its eyes open (glowing) while
// the stack is dizzy. Drawn with the stack's feet at the origin.
export const tikiBlock = (face) =>
  sprite(`g-tiki-${face}`, 1.9, 1.1, (g) => {
    rrect(g, 0.08, 0.06, 1.74, 0.98, 0.18);
    fillStroke(g, TIKI.body, TIKI.dark, 0.05);
    g.fillStyle = 'rgba(107,58,20,0.25)';
    g.fillRect(0.12, 0.82, 1.66, 0.08);
    g.fillRect(0.12, 0.14, 1.66, 0.05);
    if (face === 'glow') {
      ellipse(g, 0.6, 0.45, 0.2, 0.17, '#fff4a8', '#ffb000', 0.04);
      ellipse(g, 1.3, 0.45, 0.2, 0.17, '#fff4a8', '#ffb000', 0.04);
      ellipse(g, 0.6, 0.47, 0.08, 0.08, '#3a1d06');
      ellipse(g, 1.3, 0.47, 0.08, 0.08, '#3a1d06');
    } else {
      for (const x of [0.6, 1.3]) {
        g.beginPath();
        g.moveTo(x - 0.16, 0.42);
        g.lineTo(x + 0.16, face === 'top' ? 0.5 : 0.46);
        g.lineWidth = 0.06;
        g.strokeStyle = '#3a1d06';
        g.stroke();
      }
    }
    // a big grumpy (or dizzy-happy) mouth
    g.beginPath();
    if (face === 'glow') {
      g.moveTo(0.7, 0.72);
      g.quadraticCurveTo(0.95, 0.92, 1.2, 0.72);
    } else {
      g.moveTo(0.7, 0.82);
      g.quadraticCurveTo(0.95, 0.66, 1.2, 0.82);
    }
    g.lineWidth = 0.06;
    g.strokeStyle = '#3a1d06';
    g.stroke();
    for (const x of [0.3, 1.6]) ellipse(g, x, 0.56, 0.06, 0.12, '#e0a066');
  }, 0.95, 1.04);

export const tikiCrown = () =>
  sprite('g-tiki-crown', 2.0, 0.9, (g) => {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      g.save();
      g.translate(1.0, 0.85);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0.38, 0, 0.38, 0.11, 0, 0, Math.PI * 2);
      fillStroke(g, i % 2 ? '#52c25a' : '#3fae4f', '#1f6b2c', 0.03);
      g.restore();
    }
  }, 1.0, 0.85);

// A sticker's picture (Sticker Book, results): a happy Grumbly or a glowing tiki, feet at the
// origin, about one tile tall. `got` false draws it grumpy (shown faded as a silhouette).
export function drawSticker(g, ppt, kind, got, wing = 0) {
  const img = (c, x, y, w, h) => g.drawImage(c, x, y, w, h);
  if (kind === 'tiki') {
    const b = tikiBlock(got ? 'glow' : 'grumpy');
    const c = tikiCrown();
    const k = 0.9;
    img(b.canvas, -b.ox * ppt * k, -b.oy * ppt * k, b.w * ppt * k, b.h * ppt * k);
    img(c.canvas, -c.ox * ppt * k, (-0.85 - c.oy) * ppt * k, c.w * ppt * k, c.h * ppt * k);
    return;
  }
  g.save();
  drawGrumbly(g, ppt, { kind, mood: got ? 'happy' : 'grumpy', squash: 1, step: 0, wing, shield: kind === 'bonker' || kind === 'bigbonker', scale: kind === 'bigbonker' ? 1.3 : 1 }, img);
  g.restore();
}
