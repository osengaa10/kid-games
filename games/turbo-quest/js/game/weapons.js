// Firing, shots and weapon pickups. No DOM.
//
// Kid Mode: the Pop-Pack fires by itself, only when a Grumbly is ahead (within about 8 tiles, in a
// 70° cone), and aims at it. Weapons never run out.
// Dad Mode: FIRE fires (hold for steady fire). Aim with the stick: forward, up-forward, up, and
// down while in the air. Light aim assist bends a shot up to 12° onto a Grumbly. Holding FIRE
// while standing still charges the Pop Blaster's Big Pop. With auto-fire on, the Pop-Pack fires
// by itself and FIRE only charges.
import { WEAPONS, weaponSpec } from '../content/weapons.js';
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
  return new Pool(() => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 0.2, dmg: 1, pierce: 0, drag: 0, rise: 0, kind: 'pop', effect: null, big: false, hits: [] }), 90);
}

// The muzzle: the Pop-Pack's nozzle over Turbo's shoulder.
function muzzle(pl, ax, ay) {
  return { x: pl.cx + ax * 0.45 + (ay ? 0 : pl.facing * 0.05), y: pl.y + 0.45 + ay * 0.5 };
}

// The nearest Grumbly within `cone` of the direction (dx, dy), or null.
export function findTarget(w, x, y, dx, dy, cone, range = RANGE) {
  let best = null;
  let bestD = Infinity;
  for (const e of w.enemies) {
    if (!e.alive) continue;
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

// Bends the aim onto a Grumbly that's nearly in line with it.
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
    s.vy = Math.sin(a) * spec.speed;
    s.life = s.max = spec.life;
    s.r = spec.r;
    s.dmg = spec.dmg;
    s.pierce = spec.pierce || 0;
    s.kind = gun.id;
    s.effect = spec.effect || null;
    s.drag = spec.drag || 0;
    s.rise = spec.rise || 0;
    s.big = big;
    s.hits.length = 0;
  }
  gun.cool = 1 / rate;
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
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life <= 0) {
      w.events.emit('shotEnd', s);
      pool.free(i);
      continue;
    }
    const cx = Math.floor(s.x);
    const cy = Math.floor(s.y);
    const t = tileAt(w.grid, cx, cy);
    if (isSolid(t)) {
      if (t === T.BREAK) w.breakTile(cx, cy);
      w.events.emit('shotHit', s);
      pool.free(i);
      continue;
    }
    if (hitEnemies(w, s)) pool.free(i);
  }
}

// Returns true when the shot is used up.
function hitEnemies(w, s) {
  for (const e of w.enemies) {
    if (!e.alive || s.hits.includes(e)) continue;
    // circle vs box
    const nx = Math.max(e.x, Math.min(s.x, e.x + e.w));
    const ny = Math.max(e.y, Math.min(s.y, e.y + e.h));
    if ((s.x - nx) ** 2 + (s.y - ny) ** 2 > s.r * s.r) continue;
    if (e.bubbled) {
      w.cheer(e, 'pop');
      return true;
    }
    if (s.effect === 'trap') {
      e.trap(TRAP_TIME[w.mode]);
      w.events.emit('trap', e);
      return true;
    }
    e.hp -= s.dmg;
    if (e.hp <= 0) w.cheer(e, 'shot');
    else {
      e.flash = 0.15;
      w.events.emit('enemyHit', e);
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
