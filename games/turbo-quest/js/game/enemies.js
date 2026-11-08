// Grumbly behaviors, built from content/enemies.js. Each Grumbly runs one movement behavior
// (walk, hop, fly, spit, charge) with its mode's numbers. They only act near the camera. No DOM.
//
// A Grumbly can be:
//   alive and grumpy
//   bubbled (Bubble Cannon): floats up for a few seconds; touching the bubble pops it, landing on
//     it bounces you high. Either way the Grumbly is cheered.
//   frozen (Frosty Ray): an ice block for a few seconds. Stand on it, or walk into its side to
//     kick it sliding: it cheers every Grumbly it hits and shatters (cheered) at a wall.
//   cheered: gone from play; the world turns it into a balloon that floats away.
// Some carry a pot-lid shield that blocks shots from the front (world/weapons decide). The
// mini-boss (def.boss) takes several hits, with a moment of safety after each.
import { ENEMIES } from '../content/enemies.js';
import { moveX, moveY, MOVE, tileAt, isStandable } from '../engine/collide.js';

const GRAVITY = 40;
const KICK_SPEED = 9;

export class Enemy {
  constructor(spawn, mode) {
    const def = ENEMIES[spawn.kind];
    this.kind = spawn.kind;
    this.id = spawn.id;
    this.section = spawn.section;
    this.def = def;
    this.mode = mode;
    this.p = { ...def[mode], ...(spawn.params || {}) };
    this.w = def.w;
    this.h = def.h;
    this.x = spawn.x - def.w / 2;
    this.y = spawn.y - def.h;
    this.homeX = this.x;
    this.homeY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.dx = 0;
    this.dy = 0;
    this.facing = -1;
    this.hp = this.p.hp ?? def.hp;
    this.maxHp = this.hp;
    this.shield = !!def.shield;
    this.shieldHits = this.p.shieldHits || 0;
    this.alive = true;
    this.state = 'idle';
    this.t = 0;
    this.stateT = 0;
    this.grounded = false;
    this.bubbled = 0;
    this.frozen = 0;
    this.sliding = 0;
    this.flash = 0;
    this.safe = 0; // the mini-boss's moment of safety after a hit
    this.hopIndex = 0;
    this.turnT = 0;
    this.slamT = this.p.slam || 0;
    this.shotsLeft = 0;
    this.gapT = 0;
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

  get isBoss() {
    return !!this.def.boss;
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  update(w, dt) {
    const x0 = this.x;
    const y0 = this.y;
    this.t += dt;
    this.stateT += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.safe > 0) this.safe -= dt;
    if (this.frozen > 0) this.updateFrozen(w, dt);
    else if (this.bubbled > 0) this.updateBubbled(w, dt);
    else {
      const slow = w.enemySlow || 1;
      const move = this.def.move;
      if (move === 'walk') this.walk(w, dt * slow);
      else if (move === 'hop') this.hop(w, dt * slow);
      else if (move === 'spit') this.spit(w, dt * slow);
      else if (move === 'charge') this.charge(w, dt * slow);
      else this.fly(w, dt * slow);
    }
    this.dx = this.x - x0;
    this.dy = this.y - y0;
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
    // Shield Bonkers in Dad Mode turn to keep their lid toward Turbo.
    if (p.faceYou && Math.abs(pl.cx - this.cx) < p.faceYou && Math.abs(pl.feet - (this.y + this.h)) < 3) {
      const want = pl.cx < this.cx ? -1 : 1;
      if (want !== this.facing) {
        this.turnT += dt;
        if (this.turnT > 0.4) {
          this.facing = want;
          this.turnT = 0;
        }
      } else this.turnT = 0;
    }
    // The mini-boss hops and slams the ground every so often.
    if (p.slam && this.slamUpdate(w, dt)) return;
    this.vx = this.facing * speed;
    this.fall(w, dt);
    const hit = moveX(this, this.vx * dt, w.grid);
    if (hit === MOVE.WALL) this.turn();
    else if (this.grounded && p.turnAtLedges && !this.groundAhead(w)) this.turn();
  }

  // Returns true while the slam is happening (it replaces walking).
  slamUpdate(w, dt) {
    const p = this.p;
    if (this.state === 'slamAir') {
      const landed = this.fall(w, dt);
      if (landed) {
        this.setState('idle');
        this.slamT = p.slam;
        w.slam(this);
      }
      return true;
    }
    if (this.grounded) this.slamT -= dt;
    if (this.slamT <= 0 && this.grounded && Math.abs(w.player.cx - this.cx) < 12) {
      this.vx = 0;
      this.vy = -Math.sqrt(2 * GRAVITY * p.slamHop);
      this.grounded = false;
      this.setState('slamAir');
      w.events.emit('hop', this);
      return true;
    }
    return false;
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
    if (this.y > w.grid.h + 2 || w.inWater(this)) this.alive = false; // fell out of the level: gone quietly
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

  // ---------------------------------------------------------------------------- spitters
  spit(w, dt) {
    const p = this.p;
    const pl = w.player;
    this.facing = pl.cx < this.cx ? -1 : 1;
    this.vx = 0;
    this.fall(w, dt);
    const dx = pl.cx - this.cx;
    const inRange = Math.abs(dx) < p.range && Math.abs(pl.y + pl.h / 2 - this.cy) < 6 && pl.state === 'play';
    if (this.state === 'idle') {
      if (this.stateT >= p.interval && inRange) {
        this.setState('puff');
        w.events.emit('puff', this);
      }
    } else if (this.state === 'puff') {
      if (this.stateT >= p.puff) {
        this.setState('spitting');
        this.shotsLeft = p.shots;
        this.gapT = 0;
      }
    } else if (this.state === 'spitting') {
      this.gapT -= dt;
      if (this.gapT <= 0) {
        const mx = this.cx + this.facing * 0.45;
        const my = this.y + 0.42;
        let vx = this.facing * p.speed;
        let vy = 0;
        if (p.aim) {
          const tx = pl.cx - mx;
          const ty = pl.y + pl.h * 0.5 - my;
          const d = Math.hypot(tx, ty) || 1;
          vx = (tx / d) * p.speed;
          vy = (ty / d) * p.speed;
        }
        w.spawnEnemyShot({ x: mx, y: my, vx, vy, kind: 'seed', r: this.mode === 'kid' ? 0.32 : 0.24, life: 3.5 });
        w.events.emit('spit', this);
        this.shotsLeft--;
        this.gapT = p.gap;
        if (this.shotsLeft <= 0) this.setState('idle');
      }
    }
  }

  // ---------------------------------------------------------------------------- chargers
  charge(w, dt) {
    const p = this.p;
    const pl = w.player;
    if (!p.charge) {
      this.walk(w, dt);
      return;
    }
    let speed = 0;
    if (this.state === 'idle' || this.state === 'patrol') {
      speed = p.speed;
      const dx = pl.cx - this.cx;
      const level = Math.abs(pl.feet - (this.y + this.h)) < 1.5;
      if (level && Math.abs(dx) < p.range && pl.state === 'play') {
        this.facing = dx < 0 ? -1 : 1;
        this.setState('paw');
        w.events.emit('paw', this);
        speed = 0;
      }
    } else if (this.state === 'paw') {
      if (this.stateT >= p.paw) this.setState('rush');
    } else if (this.state === 'rush') {
      speed = p.chargeSpeed;
    } else if (this.state === 'dizzy') {
      if (this.stateT >= p.dizzy) this.setState('idle');
    }
    this.vx = this.facing * speed;
    this.fall(w, dt);
    const hit = moveX(this, this.vx * dt, w.grid);
    if (this.state === 'rush') {
      if (hit === MOVE.WALL || (this.grounded && !this.groundAhead(w))) {
        this.setState('dizzy');
        w.events.emit('bonk', this);
      }
    } else if (hit === MOVE.WALL) this.turn();
    else if (this.grounded && p.turnAtLedges && !this.groundAhead(w)) this.turn();
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
    } else {
      // 'return' (also after a bubble or ice): back to the flight path
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

  // ------------------------------------------------------------------------------- ice
  // Returns false for things that can't be frozen (the mini-boss).
  freeze(seconds) {
    if (this.isBoss) return false;
    this.frozen = seconds;
    this.sliding = 0;
    this.bubbled = 0;
    this.vx = 0;
    this.vy = 0;
    this.setState('frozen');
    return true;
  }

  kick(dir) {
    this.sliding = dir;
    this.frozen = Math.max(this.frozen, 2);
  }

  updateFrozen(w, dt) {
    this.fall(w, dt);
    if (this.sliding) {
      const hit = moveX(this, this.sliding * KICK_SPEED * dt, w.grid);
      if (hit === MOVE.WALL) w.cheer(this, 'shatter');
      return;
    }
    this.frozen -= dt;
    if (this.frozen <= 0) {
      this.frozen = 0;
      this.setState(this.def.move === 'fly' ? 'return' : 'idle');
      w.events.emit('thaw', this);
    }
  }
}
