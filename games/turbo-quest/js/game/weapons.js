// Firing, shots and weapon pickups. No DOM.
//
// Kid Mode: the Pop-Pack fires by itself, only when a Grumbly is ahead (within the weapon's reach,
// in a 70° cone), and aims at it. Weapons never run out.
// Dad Mode: FIRE fires (hold for steady fire). Aim with the stick: forward, up-forward, up, and
// down while in the air. Light aim assist bends a shot up to 12° onto a Grumbly. Holding FIRE
// while standing still charges the Pop Blaster's Big Pop. With auto-fire on, the Pop-Pack fires
// by itself and FIRE only charges.
// Shots: Boing Balls fall and bounce (and get round shields); Fizz Rockets steer themselves and
// burst (cheering everything close, shields or not); the Frosty Ray freezes; shields block other
// shots that hit their front.
import { WEAPONS, weaponSpec } from '../content/weapons.js';
import { POWERUPS } from '../content/powerups.js';
import { Pool } from '../engine/pool.js';
import { T, tileAt, isSolid } from '../engine/collide.js';

const KID_CONE = Math.cos((35 * Math.PI) / 180);
const ASSIST_CONE = Math.cos((12 * Math.PI) / 180);
const RANGE = 8.5;
const TRAP_TIME = { kid: 4, dad: 3 };
const HOLD_TO_CHARGE = 0.35;

export class Gun {
  constructor() {
    this.id = 'pop';
    this.level = 1;
    this.ammo = 0;
    this.cool = 0;
    this.charge = 0;
    this.charging = false;
    this.still = 0;
  }
}

export function makeShots() {
  return new Pool(() => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 0.2, dmg: 1, pierce: 0, drag: 0, rise: 0, gravity: 0, bounce: 0,
    homing: 0, maxSpeed: 0, blast: 0, kind: 'pop', effect: null, big: false, hits: [],
  }), 90);
}

// The muzzle: the Pop-Pack's nozzle over Turbo's shoulder.
function muzzle(pl, ax, ay) {
  return { x: pl.cx + ax * 0.45 + (ay ? 0 : pl.facing * 0.05), y: pl.y + 0.45 + ay * 0.5 };
}

// Things worth shooting at: Grumblies (not frozen ones: they're platforms now), and the boss's
// weak spot while it's dizzy.
function* targets(w) {
  for (const e of w.enemies) if (e.alive && !e.frozen) yield e;
  if (w.boss && w.boss.vulnerable) yield w.boss.weakSpot();
}

// The nearest target within `cone` of the direction (dx, dy), or null.
export function findTarget(w, x, y, dx, dy, cone, range = RANGE) {
  let best = null;
  let bestD = Infinity;
  for (const e of targets(w)) {
    const ex = e.cx - x;
    const ey = e.cy - y;
    const d = Math.hypot(ex, ey);
    if (d > range || d < 0.01) continue;
    if ((ex * dx + ey * dy) / d < cone) continue;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

// Dad Mode aim from the stick.
function dadAim(pl, intent) {
  if (intent.my < -0.5) {
    if (Math.abs(intent.mx) > 0.3) return { x: Math.sign(intent.mx) * Math.SQRT1_2, y: -Math.SQRT1_2 };
    return { x: 0, y: -1 };
  }
  if (intent.my > 0.5 && !pl.grounded) return { x: 0, y: 1 };
  return { x: pl.facing, y: 0 };
}

export function updateGun(w, intent, dt) {
  const pl = w.player;
  const gun = pl.gun;
  if (gun.cool > 0) gun.cool -= dt;
  if (pl.state !== 'play') {
    gun.charging = false;
    gun.charge = 0;
    gun.still = 0;
    return;
  }
  const spec = weaponSpec(gun.id, gun.level);
  const rate = spec.rate[w.mode] * (pl.turbo > 0 ? 2 : 1);
  const auto = w.mode === 'kid' || w.settings.autoFire;

  if (auto) {
    const m = muzzle(pl, pl.facing, 0);
    const target = findTarget(w, m.x, m.y, pl.facing, 0, KID_CONE, spec.range || RANGE);
    if (w.mode === 'dad' && charge(w, gun, spec, intent, dt, true)) return;
    if (target && gun.cool <= 0 && !gun.charging) {
      const dx = target.cx - m.x;
      const dy = target.cy - m.y;
      const d = Math.hypot(dx, dy);
      fire(w, gun, spec, rate, dx / d, dy / d, false);
    }
    return;
  }

  let aim = dadAim(pl, intent);
  if (gun.id === 'pop' && charge(w, gun, spec, intent, dt, false)) return;
  if (gun.charging) return;
  if ((intent.fire || intent.firePressed) && gun.cool <= 0) {
    if (w.settings.aimAssist !== false) aim = assist(w, pl, aim);
    fire(w, gun, spec, rate, aim.x, aim.y, false);
  }
}

// Bends the aim onto a target that's nearly in line with it.
function assist(w, pl, aim) {
  const m = muzzle(pl, aim.x, aim.y);
  const t = findTarget(w, m.x, m.y, aim.x, aim.y, ASSIST_CONE, 10);
  if (!t) return aim;
  const dx = t.cx - m.x;
  const dy = t.cy - m.y;
  const d = Math.hypot(dx, dy);
  return { x: dx / d, y: dy / d };
}

// The Big Pop: hold FIRE while standing still (or just hold it, with auto-fire), let go to fire.
// Returns true while charging or on the step it fires.
function charge(w, gun, spec, intent, dt, anyStance) {
  const pl = w.player;
  if (gun.id !== 'pop') return false;
  const still = intent.fire && (anyStance || (Math.abs(intent.mx) < 0.2 && pl.grounded));
  gun.still = still ? gun.still + dt : 0;
  if (!gun.charging && gun.still >= HOLD_TO_CHARGE) {
    gun.charging = true;
    gun.charge = 0;
    w.events.emit('chargeStart', pl);
  }
  if (!gun.charging) return false;
  if (intent.fire) {
    const before = gun.charge;
    gun.charge += dt;
    if (before < spec.charge.time && gun.charge >= spec.charge.time) w.events.emit('chargeFull', pl);
    return true;
  }
  const full = gun.charge >= spec.charge.time;
  gun.charging = false;
  gun.charge = 0;
  gun.still = 0;
  const aim = dadAim(pl, intent);
  if (full) fire(w, gun, { ...spec, ...spec.charge, count: 1 }, 1, aim.x, aim.y, true);
  else fire(w, gun, spec, spec.rate[w.mode], aim.x, aim.y, false);
  return true;
}

function fire(w, gun, spec, rate, ax, ay, big) {
  const pl = w.player;
  const m = muzzle(pl, ax, ay);
  const base = Math.atan2(ay, ax);
  const n = spec.count || 1;
  for (let i = 0; i < n; i++) {
    const s = w.shots.alloc();
    if (!s) break;
    const a = base + (n > 1 ? (i / (n - 1) - 0.5) * (spec.arc || 0) : 0);
    s.x = m.x;
    s.y = m.y;
    s.vx = Math.cos(a) * spec.speed;
    s.vy = Math.sin(a) * spec.speed + (spec.lift || 0);
    s.life = s.max = spec.life;
    s.r = spec.r;
    s.dmg = spec.dmg;
    s.pierce = spec.pierce || 0;
    s.kind = gun.id;
    s.effect = spec.effect || null;
    s.drag = spec.drag || 0;
    s.rise = spec.rise || 0;
    s.gravity = spec.gravity || 0;
    s.bounce = spec.bounce || 0;
    s.homing = spec.homing || 0;
    s.maxSpeed = spec.maxSpeed || 0;
    s.blast = spec.blast || 0;
    s.big = big;
    s.hits.length = 0;
  }
  gun.cool = 1 / rate;
  w.shotsFired++;
  if (ax) pl.facing = ax > 0 ? 1 : -1;
  if (gun.id !== 'pop' && w.mode === 'dad') {
    gun.ammo--;
    if (gun.ammo <= 0) {
      gun.id = 'pop';
      gun.level = 1;
      w.events.emit('weaponEmpty', pl);
    }
  }
  w.events.emit('shoot', { x: m.x, y: m.y, ax, ay, kind: gun.id, big });
}

export function updateShots(w, dt) {
  const pool = w.shots;
  const items = pool.items;
  for (let i = pool.count - 1; i >= 0; i--) {
    const s = items[i];
    s.life -= dt;
    if (s.drag) {
      // Bubbles slow down and drift up a little.
      s.vx *= 1 - s.drag * dt;
      s.vy -= s.rise * dt;
    }
    if (s.homing) steer(w, s, dt);
    if (s.gravity) s.vy = Math.min(14, s.vy + s.gravity * dt);
    const px = s.x;
    const py = s.y;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life <= 0) {
      if (s.blast) burst(w, s);
      w.events.emit('shotEnd', s);
      pool.free(i);
      continue;
    }
    const cx = Math.floor(s.x);
    const cy = Math.floor(s.y);
    const t = tileAt(w.grid, cx, cy);
    if (isSolid(t)) {
      // Boing Balls bounce off the ground (and off ceilings); anything else stops.
      if (s.bounce && Math.floor(py) !== cy && Math.floor(px) === cx) {
        s.y = py;
        s.vy = s.vy > 0 ? -s.bounce : Math.abs(s.vy) * 0.5;
        w.events.emit('boing', s);
      } else {
        if (t === T.BREAK) w.breakTile(cx, cy);
        if (s.blast) burst(w, s);
        w.events.emit('shotHit', s);
        pool.free(i);
        continue;
      }
    }
    if (popEnemyShots(w, s) || hitBoss(w, s) || hitEnemies(w, s)) pool.free(i);
  }
}

// Fizz Rockets turn toward the nearest target and speed up.
function steer(w, s, dt) {
  const t = findTarget(w, s.x, s.y, s.vx, s.vy, -1, 11);
  const speed = Math.min(s.maxSpeed || 12, Math.hypot(s.vx, s.vy) + 6 * dt);
  let a = Math.atan2(s.vy, s.vx);
  if (t) {
    const want = Math.atan2(t.cy - s.y, t.cx - s.x);
    let d = want - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    a += Math.max(-s.homing * dt, Math.min(s.homing * dt, d));
  }
  s.vx = Math.cos(a) * speed;
  s.vy = Math.sin(a) * speed;
}

// A rocket's burst: cheers every Grumbly close by (shields don't help), hurts the boss's weak spot.
function burst(w, s) {
  w.events.emit('blast', { x: s.x, y: s.y, r: s.blast });
  for (const e of w.enemies) {
    if (!e.alive || Math.hypot(e.cx - s.x, e.cy - s.y) > s.blast + e.w / 2) continue;
    if (e.isBoss) w.damageBoss(e, 1);
    else w.cheer(e, 'blast');
  }
  const b = w.boss;
  if (b && b.vulnerable && Math.hypot(b.cx - s.x, b.cy - s.y) < s.blast + Math.max(b.w, b.h) / 2) w.hitBoss();
}

// Turbo's shots pop the Grumblies' seeds and coconuts (not shockwaves).
function popEnemyShots(w, s) {
  const pool = w.enemyShots;
  for (let i = pool.count - 1; i >= 0; i--) {
    const e = pool.items[i];
    if (e.kind === 'wave') continue;
    if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 > (e.r + s.r) ** 2) continue;
    w.events.emit('popShot', e);
    pool.free(i);
    if (s.blast) burst(w, s);
    return !s.big;
  }
  return false;
}

// The boss: while it's dizzy any hit counts (its top block pops off); otherwise shots bounce off.
function hitBoss(w, s) {
  const b = w.boss;
  if (!b || !b.alive) return false;
  const nx = Math.max(b.x, Math.min(s.x, b.x + b.w));
  const ny = Math.max(b.y, Math.min(s.y, b.y + b.h));
  if ((s.x - nx) ** 2 + (s.y - ny) ** 2 > s.r * s.r) return false;
  if (s.blast) burst(w, s);
  else if (b.vulnerable) w.hitBoss();
  else w.events.emit('blocked', { x: s.x, y: s.y });
  return true;
}

// A shot coming at a shield's front, level or rising (Boing Balls falling onto it get past).
function fromFront(e, s) {
  return (s.x - e.cx) * e.facing > 0 && s.vy < 2;
}

// Returns true when the shot is used up.
function hitEnemies(w, s) {
  for (const e of w.enemies) {
    if (!e.alive || s.hits.includes(e)) continue;
    // circle vs box
    const nx = Math.max(e.x, Math.min(s.x, e.x + e.w));
    const ny = Math.max(e.y, Math.min(s.y, e.y + e.h));
    if ((s.x - nx) ** 2 + (s.y - ny) ** 2 > s.r * s.r) continue;
    if (s.blast) {
      burst(w, s);
      return true;
    }
    if (e.frozen) {
      w.cheer(e, 'shatter');
      return true;
    }
    if (e.bubbled) {
      w.cheer(e, 'pop');
      return true;
    }
    if (e.shield && s.kind !== 'boing' && fromFront(e, s)) {
      w.blockShot(e, s);
      return true;
    }
    if (s.effect === 'trap') {
      if (e.isBoss) {
        e.flash = 0.15;
        w.events.emit('blocked', { x: s.x, y: s.y });
      } else {
        e.trap(TRAP_TIME[w.mode]);
        w.events.emit('trap', e);
      }
      return true;
    }
    if (s.effect === 'freeze') {
      if (e.freeze(POWERUPS.freeze[w.mode])) w.events.emit('freeze', e);
      else {
        e.flash = 0.15;
        w.events.emit('blocked', { x: s.x, y: s.y });
      }
      return true;
    }
    if (e.isBoss) w.damageBoss(e, s.big ? 2 : 1);
    else {
      e.hp -= s.dmg;
      if (e.hp <= 0) w.cheer(e, 'shot');
      else {
        e.flash = 0.15;
        w.events.emit('enemyHit', e);
      }
    }
    s.hits.push(e);
    if (s.pierce-- <= 0) return true;
  }
  return false;
}

// A weapon capsule picked up: the same weapon levels up; a different one swaps, and the old one
// drops nearby to grab back.
export function giveWeapon(w, id, level = 1, ammo = null) {
  const pl = w.player;
  const gun = pl.gun;
  const def = WEAPONS[id];
  if (gun.id === id) {
    gun.level = Math.min(3, gun.level + 1);
    gun.ammo = def.ammo || 0;
    w.events.emit('weaponUp', { id, level: gun.level });
    return;
  }
  if (gun.id !== 'pop') w.dropWeapon(gun.id, gun.level, gun.ammo);
  gun.id = id;
  gun.level = level;
  gun.ammo = ammo ?? def.ammo ?? 0;
  gun.charging = false;
  gun.charge = 0;
  w.events.emit('weapon', { id, level });
}
