// The effect recipes: every hit is layered as
//   punch  (0-80 ms)   cartoon star flash, hit-stop, camera kick
//   burst  (to 600 ms) crumbs, sparks, fireball, shockwave ring
//   linger (to 4 s)    dust drifting, crumbs bouncing to rest, embers fading
// Counts scale with `intensity`, which the frame-time governor turns down on a struggling iPad.
import * as THREE from '../../vendor/three.module.min.js';
import { ParticleField, particle } from './gpuParticles.js';
import { Bursts } from './bursts.js';
import { Shake, TimeScale } from './shake.js';
import { linearRGB } from '../render/voxels.js';
import { MATERIALS } from '../core/materials.js';

const DUST = linearRGB(0xf4e7d0);
const CRUMBS_PER_BLOCK = 0.4;
const HOT = [linearRGB(0xfff2a8), linearRGB(0xffc23d), linearRGB(0xff7b2e), linearRGB(0xff4fa3)];
const GEMS = [0xffd23f, 0x2ec4f1, 0xff5fa2, 0x5fd35f, 0xb15cff, 0xffffff].map(linearRGB);
const PARTY = [0xff4d4d, 0xff9f1c, 0xffd23f, 0x5fd35f, 0x2ec4f1, 0x5b6cff, 0xb15cff, 0xff5fa2].map(linearRGB);

const rnd = (a, b) => a + Math.random() * (b - a);

// A random direction, mostly upward when up > 0.
function dir(up = 0) {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(a), Math.abs(u) * up + u * (1 - up), s * Math.sin(a)];
}

export class Fx {
  constructor(scene, camera, tier, sunDir) {
    const sun = sunDir.clone().normalize();
    this.crumbs = new ParticleField(scene, { kind: 'solid', capacity: tier.crumbs, sun });
    this.confettiField = new ParticleField(scene, { kind: 'confetti', capacity: tier.confetti, sun });
    this.sparks = new ParticleField(scene, { kind: 'spark', capacity: tier.sparks });
    this.glow = new ParticleField(scene, { kind: 'glow', capacity: tier.glow });
    this.dust = new ParticleField(scene, { kind: 'soft', capacity: tier.dust, opacity: 0.9 });
    this.fields = [this.crumbs, this.confettiField, this.sparks, this.glow, this.dust];
    this.bursts = new Bursts(scene, camera);
    this.shake = new Shake();
    this.time = new TimeScale();
    this.intensity = 1;
    this.calm = false;
    this.t = 0;
    // Per-frame crumb allowance, so one giant collapse can't wipe out every crumb in the air.
    this.crumbBudget = 0;
    this.tier = tier;
  }

  update(t) {
    this.t = t;
    this.crumbBudget = Math.round(this.tier.crumbs * 0.25 * this.intensity);
    for (const f of this.fields) f.update(t);
    this.bursts.update(t);
  }

  clear() {
    for (const f of this.fields) f.clear();
    this.bursts.clear();
  }

  n(count) {
    return Math.max(1, Math.round(count * this.intensity));
  }

  // One block smashed to bits at (x, y, z): crumbs in its colors flying away from the hit at
  // (fx, fy, fz). power ~1 for a normal hit.
  crumble(x, y, z, hex, matId, fx, fy, fz, power = 1) {
    const m = MATERIALS[matId];
    const c = linearRGB(hex);
    // Blocks are little now: about one crumb each (more for crumbly materials), so a big hit
    // still throws a thousand of them.
    let count = Math.floor(m.crumbs * CRUMBS_PER_BLOCK * this.intensity + Math.random());
    if (count > this.crumbBudget) count = this.crumbBudget;
    this.crumbBudget -= count;
    let ax = x - fx;
    let ay = y - fy;
    let az = z - fz;
    const d = Math.hypot(ax, ay, az) || 1;
    ax /= d;
    ay /= d;
    az /= d;
    const P = particle();
    for (let i = 0; i < count; i++) {
      const [rx, ry, rz] = dir(0.4);
      const sp = rnd(6, 16) * power;
      P.x = x + rnd(-0.4, 0.4);
      P.y = y + rnd(-0.4, 0.4);
      P.z = z + rnd(-0.4, 0.4);
      P.vx = (ax * 0.8 + rx * 0.6) * sp;
      P.vy = (ay * 0.5 + 0.55 + ry * 0.5) * sp;
      P.vz = (az * 0.8 + rz * 0.6) * sp;
      const shade = rnd(0.8, 1.15);
      P.r = c[0] * shade;
      P.g = c[1] * shade;
      P.b = c[2] * shade;
      P.life = rnd(1.6, 3.2);
      P.bounce = 0.38;
      P.spin = rnd(4, 14);
      if (m.shape === 'splinter') {
        P.size = rnd(0.2, 0.3);
        P.sx = 0.35;
        P.sy = 1.8;
      } else if (m.shape === 'shard') {
        P.size = rnd(0.2, 0.34);
        P.sx = 1.2;
        P.sy = 0.2;
      } else {
        P.size = rnd(0.14, 0.32);
        P.sx = P.sy = 1;
      }
      this.crumbs.emit();
    }
    // Glittery materials throw a few sparkles too.
    if (m.sparkle > 0 && Math.random() < m.sparkle * 0.3) {
      P.sx = P.sy = 1;
      for (let i = 0; i < this.n(2); i++) {
        const [rx, ry, rz] = dir(0.6);
        P.x = x;
        P.y = y;
        P.z = z;
        P.vx = rx * 7;
        P.vy = ry * 7 + 3;
        P.vz = rz * 7;
        P.r = 1;
        P.g = 1;
        P.b = 0.85;
        P.size = rnd(0.3, 0.6);
        P.life = rnd(0.5, 1);
        P.gravity = 6;
        P.drag = 2;
        P.bounce = 0;
        this.glow.emit();
      }
    }
  }

  // A cloud of dust (and the odd big puff) rolling out from (x, y, z).
  dustCloud(x, y, z, count, spread, hex, { rise = 2, size = 2.6, life = 2.6, ring = false } = {}) {
    const tint = hex ? linearRGB(hex) : DUST;
    const P = particle();
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = ring ? spread * rnd(0.8, 1.2) : spread * rnd(0.1, 1);
      P.x = x + Math.cos(a) * rnd(0, 1);
      P.y = Math.max(0.4, y + rnd(-0.5, 1));
      P.z = z + Math.sin(a) * rnd(0, 1);
      P.vx = Math.cos(a) * sp;
      P.vy = rnd(0.3, 1) * rise;
      P.vz = Math.sin(a) * sp;
      P.gravity = -0.6;
      P.drag = 1.8;
      const mix = rnd(0.45, 0.7);
      P.r = tint[0] * (1 - mix) + DUST[0] * mix;
      P.g = tint[1] * (1 - mix) + DUST[1] * mix;
      P.b = tint[2] * (1 - mix) + DUST[2] * mix;
      P.size = size * rnd(0.7, 1.3);
      P.life = life * rnd(0.7, 1.2);
      P.spin = rnd(-1, 1);
      P.sx = 1;
      this.dust.emit();
    }
  }

  sparkBurst(x, y, z, count, speed = 22, { up = 0.3, colors = HOT, life = 0.7, size = 0.32 } = {}) {
    const P = particle();
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const [rx, ry, rz] = dir(up);
      const sp = speed * rnd(0.35, 1);
      P.x = x;
      P.y = y;
      P.z = z;
      P.vx = rx * sp;
      P.vy = ry * sp;
      P.vz = rz * sp;
      const c = colors[Math.floor(Math.random() * colors.length)];
      P.r = c[0];
      P.g = c[1];
      P.b = c[2];
      P.gravity = 22;
      P.drag = 1.2;
      P.life = life * rnd(0.5, 1.2);
      P.size = size * rnd(0.6, 1.2);
      P.sx = rnd(0.8, 1.6);
      this.sparks.emit();
    }
  }

  embers(x, y, z, count, speed = 10, colors = HOT) {
    const P = particle();
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const [rx, ry, rz] = dir(0.7);
      const sp = speed * rnd(0.3, 1);
      P.x = x + rnd(-0.5, 0.5);
      P.y = y + rnd(-0.5, 0.5);
      P.z = z + rnd(-0.5, 0.5);
      P.vx = rx * sp;
      P.vy = ry * sp + 4;
      P.vz = rz * sp;
      const c = colors[Math.floor(Math.random() * colors.length)];
      P.r = c[0];
      P.g = c[1];
      P.b = c[2];
      P.gravity = 9;
      P.drag = 0.9;
      P.life = rnd(0.8, 1.8);
      P.size = rnd(0.35, 0.8);
      this.glow.emit();
    }
  }

  confetti(x, y, z, count, speed = 14, { up = 0.85, spread = 1 } = {}) {
    const P = particle();
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const [rx, ry, rz] = dir(up);
      const sp = speed * rnd(0.5, 1.1);
      P.x = x + rnd(-spread, spread);
      P.y = y;
      P.z = z + rnd(-spread, spread);
      P.vx = rx * sp;
      P.vy = ry * sp;
      P.vz = rz * sp;
      const c = PARTY[Math.floor(Math.random() * PARTY.length)];
      P.r = c[0];
      P.g = c[1];
      P.b = c[2];
      P.gravity = 7;
      P.drag = 1.4;
      P.life = rnd(2.5, 4.5);
      P.size = rnd(0.45, 0.75);
      P.sx = 1;
      P.sy = 0.6;
      P.spin = rnd(5, 12);
      this.confettiField.emit();
    }
  }

  // Treasure: shiny gems spraying up and bouncing about, with glints.
  gems(x, y, z, count) {
    const P = particle();
    for (let i = 0; i < this.n(count); i++) {
      const [rx, ry, rz] = dir(0.9);
      const sp = rnd(8, 16);
      P.x = x;
      P.y = y;
      P.z = z;
      P.vx = rx * sp * 0.5;
      P.vy = Math.abs(ry) * sp + 6;
      P.vz = rz * sp * 0.5;
      const c = GEMS[Math.floor(Math.random() * GEMS.length)];
      P.r = c[0];
      P.g = c[1];
      P.b = c[2];
      P.life = rnd(2.5, 3.5);
      P.bounce = 0.5;
      P.size = rnd(0.45, 0.7);
      P.sx = 0.75;
      P.sy = 1.2;
      P.spin = rnd(4, 10);
      this.crumbs.emit();
    }
    this.embers(x, y + 1, z, Math.round(count / 3), 8, GEMS);
  }

  // The big one: a meteor or bomb going off at (x, y, z). power 1 = meteor.
  blast(x, y, z, power = 1, { colors = HOT, ground = 0 } = {}) {
    const b = this.bursts;
    b.star(x, y + 0.5, z, 5 + power * 3, 0xffd23f, { calm: this.calm });
    b.fire(x, y + 0.8, z, 2.6 * power, { life: 0.55 });
    for (let i = 0; i < 4; i++) {
      const [rx, ry, rz] = dir(0.6);
      b.fire(x + rx * 2.2 * power, y + Math.abs(ry) * 1.5 * power + 0.5, z + rz * 2.2 * power, rnd(1.2, 2) * power, { delay: rnd(0.02, 0.12), life: rnd(0.5, 0.8), rise: 4 });
    }
    const gy = Math.max(ground, 0) + 0.1;
    b.ring(x, gy, z, 13 * power, { color: 0xfff1c4, life: 0.55, width: 0.28 });
    b.ring(x, gy, z, 8 * power, { color: 0xffb347, life: 0.85, width: 0.5, alpha: 0.6 });
    if (y < 3) b.scorch(x, z, 3.2 * power);
    this.sparkBurst(x, y + 0.5, z, 110 * power, 26 * Math.sqrt(power), { colors });
    this.embers(x, y + 0.5, z, 36 * power, 12);
    this.dustCloud(x, gy, z, 22 * power, 9 * power, null, { ring: true, rise: 2.5, size: 3, life: 2.8 });
    this.dustCloud(x, y + 1, z, 10 * power, 3, null, { rise: 6, size: 3.4, life: 3.2 });
    this.shake.add(0.38 + 0.22 * power);
    this.time.hitStop(0.05 + 0.02 * power);
  }

  // A heavy piece thumping down: dust skirt and a few crumbs.
  landing(x, y, z, blocks, hex) {
    const big = Math.min(1, blocks / 60);
    this.dustCloud(x, Math.max(0.2, y - 0.5), z, 3 + big * 14, 2 + big * 5, hex, { ring: true, rise: 1.2, size: 1.8 + big * 2, life: 1.8 });
    if (blocks > 30) {
      this.bursts.ring(x, Math.max(0, y - 1), z, 4 + big * 8, { color: 0xffffff, life: 0.45, width: 0.2, alpha: 0.5 });
      this.shake.add(0.12 + big * 0.25);
    }
  }

  // A small piece tidied away: a pop of sparkles in its color.
  poof(x, y, z, hex) {
    const c = linearRGB(hex);
    const P = particle();
    for (let i = 0; i < this.n(5); i++) {
      const [rx, ry, rz] = dir(0.6);
      P.x = x;
      P.y = y;
      P.z = z;
      P.vx = rx * 4;
      P.vy = ry * 4 + 2;
      P.vz = rz * 4;
      P.r = c[0] * 0.5 + 0.5;
      P.g = c[1] * 0.5 + 0.5;
      P.b = c[2] * 0.5 + 0.5;
      P.gravity = 2;
      P.drag = 3;
      P.life = rnd(0.4, 0.8);
      P.size = rnd(0.25, 0.5);
      this.glow.emit();
    }
  }

  splash(x, z) {
    const P = particle();
    const water = linearRGB(0xbfeaff);
    for (let i = 0; i < this.n(14); i++) {
      const [rx, , rz] = dir(0);
      P.x = x;
      P.y = -3;
      P.z = z;
      P.vx = rx * 4;
      P.vy = rnd(8, 14);
      P.vz = rz * 4;
      P.r = water[0];
      P.g = water[1];
      P.b = water[2];
      P.gravity = 30;
      P.life = 0.9;
      P.size = rnd(0.25, 0.45);
      P.bounce = 0;
      this.crumbs.emit();
    }
    this.bursts.ring(x, -3, z, 4, { color: 0xffffff, life: 0.6, width: 0.3, alpha: 0.7 });
  }

  // A puff of trail behind something flying (the meteor). color: linear [r, g, b] or null for fire.
  trail(x, y, z, color = null) {
    const P = particle();
    P.x = x + rnd(-0.4, 0.4);
    P.y = y + rnd(-0.4, 0.4);
    P.z = z + rnd(-0.4, 0.4);
    P.vx = rnd(-1, 1);
    P.vy = rnd(0, 1.5);
    P.vz = rnd(-1, 1);
    P.gravity = -1;
    P.drag = 2;
    const c = color || HOT[Math.floor(Math.random() * HOT.length)];
    P.r = c[0];
    P.g = c[1];
    P.b = c[2];
    P.size = rnd(0.9, 1.6);
    P.life = rnd(0.25, 0.45);
    this.glow.emit();
    P.size = rnd(1.4, 2.2);
    P.life = rnd(0.7, 1.2);
    P.r = P.g = P.b = 0.92;
    P.spin = rnd(-1, 1);
    this.dust.emit();
  }
}

export { PARTY, HOT };
export const sunDirFrom = (light) => new THREE.Vector3().copy(light.position).normalize();
