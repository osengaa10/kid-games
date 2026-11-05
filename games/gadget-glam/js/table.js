// The craft table everything sits on: a teal cutting mat with grid lines, a ruler edge and a few
// sequins scattered about. Drawn once per screen size.
import { makeCanvas } from './paint.js';
import { rng } from './rng.js';

export function drawTable(w, h, dpr) {
  const c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d', { alpha: false });
  g.scale(dpr, dpr);
  const bg = g.createLinearGradient(0, 0, w * 0.3, h);
  bg.addColorStop(0, '#36c2a6');
  bg.addColorStop(1, '#22a08f');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const step = Math.max(22, Math.min(w, h) / 24);
  g.lineWidth = 1;
  for (let x = 0, i = 0; x < w + step; x += step, i++) {
    g.strokeStyle = i % 5 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.24)';
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, h);
    g.stroke();
  }
  for (let y = 0, j = 0; y < h + step; y += step, j++) {
    g.strokeStyle = j % 5 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.24)';
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
    g.stroke();
  }
  // A couple of long 45° guide lines, like a real cutting mat.
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 2;
  for (const off of [-0.2, 0.6]) {
    g.beginPath();
    g.moveTo(w * off, 0);
    g.lineTo(w * off + h, h);
    g.stroke();
  }
  // Soft light from the top, darker toward the corners.
  const glow = g.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.75);
  glow.addColorStop(0, 'rgba(255,255,255,0.12)');
  glow.addColorStop(0.6, 'rgba(255,255,255,0)');
  glow.addColorStop(1, 'rgba(0,30,40,0.25)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  // Sequins and beads near the edges.
  const R = rng(7);
  const colors = ['#ff5cb6', '#ffd60a', '#ffffff', '#9a45ff', '#29c4ff', '#ff8a1c'];
  for (let i = 0; i < 26; i++) {
    const side = R();
    let x = R() * w;
    let y = R() * h;
    if (side < 0.5) x = R() < 0.5 ? R() * w * 0.12 : w - R() * w * 0.12;
    else y = R() < 0.5 ? R() * h * 0.1 : h - R() * h * 0.1;
    const r = 3 + R() * 5;
    const col = colors[Math.floor(R() * colors.length)];
    g.fillStyle = 'rgba(0,40,40,0.25)';
    g.beginPath();
    g.arc(x + 1, y + 2, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}
