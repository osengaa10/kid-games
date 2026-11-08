// The wall monitor shows what the tool sees or hears: the heart beating, the inside of an ear,
// the throat, the thermometer filling up, the scale's dial. When nothing is happening it shows
// the patient's face and how far the check-up has got.
//
// view: { mode, since (s), beats: [times], tummy, pan: {x, y} (-1..1), surprise, tooth, open,
//         fill (0..1), happy, turn (dial turns), progress: [7 booleans], sp }
import { rrect, ellipse, heartPath, starPath, withAlpha } from './style.js';
import { drawPortrait } from './patient-art.js';

export function drawMonitor(g, rect, view, t) {
  const { x, y, w, h, r } = rect;
  g.save();
  rrect(g, x, y, w, h, r);
  g.clip();
  const dark = view.mode === 'ear' || view.mode === 'throat';
  g.fillStyle = dark ? '#05090c' : '#0f2a33';
  g.fillRect(x, y, w, h);
  if (!dark) grid(g, x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (view.mode) {
    case 'heart':
      heart(g, x, y, w, h, view, t);
      break;
    case 'ear':
      ear(g, cx, cy, Math.min(w, h) * 0.46, view, t);
      break;
    case 'throat':
      throat(g, cx, cy, Math.min(w * 0.45, h * 0.5), view, t);
      break;
    case 'temp':
      thermo(g, x, y, w, h, view, t);
      break;
    case 'scale':
      dial(g, cx, cy, Math.min(w, h) * 0.4, view, t);
      break;
    case 'check':
      check(g, cx, cy, Math.min(w, h) * 0.32, t - view.since);
      break;
    default:
      idle(g, x, y, w, h, view, t);
  }
  // a soft glare across the glass
  const gl = g.createLinearGradient(x, y, x + w, y + h);
  gl.addColorStop(0, 'rgba(255,255,255,0.10)');
  gl.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.fillStyle = gl;
  g.fillRect(x, y, w, h);
  g.restore();
}

function grid(g, x, y, w, h) {
  const s = Math.max(14, w / 16);
  g.strokeStyle = 'rgba(80,220,200,0.08)';
  g.lineWidth = 1;
  g.beginPath();
  for (let gx = x + s; gx < x + w; gx += s) {
    g.moveTo(gx, y);
    g.lineTo(gx, y + h);
  }
  for (let gy = y + s; gy < y + h; gy += s) {
    g.moveTo(x, gy);
    g.lineTo(x + w, gy);
  }
  g.stroke();
}

// An ECG blip, d seconds after a beat.
function blip(d) {
  if (d < 0 || d > 0.5) return 0;
  if (d < 0.06) return Math.sin((d / 0.06) * Math.PI) * 0.12;
  if (d < 0.09) return -0.18 * ((d - 0.06) / 0.03);
  if (d < 0.12) return -0.18 + 1.28 * ((d - 0.09) / 0.03);
  if (d < 0.16) return 1.1 - 1.45 * ((d - 0.12) / 0.04);
  if (d < 0.19) return -0.35 + 0.35 * ((d - 0.16) / 0.03);
  if (d > 0.26 && d < 0.42) return Math.sin(((d - 0.26) / 0.16) * Math.PI) * 0.22;
  return 0;
}

function heart(g, x, y, w, h, view, t) {
  const beats = view.beats || [];
  const last = beats.length ? beats[beats.length - 1] : -10;
  const d = t - last;
  const pulse = d >= 0 && d < 0.35 ? Math.sin((d / 0.35) * Math.PI) : 0;
  const cx = x + w / 2;
  const cy = y + h * 0.4;
  const s = Math.min(w, h) * 0.2 * (1 + pulse * 0.22);
  if (view.tummy) {
    // the tummy: bubbles rising and popping
    g.fillStyle = '#ffd6a5';
    ellipse(g, cx, cy, w * 0.28, h * 0.28, '#ffb4a2', '#ff8fa3', 3);
    for (let i = 0; i < 9; i++) {
      const k = (t * 0.6 + i * 0.137) % 1;
      const bx = cx + Math.sin(i * 2.3 + t) * w * 0.17;
      const by = cy + h * 0.2 - k * h * 0.4;
      ellipse(g, bx, by, 4 + (i % 3) * 3, 4 + (i % 3) * 3, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.9)', 1.5);
    }
  } else {
    g.save();
    g.shadowColor = '#ff4d6d';
    g.shadowBlur = 12 + pulse * 30;
    g.fillStyle = '#ff4d6d';
    heartPath(g, cx, cy, s);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(cx - s * 0.45, cy - s * 0.25, s * 0.22, s * 0.13, -0.6, 0, Math.PI * 2);
    g.fill();
  }
  // the trace along the bottom, scrolling
  const span = 3;
  const base = y + h * 0.8;
  const amp = h * 0.16;
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const px = x + (w * i) / 120;
    const tau = t - span * (1 - i / 120);
    let v = 0;
    if (!view.tummy) for (const b of beats) v += blip(tau - b);
    else v = Math.sin(tau * 9) * 0.12 * Math.sin(tau * 1.7);
    if (i) g.lineTo(px, base - v * amp);
    else g.moveTo(px, base - v * amp);
  }
  g.lineWidth = 3;
  g.strokeStyle = view.tummy ? '#ffd166' : '#46e07a';
  g.shadowColor = g.strokeStyle;
  g.shadowBlur = 8;
  g.stroke();
  g.shadowBlur = 0;
}

function ear(g, cx, cy, R, view, t) {
  const px = (view.pan?.x || 0) * R * 0.35;
  const py = (view.pan?.y || 0) * R * 0.35;
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  const grd = g.createRadialGradient(cx + px, cy + py, R * 0.05, cx + px * 0.5, cy + py * 0.5, R * 1.05);
  grd.addColorStop(0, '#5a1f22');
  grd.addColorStop(0.16, '#b2474a');
  grd.addColorStop(0.45, '#f08a7e');
  grd.addColorStop(0.8, '#ffc2ad');
  grd.addColorStop(1, '#e8907f');
  g.fillStyle = grd;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  // folds of the ear canal
  g.strokeStyle = 'rgba(160,60,60,0.35)';
  g.lineWidth = R * 0.03;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(cx + px * (0.4 + i * 0.12), cy + py * (0.4 + i * 0.12), R * (0.3 + i * 0.16), 0.3 + i, 1.6 + i);
    g.stroke();
  }
  // tiny hairs near the edge
  g.strokeStyle = 'rgba(120,60,50,0.4)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const r0 = R * 0.82;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a + 0.1) * (r0 - R * 0.12), cy + Math.sin(a + 0.1) * (r0 - R * 0.12));
    g.stroke();
  }
  // the light of the camera
  g.fillStyle = 'rgba(255,255,230,0.35)';
  g.beginPath();
  g.ellipse(cx - R * 0.3 + px * 0.3, cy - R * 0.35 + py * 0.3, R * 0.2, R * 0.1, -0.6, 0, Math.PI * 2);
  g.fill();
  if (view.surprise) ladybug(g, cx + R * 0.32 + px * 0.8, cy + R * 0.18 + py * 0.8, R * 0.2, t - (view.surpriseAt || 0));
  g.restore();
  // the round lens edge
  g.lineWidth = R * 0.08;
  g.strokeStyle = '#000';
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  // a blinking "recording" light
  if (Math.sin(t * 4) > -0.2) ellipse(g, cx - R * 1.15, cy - R * 0.8, R * 0.06, R * 0.06, '#ff4d4d');
}

// A friendly ladybug waving hello from inside the ear: peek-a-boo!
function ladybug(g, x, y, s, age) {
  const pop = Math.min(1, age * 3);
  s *= 0.4 + 0.6 * pop;
  g.save();
  g.translate(x, y);
  // waving leg
  g.strokeStyle = '#1d1d1d';
  g.lineWidth = s * 0.12;
  g.lineCap = 'round';
  const wave = Math.sin(age * 12) * 0.5;
  g.beginPath();
  g.moveTo(s * 0.6, -s * 0.2);
  g.lineTo(s * 1.15, -s * 0.6 + wave * s * 0.4);
  g.stroke();
  for (const k of [-0.2, 0.3]) {
    g.beginPath();
    g.moveTo(-s * 0.6, k * s);
    g.lineTo(-s * 1.0, k * s + s * 0.2);
    g.stroke();
  }
  ellipse(g, 0, 0, s * 0.85, s * 0.7, '#ff3b3b', '#9e1b1b', s * 0.08);
  g.beginPath();
  g.moveTo(0, -s * 0.7);
  g.lineTo(0, s * 0.7);
  g.stroke();
  for (const [dx, dy] of [[-0.4, -0.2], [0.4, -0.15], [-0.35, 0.3], [0.38, 0.32]]) ellipse(g, dx * s, dy * s, s * 0.14, s * 0.14, '#1d1d1d');
  ellipse(g, 0, -s * 0.78, s * 0.42, s * 0.32, '#1d1d1d');
  for (const dx of [-0.15, 0.15]) {
    ellipse(g, dx * s, -s * 0.84, s * 0.09, s * 0.09, '#ffffff');
    ellipse(g, dx * s, -s * 0.82, s * 0.045, s * 0.045, '#1d1d1d');
  }
  g.restore();
}

function throat(g, cx, cy, R, view, t) {
  const open = view.open ?? 1;
  g.save();
  // the open mouth
  g.beginPath();
  g.ellipse(cx, cy, R * 1.2, R * (0.55 + 0.45 * open), 0, 0, Math.PI * 2);
  g.fillStyle = '#7a2232';
  g.fill();
  g.save();
  g.clip();
  // back of the throat
  ellipse(g, cx, cy + R * 0.05, R * 0.38, R * 0.48, '#4a1020');
  // tonsils (red and puffy with a cold)
  const sore = view.redThroat || 0;
  for (const s of [-1, 1]) ellipse(g, cx + s * R * 0.55, cy + R * 0.1, R * (0.2 + 0.06 * sore), R * (0.32 + 0.06 * sore), sore > 0.3 ? '#ff4d5e' : '#e8667a');
  // the uvula, wiggling
  const wig = Math.sin(t * 7) * 0.12 * Math.exp(-((t - (view.since || 0)) % 3));
  g.save();
  g.translate(cx, cy - R * 0.62);
  g.rotate(wig);
  g.beginPath();
  g.moveTo(-R * 0.1, -R * 0.2);
  g.quadraticCurveTo(-R * 0.12, R * 0.3, 0, R * 0.36);
  g.quadraticCurveTo(R * 0.12, R * 0.3, R * 0.1, -R * 0.2);
  g.closePath();
  g.fillStyle = '#f07a8c';
  g.fill();
  g.restore();
  // the tongue
  ellipse(g, cx, cy + R * 0.85, R * 0.95, R * 0.55, '#ff8fa3', '#e0607a', 3);
  g.strokeStyle = 'rgba(200,70,100,0.5)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx, cy + R * 0.42);
  g.lineTo(cx, cy + R * 0.75);
  g.stroke();
  // top teeth
  const n = 6;
  for (let i = 0; i < n; i++) {
    const tx = cx + (i - (n - 1) / 2) * R * 0.3;
    const wiggly = view.tooth && i === 2;
    g.save();
    g.translate(tx, cy - R * (0.55 + 0.45 * open) + R * 0.02);
    if (wiggly) g.rotate(Math.sin(t * 14) * 0.18);
    rrect(g, -R * 0.12, -R * 0.05, R * 0.24, R * 0.27, R * 0.07);
    g.fillStyle = '#ffffff';
    g.fill();
    g.strokeStyle = '#e5dcd0';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }
  g.restore();
  g.lineWidth = R * 0.12;
  g.strokeStyle = '#d65c6c';
  g.beginPath();
  g.ellipse(cx, cy, R * 1.2, R * (0.55 + 0.45 * open), 0, 0, Math.PI * 2);
  g.stroke();
  // the penlight's beam
  const grd = g.createRadialGradient(cx - R * 0.2, cy - R * 0.1, 0, cx, cy, R * 1.2);
  grd.addColorStop(0, 'rgba(255,250,200,0.35)');
  grd.addColorStop(1, 'rgba(255,250,200,0)');
  g.fillStyle = grd;
  g.fillRect(cx - R * 1.3, cy - R * 1.1, R * 2.6, R * 2.2);
  g.restore();
}

function thermo(g, x, y, w, h, view, t) {
  const fill = Math.max(0, Math.min(1, view.fill || 0));
  const tx = x + w * 0.42;
  const top = y + h * 0.1;
  const bot = y + h * 0.72;
  const tw = Math.min(w, h) * 0.13;
  const bulbR = tw * 0.95;
  // the color zones beside the tube: cool, just right, hot
  const zx = tx + tw * 0.9;
  const zones = [['#4cc9f0', 0, 0.35], ['#2fc75a', 0.35, 0.7], ['#ff6b6b', 0.7, 1]];
  for (const [c, a, b] of zones) {
    rrect(g, zx, bot - (bot - top) * b, tw * 0.55, (bot - top) * (b - a) - 2, tw * 0.2);
    g.fillStyle = withAlpha(c, 0.85);
    g.fill();
  }
  // the tube
  rrect(g, tx - tw / 2, top, tw, bot - top + bulbR, tw / 2);
  g.fillStyle = '#e8f4f8';
  g.fill();
  // the level: rises to the middle of the green zone (or up into the red with a fever)
  const level = (view.hot ? 0.86 : 0.53) * fill;
  const col = level >= 0.7 ? '#ff4d4d' : level >= 0.35 ? '#2fc75a' : '#4cc9f0';
  rrect(g, tx - tw * 0.3, bot - (bot - top) * level, tw * 0.6, (bot - top) * level + bulbR, tw * 0.3);
  g.fillStyle = col;
  g.fill();
  ellipse(g, tx, bot + bulbR * 0.6, bulbR, bulbR, col, '#e8f4f8', tw * 0.18);
  if (view.happy) (view.hot ? hotFace : smiley)(g, x + w * 0.78, y + h * 0.42, Math.min(w, h) * 0.17, t - (view.happyAt || 0));
}

// A fever reading: a hot red face with a sweat drop.
function hotFace(g, x, y, r, age) {
  const s = r * Math.min(1, 0.4 + age * 3);
  ellipse(g, x, y, s, s, '#ff6b5b', '#e03e3e', s * 0.1);
  for (const dx of [-0.35, 0.35]) {
    g.beginPath();
    g.arc(x + dx * s, y - s * 0.15, s * 0.13, Math.PI * 1.1, Math.PI * 1.9);
    g.lineWidth = s * 0.1;
    g.strokeStyle = '#7a1f1f';
    g.lineCap = 'round';
    g.stroke();
  }
  g.beginPath();
  g.moveTo(x - s * 0.35, y + s * 0.4);
  for (let i = 1; i <= 4; i++) g.quadraticCurveTo(x - s * 0.35 + (i - 0.5) * s * 0.175, y + s * (i % 2 ? 0.28 : 0.52), x - s * 0.35 + i * s * 0.175, y + s * 0.4);
  g.stroke();
  g.beginPath();
  g.moveTo(x + s * 0.75, y - s * 0.55);
  g.quadraticCurveTo(x + s * 0.92, y - s * 0.25, x + s * 0.75, y - s * 0.18);
  g.quadraticCurveTo(x + s * 0.58, y - s * 0.25, x + s * 0.75, y - s * 0.55);
  g.fillStyle = '#7fd3ff';
  g.fill();
}

function smiley(g, x, y, r, age) {
  const s = r * Math.min(1, 0.4 + age * 3);
  ellipse(g, x, y, s, s, '#ffd60a', '#ffb703', s * 0.1);
  ellipse(g, x - s * 0.35, y - s * 0.2, s * 0.11, s * 0.15, '#7a4a10');
  ellipse(g, x + s * 0.35, y - s * 0.2, s * 0.11, s * 0.15, '#7a4a10');
  g.beginPath();
  g.arc(x, y + s * 0.05, s * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
  g.lineWidth = s * 0.12;
  g.strokeStyle = '#7a4a10';
  g.lineCap = 'round';
  g.stroke();
}

function dial(g, cx, cy, R, view, t) {
  ellipse(g, cx, cy, R, R, '#ffffff', '#9fb0bc', R * 0.08);
  // colored dots instead of numbers, round the dial
  const cols = ['#ff6b6b', '#ff9f43', '#ffd166', '#6bd68a', '#4cc9f0', '#7b8cff', '#c77dff', '#ff8fab'];
  for (let i = 0; i < 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI * 2;
    const big = i % 3 === 0;
    const r0 = R * (big ? 0.72 : 0.8);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88);
    g.lineWidth = big ? 4 : 2;
    g.strokeStyle = '#7b93a6';
    g.stroke();
    if (big) ellipse(g, cx + Math.cos(a) * R * 0.58, cy + Math.sin(a) * R * 0.58, R * 0.07, R * 0.07, cols[(i / 3) % cols.length]);
  }
  const a = -Math.PI / 2 + (view.turn || 0) * Math.PI * 2;
  g.beginPath();
  g.moveTo(cx - Math.cos(a) * R * 0.12, cy - Math.sin(a) * R * 0.12);
  g.lineTo(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8);
  g.lineWidth = R * 0.06;
  g.strokeStyle = '#ff3b3b';
  g.lineCap = 'round';
  g.stroke();
  ellipse(g, cx, cy, R * 0.09, R * 0.09, '#34424f');
  if (view.settled) {
    g.fillStyle = '#ffd60a';
    starPath(g, cx + R * 1.05, cy - R * 0.75, R * 0.22, R * 0.1);
    g.fill();
  }
}

function check(g, cx, cy, R, age) {
  const k = Math.min(1, age * 4);
  const s = R * (0.5 + 0.5 * k + 0.08 * Math.sin(Math.min(age, 1) * 12) * (1 - Math.min(1, age)));
  ellipse(g, cx, cy, s, s, '#2fc75a', '#ffffff', s * 0.1);
  g.beginPath();
  g.moveTo(cx - s * 0.45, cy + s * 0.02);
  g.lineTo(cx - s * 0.12, cy + s * 0.35);
  g.lineTo(cx + s * 0.48, cy - s * 0.32);
  g.lineWidth = s * 0.2;
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

function idle(g, x, y, w, h, view, t) {
  if (view.sp) {
    // tall ears need more room above the head
    const tall = view.sp.ear === 'tall';
    const size = Math.min(w * 0.5, h * 0.62) * (tall ? 0.78 : 1);
    drawPortrait(g, view.sp, x + w / 2, y + h * (tall ? 0.5 : 0.42), size, t, 'idle', view.sick);
  }
  // one dot per step, filled in as they're done
  const prog = view.progress || [];
  const n = prog.length || 7;
  const r = Math.min(w / (n * 3.2), h * 0.045);
  const gap = r * 3;
  const y0 = y + h * 0.86;
  for (let i = 0; i < n; i++) {
    const dx = x + w / 2 + (i - (n - 1) / 2) * gap;
    ellipse(g, dx, y0, r, r, prog[i] ? '#46e07a' : 'rgba(255,255,255,0.18)');
  }
}
