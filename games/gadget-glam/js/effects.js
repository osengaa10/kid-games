// Little things flying about, in screen pixels: spray that misses, sparkles, confetti, poofs.
import { css } from './palette.js';

export class Particles {
  constructor() {
    this.list = [];
  }

  get busy() {
    return this.list.length > 0;
  }

  add(p) {
    if (this.list.length < 900) this.list.push(p);
  }

  // Spray drifting from the nozzle toward where the paint lands, and some flying past it.
  spray(x, y, tx, ty, rgb, n = 3) {
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < n; i++) {
      const sp = 260 + Math.random() * 380;
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.9;
      this.add({ kind: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25 + Math.random() * 0.35 * (d / 60), age: 0, r: 1 + Math.random() * 2.4, color: css(rgb, 0.85), drag: 3 });
    }
  }

  sparkle(x, y, n = 10, colors = ['#fff', '#ffe36e', '#ff9ad5', '#9ee8ff']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 260;
      this.add({ kind: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.5, age: 0, r: 5 + Math.random() * 9, color: colors[i % colors.length], drag: 2.5, spin: (Math.random() - 0.5) * 8 });
    }
  }

  poof(x, y, r = 30) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.add({ kind: 'puff', x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 20, life: 0.45, age: 0, r: r * 0.45, color: '#ffffff', drag: 4 });
    }
  }

  // Glitter falling from the shaker.
  fleck(x, y, color) {
    this.add({ kind: 'dot', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 160, life: 0.25 + Math.random() * 0.2, age: 0, r: 1.5 + Math.random() * 2, color, drag: 0.5 });
  }

  confetti(w, h, n = 120) {
    const colors = ['#ff3347', '#ffd60a', '#2fc75a', '#29c4ff', '#9a45ff', '#ff5cb6', '#ff8a1c'];
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      const x = fromLeft ? -10 : w + 10;
      const y = h * (0.55 + Math.random() * 0.35);
      const a = (fromLeft ? -1 : -Math.PI + 1) + (Math.random() - 0.5) * 0.7 - (fromLeft ? 0.25 : -0.25);
      const sp = 650 + Math.random() * 650;
      this.add({ kind: 'paper', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3 + Math.random() * 1.5, age: 0, r: 6 + Math.random() * 6, color: colors[i % colors.length], drag: 1.2, gravity: 520, spin: (Math.random() - 0.5) * 14, rot: Math.random() * 6 });
    }
  }

  update(dt) {
    const out = [];
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const k = Math.exp(-(p.drag || 0) * dt);
      p.vx *= k;
      p.vy = p.vy * k + (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
      out.push(p);
    }
    this.list = out;
  }

  draw(g) {
    for (const p of this.list) {
      const f = p.age / p.life;
      g.globalAlpha = p.kind === 'paper' ? Math.min(1, (1 - f) * 3) : 1 - f;
      g.fillStyle = p.color;
      if (p.kind === 'dot') {
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'puff') {
        g.beginPath();
        g.arc(p.x, p.y, p.r * (0.6 + f), 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'star') {
        star(g, p.x, p.y, p.r * (1 - f * 0.5), p.rot || 0);
      } else if (p.kind === 'paper') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(1, Math.cos(p.rot * 1.7));
        g.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        g.restore();
      }
    }
    g.globalAlpha = 1;
  }
}

export function star(g, x, y, r, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const rr = k % 2 ? r * 0.32 : r;
    if (k) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else g.moveTo(rr, 0);
  }
  g.closePath();
  g.fill();
  g.restore();
}
