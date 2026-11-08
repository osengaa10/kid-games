// Little things flying about, in screen pixels: sparkles, confetti, poofs, and hearts that float
// up from the stethoscope. Gadget Glam's Particles, with hearts added and the paint bits taken out.
import { heartPath } from './style.js';

export class Particles {
  constructor() {
    this.list = [];
  }

  get busy() {
    return this.list.length > 0;
  }

  clear() {
    this.list = [];
  }

  add(p) {
    if (this.list.length < 700) this.list.push(p);
  }

  sparkle(x, y, n = 10, colors = ['#fff', '#ffe36e', '#ff9ad5', '#9ee8ff'], speed = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (80 + Math.random() * 260) * speed;
      this.add({ kind: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.5, age: 0, r: 5 + Math.random() * 9, color: colors[i % colors.length], drag: 2.5, spin: (Math.random() - 0.5) * 8 });
    }
  }

  poof(x, y, r = 30) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.add({ kind: 'puff', x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 20, life: 0.45, age: 0, r: r * 0.45, color: '#ffffff', drag: 4 });
    }
  }

  // A heart floating up and fading (one per heartbeat).
  heart(x, y, s = 14, color = '#ff4d6d') {
    this.add({ kind: 'heart', x, y, vx: (Math.random() - 0.5) * 40, vy: -90 - Math.random() * 40, life: 1.1, age: 0, r: s, color, drag: 0.6 });
  }

  // A big star that pops and hangs for a moment (the height mark, a check).
  bigStar(x, y, r = 26, color = '#ffd60a') {
    this.add({ kind: 'big', x, y, vx: 0, vy: -20, life: 1.2, age: 0, r, color, drag: 1, spin: 1.5 });
  }

  // Little plus signs and hearts floating up around the patient: feeling better.
  plusses(x, y, n = 12, spread = 80) {
    const cols = ['#2fc75a', '#ffffff', '#4cc9f0', '#ff5c8a'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = spread * (0.4 + Math.random() * 0.6);
      this.add({ kind: i % 4 === 3 ? 'heart' : 'plus', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.8, vx: (Math.random() - 0.5) * 30, vy: -70 - Math.random() * 70, life: 1.1 + Math.random() * 0.6, age: -Math.random() * 0.25, r: 7 + Math.random() * 7, color: cols[i % cols.length], drag: 0.8 });
    }
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
      if (p.age < 0) {
        out.push(p);
        continue;
      }
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
      if (p.age < 0) continue;
      const f = p.age / p.life;
      g.globalAlpha = p.kind === 'paper' ? Math.min(1, (1 - f) * 3) : p.kind === 'big' ? Math.min(1, (1 - f) * 2.5) : 1 - f;
      g.fillStyle = p.color;
      if (p.kind === 'puff') {
        g.beginPath();
        g.arc(p.x, p.y, p.r * (0.6 + f), 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'star') {
        star(g, p.x, p.y, p.r * (1 - f * 0.5), p.rot || 0);
      } else if (p.kind === 'big') {
        const s = p.r * Math.min(1, f * 6) * (1 + 0.15 * Math.sin(f * 12));
        g.save();
        g.translate(p.x, p.y);
        g.rotate((p.rot || 0) * 0.3);
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? s * 0.45 : s;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
        g.lineWidth = Math.max(2, s * 0.12);
        g.strokeStyle = '#ffffff';
        g.stroke();
        g.restore();
      } else if (p.kind === 'plus') {
        const s = p.r * (0.6 + Math.min(1, Math.max(0, f) * 5) * 0.4);
        g.save();
        g.translate(p.x, p.y);
        g.fillStyle = p.color === '#ffffff' ? '#2fc75a' : '#ffffff';
        g.fillRect(-s * 1.15, -s * 0.48, s * 2.3, s * 0.96);
        g.fillRect(-s * 0.48, -s * 1.15, s * 0.96, s * 2.3);
        g.fillStyle = p.color;
        g.fillRect(-s, -s * 0.33, s * 2, s * 0.66);
        g.fillRect(-s * 0.33, -s, s * 0.66, s * 2);
        g.restore();
      } else if (p.kind === 'heart') {
        const s = p.r * (0.6 + Math.min(1, f * 5) * 0.4);
        heartPath(g, p.x + Math.sin(p.age * 6) * 6, p.y, s);
        g.fill();
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
