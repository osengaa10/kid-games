// Tiki Tumble, the World 1 boss: a stack of grumpy tiki blocks. No DOM.
//
// The pattern, each round:
//   crouch  the warning (it squashes down and faces Turbo)
//   hop     a big hop toward where Turbo was (a shadow shows where it will land)
//   land    a thump: shockwaves roll along the floor both ways (jump over them). In Dad Mode's
//           later rounds it also spits coconuts.
//   dizzy   stars round its head, and the top block's eyes open: now it can be hit (any shot
//           anywhere on it, or a stomp) and the top block pops off as a balloon.
// Each block lost makes it a little quicker. Kid Mode: 3 blocks, slow, long dizzy spells, and it
// keeps the blocks it has lost if he runs out of hearts. Dad Mode: 4 blocks, quicker, coconuts,
// and it's whole again if you run out of hearts (the fight is short).
import { moveX, moveY, MOVE } from '../engine/collide.js';

const GRAVITY = 40;
export const BLOCK_H = 0.95;

const PARAMS = {
  kid: { blocks: 3, idle: 1.3, crouch: 1.0, hop: 3.2, wave: 3.4, dizzy: 2.8, coconuts: 0 },
  dad: { blocks: 4, idle: 0.7, crouch: 0.6, hop: 3.6, wave: 6, dizzy: 1.7, coconuts: 2 },
};

export class TikiBoss {
  constructor(spawn, mode, arena) {
    this.kind = 'tiki';
    this.mode = mode;
    this.p = { ...PARAMS[mode] };
    this.blocks = this.p.blocks;
    this.maxBlocks = this.blocks;
    this.w = 1.7;
    this.feetX = spawn.x;
    this.feetY = spawn.y;
    this.x = spawn.x - this.w / 2;
    this.y = spawn.y - this.blocks * BLOCK_H;
    this.h = this.blocks * BLOCK_H;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.state = 'sleep';
    this.stateT = 0;
    this.t = 0;
    this.grounded = true;
    this.arena = arena;
    this.landX = this.x;
    this.round = 0;
    this.flash = 0;
    this.spawn = spawn;
    this.out = { landed: false, ceiling: false, shifted: 0, tile: 0 };
  }

  get cx() {
    return this.x + this.w / 2;
  }

  get cy() {
    return this.y + this.h / 2;
  }

  get alive() {
    return this.state !== 'defeated';
  }

  get vulnerable() {
    return this.state === 'dizzy';
  }

  // The weak spot: the top block's face, while it's dizzy.
  weakSpot() {
    return { cx: this.cx, cy: this.y + BLOCK_H * 0.5, r: 0.7 };
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  // Back to a whole stack (Dad Mode, after running out of hearts).
  reset() {
    this.blocks = this.maxBlocks;
    this.h = this.blocks * BLOCK_H;
    this.x = this.spawn.x - this.w / 2;
    this.y = this.spawn.y - this.h;
    this.vx = this.vy = 0;
    this.p = { ...PARAMS[this.mode] };
    this.setState('idle');
  }

  update(w, dt) {
    this.t += dt;
    this.stateT += dt;
    if (this.flash > 0) this.flash -= dt;
    const p = this.p;
    const pl = w.player;
    switch (this.state) {
      case 'sleep':
        if (pl.x > this.arena.x0 + 2) {
          this.setState('wake');
          w.events.emit('bossWake', this);
        }
        return;
      case 'wake':
        if (this.stateT >= 1.4) this.setState('idle');
        return;
      case 'idle':
        this.facing = pl.cx < this.cx ? -1 : 1;
        if (this.stateT >= p.idle) this.setState('crouch');
        break;
      case 'crouch':
        this.facing = pl.cx < this.cx ? -1 : 1;
        if (this.stateT >= p.crouch) {
          // Hop toward where Turbo is now, staying inside the arena.
          const airTime = (2 * Math.sqrt(2 * GRAVITY * p.hop)) / GRAVITY;
          const target = Math.max(this.arena.x0 + 1.5 + this.w / 2, Math.min(this.arena.x1 - 1.5 - this.w / 2, pl.cx));
          this.landX = target;
          this.vx = (target - this.cx) / airTime;
          this.vy = -Math.sqrt(2 * GRAVITY * p.hop);
          this.grounded = false;
          this.setState('hop');
          w.events.emit('bossHop', this);
        }
        break;
      case 'hop':
        break;
      case 'dizzy':
        if (this.stateT >= p.dizzy) this.setState('idle');
        break;
      case 'hurt':
        if (this.stateT >= 0.9) this.setState('idle');
        break;
      default:
        return;
    }
    // Gravity and the floor.
    const vy0 = this.vy;
    this.vy = Math.min(18, this.vy + GRAVITY * dt);
    if (this.vx) {
      if (moveX(this, this.vx * dt, w.grid) === MOVE.WALL) this.vx = 0;
    }
    const r = moveY(this, (vy0 + this.vy) * 0.5 * dt, w.grid, {}, this.out);
    if (r.landed) {
      this.vy = 0;
      if (this.state === 'hop') {
        this.vx = 0;
        this.grounded = true;
        this.round++;
        w.bossLanded(this);
        this.setState('dizzy');
      }
    }
  }

  // The weak spot was hit: the top block pops off.
  hit(w) {
    if (this.state !== 'dizzy') return false;
    this.blocks--;
    this.flash = 0.2;
    const top = { x: this.cx, y: this.y + BLOCK_H / 2 };
    this.y += BLOCK_H;
    this.h = this.blocks * BLOCK_H;
    if (this.blocks <= 0) {
      this.setState('defeated');
      w.events.emit('bossHit', { boss: this, x: top.x, y: top.y, left: 0 });
      return true;
    }
    // Quicker with every block lost.
    this.p.idle *= 0.8;
    this.p.crouch *= 0.88;
    this.p.wave *= 1.1;
    this.setState('hurt');
    w.events.emit('bossHit', { boss: this, x: top.x, y: top.y, left: this.blocks });
    return true;
  }

  // Coconuts start in Dad Mode once it's lost a block.
  get coconuts() {
    return this.blocks < this.maxBlocks ? this.p.coconuts : 0;
  }
}
