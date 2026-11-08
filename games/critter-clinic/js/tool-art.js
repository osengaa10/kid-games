// The tools as they look in his hand, drawn in code. (x, y) is always the tool's working tip (the
// chest piece, the camera's cone, the sensor, the hammer's edge, the needle); the rest of the tool
// reaches down toward his finger, so his finger never hides what the tool is doing.
// u is the size of one rig unit on screen.
import { rrect, ellipse, capsule, heartPath, glow } from './style.js';
import { drawBandage } from './bandages.js';

function shadow(g, u, on = true) {
  if (!on) return;
  g.shadowColor = 'rgba(20,40,60,0.28)';
  g.shadowBlur = u * 0.35;
  g.shadowOffsetX = u * 0.08;
  g.shadowOffsetY = u * 0.18;
}

// st: { t, lifted, swing (hammer, radians), plunger (0..1), light, tube: {x, y} where the
// stethoscope's tube goes off to (the doctor's ears) }
export function drawTool(g, kind, x, y, u, st = {}) {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  switch (kind) {
    case 'heart':
      stethoscope(g, x, y, u, st);
      break;
    case 'ears':
      otoscope(g, x, y, u, st);
      break;
    case 'temp':
      scanner(g, x, y, u, st);
      break;
    case 'ahh':
      penlight(g, x, y, u, st);
      break;
    case 'reflex':
      hammer(g, x, y, u, st);
      break;
    case 'cotton':
      cotton(g, x, y, u, st);
      break;
    case 'syringe':
      syringe(g, x, y, u, st);
      break;
    case 'bandage':
      g.save();
      shadow(g, u, st.lifted);
      drawBandage(g, st.bandage || 'stars', x, y, 1.05 * u, 0.46 * u, st.rot || 0);
      g.restore();
      break;
    default:
      break;
  }
  g.restore();
}

function stethoscope(g, x, y, u, st) {
  const r = 0.42 * u;
  const end = st.tube || { x: x + 2 * u, y: y + 6 * u };
  // the tube, from the chest piece off to the doctor (that's him!)
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x, y + 2.2 * u, end.x - 1.5 * u, end.y - 3 * u, end.x, end.y);
  g.lineWidth = 0.24 * u;
  g.strokeStyle = '#1f3442';
  g.stroke();
  g.lineWidth = 0.16 * u;
  g.strokeStyle = '#2f4858';
  g.stroke();
  // stem
  g.save();
  shadow(g, u, st.lifted);
  rrect(g, x - 0.1 * u, y + r * 0.5, 0.2 * u, 0.5 * u, 0.06 * u);
  g.fillStyle = '#9fb0bc';
  g.fill();
  // chest piece
  const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, '#a9b8c4');
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = grd;
  g.fill();
  g.restore();
  g.lineWidth = 0.07 * u;
  g.strokeStyle = '#6f8597';
  g.stroke();
  ellipse(g, x, y, r * 0.62, r * 0.62, '#e8eef2', '#9fb0bc', 0.04 * u);
  g.fillStyle = '#ff5c8a';
  heartPath(g, x, y + r * 0.05, r * 0.28);
  g.fill();
}

function otoscope(g, x, y, u, st) {
  g.save();
  g.translate(x, y);
  g.rotate(0.35);
  shadow(g, u, st.lifted);
  // handle
  rrect(g, -0.32 * u, 1.05 * u, 0.64 * u, 2.3 * u, 0.25 * u);
  g.fillStyle = '#4cc9f0';
  g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = 0.06 * u;
  g.strokeStyle = '#2a8fb5';
  g.stroke();
  g.strokeStyle = '#2a8fb5';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(-0.18 * u, (1.6 + i * 0.35) * u);
    g.lineTo(0.18 * u, (1.6 + i * 0.35) * u);
    g.stroke();
  }
  // head
  rrect(g, -0.55 * u, 0.42 * u, 1.1 * u, 0.7 * u, 0.22 * u);
  g.fillStyle = '#eef3f6';
  g.fill();
  g.strokeStyle = '#7b93a6';
  g.stroke();
  ellipse(g, 0.22 * u, 0.77 * u, 0.17 * u, 0.17 * u, '#2f3a44');
  ellipse(g, 0.22 * u, 0.77 * u, 0.07 * u, 0.07 * u, '#9be3ff');
  ellipse(g, -0.32 * u, 0.6 * u, 0.06 * u, 0.06 * u, Math.sin((st.t || 0) * 5) > 0 ? '#ff4d4d' : '#9b2c2c');
  // the cone that goes in the ear
  g.beginPath();
  g.moveTo(-0.3 * u, 0.45 * u);
  g.lineTo(-0.09 * u, 0);
  g.quadraticCurveTo(0, -0.05 * u, 0.09 * u, 0);
  g.lineTo(0.3 * u, 0.45 * u);
  g.closePath();
  g.fillStyle = '#2f3a44';
  g.fill();
  g.restore();
  if (st.light) glow(g, x, y, 0.6 * u, '#fff7b0', 0.75);
}

function scanner(g, x, y, u, st) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.25);
  shadow(g, u, st.lifted);
  // the head points up at the forehead; the handle goes down
  rrect(g, -0.42 * u, 0.12 * u, 0.84 * u, 1.55 * u, 0.36 * u);
  g.fillStyle = '#ffffff';
  g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = 0.06 * u;
  g.strokeStyle = '#7b93a6';
  g.stroke();
  rrect(g, 0.12 * u, 1.35 * u, 0.5 * u, 1.6 * u, 0.22 * u);
  g.fillStyle = '#ffffff';
  g.fill();
  g.stroke();
  // sensor
  rrect(g, -0.3 * u, -0.05 * u, 0.6 * u, 0.3 * u, 0.12 * u);
  g.fillStyle = '#ff6b6b';
  g.fill();
  g.strokeStyle = '#c94545';
  g.stroke();
  // little screen
  rrect(g, -0.26 * u, 0.48 * u, 0.52 * u, 0.42 * u, 0.08 * u);
  g.fillStyle = st.done ? '#2fc75a' : '#2bb3a3';
  g.fill();
  if (st.done) {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 0.05 * u;
    g.beginPath();
    g.arc(0, 0.62 * u, 0.12 * u, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  ellipse(g, 0, 1.2 * u, 0.13 * u, 0.13 * u, '#4cc9f0', '#2a8fb5', 0.04 * u);
  g.restore();
  if (st.light) glow(g, x, y - 0.1 * u, 0.5 * u, '#ff6b6b', 0.35);
}

function penlight(g, x, y, u, st) {
  // the tongue stick: tip at (x, y)
  g.save();
  shadow(g, u, st.lifted);
  capsule(g, x, y, x + 1.0 * u, y + 2.3 * u, 0.17 * u);
  g.fillStyle = '#f3d8ab';
  g.fill();
  g.restore();
  capsule(g, x, y, x + 1.0 * u, y + 2.3 * u, 0.17 * u);
  g.lineWidth = 0.05 * u;
  g.strokeStyle = '#c9a26b';
  g.stroke();
  // the penlight beside it, shining at the tip
  const lx = x + 0.55 * u;
  const ly = y + 0.15 * u;
  g.save();
  shadow(g, u, st.lifted);
  capsule(g, lx, ly, lx + 1.0 * u, ly + 2.1 * u, 0.15 * u);
  g.fillStyle = '#9b5de5';
  g.fill();
  g.restore();
  capsule(g, lx, ly, lx + 1.0 * u, ly + 2.1 * u, 0.15 * u);
  g.lineWidth = 0.05 * u;
  g.strokeStyle = '#6a35b5';
  g.stroke();
  capsule(g, lx, ly, lx + 0.12 * u, ly + 0.28 * u, 0.15 * u);
  g.fillStyle = '#eef3f6';
  g.fill();
  g.stroke();
  glow(g, lx - 0.05 * u, ly - 0.05 * u, (st.light ? 0.7 : 0.35) * u, '#fff59d', st.light ? 0.85 : 0.6);
}

function hammer(g, x, y, u, st) {
  const swing = st.swing || 0;
  // pivot around the end of the handle (where his hand is)
  const px = x + 1.5 * u;
  const py = y + 2.6 * u;
  g.save();
  g.translate(px, py);
  g.rotate(swing);
  g.translate(-px, -py);
  g.save();
  shadow(g, u, st.lifted);
  capsule(g, x + 0.35 * u, y + 0.3 * u, px, py, 0.11 * u);
  g.fillStyle = '#c3cfd8';
  g.fill();
  g.restore();
  capsule(g, x + 0.35 * u, y + 0.3 * u, px, py, 0.11 * u);
  g.lineWidth = 0.04 * u;
  g.strokeStyle = '#7b93a6';
  g.stroke();
  // the rubber triangle head; its lower edge is the tip
  g.beginPath();
  g.moveTo(x - 0.75 * u, y - 0.1 * u);
  g.lineTo(x + 0.95 * u, y - 0.55 * u);
  g.lineTo(x + 0.15 * u, y + 0.75 * u);
  g.closePath();
  g.fillStyle = '#ff6b6b';
  g.fill();
  g.lineWidth = 0.07 * u;
  g.strokeStyle = '#c94545';
  g.stroke();
  g.beginPath();
  g.moveTo(x - 0.35 * u, y - 0.12 * u);
  g.lineTo(x + 0.55 * u, y - 0.37 * u);
  g.lineWidth = 0.06 * u;
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.stroke();
  g.restore();
}

function cotton(g, x, y, u, st) {
  // a pair of tweezers holding a fluffy cotton ball
  g.save();
  shadow(g, u, st.lifted);
  g.strokeStyle = '#b8c7d1';
  g.lineWidth = 0.12 * u;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(x + s * 0.12 * u, y + 0.25 * u);
    g.lineTo(x + 1.0 * u + s * 0.18 * u, y + 2.4 * u);
    g.stroke();
  }
  g.restore();
  const wob = Math.sin((st.t || 0) * 30) * (st.rubbing ? 0.03 : 0);
  for (const [dx, dy, r] of [[0, 0, 0.42], [-0.25, -0.12, 0.26], [0.25, -0.14, 0.27], [0.05, -0.3, 0.26], [-0.2, 0.18, 0.24], [0.24, 0.16, 0.24]]) {
    ellipse(g, x + (dx + wob) * u, y + dy * u, r * u, r * u * 0.92, '#ffffff', '#d7e0e8', 0.04 * u);
  }
  ellipse(g, x + wob * u, y, 0.32 * u, 0.28 * u, '#ffffff');
  ellipse(g, x - 0.12 * u, y - 0.12 * u, 0.12 * u, 0.08 * u, '#e9f6ff');
}

function syringe(g, x, y, u, st) {
  const p = st.plunger || 0; // 0 full, 1 pushed all the way
  g.save();
  g.translate(x, y);
  g.rotate(-0.72); // needle points up and to the left
  // in this frame the needle tip is at (0,0) and the syringe runs down +y
  g.save();
  shadow(g, u, st.lifted);
  const bx = -0.3 * u;
  const bw = 0.6 * u;
  const by = 0.7 * u;
  const bh = 1.9 * u;
  rrect(g, bx, by, bw, bh, 0.12 * u);
  g.fillStyle = 'rgba(235,248,255,0.95)';
  g.fill();
  g.restore();
  // needle and hub
  g.lineWidth = 0.06 * u;
  g.strokeStyle = '#8aa1b1';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, 0.5 * u);
  g.stroke();
  rrect(g, -0.12 * u, 0.48 * u, 0.24 * u, 0.24 * u, 0.04 * u);
  g.fillStyle = '#cfd9e0';
  g.fill();
  // the medicine (goes down as he pushes)
  const top = by + 0.12 * u + p * (bh - 0.35 * u);
  const liq = Math.max(0, by + bh - 0.12 * u - top);
  if (liq > 0) {
    rrect(g, bx + 0.07 * u, by + 0.08 * u, bw - 0.14 * u, Math.max(0.01, (bh - 0.2 * u) * (1 - p)), 0.06 * u);
    g.fillStyle = '#7fd1ff';
    g.fill();
  }
  // tick marks and a heart
  g.strokeStyle = 'rgba(80,110,130,0.6)';
  g.lineWidth = 0.035 * u;
  for (let i = 1; i < 6; i++) {
    g.beginPath();
    g.moveTo(bx + 0.06 * u, by + i * 0.3 * u);
    g.lineTo(bx + (i % 2 ? 0.2 : 0.28) * u, by + i * 0.3 * u);
    g.stroke();
  }
  g.fillStyle = '#ff5c8a';
  heartPath(g, 0.04 * u, by + bh * 0.62, 0.13 * u);
  g.fill();
  rrect(g, bx, by, bw, bh, 0.12 * u);
  g.lineWidth = 0.06 * u;
  g.strokeStyle = '#7b93a6';
  g.stroke();
  // flange
  rrect(g, bx - 0.25 * u, by + bh - 0.1 * u, bw + 0.5 * u, 0.16 * u, 0.06 * u);
  g.fillStyle = '#b8c7d1';
  g.fill();
  // plunger: a rod and a thumb rest, sliding in as he pushes
  const rodTop = by + 0.15 * u + p * (bh - 0.35 * u);
  rrect(g, bx + 0.06 * u, rodTop - 0.08 * u, bw - 0.12 * u, 0.16 * u, 0.04 * u);
  g.fillStyle = '#5b6b78';
  g.fill();
  const rodEnd = rodTop + bh + 0.1 * u;
  g.fillStyle = '#d5dee5';
  g.fillRect(-0.07 * u, rodTop, 0.14 * u, rodEnd - rodTop);
  rrect(g, -0.32 * u, rodEnd, 0.64 * u, 0.16 * u, 0.06 * u);
  g.fillStyle = '#9fb0bc';
  g.fill();
  g.restore();
}

// The hint hand: a pointing finger emoji.
export function drawHand(g, x, y, size, press = 0) {
  g.save();
  g.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.globalAlpha = 0.95;
  g.translate(x, y);
  g.scale(1 - press * 0.12, 1 - press * 0.12);
  g.shadowColor = 'rgba(0,0,0,0.25)';
  g.shadowBlur = 8;
  g.shadowOffsetY = 4;
  g.fillText('👆', 0, 0);
  g.restore();
}

// A pulsing ring where a tool should go.
export function drawSpotRing(g, x, y, r, t, color = '#ffd60a') {
  const k = (t * 1.4) % 1;
  g.save();
  g.lineWidth = Math.max(3, r * 0.12);
  g.strokeStyle = color;
  g.globalAlpha = 0.9 * (1 - k);
  g.beginPath();
  g.arc(x, y, r * (0.8 + k * 0.5), 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 0.55;
  g.setLineDash([r * 0.3, r * 0.22]);
  g.lineDashOffset = -t * r * 0.8;
  g.beginPath();
  g.arc(x, y, r * 0.85, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

