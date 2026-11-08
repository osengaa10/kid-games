// Draws a patient from the rig (rig.js), every frame, as plain canvas paths: bold outlines in a
// darker shade of each part's own color, flat fills and one soft highlight (Turbo Quest's look).
// A face is { eyes, brows, mouth, open, look, blush }; faceFor(mood) gives the stock ones.
import { rig, NECK, HEAD, headAngles } from './rig.js';
import { ellipse, capsule, fillStroke, shade, withAlpha } from './style.js';
import { drawBandage } from './bandages.js';
import { drawSticker } from './stickers.js';

const LW = 0.085;
const INK = '#2a1c14';
const ink = (c) => shade(c, -0.42);

const MOODS = {
  idle: { eyes: 'open', mouth: 'smile' },
  happy: { eyes: 'happy', mouth: 'grin', blush: 0.5 },
  giggle: { eyes: 'happy', mouth: 'grin', blush: 1 },
  nervous: { eyes: 'open', brows: 'worried', mouth: 'wobble' },
  ouch: { eyes: 'squint', brows: 'worried', mouth: 'ouch' },
  surprised: { eyes: 'wide', brows: 'up', mouth: 'o' },
  ahh: { eyes: 'open', mouth: 'ahh', open: 1, look: { x: 0, y: -1 } },
  proud: { eyes: 'happy', mouth: 'smile', blush: 0.7 },
  calm: { eyes: 'closed', mouth: 'smile' },
  focus: { eyes: 'open', mouth: 'flat' },
  achoo: { eyes: 'open', brows: 'up', mouth: 'o', lids: 0.55 }, // "ah… ah…"
  sneeze: { eyes: 'squint', mouth: 'o' }, // "CHOO!"
};

// The sick version of a face: heavy eyelids, sad eyebrows, a frown, pale or flushed cheeks.
// Happy faces stay happy (a sick patient can still giggle); they just keep the sick colors.
export function sickFace(face, level, ail) {
  if (!level) return face;
  const f = { ...face };
  if (f.eyes === 'open' || f.eyes === 'wide') f.lids = Math.max(f.lids || 0, 0.5 * level);
  if (!f.brows && level > 0.4 && (f.mouth === 'smile' || f.mouth === 'flat')) f.brows = 'worried';
  if (f.mouth === 'smile') f.mouth = level > 0.55 ? 'frown' : level > 0.25 ? 'flat' : 'smile';
  f.blush = ail === 'fever' ? (f.blush || 0) + 1.2 * level : (f.blush || 0) - 0.9 * level;
  return f;
}

export function faceFor(mood = 'idle') {
  return { eyes: 'open', mouth: 'smile', brows: null, open: 0, look: null, blush: 0, ...(MOODS[mood] || MOODS.idle) };
}

// Sticker-style outline: stroke every shape thick in the ink color first, then fill them all, so
// overlapping parts (thigh and shin, arm and paw) share one clean outline.
function union(g, paths, fill, stroke) {
  g.lineWidth = LW * 2;
  g.strokeStyle = stroke;
  for (const p of paths) {
    p();
    g.stroke();
  }
  g.fillStyle = fill;
  for (const p of paths) {
    p();
    g.fill();
  }
}

// ------------------------------------------------------------------------------------- parts

function drawTail(g, sp, r, t, x) {
  const s = r.s;
  const P = (px, py) => r.P(px, py);
  const wag = Math.sin(t * (x.wagFast ? 16 : 5)) * (x.wagFast ? 0.45 : 0.18) * (1 - 0.85 * (x.sick?.level || 0));
  g.save();
  if (sp.tail === 'wag') {
    const a = P(0.95, -0.6);
    const c = P(1.95, -0.7);
    const e = P(1.95 + wag, -1.65);
    const path = () => {
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(c.x, c.y, e.x, e.y);
    };
    g.lineCap = 'round';
    path();
    g.lineWidth = 0.52 * s + LW * 2;
    g.strokeStyle = ink(sp.fur);
    g.stroke();
    path();
    g.lineWidth = 0.52 * s;
    g.strokeStyle = sp.fur;
    g.stroke();
    ellipse(g, e.x, e.y, 0.22 * s, 0.2 * s, sp.belly);
  } else if (sp.tail === 'puff') {
    const p = P(1.3, -0.4);
    for (const [dx, dy, rr] of [[0, 0, 0.42], [0.18, -0.2, 0.3], [-0.12, -0.25, 0.28], [0.2, 0.15, 0.28]]) ellipse(g, p.x + dx * s, p.y + dy * s, rr * s, rr * s, '#ffffff', '#d8d0e6', LW);
  } else if (sp.tail === 'stub') {
    const p = P(1.25, -0.35);
    ellipse(g, p.x, p.y, 0.3 * s, 0.28 * s, sp.fur, ink(sp.fur), LW);
  } else if (sp.tail === 'curl') {
    const a = P(0.95, -0.5);
    const c = P(2.5, -0.5);
    const e = P(2.1 + wag * 0.5, -2.3);
    const path = () => {
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(c.x, c.y, e.x, e.y);
      g.quadraticCurveTo(e.x + 0.1 * s, e.y - 0.6 * s, e.x - 0.45 * s, e.y - 0.35 * s);
    };
    g.lineCap = 'round';
    path();
    g.lineWidth = 0.42 * s + LW * 2;
    g.strokeStyle = ink(sp.fur);
    g.stroke();
    path();
    g.lineWidth = 0.42 * s;
    g.strokeStyle = sp.fur;
    g.stroke();
    if (sp.stripes) {
      g.setLineDash([0.18 * s, 0.32 * s]);
      path();
      g.strokeStyle = sp.stripes;
      g.stroke();
      g.setLineDash([]);
    }
  } else if (sp.tail === 'dino') {
    const thump = x.thump || 0;
    const a = P(0.7, -1.3);
    const b = P(0.9, -0.05);
    const tip = P(3.0, -0.25 - thump * 0.9);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo(P(2.2, -0.9).x, P(2.2, -0.9).y - thump * 0.4 * s, tip.x, tip.y);
    g.quadraticCurveTo(P(2.0, 0.05).x, P(2.0, 0.05).y, b.x, b.y);
    g.closePath();
    fillStroke(g, sp.fur, ink(sp.fur), LW);
    for (const k of [0.45, 0.7]) {
      const p = P(0.9 + k * 2, -0.75 + k * 0.4 - thump * 0.6 * k);
      ellipse(g, p.x, p.y, 0.14 * s, 0.1 * s, sp.spots);
    }
  } else if (sp.tail === 'tuft') {
    const a = P(1.1, -0.55);
    const e = P(1.7 + wag * 0.3, -0.15);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo(P(1.6, -0.7).x, P(1.6, -0.7).y, e.x, e.y);
    g.lineWidth = 0.12 * s;
    g.strokeStyle = ink(sp.fur);
    g.stroke();
    ellipse(g, e.x, e.y + 0.08 * s, 0.13 * s, 0.2 * s, '#5d6b80');
  }
  g.restore();
}

function drawEar(g, sp, e) {
  const line = ink(sp.earFur);
  if (e.k === 'el') {
    ellipse(g, e.cx, e.cy, e.rx, e.ry, sp.earFur, line, LW, e.rot);
    if (e.inner) {
      const k = e.inner;
      // the inside of the ear: smaller, nudged toward the head
      const off = sp.ear === 'tall' ? 0.18 : 0.1;
      const ix = e.cx + Math.sin(e.rot) * e.ry * off * 0.2;
      const iy = e.cy + Math.cos(e.rot) * e.ry * off;
      ellipse(g, ix, iy, e.rx * k, e.ry * (sp.ear === 'tall' ? 0.78 : k), sp.inner, null, 0, e.rot);
    }
  } else {
    const [a, b, c] = e.pts;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(c[0], c[1]);
    g.closePath();
    fillStroke(g, sp.earFur, line, LW);
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    const k = e.inner || 0.55;
    const toward = (p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k + 0.06];
    const [ia, ib, ic] = [toward(a), toward(b), toward(c)];
    g.beginPath();
    g.moveTo(ia[0], ia[1]);
    g.lineTo(ib[0], ib[1]);
    g.lineTo(ic[0], ic[1]);
    g.closePath();
    g.fillStyle = sp.inner;
    g.fill();
  }
}

function drawBody(g, sp, r) {
  const b = r.body;
  const s = r.s;
  ellipse(g, b.x, b.y, b.rx, b.ry, sp.fur, ink(sp.fur), LW * 2);
  ellipse(g, b.x, b.y, b.rx, b.ry, sp.fur);
  g.save();
  g.beginPath();
  g.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
  g.clip();
  ellipse(g, b.x, b.y + 0.25 * s, b.rx * 0.66, b.ry * 0.72, sp.belly);
  if (sp.id === 'dino') {
    g.strokeStyle = shade(sp.belly, -0.12);
    g.lineWidth = 0.06 * s;
    for (let i = 0; i < 4; i++) {
      const y = b.y - 0.35 * s + i * 0.42 * s;
      g.beginPath();
      g.moveTo(b.x - 0.8 * s, y);
      g.quadraticCurveTo(b.x, y + 0.12 * s, b.x + 0.8 * s, y);
      g.stroke();
    }
    for (const [dx, dy, rr] of [[-1.15, -1.0, 0.22], [1.1, -0.5, 0.18], [-1.2, 0.2, 0.15]]) ellipse(g, b.x + dx * s, b.y + dy * s, rr * s, rr * s, sp.spots);
  }
  if (sp.stripes) {
    g.strokeStyle = sp.stripes;
    g.lineWidth = 0.13 * s;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const y = b.y - 0.6 * s + i * 0.5 * s;
      g.beginPath();
      g.moveTo(b.x + side * 1.5 * s, y);
      g.lineTo(b.x + side * 1.05 * s, y + 0.1 * s);
      g.stroke();
    }
  }
  // soft highlight
  ellipse(g, b.x - 0.5 * s, b.y - 0.7 * s, 0.45 * s, 0.32 * s, 'rgba(255,255,255,0.22)');
  g.restore();
  if (sp.collar) {
    const y = r.P(0, -2.62).y;
    g.beginPath();
    g.moveTo(b.x - 0.98 * s, y - 0.18 * s);
    g.quadraticCurveTo(b.x, y + 0.28 * s, b.x + 0.98 * s, y - 0.18 * s);
    g.lineWidth = 0.24 * s;
    g.strokeStyle = sp.collar;
    g.lineCap = 'round';
    g.stroke();
    ellipse(g, b.x, y + 0.24 * s, 0.17 * s, 0.17 * s, '#ffd23a', '#c9970c', LW * 0.8);
  }
}

function drawLegs(g, sp, r) {
  const s = r.s;
  for (const l of r.legs) {
    union(
      g,
      [
        () => capsule(g, l.hip.x, l.hip.y, l.knee.x, l.knee.y, l.r * 1.12),
        () => capsule(g, l.knee.x, l.knee.y, l.ankle.x, l.ankle.y, l.r),
        () => {
          g.beginPath();
          g.ellipse(l.foot.x, l.foot.y, l.foot.rx, l.foot.ry, l.foot.rot, 0, Math.PI * 2);
        },
      ],
      sp.fur,
      ink(sp.fur),
    );
    // toes
    g.save();
    g.translate(l.foot.x, l.foot.y);
    g.rotate(l.foot.rot);
    if (sp.id === 'dino' || sp.id === 'elephant') {
      g.fillStyle = sp.id === 'dino' ? '#fffbe8' : '#f4efe6';
      for (const dx of [-0.24, 0, 0.24]) {
        g.beginPath();
        g.ellipse(dx * s, 0.12 * s, 0.1 * s, 0.09 * s, 0, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.strokeStyle = ink(sp.fur);
      g.lineWidth = LW * 0.8;
      for (const dx of [-0.13, 0.13]) {
        g.beginPath();
        g.moveTo(dx * s, 0.05 * s);
        g.lineTo(dx * s, 0.25 * s);
        g.stroke();
      }
    }
    g.restore();
  }
}

// Arms raised above the shoulder (waving, cheering) are drawn after the head, so they show.
const raised = (r, i) => (r.pose.arm[i] || 0) > 1.2;

function drawArms(g, sp, r, x, up = false) {
  for (const [i, a] of r.arms.entries()) {
    if (raised(r, i) !== up) continue;
    union(
      g,
      [
        () => capsule(g, a.shoulder.x, a.shoulder.y, a.hand.x, a.hand.y, a.r),
        () => {
          g.beginPath();
          g.arc(a.hand.x, a.hand.y, a.r * 1.18, 0, Math.PI * 2);
        },
      ],
      sp.fur,
      ink(sp.fur),
    );
    if (sp.stripes) {
      g.save();
      capsule(g, a.shoulder.x, a.shoulder.y, a.hand.x, a.hand.y, a.r);
      g.clip();
      g.strokeStyle = sp.stripes;
      g.lineWidth = 0.12 * r.s;
      for (const k of [0.45, 0.65]) {
        const x = a.shoulder.x + (a.hand.x - a.shoulder.x) * k;
        const y = a.shoulder.y + (a.hand.y - a.shoulder.y) * k;
        g.beginPath();
        g.moveTo(x - 0.5 * r.s, y - 0.15 * r.s);
        g.lineTo(x + 0.5 * r.s, y + 0.15 * r.s);
        g.stroke();
      }
      g.restore();
    }
    // the bandage from the shot, across his right arm
    if (i === 1 && x.bandage) {
      const ang = Math.atan2(a.hand.y - a.shoulder.y, a.hand.x - a.shoulder.x) + Math.PI / 2;
      drawBandage(g, x.bandage, a.shoulder.x + (a.hand.x - a.shoulder.x) * 0.32, a.shoulder.y + (a.hand.y - a.shoulder.y) * 0.32, 1.05 * r.s, 0.46 * r.s, ang);
    }
  }
}

// --------------------------------------------------------------------------------- the head

// Everything here is in head base units (the canvas is already turned and scaled to the head).
function drawHeadBase(g, sp, x) {
  const { cx, cy, rx, ry } = HEAD;
  if (sp.spikes) {
    g.fillStyle = sp.spikes;
    g.strokeStyle = ink(sp.spikes);
    g.lineWidth = LW;
    for (const [px, a, sz] of [[-0.95, -0.5, 0.45], [0, 0, 0.55], [0.95, 0.5, 0.45]]) {
      g.save();
      g.translate(px, cy - Math.sqrt(1 - (px / rx) ** 2) * ry + 0.12);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-sz * 0.6, 0.1);
      g.quadraticCurveTo(0, -sz * 0.4, 0, -sz * 1.2);
      g.quadraticCurveTo(0, -sz * 0.4, sz * 0.6, 0.1);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }
  }
  ellipse(g, cx, cy, rx, ry, sp.fur, ink(sp.fur), LW);
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.clip();
  if (sp.patch) ellipse(g, -0.82, -4.75, 0.62, 0.66, sp.patch, null, 0, -0.2);
  if (sp.stripes) {
    g.fillStyle = sp.stripes;
    for (const dx of [-0.45, 0, 0.45]) {
      g.beginPath();
      g.moveTo(dx - 0.13, cy - ry);
      g.lineTo(dx + 0.13, cy - ry);
      g.lineTo(dx, cy - ry + (dx === 0 ? 0.75 : 0.55));
      g.closePath();
      g.fill();
    }
  }
  if (sp.spots) for (const [px, py, rr] of [[1.2, -5.6, 0.25], [1.55, -5.1, 0.15], [-1.35, -5.5, 0.2]]) ellipse(g, px, py, rr, rr, sp.spots);
  ellipse(g, -0.75, -5.75, 0.8, 0.42, 'rgba(255,255,255,0.25)', null, 0, -0.25);
  g.restore();
  // cheeks
  const blush = Math.max(0, Math.min(0.95, 0.42 + 0.4 * (x.face.blush || 0)));
  for (const side of [-1, 1]) ellipse(g, side * 1.28, -3.92, 0.34, 0.2, withAlpha(x.sick?.ail === 'fever' && x.sick.level > 0.2 ? '#ff4d4d' : '#ff7a9c', blush));
  if (sp.ear === 'hole') for (const side of [-1, 1]) ellipse(g, side * 1.92, -4.98, 0.09, 0.13, ink(sp.fur));
}

function drawEyes(g, sp, face) {
  const ey = -4.65;
  const lx = face.look ? Math.max(-1, Math.min(1, face.look.x)) * 0.09 : 0;
  const ly = face.look ? Math.max(-1, Math.min(1, face.look.y)) * 0.08 : 0;
  g.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = side * 0.78;
    switch (face.eyes) {
      case 'happy':
        g.beginPath();
        g.arc(ex, ey + 0.12, 0.24, Math.PI * 1.12, Math.PI * 1.88);
        g.lineWidth = 0.13;
        g.strokeStyle = INK;
        g.stroke();
        break;
      case 'closed':
        g.beginPath();
        g.arc(ex, ey - 0.08, 0.22, Math.PI * 0.18, Math.PI * 0.82);
        g.lineWidth = 0.11;
        g.strokeStyle = INK;
        g.stroke();
        break;
      case 'squint':
        g.beginPath();
        g.moveTo(ex - side * 0.2, ey - 0.17);
        g.lineTo(ex + side * 0.16, ey);
        g.lineTo(ex - side * 0.2, ey + 0.17);
        g.lineWidth = 0.12;
        g.strokeStyle = INK;
        g.stroke();
        break;
      default: {
        const wide = face.eyes === 'wide';
        const rx = wide ? 0.3 : 0.26;
        const ry = wide ? 0.38 : 0.33;
        ellipse(g, ex + lx, ey + ly, rx, ry, INK);
        ellipse(g, ex + lx + 0.08, ey + ly - 0.13, wide ? 0.09 : 0.105, wide ? 0.09 : 0.105, '#ffffff');
        ellipse(g, ex + lx - 0.08, ey + ly + 0.11, 0.045, 0.045, '#ffffff');
        if (face.lids > 0.02) {
          // heavy, sleepy eyelids: fur over the top of the eye, with a soft lid line
          const lidTop = ey + ly - ry * 1.15;
          const edge = lidTop + ry * 2.3 * Math.min(0.85, face.lids);
          g.save();
          g.beginPath();
          g.ellipse(ex + lx, ey + ly, rx * 1.18, ry * 1.15, 0, 0, Math.PI * 2);
          g.clip();
          g.fillStyle = side < 0 && sp.patch ? sp.patch : sp.fur;
          g.fillRect(ex + lx - rx * 1.3, lidTop - 0.1, rx * 2.6, edge - lidTop + 0.1);
          g.restore();
          g.beginPath();
          g.moveTo(ex + lx - rx * 1.12, edge - 0.02);
          g.quadraticCurveTo(ex + lx, edge + ry * 0.22, ex + lx + rx * 1.12, edge - 0.02);
          g.lineWidth = 0.07;
          g.strokeStyle = INK;
          g.stroke();
        }
      }
    }
    if (face.brows) {
      g.beginPath();
      if (face.brows === 'worried') {
        // inner ends up: worried, not cross
        g.moveTo(ex - side * 0.22, ey - 0.68);
        g.lineTo(ex + side * 0.2, ey - 0.52);
      } else {
        g.arc(ex, ey - 0.35, 0.3, Math.PI * 1.2, Math.PI * 1.8);
      }
      g.lineWidth = 0.09;
      g.strokeStyle = ink(sp.fur);
      g.stroke();
    }
  }
}

function drawMuzzle(g, sp) {
  switch (sp.muzzle) {
    case 'dog':
      ellipse(g, 0, -3.82, 0.92, 0.66, sp.belly);
      break;
    case 'bear':
      ellipse(g, 0, -3.84, 0.82, 0.6, sp.belly);
      break;
    case 'bunny':
      ellipse(g, -0.28, -3.88, 0.38, 0.32, sp.belly);
      ellipse(g, 0.28, -3.88, 0.38, 0.32, sp.belly);
      break;
    case 'cat':
      ellipse(g, -0.26, -3.86, 0.36, 0.3, sp.belly);
      ellipse(g, 0.26, -3.86, 0.36, 0.3, sp.belly);
      break;
    default:
      break;
  }
}

function drawNose(g, sp, x) {
  switch (sp.muzzle) {
    case 'dog':
    case 'bear':
      ellipse(g, 0, -4.12, sp.muzzle === 'dog' ? 0.3 : 0.27, 0.2, sp.nose);
      ellipse(g, -0.08, -4.18, 0.09, 0.05, 'rgba(255,255,255,0.55)');
      break;
    case 'bunny':
    case 'cat': {
      const tw = sp.muzzle === 'bunny' ? Math.sin(x.t * 9) * 0.025 * (Math.sin(x.t * 0.7) > 0.3 ? 1 : 0) : 0;
      g.beginPath();
      g.moveTo(-0.15, -4.13 + tw);
      g.lineTo(0.15, -4.13 + tw);
      g.lineTo(0, -3.97 + tw);
      g.closePath();
      g.fillStyle = sp.nose;
      g.lineJoin = 'round';
      g.lineWidth = 0.07;
      g.strokeStyle = sp.nose;
      g.fill();
      g.stroke();
      break;
    }
    case 'dino':
      for (const side of [-1, 1]) ellipse(g, side * 0.24, -4.05, 0.07, 0.05, sp.nose);
      break;
    default:
      break;
  }
}

function drawMouth(g, sp, face) {
  const line = ink(sp.fur === '#f5f1fb' ? '#c7b8d6' : sp.fur);
  const wide = sp.muzzle === 'dino' || sp.muzzle === 'trunk' ? 1.7 : 1;
  const my = sp.muzzle === 'trunk' ? -3.5 : -3.72;
  const philtrum = sp.muzzle === 'dog' || sp.muzzle === 'bear' || sp.muzzle === 'bunny' || sp.muzzle === 'cat';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = line;
  g.lineWidth = 0.08;
  const open = (rx, ry, cy) => {
    ellipse(g, 0, cy, rx, ry, '#7a2232', line, 0.08);
    g.save();
    g.beginPath();
    g.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    g.clip();
    ellipse(g, 0, cy + ry * 0.75, rx * 0.72, ry * 0.5, '#ff8fa3');
    g.restore();
  };
  switch (face.mouth) {
    case 'grin': {
      const w = 0.44 * wide;
      const d = () => {
        g.beginPath();
        g.moveTo(-w, my - 0.02);
        g.quadraticCurveTo(0, my + 0.1, w, my - 0.02);
        g.quadraticCurveTo(0, my + 0.78, -w, my - 0.02);
        g.closePath();
      };
      d();
      g.fillStyle = '#7a2232';
      g.fill();
      g.save();
      g.clip();
      ellipse(g, 0, my + 0.55, w * 0.62, 0.22, '#ff8fa3');
      g.restore();
      d(); // (the tongue replaced the current path; outline the mouth, not the tongue)
      g.stroke();
      break;
    }
    case 'o':
      ellipse(g, 0, my + 0.15, 0.16, 0.2, '#7a2232', line, 0.07);
      break;
    case 'ahh': {
      const o = face.open ?? 1;
      open(0.42 * Math.min(wide, 1.35), 0.12 + 0.42 * o, my + 0.28);
      break;
    }
    case 'wobble': {
      g.beginPath();
      g.moveTo(-0.34 * wide, my + 0.04);
      for (let i = 1; i <= 4; i++) g.quadraticCurveTo(-0.34 * wide + (i - 0.5) * 0.17 * wide, my + (i % 2 ? -0.08 : 0.14), -0.34 * wide + i * 0.17 * wide, my + 0.04);
      g.stroke();
      break;
    }
    case 'ouch': {
      const w = 0.36 * wide;
      g.beginPath();
      g.roundRect ? g.roundRect(-w, my - 0.1, w * 2, 0.3, 0.1) : g.rect(-w, my - 0.1, w * 2, 0.3);
      g.fillStyle = '#ffffff';
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(-w, my + 0.05);
      g.lineTo(w, my + 0.05);
      for (const k of [-0.5, 0, 0.5]) {
        g.moveTo(k * w, my - 0.1);
        g.lineTo(k * w, my + 0.2);
      }
      g.lineWidth = 0.05;
      g.stroke();
      break;
    }
    case 'flat':
      g.beginPath();
      g.moveTo(-0.22 * wide, my + 0.02);
      g.lineTo(0.22 * wide, my + 0.02);
      g.stroke();
      break;
    case 'frown':
      g.beginPath();
      if (philtrum) {
        g.moveTo(0, -3.98);
        g.lineTo(0, my - 0.02);
      }
      g.moveTo(-0.3 * wide, my + 0.16);
      g.quadraticCurveTo(0, my - 0.14, 0.3 * wide, my + 0.16);
      g.stroke();
      break;
    default: {
      if (wide > 1) {
        g.beginPath();
        g.moveTo(-0.62, my - 0.08);
        g.quadraticCurveTo(0, my + 0.42, 0.62, my - 0.08);
        g.stroke();
      } else {
        g.beginPath();
        if (philtrum) {
          g.moveTo(0, -3.98);
          g.lineTo(0, my);
        }
        g.moveTo(-0.34, my - 0.04);
        g.quadraticCurveTo(-0.17, my + 0.2, 0, my);
        g.quadraticCurveTo(0.17, my + 0.2, 0.34, my - 0.04);
        g.stroke();
      }
    }
  }
  if (sp.muzzle === 'bunny' && (face.mouth === 'smile' || face.mouth === 'flat' || !face.mouth)) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#c7b8d6';
    g.lineWidth = 0.04;
    for (const dx of [-0.075, 0.075]) {
      g.beginPath();
      g.rect(dx - 0.065, my + 0.04, 0.13, 0.17);
      g.fill();
      g.stroke();
    }
  }
}

function drawWhiskers(g, sp) {
  if (sp.muzzle !== 'cat') return;
  g.strokeStyle = ink(sp.fur);
  g.lineWidth = 0.045;
  for (const side of [-1, 1]) for (const k of [-1, 0, 1]) {
    g.beginPath();
    g.moveTo(side * 0.6, -3.9 + k * 0.1);
    g.quadraticCurveTo(side * 1.1, -3.95 + k * 0.16, side * 1.6, -3.95 + k * 0.28);
    g.stroke();
  }
}

function drawTrunk(g, sp, up) {
  if (sp.muzzle !== 'trunk') return;
  const l = (a, b) => a + (b - a) * up;
  const sx = 0;
  const sy = -4.35;
  const cx = l(-0.08, 1.0);
  const cy = l(-3.2, -3.55);
  const ex = l(0.42, 1.12);
  const ey = l(-2.75, -4.85);
  const path = () => {
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(cx, cy, ex, ey);
  };
  g.lineCap = 'round';
  path();
  g.lineWidth = 0.62 + LW * 2;
  g.strokeStyle = ink(sp.fur);
  g.stroke();
  path();
  g.lineWidth = 0.62;
  g.strokeStyle = sp.fur;
  g.stroke();
  // wrinkles
  g.strokeStyle = shade(sp.fur, -0.2);
  g.lineWidth = 0.04;
  for (const k of [0.35, 0.55, 0.75]) {
    const t = k;
    const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
    const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
    g.beginPath();
    g.arc(px, py, 0.22, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
  }
  ellipse(g, ex, ey, 0.3, 0.2, shade(sp.fur, -0.12), ink(sp.fur), LW, Math.atan2(ey - cy, ex - cx) + Math.PI / 2);
  return { x: ex, y: ey };
}

// ---------------------------------------------------------------------------- feeling sick

// Drawn over the head (head base units): the sick colors and each illness's own signs. Everything
// fades as `level` goes down, and the signs go away one by one, so each step visibly helps.
function drawSick(g, sp, sick, t, trunkTip) {
  const L = sick.level;
  const { cx, cy, rx, ry } = HEAD;
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.clip();
  if (sick.ail === 'cold') {
    g.fillStyle = `rgba(175,195,225,${0.3 * L})`;
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  } else if (sick.ail === 'tummy') {
    const grd = g.createLinearGradient(0, cy + ry, 0, cy - ry * 0.6);
    grd.addColorStop(0, `rgba(120,205,80,${0.45 * L})`);
    grd.addColorStop(1, 'rgba(120,205,80,0)');
    g.fillStyle = grd;
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  } else if (sick.ail === 'fever') {
    const grd = g.createRadialGradient(0, -4.0, 0.2, 0, -4.2, rx * 1.1);
    grd.addColorStop(0, `rgba(255,90,70,${0.28 * L})`);
    grd.addColorStop(1, `rgba(255,90,70,${0.1 * L})`);
    g.fillStyle = grd;
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  g.restore();

  if (sick.ail === 'cold') {
    // a red nose, and (while it's bad) a drip that grows and falls
    const nose = sp.muzzle === 'trunk' && trunkTip ? trunkTip : { x: 0, y: sp.muzzle === 'dino' ? -4.05 : -4.1 };
    ellipse(g, nose.x, nose.y, 0.3, 0.22, `rgba(255,70,70,${0.75 * Math.min(1, L * 1.4)})`);
    if (L > 0.45) {
      const k = (t * 0.4) % 1;
      const a = Math.min(1, (L - 0.45) * 4);
      const dx = nose.x + 0.13;
      const fall = k > 0.8 ? (k - 0.8) * 5 : 0;
      const len = 0.08 + 0.22 * Math.min(1, k / 0.8);
      const dy = nose.y + 0.16 + fall * 0.9;
      g.globalAlpha = a * (1 - fall);
      g.beginPath();
      g.moveTo(dx, dy - 0.05);
      g.quadraticCurveTo(dx + 0.1, dy + len, dx, dy + len + 0.07);
      g.quadraticCurveTo(dx - 0.1, dy + len, dx, dy - 0.05);
      g.fillStyle = '#9fe0ff';
      g.fill();
      g.globalAlpha = 1;
    }
  } else if (sick.ail === 'fever') {
    // sweat drops on the side of the forehead, and wavy heat lines rising off the head
    if (L > 0.3) {
      const a = Math.min(1, (L - 0.3) * 3);
      for (const [x0, y0, ph] of [[1.55, -5.55, 0], [-1.7, -5.2, 0.5]]) {
        const k = (t * 0.3 + ph) % 1;
        const x = x0 + Math.sign(x0) * k * 0.15;
        const y = y0 + k * 0.6;
        g.globalAlpha = a * (1 - k * 0.6);
        g.beginPath();
        g.moveTo(x, y - 0.2);
        g.quadraticCurveTo(x + 0.13, y + 0.02, x, y + 0.1);
        g.quadraticCurveTo(x - 0.13, y + 0.02, x, y - 0.2);
        g.fillStyle = '#7fd3ff';
        g.fill();
      }
      g.globalAlpha = a * 0.7;
      g.strokeStyle = '#ff7a59';
      g.lineWidth = 0.09;
      for (const x0 of [-0.7, 0, 0.7]) {
        const rise = (t * 0.6 + x0) % 1;
        const y = -6.75 - rise * 0.5;
        g.globalAlpha = a * 0.7 * Math.sin(rise * Math.PI);
        g.beginPath();
        g.moveTo(x0, y + 0.45);
        g.bezierCurveTo(x0 + 0.18, y + 0.3, x0 - 0.18, y + 0.15, x0, y);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  } else if (sick.ail === 'tummy' && L > 0.45) {
    // a little wobbly line of "ugh" beside the head
    const a = Math.min(1, (L - 0.45) * 4);
    g.globalAlpha = a * 0.8;
    g.strokeStyle = '#6cbf55';
    g.lineWidth = 0.08;
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const y = -6.2 + i * 0.07;
      const x = 2.35 + Math.sin(i * 1.2 + t * 6) * 0.08;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------------------- the whole

// Draws the patient with its hip at (x, y) on screen, u screen px per rig unit, at time t.
// x is extras: { face, bandage, sticker: { e, x, y } (rig units), wagFast, thump, only: 'head' }.
export function drawPatient(g, sp, pose, x0, y0, u, t, extras = {}) {
  const r = rig(sp, pose);
  const s = r.s;
  const x = { face: faceFor('idle'), t, ...extras };
  if (x.sick?.level > 0) x.face = sickFace(x.face, x.sick.level, x.sick.ail);
  g.save();
  g.translate(x0, y0);
  g.scale(u, u);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const headOnly = x.only === 'head';
  if (!headOnly) {
    // shadow on the seat or the scale
    const sy = pose.stand > 0.5 ? 1.96 * s : 0.05 * s;
    ellipse(g, pose.dx * s, sy, 1.7 * s, 0.2 * s, 'rgba(30,40,60,0.16)');
    drawTail(g, sp, r, t, x);
  }
  for (const e of r.ears) if (!e.front) drawEar(g, sp, e);
  if (!headOnly) {
    if (pose.stand >= 0.5) drawLegs(g, sp, r);
    drawBody(g, sp, r);
    if (pose.stand < 0.5) drawLegs(g, sp, r);
    drawArms(g, sp, r, x);
  }
  // the head, in head base units
  g.save();
  const ha = headAngles(pose);
  g.translate((NECK.x + pose.dx) * s, NECK.y * s);
  g.scale(s, s);
  g.rotate(ha.tilt);
  g.translate(-NECK.x, -NECK.y + ha.dy);
  drawHeadBase(g, sp, x);
  drawMuzzle(g, sp);
  drawEyes(g, sp, x.face);
  drawMouth(g, sp, x.face);
  drawNose(g, sp, x);
  drawWhiskers(g, sp);
  const trunkTip = drawTrunk(g, sp, pose.trunk || 0);
  if (x.sick?.level > 0.01) drawSick(g, sp, x.sick, t, trunkTip);
  g.restore();
  for (const e of r.ears) if (e.front) drawEar(g, sp, e);
  if (!headOnly) drawArms(g, sp, r, x, true);
  if (!headOnly && x.sticker) drawSticker(g, x.sticker.e, x.sticker.x, x.sticker.y, 1.35 * s, x.sticker.rot || 0);
  g.restore();
  return r;
}

// Just the face, centered on (cx, cy) and about `size` px across (the monitor, the sticker book).
export function drawPortrait(g, sp, cx, cy, size, t = 0, mood = 'idle', sick = null) {
  const u = size / (5.4 * sp.size);
  const hy = HEAD.cy * sp.size * u;
  drawPatient(g, sp, { ...defaultPoseLite, droop: sick?.level || 0 }, cx, cy - hy + 0.3 * u * sp.size, u, t, { only: 'head', face: faceFor(mood), sick });
}

const defaultPoseLite = { stand: 0, tilt: 0, headDy: 0, breathe: 0, puff: 0, kick: [0, 0], arm: [0, 0], earLift: [0, 0], squish: 0, trunk: 0, dx: 0 };
