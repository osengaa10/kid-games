// One level being played: tiles, Turbo, Grumblies, the boss, shots, balloons, pickups,
// checkpoints, the goal, and the rules that connect them. It only changes state and emits
// events; drawing and sound listen. No DOM.
import { Events } from '../engine/events.js';
import { Pool } from '../engine/pool.js';
import { T, tileAt, setTile, isStandable, isSolid } from '../engine/collide.js';
import { parseLevel, movePlatform, sectionAt } from './level.js';
import { Player } from './player.js';
import { derive } from './tuning.js';
import { Enemy } from './enemies.js';
import { TikiBoss } from './boss.js';
import { Gun, makeShots, updateGun, updateShots, giveWeapon } from './weapons.js';
import { Combo, medalFor } from './combo.js';
import { HEARTS, POWERUPS, POINTS, ABILITIES } from '../content/powerups.js';

const STAR_CHAIN_GAP = 0.7; // stars collected closer together than this climb the scale
const ACTIVE_RANGE = 16; // Grumblies further than this from Turbo wait
const TIMED = ['giant', 'zoom', 'magnet']; // one at a time

export class World {
  // opts: { mode: 'kid' | 'dad', tune, autoGo, settings: { autoFire, aimAssist }, resume, events,
  //         abilities: { doubleJump }, treats: [ids of Heart Treats already eaten] }
  constructor(def, opts) {
    this.def = def;
    this.events = opts.events || new Events();
    this.mode = opts.mode === 'dad' ? 'dad' : 'kid';
    this.settings = { autoFire: false, aimAssist: true, ...(opts.settings || {}) };
    this.abilities = { ...(opts.abilities || {}) };
    this.doubleJumpHeight = ABILITIES.doubleJump.height[this.mode];
    this.level = parseLevel(def, this.mode);
    this.grid = this.level.grid;
    this.platforms = this.level.platforms;
    this.landables = [...this.platforms];
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.player.gun = new Gun();
    const treats = new Set(opts.treats || []);
    this.treats = [...treats];
    this.player.maxHearts = Math.min(HEARTS.max, HEARTS[this.mode] + (this.mode === 'dad' ? treats.size : 0));
    this.player.hearts = this.player.maxHearts;
    this.stars = this.level.stars.map((s, i) => ({ x: s.x, y: s.y, i, id: s.id, homing: false, speed: 0, got: false }));
    this.items = this.level.items.map((it) => ({ ...it, got: it.kind === 'treat' && treats.has(it.id), t: 0, vy: 0, life: 0, noPickup: 0 }));
    this.enemies = this.level.enemies.map((s) => new Enemy(s, this.mode));
    this.arena = this.level.arena;
    this.boss = this.level.boss ? new TikiBoss(this.level.boss, this.mode, this.arena) : null;
    this.decor = this.level.decor;
    this.balloons = [];
    this.shots = makeShots();
    this.enemyShots = new Pool(() => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 0.3, kind: 'seed', gravity: 0, h: 0 }), 40);
    this.combo = new Combo(this.mode);
    this.gemCount = this.items.filter((i) => i.kind === 'gem').length;
    this.gems = [false, false, false];
    this.starsGot = 0;
    this.chain = 0;
    this.lastStar = -9;
    this.time = 0;
    this.checkpoint = 0;
    this.won = false;
    this.wonAt = 0;
    this.rescues = 0;
    this.hits = 0;
    this.faints = 0;
    this.shotsFired = 0;
    this.cheered = [];
    this.kindsCheered = new Set();
    this.regen = 0;
    this.enemySlow = 1;
    this.jumpHeld = false;
    this.inArena = false;
    this.goalOpenAt = this.boss || this.level.goalAfter ? Infinity : -99; // when the goal appeared
    this.bossBeaten = false;
    this.minibossBeaten = false;
    this.rescueSpots = [];
    this.sectionStats = this.level.sections.map(() => ({ time: 0, hits: 0, rescues: 0, helps: 0 }));
    this.setMode(this.mode, opts.tune, opts.autoGo);
    if (opts.resume) this.applyResume(opts.resume);
  }

  // New tuning (or Auto-Go on/off) while playing. Switching Kid/Dad needs a new World.
  setMode(mode, tune, autoGo = false) {
    this.tune = tune;
    this.derived = derive(tune);
    this.autoGo = !!autoGo && this.mode === 'kid';
  }

  step(input, dt) {
    this.time += dt;
    const p = this.player;
    this.jumpHeld = input.jump;
    const sec = sectionAt(this.level, p.x);
    this.sectionStats[sec].time += dt;
    for (let i = 0; i < this.platforms.length; i++) movePlatform(this.platforms[i], dt);
    // Rafts start floating once Turbo stands on them.
    if (p.riding && p.riding.kind === 'raft' && !p.riding.started) {
      p.riding.started = true;
      this.events.emit('raft', p.riding);
    }
    // Ice blocks are platforms too.
    this.landables.length = this.platforms.length;
    for (const e of this.enemies) if (e.alive && e.frozen > 0) this.landables.push(e);
    p.update(input, this, dt);
    if (this.mode === 'kid') this.bumpLeaves(input);
    this.updatePowers(input, dt);
    updateGun(this, input, dt);
    updateShots(this, dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateEnemyShots(dt);
    this.updateBalloons(dt);
    this.updateItems(dt);
    this.updateStars(dt);
    if (this.mode === 'dad') this.touchThorns();
    this.combo.update(dt);
    this.updateCheckpoints();
    this.checkGoal();
  }

  // ------------------------------------------------------------------------------ power-ups
  updatePowers(input, dt) {
    const p = this.player;
    const ev = this.events;
    if (p.giant > 0) {
      p.giant -= dt;
      if (p.giant <= 0) ev.emit('giantEnd', p);
      else this.giantSmash();
    }
    for (const k of ['zoom', 'magnet']) {
      if (p[k] > 0) {
        p[k] -= dt;
        if (p[k] <= 0) ev.emit(`${k}End`, p);
      }
    }
    if (p.turbo > 0) {
      p.turbo -= dt;
      if (p.turbo <= 0) ev.emit('turboEnd', p);
    } else if (this.combo.full && p.state === 'play' && (this.mode === 'kid' || input.turboPressed)) this.startTurbo();
    if (this.mode === 'kid' && p.hearts < p.maxHearts && p.state === 'play') {
      this.regen += dt;
      if (this.regen >= HEARTS.regen.kid) {
        this.regen = 0;
        p.hearts++;
        ev.emit('heartBack', p);
      }
    }
  }

  startTurbo() {
    this.player.turbo = POWERUPS.turbo.time;
    this.combo.spendMeter();
    this.events.emit('turbo', this.player);
  }

  // One timed power-up at a time: a new one replaces the old.
  setPower(kind) {
    const p = this.player;
    for (const k of TIMED) if (k !== kind && p[k] > 0) p[k] = 0;
    p[kind] = POWERUPS[kind].time;
  }

  // The box Turbo cheers Grumblies with while giant: as big as he looks.
  bigBox() {
    const p = this.player;
    const s = POWERUPS.giant.scale;
    const w = p.w * s;
    const h = p.h * s;
    return { x: p.cx - w / 2, y: p.feet - h, w, h };
  }

  giantSmash() {
    const b = this.bigBox();
    for (let cy = Math.floor(b.y); cy <= Math.floor(b.y + b.h); cy++) {
      for (let cx = Math.floor(b.x - 0.2); cx <= Math.floor(b.x + b.w + 0.2); cx++) if (tileAt(this.grid, cx, cy) === T.BREAK) this.breakTile(cx, cy);
    }
  }

  // Kid Mode: walking into a leafy wall pushes right through it (his Pop-Pack only aims at
  // Grumblies, so he'd never shoot it).
  bumpLeaves(input) {
    const p = this.player;
    if (p.state !== 'play' || !p.grounded) return;
    const dir = this.autoGo ? 1 : Math.sign(input.mx);
    if (!dir) return;
    const col = Math.floor(dir > 0 ? p.x + p.w + 0.05 : p.x - 0.05);
    for (let cy = Math.floor(p.y + 0.05); cy <= Math.floor(p.feet - 0.05); cy++) if (tileAt(this.grid, col, cy) === T.BREAK) this.breakTile(col, cy);
  }

  breakTile(cx, cy) {
    setTile(this.grid, cx, cy, T.EMPTY);
    this.events.emit('break', { x: cx + 0.5, y: cy + 0.5 });
  }

  // Is this box's feet in the river?
  inWater(b) {
    const feet = b.y + b.h;
    const row = Math.floor(feet - 0.35);
    const col = Math.floor(b.x + b.w / 2);
    return tileAt(this.grid, col, row) === T.WATER;
  }

  // --------------------------------------------------------------------------- Grumblies
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive || Math.abs(e.cx - p.cx) > ACTIVE_RANGE) continue;
      e.update(this, dt);
      if (!e.alive) continue;
      if (e.sliding) this.iceHits(e);
      this.touchEnemy(e);
    }
  }

  // A kicked ice block cheers every Grumbly it slides into.
  iceHits(ice) {
    for (const e of this.enemies) {
      if (e === ice || !e.alive || e.isBoss) continue;
      if (ice.x + ice.w <= e.x || ice.x >= e.x + e.w || ice.y + ice.h <= e.y || ice.y >= e.y + e.h) continue;
      this.cheer(e, 'kick');
    }
  }

  touchEnemy(e) {
    const p = this.player;
    if (p.state !== 'play') return;
    const big = p.giant > 0;
    const b = big ? this.bigBox() : p;
    if (b.x + b.w <= e.x || b.x >= e.x + e.w || b.y + b.h <= e.y || b.y >= e.y + e.h) return;
    const fromAbove = p.vy > 0 && p.prevFeet <= e.y + 0.45;
    if (e.frozen > 0) {
      // Ice: stand on it (the landing code does that), or walk into its side to kick it.
      if (!e.sliding && p.grounded && p.riding !== e && Math.abs(p.feet - (e.y + e.h)) < 0.3) {
        const dir = p.cx < e.cx ? 1 : -1;
        e.kick(dir);
        this.events.emit('kick', e);
      }
      return;
    }
    if (e.bubbled) {
      if (fromAbove) {
        this.cheer(e, 'bounce');
        p.springUp(this, this.tune.bubbleBounce);
      } else this.cheer(e, 'pop');
      return;
    }
    if (e.isBoss) {
      if (fromAbove) {
        this.damageBoss(e, 1);
        p.springUp(this, this.jumpHeld ? this.tune.stompHigh : this.tune.stompLow);
        return;
      }
      if (p.turbo > 0 || big) {
        this.damageBoss(e, 1);
        return;
      }
    } else {
      if (p.turbo > 0 || big) {
        this.cheer(e, big ? 'giant' : 'turbo');
        return;
      }
      if (fromAbove && e.def.stompable) {
        this.cheer(e, 'stomp');
        p.springUp(this, this.jumpHeld ? this.tune.stompHigh : this.tune.stompLow);
        return;
      }
    }
    if (this.hurtboxTouches(e.x + 0.08, e.y + 0.08, e.w - 0.16, e.h - 0.13)) this.hurtPlayer(e.cx, e.kind);
  }

  // The forgiving part: only the middle of Turbo can be touched.
  hurtboxTouches(x, y, w, h) {
    const p = this.player;
    const k = this.tune.hurtbox;
    const hw = p.w * k;
    const hh = p.h * k;
    const hx = p.cx - hw / 2;
    const hy = p.feet - hh - (p.h - hh) * 0.3;
    return !(hx + hw <= x || hx >= x + w || hy + hh <= y || hy >= y + h);
  }

  // A shot hit a shield's front: clang. In Kid Mode the lid falls off after a few.
  blockShot(e, s) {
    this.events.emit('blocked', { x: s.x, y: s.y, e });
    if (e.shieldHits > 0) {
      e.shieldHits--;
      if (e.shieldHits === 0) {
        e.shield = false;
        this.events.emit('shieldBreak', e);
      }
    }
  }

  // The mini-boss takes hits one at a time, with a moment of safety after each.
  damageBoss(e, dmg) {
    if (e.safe > 0) return;
    e.hp -= dmg;
    e.flash = 0.2;
    e.safe = 0.6;
    this.events.emit('enemyHit', e);
    if (e.hp <= 0) {
      this.minibossBeaten = true;
      this.combo.add(POINTS.miniboss);
      this.cheer(e, 'boss');
      if (this.level.goalAfter === 'miniboss') {
        this.goalOpenAt = this.time;
        this.events.emit('goalAppear', this.level.goal);
      }
    }
  }

  // The mini-boss lands: shockwaves both ways.
  slam(e) {
    const y = e.y + e.h;
    this.spawnWave(e.cx - e.w / 2, y, -1, e.p.waveSpeed);
    this.spawnWave(e.cx + e.w / 2, y, 1, e.p.waveSpeed);
    this.events.emit('slam', { x: e.cx, y, big: false });
  }

  // A Grumbly cheered up: it turns into a balloon that floats away.
  cheer(e, how) {
    if (!e.alive) return;
    e.alive = false;
    e.bubbled = 0;
    e.frozen = 0;
    this.cheered.push(e.id);
    const first = !this.kindsCheered.has(e.kind);
    this.kindsCheered.add(e.kind);
    const points = this.combo.cheer(how);
    this.balloons.push({ x: e.cx, y: e.cy, kind: e.kind, t: 0, life: 1.8, big: e.isBoss });
    this.events.emit('cheer', { x: e.cx, y: e.cy, kind: e.kind, how, chain: this.combo.chain, points, first, boss: e.isBoss });
  }

  // -------------------------------------------------------------------------------- boss
  updateBoss(dt) {
    const b = this.boss;
    const p = this.player;
    if (this.arena && !this.inArena && p.x > this.arena.x0 + 0.5) {
      this.inArena = true;
      this.events.emit('arena', this.arena);
    }
    if (!b || !b.alive) return;
    b.update(this, dt);
    if (p.state !== 'play' || b.state === 'sleep' || b.state === 'wake') return;
    if (p.x + p.w <= b.x || p.x >= b.x + b.w || p.y + p.h <= b.y || p.y >= b.y + b.h) return;
    const fromAbove = p.vy > 0 && p.prevFeet <= b.y + 0.5;
    if (fromAbove) {
      // A stomp on the top block: a hit while it's dizzy, a harmless bounce otherwise.
      if (b.vulnerable) this.hitBoss();
      else this.events.emit('blocked', { x: p.cx, y: p.feet });
      p.springUp(this, this.tune.stompHigh);
      return;
    }
    if (p.turbo > 0) return;
    if (this.hurtboxTouches(b.x + 0.1, b.y + 0.1, b.w - 0.2, b.h - 0.1)) this.hurtPlayer(b.cx);
  }

  hitBoss() {
    const b = this.boss;
    if (!b || !b.vulnerable) return;
    const top = { x: b.cx, y: b.y + 0.45 };
    b.hit(this);
    this.combo.cheer('shot');
    this.balloons.push({ x: top.x, y: top.y, kind: 'tiki', t: 0, life: 2.2, big: true });
    if (!b.alive) {
      this.bossBeaten = true;
      this.combo.add(POINTS.boss);
      this.kindsCheered.add('tiki');
      this.goalOpenAt = this.time;
      this.events.emit('bossDefeated', b);
      this.events.emit('goalAppear', this.level.goal);
    }
  }

  bossLanded(b) {
    const y = b.y + b.h;
    this.spawnWave(b.x, y, -1, b.p.wave);
    this.spawnWave(b.x + b.w, y, 1, b.p.wave);
    for (let i = 0; i < b.coconuts; i++) {
      const dir = i % 2 ? 1 : -1;
      this.spawnEnemyShot({ x: b.cx, y: b.y + 0.3, vx: dir * (3 + i), vy: -9, kind: 'coconut', r: 0.3, life: 3, gravity: 24 });
    }
    this.events.emit('slam', { x: b.cx, y, big: true });
  }

  // ------------------------------------------------------------------------ enemy shots
  spawnEnemyShot(o) {
    const s = this.enemyShots.alloc();
    if (!s) return null;
    s.x = o.x;
    s.y = o.y;
    s.vx = o.vx || 0;
    s.vy = o.vy || 0;
    s.life = o.life || 3;
    s.r = o.r || 0.3;
    s.kind = o.kind || 'seed';
    s.gravity = o.gravity || 0;
    s.h = o.h || 0;
    return s;
  }

  // A shockwave rolling along the floor from x (feet height y) in direction dir.
  spawnWave(x, y, dir, speed) {
    this.spawnEnemyShot({ x, y: y - 0.3, vx: dir * speed, kind: 'wave', r: 0.3, life: 4, h: 0.6 });
  }

  updateEnemyShots(dt) {
    const pool = this.enemyShots;
    const p = this.player;
    for (let i = pool.count - 1; i >= 0; i--) {
      const s = pool.items[i];
      s.life -= dt;
      if (s.gravity) s.vy += s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let gone = s.life <= 0;
      if (s.kind === 'wave') {
        // Rolls along the floor; stops at a wall or the end of the floor.
        const ahead = Math.floor(s.x + Math.sign(s.vx) * 0.3);
        const row = Math.floor(s.y + 0.3);
        if (isSolid(tileAt(this.grid, ahead, Math.floor(s.y))) || !isStandable(tileAt(this.grid, ahead, row))) gone = true;
      } else if (isSolid(tileAt(this.grid, Math.floor(s.x), Math.floor(s.y)))) gone = true;
      if (gone) {
        this.events.emit('enemyShotEnd', s);
        pool.free(i);
        continue;
      }
      if (p.state !== 'play') continue;
      const hit = s.kind === 'wave' ? this.hurtboxTouches(s.x - 0.25, s.y - 0.3, 0.5, 0.6) : this.hurtboxTouches(s.x - s.r * 0.8, s.y - s.r * 0.8, s.r * 1.6, s.r * 1.6);
      if (hit && this.hurtPlayer(s.x)) {
        if (s.kind !== 'wave') pool.free(i);
      }
    }
  }

  // Is a shockwave coming at Turbo (for Auto-Go's jump hint in a boss fight)?
  waveNear(p) {
    const pool = this.enemyShots;
    for (let i = 0; i < pool.count; i++) {
      const s = pool.items[i];
      if (s.kind !== 'wave') continue;
      const d = p.cx - s.x;
      if (Math.sign(d) === Math.sign(s.vx) && Math.abs(d) < 2.6 && Math.abs(p.feet - (s.y + 0.3)) < 0.5) return true;
    }
    return false;
  }

  updateBalloons(dt) {
    const p = this.player;
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.t += dt;
      b.y -= Math.min(1.8, 0.6 + b.t * 1.5) * dt;
      b.x += Math.sin(b.t * 3) * 0.25 * dt;
      // One bounce: land on top of it.
      const top = b.y - 0.45;
      if (p.state === 'play' && p.vy > 0 && Math.abs(p.cx - b.x) < 0.7 && p.prevFeet <= top + 0.2 && p.feet >= top - 0.1) {
        p.springUp(this, this.tune.balloonBounce);
        this.combo.bounce();
        this.events.emit('balloonBounce', b);
        this.balloons.splice(i, 1);
        continue;
      }
      if (b.t >= b.life) {
        this.events.emit('balloonPop', b);
        this.balloons.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------------------- hurting
  hurtPlayer(fromX) {
    const p = this.player;
    if (p.state !== 'play' || p.invuln > 0 || p.turbo > 0) return false;
    const ev = this.events;
    if (p.shield > 0) {
      p.shield--;
      p.invuln = 1;
      p.knockback(fromX);
      ev.emit('shieldHit', p);
      return true;
    }
    p.hearts--;
    this.hits++;
    this.regen = 0;
    const sec = sectionAt(this.level, p.x);
    this.sectionStats[sec].hits++;
    if (this.mode === 'dad') {
      p.gun.level = Math.max(1, p.gun.level - 1);
      this.combo.reset();
    } else if (this.sectionStats[sec].hits >= 3) this.enemySlow = 0.8; // Kid help: slower Grumblies
    p.knockback(fromX);
    p.invuln = this.tune.invuln;
    ev.emit('hurt', p);
    if (p.hearts <= 0) this.faint();
    return true;
  }

  // Out of hearts: float back to the checkpoint in a bubble, hearts full. Nothing else is lost
  // (in Dad Mode a boss is whole again).
  faint() {
    const p = this.player;
    const cp = this.level.checkpoints[this.checkpoint];
    this.faints++;
    this.combo.reset();
    p.startRescue(this, cp.x, cp.y, this.mode === 'kid' ? 1.6 : 0.7, 'faint');
    p.hearts = p.maxHearts;
    p.shield = 0;
    p.lastRaft = null;
    this.resetRafts(cp.x);
    if (this.mode === 'dad' && this.boss && this.boss.alive && this.inArena) this.boss.reset();
    this.events.emit('faint', p);
  }

  // Called by the player when he falls out of the level or into the river.
  fellInPit(p) {
    this.rescues++;
    const sec = sectionAt(this.level, p.x);
    this.sectionStats[sec].rescues++;
    const water = this.inWater(p);
    if (water) this.events.emit('splash', { x: p.cx, y: p.feet });
    if (this.mode === 'dad') {
      p.hearts--;
      this.hits++;
      this.combo.reset();
      if (p.hearts <= 0) {
        this.faint();
        return;
      }
    } else if (!p.lastRaft) this.kidHelp(p);
    const raft = p.lastRaft;
    if (raft && raft.started && !raft.done) p.startRescue(this, raft.x, raft.y - p.h, this.tune.rescueTime, 'pit', raft);
    else p.startRescue(this, p.safeX, p.safeY, this.tune.rescueTime, 'pit');
  }

  // Kid help: falling into the same gap twice lays a rope bridge across it.
  kidHelp(p) {
    const spot = this.rescueSpots.find((s) => Math.abs(s.x - p.safeX) < 3 && Math.abs(s.y - p.safeY) < 1);
    if (!spot) {
      this.rescueSpots.push({ x: p.safeX, y: p.safeY, n: 1 });
      return;
    }
    if (++spot.n !== 2) return;
    const row = Math.round(p.safeY + p.h);
    const dir = p.x >= p.safeX ? 1 : -1;
    let col = Math.floor(dir > 0 ? p.safeX + p.w + 0.1 : p.safeX - 0.1);
    while (isStandable(tileAt(this.grid, col, row)) && Math.abs(col - p.safeX) < 4) col += dir;
    const start = col;
    while (!isStandable(tileAt(this.grid, col, row)) && Math.abs(col - start) <= 6) col += dir;
    if (Math.abs(col - start) > 6 || !isStandable(tileAt(this.grid, col, row))) return;
    const cols = [];
    for (let c = start; c !== col; c += dir) {
      setTile(this.grid, c, row, T.BRIDGE);
      cols.push(c);
    }
    this.sectionStats[sectionAt(this.level, p.x)].helps++;
    this.events.emit('help', { row, cols });
  }

  touchThorns() {
    const p = this.player;
    if (p.state !== 'play' || p.invuln > 0) return;
    const x0 = Math.floor(p.x + 0.15);
    const x1 = Math.floor(p.x + p.w - 0.15);
    const row = Math.floor(p.feet - 0.2);
    for (let cx = x0; cx <= x1; cx++) {
      if (tileAt(this.grid, cx, row) === T.THORN) {
        this.hurtPlayer(cx + 0.5);
        return;
      }
    }
  }

  // ------------------------------------------------------------------------------- pickups
  updateItems(dt) {
    const p = this.player;
    const reach = this.mode === 'kid' ? 1.0 : 0.75;
    const big = p.giant > 0 ? 1.6 : 1;
    const py = p.y + p.h / 2;
    for (const it of this.items) {
      if (it.got) continue;
      it.t += dt;
      if (it.kind === 'drop') {
        it.life -= dt;
        it.noPickup -= dt;
        it.y += it.vy * dt;
        it.vy *= 1 - 2.5 * dt;
        if (it.life <= 0) {
          it.got = true;
          this.events.emit('dropGone', it);
          continue;
        }
        if (it.noPickup > 0) continue;
      }
      if (p.state !== 'play') continue;
      if (Math.hypot(p.cx - it.x, py - it.y) < reach * big) this.collect(it);
    }
  }

  collect(it) {
    const p = this.player;
    const ev = this.events;
    it.got = true;
    switch (it.kind) {
      case 'gem':
        this.gems[it.gem - 1] = true;
        this.combo.add(POINTS.gem);
        ev.emit('gem', it);
        break;
      case 'heart':
        if (p.hearts < p.maxHearts) p.hearts++;
        else this.combo.add(POINTS.heart);
        ev.emit('heart', it);
        break;
      case 'treat':
        // Dad Mode: one more heart for good (up to 5). Kid Mode: hearts filled up.
        if (this.mode === 'dad' && p.maxHearts < HEARTS.max) p.maxHearts++;
        p.hearts = p.maxHearts;
        this.treats.push(it.id);
        ev.emit('treat', it);
        break;
      case 'shield':
        p.shield = POWERUPS.shield.hits[this.mode];
        ev.emit('shield', it);
        break;
      case 'giant':
      case 'zoom':
      case 'magnet':
        this.setPower(it.kind);
        ev.emit(it.kind, it);
        break;
      case 'drop':
        giveWeapon(this, it.weapon, it.level, it.ammo);
        break;
      default:
        giveWeapon(this, it.kind);
    }
  }

  dropWeapon(id, level, ammo) {
    const p = this.player;
    this.items.push({ kind: 'drop', weapon: id, level, ammo, id: `drop${this.time.toFixed(2)}`, x: p.cx - p.facing * 0.9, y: p.y + 0.2, vy: -1.6, life: 6, noPickup: 0.8, t: 0, got: false });
    this.events.emit('drop', { id, level });
  }

  updateStars(dt) {
    const p = this.player;
    const px = p.cx;
    const py = p.y + p.h / 2;
    const reach = Math.max(this.tune.pickupRadius * (p.giant > 0 ? 1.6 : 1), p.magnet > 0 ? POWERUPS.magnet.radius : 0);
    const canGrab = p.state !== 'rescue';
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      if (s.got) continue;
      const dx = px - s.x;
      const dy = py - s.y;
      const dist = Math.hypot(dx, dy);
      if (canGrab && !s.homing && dist < Math.max(reach, 0.75)) {
        s.homing = true;
        s.speed = 7;
      }
      if (!s.homing) continue;
      // Stars that are close fly to Turbo, faster and faster.
      s.speed = Math.min(30, s.speed + 70 * dt);
      const step = s.speed * dt;
      if (dist <= step + 0.4) this.collectStar(s);
      else {
        s.x += (dx / dist) * step;
        s.y += (dy / dist) * step;
      }
    }
  }

  collectStar(s) {
    s.got = true;
    this.starsGot++;
    this.combo.add(POINTS.star);
    this.chain = this.time - this.lastStar < STAR_CHAIN_GAP ? Math.min(this.chain + 1, 14) : 0;
    this.lastStar = this.time;
    this.events.emit('star', { x: s.x, y: s.y, chain: this.chain });
  }

  // ---------------------------------------------------------------- checkpoints and goal
  updateCheckpoints() {
    const p = this.player;
    if (p.state !== 'play' || !p.grounded) return;
    const cps = this.level.checkpoints;
    for (let i = this.checkpoint + 1; i < cps.length; i++) {
      if (p.x < cps[i].x) break;
      this.checkpoint = i;
      this.events.emit('checkpoint', { ...cps[i], index: i });
    }
  }

  // The goal is locked while the boss is still about.
  get goalOpen() {
    return (!this.boss || !this.boss.alive) && (this.level.goalAfter !== 'miniboss' || this.minibossBeaten);
  }

  // The big thing to keep a distance from (Auto-Go): the boss in its arena, or a mini-boss ahead.
  bigFoe(p) {
    if (this.boss && this.boss.alive && this.inArena) return this.boss;
    let best = null;
    for (const e of this.enemies) {
      if (!e.alive || !e.isBoss) continue;
      if (Math.abs(e.cx - p.cx) < 12 && (!best || Math.abs(e.cx - p.cx) < Math.abs(best.cx - p.cx))) best = e;
    }
    return best;
  }

  // Rafts go back to their dock when Turbo goes back to a checkpoint upriver of them.
  resetRafts(x) {
    for (const r of this.platforms) {
      if (r.kind !== 'raft' || !r.started || x > r.x0 + 1) continue;
      r.x = r.x0;
      r.started = false;
      r.done = false;
      this.events.emit('raftBack', r);
    }
  }

  checkGoal() {
    if (this.won || !this.goalOpen) return;
    const p = this.player;
    const g = this.level.goal;
    if (p.state !== 'play') return;
    if (p.x + p.w > g.x + 0.2 && p.x < g.x + 0.8 && p.y < g.y && p.y + p.h > g.y - 5) {
      this.won = true;
      this.wonAt = this.time;
      p.state = 'victory';
      p.stateTime = 0;
      p.turbo = 0;
      this.events.emit('win', { x: g.x + 0.5, y: g.y });
    }
  }

  // Back to the last checkpoint (from the pause menu). Everything collected stays collected.
  toCheckpoint() {
    const cp = this.level.checkpoints[this.checkpoint];
    const p = this.player;
    const gun = p.gun;
    p.reset(cp.x, cp.y);
    p.gun = gun;
    this.resetRafts(cp.x);
    this.events.emit('respawn', p);
  }

  get starsTotal() {
    return this.stars.length;
  }

  // ---------------------------------------------------------------------- results and saving
  results() {
    const noHit = this.hits === 0 && this.faints === 0;
    let score = this.combo.score;
    const time = this.wonAt || this.time;
    const timeBonus = Math.max(0, Math.round(this.level.par - time)) * POINTS.timeBonus;
    score += timeBonus + (noHit ? POINTS.noHit : 0);
    const allGems = this.gemCount > 0 && this.gems.slice(0, this.gemCount).every(Boolean);
    const badges = [];
    if (noHit) badges.push('noHit');
    if (allGems) badges.push('allGems');
    if (this.mode === 'dad' && time <= this.level.par) badges.push('underPar');
    if (this.mode === 'dad' && this.shotsFired === 0) badges.push('pawsOnly');
    return {
      level: this.level.id, mode: this.mode, stars: this.starsGot, starsTotal: this.starsTotal, gems: [...this.gems], gemCount: this.gemCount,
      time, score, timeBonus, noHit, medal: this.mode === 'dad' ? medalFor(score, this.level.medals) : 0,
      cheers: this.combo.cheers, bestChain: this.combo.best, kinds: [...this.kindsCheered], par: this.level.par, badges,
      boss: this.bossBeaten, ability: this.bossBeaten ? 'doubleJump' : null, treats: [...this.treats],
    };
  }

  // What to save at a checkpoint so closing the app mid-level comes back here.
  resumeData() {
    return {
      level: this.level.id, mode: this.mode, checkpoint: this.checkpoint, gems: [...this.gems],
      stars: this.stars.filter((s) => s.got).map((s) => s.id), cheered: [...this.cheered],
      items: this.items.filter((i) => i.got && i.kind !== 'drop').map((i) => i.id), time: this.time, score: this.combo.score,
      bossBlocks: this.boss ? this.boss.blocks : null,
    };
  }

  applyResume(r) {
    if (!r || r.level !== this.level.id) return;
    this.checkpoint = Math.min(r.checkpoint || 0, this.level.checkpoints.length - 1);
    this.gems = [...(r.gems || [false, false, false])];
    const starIds = new Set(r.stars || []);
    for (const s of this.stars) if (starIds.has(s.id)) s.got = true;
    this.starsGot = this.stars.filter((s) => s.got).length;
    const cheered = new Set(r.cheered || []);
    for (const e of this.enemies) if (cheered.has(e.id)) e.alive = false;
    this.cheered = [...cheered];
    const items = new Set(r.items || []);
    for (const it of this.items) if (items.has(it.id)) it.got = true;
    this.time = r.time || 0;
    this.combo.score = r.score || 0;
    if (this.boss && this.mode === 'kid' && r.bossBlocks > 0) {
      // Kid Mode keeps the boss's lost blocks.
      while (this.boss.blocks > r.bossBlocks) this.boss.blocks--, this.boss.y += 0.95;
      this.boss.h = this.boss.blocks * 0.95;
    }
    const cp = this.level.checkpoints[this.checkpoint];
    this.player.reset(cp.x, cp.y);
  }
}
