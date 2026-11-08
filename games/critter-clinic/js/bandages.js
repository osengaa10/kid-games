// The four bandages he can pick after the shot. drawBandage draws one centered on (x, y), w long
// and h tall, turned by rot, in whatever units the canvas is in.
import { rrect, starPath, heartPath, EMOJI_FONT } from './style.js';

export const BANDAGES = [
  ['stars', 'Stars!', '#4d7cff'],
  ['hearts', 'Hearts!', '#ffffff'],
  ['rainbow', 'Rainbow!', '#ffffff'],
  ['dinos', 'Dinos!', '#b8f08a'],
];
export const BANDAGE_SAY = Object.fromEntries(BANDAGES.map(([id, say]) => [id, say]));

export function drawBandage(g, id, x, y, w, h, rot = 0) {
  const bg = (BANDAGES.find((b) => b[0] === id) || BANDAGES[0])[2];
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  // Drawn at about 40 units tall and scaled to fit, so line widths and the emoji font stay sane
  // even when the canvas is in rig units (where the whole bandage is less than one unit).
  const k = 40 / h;
  g.scale(1 / k, 1 / k);
  w *= k;
  h *= k;
  g.lineJoin = 'round';
  // shadow
  g.globalAlpha = 0.18;
  rrect(g, -w / 2 + h * 0.04, -h / 2 + h * 0.08, w, h, h / 2);
  g.fillStyle = '#3a2a40';
  g.fill();
  g.globalAlpha = 1;
  rrect(g, -w / 2, -h / 2, w, h, h / 2);
  g.fillStyle = bg;
  g.fill();
  g.save();
  g.clip();
  if (id === 'rainbow') {
    const cols = ['#ff4d4d', '#ff9f1c', '#ffd60a', '#3ccf6e', '#38b6ff', '#9b5de5'];
    cols.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(-w / 2, -h / 2 + (h * i) / cols.length, w, h / cols.length + 0.5);
    });
  } else if (id === 'stars') {
    g.fillStyle = '#ffd60a';
    for (let i = 0; i < 4; i++) {
      const sx = -w / 2 + w * (0.12 + i * 0.25);
      starPath(g, sx, (i % 2 ? 0.18 : -0.18) * h, h * 0.2, h * 0.09);
      g.fill();
    }
  } else if (id === 'hearts') {
    g.fillStyle = '#ff5c8a';
    for (let i = 0; i < 4; i++) {
      heartPath(g, -w / 2 + w * (0.12 + i * 0.25), (i % 2 ? 0.16 : -0.16) * h, h * 0.17);
      g.fill();
    }
  } else if (id === 'dinos') {
    g.font = `${h * 0.42}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) g.fillText(i % 2 ? '🦖' : '🦕', -w / 2 + w * (0.12 + i * 0.25), (i % 2 ? 0.14 : -0.14) * h);
  }
  g.restore();
  // the pad in the middle
  rrect(g, -w * 0.17, -h * 0.34, w * 0.34, h * 0.68, h * 0.14);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fill();
  g.fillStyle = 'rgba(220,170,160,0.5)';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    g.beginPath();
    g.arc(-w * 0.1 + i * w * 0.1, -h * 0.12 + j * h * 0.24, h * 0.035, 0, Math.PI * 2);
    g.fill();
  }
  rrect(g, -w / 2, -h / 2, w, h, h / 2);
  g.lineWidth = h * 0.06;
  g.strokeStyle = 'rgba(80,60,90,0.35)';
  g.stroke();
  g.restore();
}
