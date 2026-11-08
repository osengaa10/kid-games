// Grumbly behaviors, built from content/enemies.js. Each Grumbly runs one movement behavior
// (walk, hop, fly) with its mode's numbers. They only act near the camera. No DOM.
//
// A Grumbly can be:
//   alive and grumpy
//   bubbled (trapped by the Bubble Cannon): floats up for a few seconds; touching the bubble pops
//   it, landing on it bounces you high. Either way the Grumbly is cheered.
//   cheered: gone from play; the world turns it into a balloon that floats away.
import { ENEMIES } from '../content/enemies.js';
import { moveX, moveY, MOVE, tileAt, isStandable } from '../engine/collide.js';

const GRAVITY = 40;

export class Enemy {
  constructor(spawn, mode) {
    const def = ENEMIES[spawn.kind];
    this.kind = spawn.kind;
    this.id = spawn.id;
    this.section = spawn.section;
    this.def = def;
    this.p = { ...def[mode], ...(spawn.params || {}) };
    this.w = def.w;
    this.h = def.h;
    this.x = spawn.x - def.w / 2;
    this.y = spawn.y - def.h;
    this.homeX = this.x;
    this.homeY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.hp = def.hp;
    this.alive = true;
    this.state = 'idle';
    this.t = 0;
    this.stateT = 0;
    this.grounded = false;
    this.bubbled = 0;
    this.flash = 0;
    this.hopIndex = 0;
    this.phase = (spawn.x * 1.7) % 6.28;
    this.out = { landed: false, ceiling: false, shifted: 0, tile: 0 };
    if (def.move === 'fly') this.state = 'patrol';
  }

  get cx() {
    return this.x + this.w / 2;
  }

  get cy() {
    return this.y + this.h / 2;
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  update(w, dt) {
    this.t += dt;
    this.stateT += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.bubbled > 0) {
      this.updateBubbled(w, dt);
      return;
    }
    const slow = w.enemySlow || 1;
    const move = this.def.move;
    if (move === 'walk') this.walk(w, dt * slow);
    else if (move === 'hop') this.hop(w, dt * slow);
    else this.fly(w, dt * slow);
  }

  // ---------------------------------------------------------------------------- walkers
  walk(w, dt) {
    const p = this.p;
    const pl = w.player;
    let speed = p.speed;
    if (p.alertRange) {
      const ahead = (pl.cx - this.cx) * this.facing;
      const sees = this.state === 'idle' && ahead > 0 && ahead < p.alertRange && Math.abs(pl.feet - (this.y + this.h)) < 2;
      if (sees) {
        this.setState('alert');
        w.events.emit('alert', this);
      }
      if (this.state === 'alert') {
        speed = 0;
        if (this.stateT >= p.alertTime) this.setState('hurry');
      } else if (this.state === 'hurry') {
        speed *= p.alertMul;
        if (this.stateT >= p.alertFor) this.setState('idle');
      }
    }
    this.vx = this.facing * speed;
    this.fall(w, dt);
    const hit = moveX(this, this.vx * dt, w.grid);
    if (hit === MOVE.WALL) this.turn();
    else if (this.grounded && p.turnAtLedges && !this.groundAhead(w)) this.turn();
  }

  turn() {
    this.facing = -this.facing;
    if (this.state === 'hurry') this.setState('idle');
  }

  groundAhead(w) {
    const col = Math.floor(this.facing > 0 ? this.x + this.w + 0.05 : this.x - 0.05);
    const row = Math.floor(this.y + this.h + 0.05);
    return isStandable(tileAt(w.grid, col, row));
  }

  fall(w, dt) {
    const vy0 = this.vy;
    this.vy = Math.min(16, this.vy + GRAVITY * dt);
    const r = moveY(this, (vy0 + this.vy) * 0.5 * dt, w.grid, {}, this.out);
    const was = this.grounded;
    this.grounded = r.landed;
    if (r.landed) this.vy = 0;
    if (r.ceiling) this.vy = 0;
    if (this.y > w.grid.h + 2) this.alive = false; // fell out of the level: gone quietly
    return this.grounded && !was;
  }

  // ---------------------------------------------------------------------------- hoppers
  hop(w, dt) {
    const p = this.p;
    const pl = w.player;
    if (this.state === 'idle') {
      this.vx = 0;
      if (this.grounded && this.stateT >= p.interval) this.setState('crouch');
    } else if (this.state === 'crouch') {
      this.vx = 0;
      if (p.toward) this.facing = pl.cx < this.cx ? -1 : 1;
      if (this.stateT >= p.crouch) {
        const h = p.hops[this.hopIndex++ % p.hops.length];
        this.vy = -Math.sqrt(2 * GRAVITY * h);
        this.vx = p.toward ? this.facing * p.drift : 0;
        this.grounded = false;
        this.setState('air');
        w.events.emit('hop', this);
      }
    }
    const landed = this.fall(w, dt);
    if (this.vx) {
      const hit = moveX(this, this.vx * dt, w.grid);
      if (hit === MOVE.WALL) this.vx = 0;
    }
    if (this.state === 'air' && landed) {
      this.vx = 0;
      this.setState('idle');
      w.events.emit('enemyLand', this);
    }
  }

  // ---------------------------------------------------------------------------- fliers
  fly(w, dt) {
    const p = this.p;
    const pl = w.player;
    this.phase += dt;
    const pathX = this.homeX + Math.sin(this.phase * p.speed) * p.range;
    const pathY = this.homeY + Math.sin(this.phase * 2.1) * p.bob;
    if (this.state === 'patrol') {
      this.facing = Math.cos(this.phase * p.speed) >= 0 ? 1 : -1;
      this.x = pathX;
      this.y = pathY;
      if (p.swoop && this.stateT > p.cooldown && pl.state === 'play') {
        const dx = pl.cx - this.cx;
        if (Math.abs(dx) < p.swoopRange && pl.y > this.y + this.h + 0.5) {
          this.facing = dx < 0 ? -1 : 1;
          this.setState('wiggle');
          w.events.emit('alert', this);
        }
      }
    } else if (this.state === 'wiggle') {
      if (this.stateT >= p.wiggle) {
        const dx = pl.cx - this.cx;
        const dy = pl.y + pl.h * 0.4 - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        this.vx = (dx / d) * p.swoopSpeed;
        this.vy = (dy / d) * p.swoopSpeed;
        this.setState('swoop');
      }
    } else if (this.state === 'swoop') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.stateT > 0.9 || this.y + this.h > w.grid.h) this.setState('return');
    } else if (this.state === 'return') {
      const dx = pathX - this.x;
      const dy = pathY - this.y;
      const d = Math.hypot(dx, dy);
      const step = 4 * dt;
      if (d <= step) this.setState('patrol');
      else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
    }
  }

  // ---------------------------------------------------------------------------- bubbles
  trap(seconds) {
    this.bubbled = seconds;
    this.bubbleY = this.y;
    this.vx = 0;
    this.vy = 0;
  }

  updateBubbled(w, dt) {
    this.bubbled -= dt;
    // Float up about 2.5 tiles, then hover with a wobble.
    const risen = this.bubbleY - this.y;
    if (risen < 2.5) this.y -= Math.min(2.5 - risen, 1.4 * dt);
    this.x += Math.sin(this.t * 3) * 0.15 * dt;
    if (this.bubbled <= 0) {
      this.bubbled = 0;
      this.setState(this.def.move === 'fly' ? 'return' : 'idle');
      this.grounded = false;
      w.events.emit('unbubble', this);
    }
  }
}
