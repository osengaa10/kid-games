// How a style looks, on top of its outline (see styleParts in items.js):
//   drawPlastic:  the case before he paints it: its plastic, and the colored bits (inside the
//                 ears, a gold horn, red fins, tinted wings)
//   drawTrim:     bits that are never painted, on top of the paint (cactus flowers, the crown's
//                 jewels, the robot's light, the rocket's window)
//   drawTrimLive: the parts of those that move, drawn every frame (the robot's light blinks)
import { partPath, unionPath } from './shapes.js';
import { gemSprite } from './paint.js';

const TAU = Math.PI * 2;

function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
}

function radial(g, x0, y0, r0, x1, y1, r1, stops) {
  const gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

// The plastic, then the colored bits. Ones tucked `under` the body go first, and the body goes
// back over them, so they only show where they stick out. The inside of the case (`back`) has no
// `front` bits, like the inside of the ears.
export function drawPlastic(g, shape, { back = false } = {}) {
  const accents = back ? shape.accents.filter((a) => !a.front) : shape.accents;
  const fill = (c, parts) => {
    g.fillStyle = c;
    for (const p of parts) g.fill(partPath(p));
  };
  fill(shape.plastic, shape.parts);
  if (!accents.length) return;
  g.save();
  g.clip(unionPath(shape.parts));
  for (const a of accents) if (a.under) fill(a.c, [a.part]);
  if (accents.some((a) => a.under)) fill(shape.plastic, shape.body);
  for (const a of accents) if (!a.under) fill(a.c, [a.part]);
  g.restore();
}

export function drawTrim(g, t) {
  if (t.k === 'flower') flower(g, t.x, t.y, t.s);
  else if (t.k === 'jewel') g.drawImage(gemSprite(t.id), t.x - t.s / 2, t.y - t.s / 2, t.s, t.s);
  else if (t.k === 'light') bulb(g, t.x, t.y, t.s);
  else if (t.k === 'window') porthole(g, t.x, t.y, t.s);
}

// `now` in seconds.
export function drawTrimLive(g, t, now) {
  if (t.k !== 'light') return;
  // On for a bit more than half a second, then off, over and over.
  const on = Math.max(0, Math.sin(now * 4.5)) ** 0.6;
  if (on < 0.02) return;
  const { x, y, s: r } = t;
  g.fillStyle = radial(g, x, y, r * 0.3, x, y, r * 2.8, [[0, `rgba(255,90,100,${0.7 * on})`], [1, 'rgba(255,90,100,0)']]);
  circle(g, x, y, r * 2.8);
  g.fill();
  g.fillStyle = `rgba(255,236,236,${0.85 * on})`;
  circle(g, x - r * 0.08, y - r * 0.1, r * 0.42);
  g.fill();
}

function flower(g, x, y, s) {
  const petals = 8;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU;
    g.fillStyle = i % 2 ? '#ff4f6d' : '#ff6b84';
    g.beginPath();
    g.ellipse(x + Math.cos(a) * s * 0.26, y + Math.sin(a) * s * 0.26, s * 0.2, s * 0.12, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#ffd23f';
  circle(g, x, y, s * 0.13);
  g.fill();
}

// A round red light, lit from the top left.
function bulb(g, x, y, r) {
  g.fillStyle = 'rgba(40,10,20,0.35)';
  circle(g, x + r * 0.06, y + r * 0.12, r);
  g.fill();
  g.fillStyle = radial(g, x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r, [[0, '#ffd2d2'], [0.35, '#ff4d5e'], [1, '#a3001a']]);
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.ellipse(x - r * 0.32, y - r * 0.38, r * 0.3, r * 0.16, -0.6, 0, TAU);
  g.fill();
}

// A rocket window: a bolted metal ring round blue glass.
function porthole(g, x, y, r) {
  g.fillStyle = 'rgba(40,10,30,0.3)';
  circle(g, x + r * 0.05, y + r * 0.12, r);
  g.fill();
  const rim = g.createLinearGradient(x - r, y - r, x + r, y + r);
  rim.addColorStop(0, '#f4f6fa');
  rim.addColorStop(0.5, '#b4bac6');
  rim.addColorStop(1, '#7a808e');
  g.fillStyle = rim;
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = '#4c5260';
  circle(g, x, y, r * 0.8);
  g.fill();
  g.fillStyle = radial(g, x - r * 0.25, y - r * 0.3, r * 0.05, x, y, r * 0.74, [[0, '#d8f4ff'], [0.45, '#4aa3ff'], [1, '#1d3f9e']]);
  circle(g, x, y, r * 0.74);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.ellipse(x - r * 0.28, y - r * 0.3, r * 0.26, r * 0.13, -0.7, 0, TAU);
  g.fill();
  g.fillStyle = '#8d93a0';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.5;
    circle(g, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.06);
    g.fill();
  }
}
