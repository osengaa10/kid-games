// How Turbo looks moving: squash and stretch, galloping legs, ears on springs that flop on
// landings, a tail that wags (and spins like a propeller while fluttering), faces for each
// moment, the Pop-Pack kicking back when it fires. It reads the player and hears about jumps,
// landings, shots and hurts; it never changes the game.
import { damp } from '../engine/math.js';
import { neutralPose } from '../art/turbo.js';

export class PlayerView {
  constructor() {
    this.sx = 1;
    this.sy = 1;
    this.run = 0;
    this.wag = 0;
    this.spin = 0;
    this.blink = 0;
    this.nextBlink = 2;
    this.turn = 1;
    this.tilt = 0;
    this.ear = { b: 0, bv: 0, f: 0, fv: 0 };
    this.kick = 0;
    this.hurtFace = 0;
    this.time = 0;
    this.giant = 1;
    this.pose = neutralPose();
  }

  jump() {
    this.sx = 0.82;
    this.sy = 1.2;
    this.ear.bv -= 7;
    this.ear.fv -= 7;
  }

  land(speed) {
    const k = Math.min(1, speed / 14);
    this.sx = 1 + 0.32 * k;
    this.sy = 1 - 0.28 * k;
    this.ear.bv += 10 * k;
    this.ear.fv += 12 * k;
  }

  spring() {
    this.sx = 0.75;
    this.sy = 1.3;
    this.ear.bv -= 9;
    this.ear.fv -= 9;
  }

  shoot() {
    this.kick = 0.08;
  }

  hurt() {
    this.hurtFace = 0.6;
    this.sx = 1.2;
    this.sy = 0.85;
  }

  update(p, dt) {
    this.time += dt;
    this.sx = damp(this.sx, 1, 14, dt);
    this.sy = damp(this.sy, 1, 14, dt);
    this.kick = Math.max(0, this.kick - dt * 0.6);
    if (this.hurtFace > 0) this.hurtFace -= dt;
    this.giant = damp(this.giant, p.giant > 0 ? 1.8 : 1, 6, dt);
    const speed = Math.abs(p.vx);
    const air = !p.grounded && p.state !== 'rescue';
    if (p.grounded && speed > 0.2) this.run += dt * (7 + speed * 1.8);
    else if (p.grounded) this.run = damp(this.run, Math.round(this.run / Math.PI) * Math.PI, 10, dt);
    this.wag += dt * (p.grounded && speed < 0.2 ? 10 : 15);
    this.spin += dt * 40;
    this.tilt = damp(this.tilt, p.grounded ? p.vx * 0.012 : p.vy * -0.012 * p.facing, 10, dt);
    this.turn = damp(this.turn, p.facing, 22, dt);
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 0.12;
      this.nextBlink = 2 + Math.random() * 3;
    }
    if (this.blink > 0) this.blink -= dt;

    // Ears: springs toward where the motion pushes them.
    let earTarget = 0;
    if (air) earTarget = p.vy < 0 ? -0.45 : 0.5;
    else if (speed > 1) earTarget = -0.3;
    else earTarget = Math.sin(this.time * 0.7) > 0.97 ? 0.25 : 0; // the odd twitch
    const e = this.ear;
    for (const [k, kv, extra] of [['b', 'bv', 0], ['f', 'fv', 0.05]]) {
      e[kv] += ((earTarget + extra - e[k]) * 160 - e[kv] * 12) * dt;
      e[k] += e[kv] * dt;
      e[k] = Math.max(-1, Math.min(1, e[k]));
    }

    const P = this.pose;
    const r = this.run;
    if (air) {
      const up = p.vy < 0;
      P.legs[0] = P.legs[1] = up ? 0.7 : 0.25;
      P.legs[2] = P.legs[3] = up ? -0.6 : -0.2;
    } else if (p.grounded && speed > 0.2) {
      const a = Math.min(1, speed / 3) * 0.75;
      P.legs[0] = Math.sin(r + Math.PI) * a;
      P.legs[1] = Math.sin(r) * a;
      P.legs[2] = Math.sin(r + 0.6) * a;
      P.legs[3] = Math.sin(r + Math.PI + 0.6) * a;
    } else P.legs[0] = P.legs[1] = P.legs[2] = P.legs[3] = p.state === 'rescue' ? Math.sin(this.time * 12) * 0.5 : 0;
    P.bodyY = p.grounded && speed > 0.2 ? -Math.abs(Math.sin(r)) * 0.06 : Math.sin(this.time * 2.5) * 0.012;
    P.headY = p.grounded && speed > 0.2 ? -Math.abs(Math.sin(r - 0.5)) * 0.04 : 0;
    P.headRot = air ? (p.vy < 0 ? -0.12 : 0.12) : speed > 0.2 ? -0.04 : 0;
    P.earB = e.b;
    P.earF = e.f;
    P.tail = Math.sin(this.wag) * 0.4 - 0.2;
    P.flutter = p.fluttering ? this.spin : null;
    P.packKick = this.kick;
    P.nozzle = p.gun ? p.gun.id : 'pop';
    P.look = this.look || null;
    const victory = p.state === 'victory';
    P.eye = this.hurtFace > 0 ? 'hurt' : victory || p.fluttering || p.state === 'rescue' ? 'happy' : this.blink > 0 ? 'blink' : air && p.vy > 9 ? 'wide' : 'open';
    P.mouth = this.hurtFace > 0 ? 'o' : victory || p.fluttering || p.turbo > 0 ? 'grin' : air ? 'open' : speed > 4 ? 'open' : 'smile';
  }
}
