// Pooled particles in tiles: dust puffs, sparkles, confetti. A burst is capped and the total is
// capped (fewer with reduced motion or a low quality tier), so effects never hide the game.
import { Pool } from '../engine/pool.js';

export const MAX_PARTICLES = 300;
const BURST_CAP = 40;

export class Particles {
  constructor() {
    this.pool = new Pool(() => ({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 0, max: 1, size: 1, kind: 0, variant: 0, rot: 0, vr: 0, grow: 0 }), MAX_PARTICLES);
    this.scale = 1; // share of particles to keep (reduced motion, low tier)
  }

  get count() {
    return this.pool.count;
  }

  clear() {
    this.pool.clear();
  }

  // kind: 'dust' | 'sparkle' | 'confetti'
  burst(kind, x, y, n, opts = {}) {
    n = Math.min(BURST_CAP, Math.max(1, Math.round(n * this.scale)));
    const { speed = 3, spread = Math.PI * 2, angle = -Math.PI / 2, life = 0.6, size = 1, g = 0, drag = 2, grow = 0 } = opts;
    for (let i = 0; i < n; i++) {
      const p = this.pool.alloc();
      if (!p) return;
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random() * 0.7);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.g = g;
      p.drag = drag;
      p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.size = size * (0.7 + Math.random() * 0.6);
      p.kind = kind;
      p.variant = (Math.random() * 6) | 0;
      p.rot = Math.random() * Math.PI * 2;
      p.vr = (Math.random() - 0.5) * 12;
      p.grow = grow;
    }
  }

  update(dt) {
    const items = this.pool.items;
    for (let i = this.pool.count - 1; i >= 0; i--) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.free(i);
        continue;
      }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
    }
  }
}
