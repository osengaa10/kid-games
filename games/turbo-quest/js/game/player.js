// Turbo's controller: running, jumping, fluttering, bouncing, riding platforms and the bubble
// rescue out of pits. All feel numbers come from tuning.js. No DOM: tested in node.
//
// States: 'play' (normal), 'rescue' (floating back in a bubble: from a pit to safe ground, or
// to the checkpoint when out of hearts), 'victory' (reached the goal; ignores input).
// Hearts, shields, power-up timers and the weapon live here too; the world decides what hurts.
import { T, MOVE, moveX, moveY, fullySupported, tileAt, isSolid, isStandable } from '../engine/collide.js';
import { approach, lerp, smoothstep } from '../engine/math.js';

export const PLAYER_W = 0.8;
export const PLAYER_H = 1.2;

const PLATFORM_SLACK = 0.05;

export class Player {
  constructor(x = 0, y = 0) {
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.out = { landed: false, ceiling: false, shifted: 0, tile: 0 };
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.ground = T.EMPTY;
    this.riding = null;
    this.coyote = 0;
    this.buffer = 0;
    this.jumping = false;
    this.fluttering = false;
    this.flutterLeft = 0;
    this.dropTimer = 0;
    this.waiting = false;
    this.invuln = 0;
    this.state = 'play';
    this.stateTime = 0;
    this.rescue = null;
    this.safeX = x;
    this.safeY = y;
    this.prevFeet = y + this.h;
    this.hurtLock = 0;
    this.assistJump = false;
    this.shield = 0;
    this.giant = 0;
    this.turbo = 0;
    this.zoom = 0;
    this.magnet = 0;
    this.airJumps = 0;
    this.carryVx = 0; // speed kept from a moving platform jumped off
    this.lastRaft = null;
    if (this.maxHearts) this.hearts = this.maxHearts;
  }

  // A bounce off something (a Grumbly, a balloon, a bubble): up `height` tiles, no jump cut.
  springUp(w, height) {
    this.vy = -Math.sqrt(2 * w.tune.riseGravity * height);
    this.jumping = false;
    this.grounded = false;
    this.coyote = 0;
    this.riding = null;
    this.flutterLeft = w.tune.flutterTime;
    w.events.emit('spring', { x: this.cx, y: this.feet });
  }

  // Hurt: knocked back away from what hit him, briefly out of control.
  knockback(fromX) {
    const dir = Math.sign(this.cx - fromX) || -this.facing;
    this.vx = dir * 5;
    this.vy = -7;
    this.grounded = false;
    this.riding = null;
    this.jumping = false;
    this.hurtLock = 0.3;
  }

  get cx() {
    return this.x + this.w / 2;
  }

  get feet() {
    return this.y + this.h;
  }

  get cy() {
    return this.y + this.h / 2;
  }

  // w: the world: { grid, platforms, tune, derived, events, mode, autoGo }.
  // input: { mx (-1..1), my (-1..1, down is +), jump (held), jumpPressed (this step) }.
  update(input, w, dt) {
    const t = w.tune;
    const d = w.derived;
    const ev = w.events;
    this.stateTime += dt;
    this.prevFeet = this.y + this.h;
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.state === 'rescue') {
      this.updateRescue(w, dt);
      return;
    }
    const playing = this.state === 'play';

    // ---------------------------------------------------------------- what the player wants
    let mx = playing ? input.mx : 0;
    const held = playing && input.jump;
    this.waiting = false;
    if (playing && w.autoGo) mx = this.autoGo(w);
    // Auto-Go jumping off a raft or log keeps pace with it instead of running ahead.
    if (playing && w.autoGo && !this.grounded && this.carryVx) mx = 0;
    // Aiming up (straight or diagonally, Dad Mode) plants his feet on the ground, so he can stand
    // and shoot up at an angle; in the air it still steers.
    if (input.my < -0.5 && (this.grounded || Math.abs(mx) < 0.3)) {
      if (Math.abs(mx) >= 0.3) this.facing = mx > 0 ? 1 : -1;
      mx = 0;
    }
    // Kid smart jump: a jump from standing still at a gap carries him across.
    if (this.assistJump && !this.grounded && Math.abs(mx) < 0.1) mx = this.facing;
    if (this.hurtLock > 0) {
      this.hurtLock -= dt;
      mx = 0;
    }
    if (playing && input.jumpPressed) this.buffer = t.buffer;
    else if (this.buffer > 0) this.buffer = Math.max(0, this.buffer - dt);
    if (this.dropTimer > 0) this.dropTimer -= dt;

    // Riding a moving platform: carried along before anything else.
    if (this.riding) {
      const p = this.riding;
      moveX(this, p.dx, w.grid);
      this.y = p.y - this.h;
      if (p.kind === 'raft') this.lastRaft = p;
    }

    // ---------------------------------------------------------------- running
    const boost = (this.turbo > 0 ? 1.3 : 1) * (this.zoom > 0 ? 1.4 : 1);
    const target = mx * t.runSpeed * boost + (this.grounded ? 0 : this.carryVx);
    let rate;
    if (this.hurtLock > 0) rate = 4;
    else if (mx === 0) rate = d.decel;
    else if (this.vx * mx < 0) rate = d.decel + d.accel; // turning round is extra snappy
    else if (Math.abs(this.vx) > Math.abs(target)) rate = d.decel;
    else rate = d.accel;
    if (!this.grounded) rate *= t.airControl;
    this.vx = approach(this.vx, target, rate * dt);
    if (mx > 0.1) this.facing = 1;
    else if (mx < -0.1) this.facing = -1;

    // ---------------------------------------------------------------- jumping
    if (this.grounded) {
      this.coyote = t.coyote;
      this.flutterLeft = t.flutterTime;
      this.airJumps = w.abilities && w.abilities.doubleJump ? 1 : 0;
    } else if (this.coyote > 0) this.coyote = Math.max(0, this.coyote - dt);
    const carry = this.riding ? this.riding.dx / dt : 0;

    if (this.buffer > 0 && this.coyote > 0) {
      const onOneWay = this.grounded && (this.ground === T.ONEWAY || this.riding);
      if (w.mode === 'dad' && input.my > 0.5 && onOneWay) {
        // Down + jump drops through a one-way platform.
        this.dropTimer = 0.25;
        this.buffer = 0;
        this.coyote = 0;
        this.grounded = false;
        this.riding = null;
      } else {
        this.jump(d, ev, this.zoom > 0 ? 1.08 : 1);
        this.carryVx = carry;
        if (w.mode === 'kid' && !w.autoGo && Math.abs(input.mx) < 0.1 && this.gapAhead(w)) this.assistJump = true;
      }
    } else if (playing && input.jumpPressed && !this.grounded && this.coyote <= 0 && this.airJumps > 0) {
      // Double jump (once Tiki Tumble is beaten): a second, smaller jump in the air.
      this.airJumps--;
      this.buffer = 0;
      this.vy = -Math.sqrt(2 * t.riseGravity * (w.doubleJumpHeight || 2.5));
      this.jumping = true;
      this.flutterLeft = t.flutterTime;
      ev.emit('doubleJump', { x: this.cx, y: this.feet });
    }
    // Letting go of jump early makes a lower jump.
    if (this.jumping && !held && this.vy < -d.cutVel) this.vy = -d.cutVel;
    if (this.vy >= 0) this.jumping = false;

    // ---------------------------------------------------------------- gravity
    let g = this.vy < 0 ? t.riseGravity : t.fallGravity;
    if (held && !this.grounded && Math.abs(this.vy) < d.hangSpeed) g *= t.hangMul;
    this.fluttering = t.flutter > 0 && !this.grounded && this.vy > 0 && held && this.flutterLeft > 0;
    const vy0 = this.vy;
    let vy1 = vy0 + g * dt;
    if (this.fluttering) {
      this.flutterLeft -= dt;
      if (vy1 > t.flutterFall) vy1 = vy0 > t.flutterFall ? Math.max(t.flutterFall, vy0 - 50 * dt) : t.flutterFall;
    }
    if (vy1 > t.maxFall) vy1 = t.maxFall;
    this.vy = vy1;
    const dy = (vy0 + vy1) * 0.5 * dt; // exact for steady gravity

    // ---------------------------------------------------------------- moving
    const wasGrounded = this.grounded;
    const prevBottom = this.y + this.h;
    const step = moveX(this, this.vx * dt, w.grid, this.vy > -2 ? t.ledgeAssist : 0);
    if (step === MOVE.WALL) this.vx = 0;
    else if (step === MOVE.STEPPED && this.vy > 0) this.vy = 0;

    const r = moveY(this, dy, w.grid, { dropThrough: this.dropTimer > 0, corner: t.corner }, this.out);
    const platform = !r.landed && dy > 0 && this.dropTimer <= 0 ? this.landOnPlatform(w.landables || w.platforms, prevBottom) : null;
    if (r.ceiling && this.vy < 0) {
      this.vy = 0;
      this.jumping = false;
      ev.emit('bonk', this);
    }
    if (r.landed || platform || step === MOVE.STEPPED) {
      if (r.landed && r.tile === T.BOUNCE) this.bounce(d, ev);
      else {
        if (!wasGrounded) ev.emit('land', { x: this.cx, y: this.feet, speed: vy1 });
        this.vy = 0;
        this.grounded = true;
        this.ground = platform ? T.ONEWAY : r.landed ? r.tile : T.SOLID;
        this.riding = platform;
        this.jumping = false;
        this.assistJump = false;
        this.carryVx = 0;
      }
    } else {
      this.grounded = false;
      this.riding = null;
      this.ground = T.EMPTY;
    }

    // A safe spot to bring him back to after a pit: solid ground under both feet.
    if (this.grounded && !this.riding && this.ground !== T.BOUNCE && fullySupported(this, w.grid)) {
      this.safeX = this.x;
      this.safeY = this.y;
      this.lastRaft = null;
    }
    if (this.y > w.grid.h + 0.5 || (w.inWater && w.inWater(this))) {
      if (w.fellInPit) w.fellInPit(this);
      else this.startRescue(w, this.safeX, this.safeY, w.tune.rescueTime, 'pit');
    }
  }

  // A gap or a wall just ahead (within 1.5 tiles) in the direction he faces.
  gapAhead(w) {
    const feet = Math.floor(this.y + this.h + 0.02);
    for (let k = 0; k < 2; k++) {
      const col = Math.floor(this.facing > 0 ? this.x + this.w + 0.3 + k * 0.7 : this.x - 0.3 - k * 0.7);
      if (isSolid(tileAt(w.grid, col, feet - 1))) return true;
      let ground = false;
      for (let cy = feet; cy <= feet + 3; cy++) if (isStandable(tileAt(w.grid, col, cy))) ground = true;
      if (!ground) return true;
    }
    return false;
  }

  jump(d, ev, mul = 1) {
    this.vy = -d.jumpVel * mul;
    this.jumping = true;
    this.grounded = false;
    this.coyote = 0;
    this.buffer = 0;
    this.riding = null;
    ev.emit('jump', { x: this.cx, y: this.feet });
  }

  bounce(d, ev) {
    this.carryVx = 0;
    this.vy = -d.bounceVel;
    this.jumping = false;
    this.grounded = false;
    this.coyote = 0;
    this.riding = null;
    ev.emit('bounce', { x: this.cx, y: this.feet });
  }

  // Moving platforms are one-way: they catch feet coming down onto them.
  landOnPlatform(platforms, prevBottom) {
    const bottom = this.y + this.h;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (this.x + this.w <= p.x || this.x >= p.x + p.w) continue;
      const top = p.y;
      if (prevBottom <= Math.max(top, top - p.dy) + PLATFORM_SLACK && bottom >= top) {
        this.y = top - this.h;
        return p;
      }
    }
    return null;
  }

  // Auto-Go (Kid Mode, one button): walk right by himself, but stop at a wall or a gap and wait
  // for a jump. A short step down (3 tiles or less) is just walked off.
  autoGo(w) {
    // On a moving raft: stand still, and ask for a jump only when a rock is coming.
    const raft = this.riding && this.riding.kind === 'raft' && !this.riding.done ? this.riding : null;
    if (raft) {
      const y0 = Math.floor(this.y + 0.05);
      const y1 = Math.floor(this.y + this.h - 0.05);
      for (let k = 0.2; k <= 0.95; k += 0.25) {
        const col = Math.floor(this.x + this.w + k);
        for (let cy = y0; cy <= y1; cy++) if (isSolid(tileAt(w.grid, col, cy))) this.waiting = true;
      }
      return 0;
    }
    // Standing on a river rock: step back onto the raft as it passes under; if it has already gone
    // by, jump after it; if it hasn't come yet, just wait.
    const lr = this.lastRaft;
    if (lr && lr.started && !lr.done && this.grounded && !this.riding) {
      if (lr.x <= this.x + this.w + 0.2 && lr.x + lr.w >= this.x + this.w + 0.4) return 1;
      if (lr.x > this.x + this.w + 0.2) this.waiting = true;
      return 0;
    }
    // A shockwave coming: wait (the hint says jump!).
    if (w.waveNear && w.waveNear(this)) this.waiting = true;
    // Near the boss or a mini-boss: keep a few tiles away and let the Pop-Pack do the work.
    const foe = w.bigFoe && w.bigFoe(this);
    if (foe) {
      if (!this.grounded) return 0;
      const gap = foe.cx - this.cx;
      if (Math.abs(gap) > 4.5) return Math.sign(gap);
      if (Math.abs(gap) < 3) return -Math.sign(gap) || -1;
      return 0;
    }
    if (!this.grounded) return 1;
    const grid = w.grid;
    const stop = (this.vx * this.vx) / (2 * w.derived.decel);
    const col = Math.floor(this.x + this.w + 0.12 + stop);
    const y0 = Math.floor(this.y + 0.01);
    const y1 = Math.floor(this.y + this.h - 0.01);
    for (let cy = y0; cy <= y1; cy++) {
      if (isSolid(tileAt(grid, col, cy))) {
        this.waiting = true;
        return 0;
      }
    }
    const feet = Math.floor(this.y + this.h + 0.02);
    for (let cy = feet; cy <= feet + 3; cy++) if (isStandable(tileAt(grid, col, cy))) return 1;
    // A raft, log or ice block there counts as ground too.
    for (const p of w.landables || w.platforms) {
      if (p === this.riding && p.kind !== 'raft') continue;
      if (col + 0.5 >= p.x && col + 0.5 <= p.x + p.w && p.y >= this.feet - 0.1 && p.y <= this.feet + 3) return 1;
    }
    this.waiting = true;
    return 0;
  }

  // Float in a bubble to (tx, ty). kind: 'pit' (back to safe ground) or 'faint' (out of hearts,
  // back to the checkpoint).
  // follow: a raft to float back onto (it keeps moving, so the bubble follows it).
  startRescue(w, tx, ty, dur, kind = 'pit', follow = null) {
    this.state = 'rescue';
    this.stateTime = 0;
    this.rescue = { fx: this.x, fy: Math.min(this.y, w.grid.h - 0.5), tx, ty, t: 0, dur, kind, follow };
    this.carryVx = 0;
    this.airJumps = 0;
    this.hurtLock = 0;
    this.assistJump = false;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.riding = null;
    this.jumping = false;
    this.fluttering = false;
    this.buffer = 0;
    w.events.emit('rescue', this.rescue);
  }

  updateRescue(w, dt) {
    const r = this.rescue;
    r.t += dt;
    if (r.follow) {
      r.tx = r.follow.x + r.follow.w / 2 - this.w / 2;
      r.ty = r.follow.y - this.h;
    }
    const k = smoothstep(Math.min(1, r.t / r.dur));
    this.x = lerp(r.fx, r.tx, k);
    this.y = lerp(r.fy, r.ty, k) - Math.sin(k * Math.PI) * 1.5;
    if (r.t < r.dur) return;
    this.state = 'play';
    this.stateTime = 0;
    this.x = r.tx;
    this.y = r.ty;
    this.rescue = null;
    this.invuln = w.tune.invuln;
    w.events.emit('respawn', this);
  }
}
