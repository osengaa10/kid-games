// TORNADO: put a finger down and a candy-colored twister spins up on the spot; drag and it
// follows the finger. It chews through whatever stands at its feet, so towers lose their footing
// and topple, sucks up loose pieces, whirls them round and up, and flings them out of the top.
// Let go and it wanders off by itself for a few seconds, then fizzles out.
// Only one at a time: a new tap calls it over.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { MAT } from '../core/materials.js';

const HEIGHT = 24;
const LINGER = 3.5;
const MAX_SPEED = 22;
const CHEW_RATE = 12;
const PULL = 10;
// At most this many pieces caught in the wind at once (the physics pays for each one).
const CARRY = 36;
const EDGE = 34;

const VERT = /* glsl */ `
uniform float uTime;
uniform vec2 uBend;
uniform float uGrow;
uniform float uSpin;
varying vec2 vUv;
varying float vH;
varying float vFace;
void main() {
  vUv = uv;
  float h = clamp(position.y / ${HEIGHT}.0, 0.0, 1.0);
  vH = h;
  vec3 p = position;
  p.xz *= uSpin;
  // The top trails behind as it moves, and the whole funnel snakes about.
  p.x += uBend.x * h * h + sin(uTime * 3.1 + h * 6.0) * 0.7 * h;
  p.z += uBend.y * h * h + cos(uTime * 2.4 + h * 5.0) * 0.7 * h;
  p *= uGrow;
  vec3 n = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFace = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform vec3 uDark;
uniform vec3 uLight;
uniform float uAlpha;
varying vec2 vUv;
varying float vH;
varying float vFace;
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
void main() {
  float a = vUv.x * 6.2831853;
  float swirl = sin(a * 3.0 + vH * 16.0 - uTime * uSpeed);
  float swirl2 = sin(a * 5.0 - vH * 9.0 - uTime * uSpeed * 0.7 + 1.3);
  float streak = smoothstep(0.1, 1.0, swirl) * 0.8 + smoothstep(0.6, 1.0, swirl2) * 0.4;
  vec3 col = mix(uDark, uLight, clamp(streak, 0.0, 1.0));
  // A faint rainbow shimmer running up the streaks.
  col = mix(col, hue(fract(vH * 1.5 - uTime * 0.4)), 0.18 * streak);
  float edge = smoothstep(0.0, 0.06, vH) * (1.0 - smoothstep(0.82, 1.0, vH));
  float alpha = (0.42 + 0.55 * clamp(streak, 0.0, 1.0)) * edge * mix(0.6, 1.0, vFace) * uAlpha;
  gl_FragColor = vec4(col, alpha);
}`;

function funnel(top, bottom, dark, light, speed, alpha) {
  const geo = new THREE.CylinderGeometry(top, bottom, HEIGHT, 32, 24, true).translate(0, HEIGHT / 2, 0);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uBend: { value: new THREE.Vector2() },
      uGrow: { value: 1 },
      uSpin: { value: 1 },
      uSpeed: { value: speed },
      uDark: { value: new THREE.Color(dark) },
      uLight: { value: new THREE.Color(light) },
      uAlpha: { value: alpha },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = 3;
  return m;
}

export class Tornado {
  constructor(g) {
    this.g = g;
    this.id = 'tornado';
    this.dragOrbits = false;
    this.group = new THREE.Group();
    this.outer = funnel(7, 1.6, 0x8f86d8, 0xf6f2ff, 9, 0.9);
    this.inner = funnel(4.2, 0.9, 0x6a62b8, 0xe2dcff, 13, 0.8);
    this.group.add(this.inner, this.outer);
    this.group.visible = false;
    g.scene.add(this.group);
    this.tw = null;
    this.wind = null;
  }

  press(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (!hit || hit.water) return;
    this.call(hit.x, hit.z, true);
  }
  move(sx, sy) {
    if (!this.tw?.held) return;
    const hit = this.g.aim(sx, sy);
    if (!hit || hit.water) return;
    this.tw.tx = clamp(hit.x);
    this.tw.tz = clamp(hit.z);
  }
  release() {
    if (!this.tw?.held) return;
    this.tw.held = false;
    this.tw.left = LINGER;
    const v = Math.hypot(this.tw.vx, this.tw.vz);
    this.tw.heading = v > 1 ? Math.atan2(this.tw.vz, this.tw.vx) : Math.random() * Math.PI * 2;
  }
  cancel() {
    this.release();
  }

  // Sets one off at a world point (testing, the stress test): it wanders from there.
  strike(hit) {
    this.call(hit.x, hit.z, false);
  }

  // Spins one up at (x, z), or calls the one already going over there.
  call(x, z, held) {
    x = clamp(x);
    z = clamp(z);
    if (!this.tw) {
      this.tw = { x, z, vx: 0, vz: 0, grow: 0, bend: new THREE.Vector2(), chew: 0, t: 0, heading: Math.random() * Math.PI * 2 };
      this.group.visible = true;
      sfx.whoosh(this.g.panOf(x, 2, z));
    }
    Object.assign(this.tw, { tx: x, tz: z, held, left: LINGER });
    if (!held) this.tw.heading = Math.random() * Math.PI * 2;
    if (!this.wind) this.wind = sfx.windHold();
  }

  update(dt) {
    const tw = this.tw;
    if (!tw) return;
    const g = this.g;
    tw.t += dt;
    if (!tw.held) {
      tw.left -= dt;
      // Wandering on its own: a lazy meander, turning back before the edge of the island.
      tw.heading += (Math.sin(tw.t * 0.9) * 0.8 + (Math.random() - 0.5)) * dt;
      if (Math.abs(tw.x) > EDGE - 4 || Math.abs(tw.z) > EDGE - 4) {
        const back = Math.atan2(-tw.z, -tw.x);
        let d = back - tw.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        tw.heading += d * Math.min(1, dt * 2);
      }
      tw.tx = clamp(tw.x + Math.cos(tw.heading) * 4);
      tw.tz = clamp(tw.z + Math.sin(tw.heading) * 4);
    }
    // Glide toward where it's wanted, faster the further away that is.
    const dx = tw.tx - tw.x;
    const dz = tw.tz - tw.z;
    const d = Math.hypot(dx, dz);
    const want = Math.min(MAX_SPEED, d * 3);
    const k = Math.min(1, dt * 4);
    tw.vx += ((d > 0.01 ? (dx / d) * want : 0) - tw.vx) * k;
    tw.vz += ((d > 0.01 ? (dz / d) * want : 0) - tw.vz) * k;
    tw.x += tw.vx * dt;
    tw.z += tw.vz * dt;
    const alive = tw.held || tw.left > 0;
    tw.grow = alive ? Math.min(1, tw.grow + dt * 2.5) : Math.max(0, tw.grow - dt * 1.6);
    if (!alive && tw.grow <= 0) {
      this.stop();
      return;
    }
    // The top lags behind the bottom.
    tw.bend.x += (-tw.vx * 0.45 - tw.bend.x) * Math.min(1, dt * 3);
    tw.bend.y += (-tw.vz * 0.45 - tw.bend.y) * Math.min(1, dt * 3);
    this.group.position.set(tw.x, 0, tw.z);
    for (const [m, spin] of [
      [this.outer, 1],
      [this.inner, 1],
    ]) {
      const u = m.material.uniforms;
      u.uTime.value = g.real;
      u.uBend.value.copy(tw.bend);
      u.uGrow.value = 0.25 + 0.75 * tw.grow;
      u.uSpin.value = spin * (0.92 + 0.08 * Math.sin(g.real * 7));
    }
    this.wind?.set(0.35 * tw.grow, 0.8 + Math.hypot(tw.vx, tw.vz) / MAX_SPEED);
    if (tw.grow < 0.3) return;
    this.chew(dt);
    this.whirl(dt);
    this.dust();
  }

  // Bites out of whatever stands at its feet.
  chew(dt) {
    const tw = this.tw;
    const g = this.g;
    tw.chew += dt;
    while (tw.chew > 1 / CHEW_RATE) {
      tw.chew -= 1 / CHEW_RATE;
      // Chunks fly off round the funnel, a different way each bite.
      const a = tw.t * 9;
      const n = g.destruction.impact({ x: tw.x, y: 0.3, z: tw.z, shape: 'capsule', to: { x: tw.x + tw.bend.x * 0.03, y: 8.5 * tw.grow, z: tw.z + tw.bend.y * 0.03 }, radius: 2.2 * tw.grow, power: 0.8, dir: { x: -Math.sin(a), y: 0.7, z: Math.cos(a) }, shellChance: 0.65, chunky: 0.75, quiet: true });
      if (n > 0) g.fx.shake.add(Math.min(0.06, 0.01 + n * 0.0008));
      this.wind?.parts?.crunch(n > 0 ? 1 : 0);
    }
  }

  // Loose pieces nearby get pulled in, carried round and up, and thrown out of the top.
  whirl(dt) {
    const tw = this.tw;
    const { pieces } = this.g;
    const reach = PULL * tw.grow;
    const top = HEIGHT * 0.8 * tw.grow;
    const near = [];
    for (const p of pieces.list) {
      if (p.dead) continue;
      const t = p.body.translation();
      if (t.y > top + 6) continue;
      // The funnel leans with its bend, so measure from its middle at that height.
      const h = Math.min(1, t.y / HEIGHT);
      const ax = tw.x + tw.bend.x * h * h;
      const az = tw.z + tw.bend.y * h * h;
      const r = Math.hypot(t.x - ax, t.z - az);
      if (r < reach) near.push([r, p, t, ax, az]);
    }
    near.sort((a, b) => a[0] - b[0]);
    let thawed = 0;
    for (const [r, p, t, ax, az] of near.slice(0, CARRY)) {
      if (p.frozen) {
        if (r > 5 || thawed >= 6) continue;
        pieces.thaw(p);
        thawed++;
      }
      const ux = (t.x - ax) / (r || 1);
      const uz = (t.z - az) / (r || 1);
      let vt = 16;
      let vin = -7;
      let vup = r < 4.5 ? 15 : 5;
      if (t.y > top) {
        vin = 14;
        vup = 4;
        vt = 10;
      }
      const want = { x: -uz * vt + ux * vin, y: vup, z: ux * vt + uz * vin };
      // Big sections hardly budge; little bits fly.
      const a = Math.min(1, dt * 5 * (1 - r / reach) * tw.grow * Math.min(1, 30 / p.mass));
      if (a < 0.002) continue;
      const v = p.body.linvel();
      p.body.setLinvel({ x: v.x + (want.x - v.x) * a, y: v.y + (want.y - v.y) * a, z: v.z + (want.z - v.z) * a }, true);
      if (Math.random() < 0.08) {
        const w = p.body.angvel();
        p.body.setAngvel({ x: w.x + (Math.random() - 0.5) * 6, y: w.y + (Math.random() - 0.5) * 6, z: w.z + (Math.random() - 0.5) * 6 }, true);
      }
    }
  }

  // Dust kicked up round its foot, and bits of grass and leaves whirling off it.
  dust() {
    const tw = this.tw;
    const { fx, real } = this.g;
    const a = real * 7;
    const r = 2.2 * tw.grow;
    fx.dustCloud(tw.x + Math.cos(a) * r, 0.4, tw.z + Math.sin(a) * r, 1, 1.5, 0xe0d4bc, { rise: 5, size: 2.2, life: 1 });
    const h = Math.random() * HEIGHT * 0.7 * tw.grow;
    const b = Math.random() * Math.PI * 2;
    const rr = (1.6 + (h / HEIGHT) * 5) * tw.grow;
    const px = tw.x + tw.bend.x * (h / HEIGHT) ** 2 + Math.cos(b) * rr;
    const pz = tw.z + tw.bend.y * (h / HEIGHT) ** 2 + Math.sin(b) * rr;
    // Thrown off sideways along the swirl.
    fx.crumble(px, h, pz, Math.random() < 0.7 ? 0x5fc24f : 0xa5733f, MAT.LEAF, px + Math.sin(b), h - 0.5, pz - Math.cos(b), 0.8);
  }

  stop() {
    this.tw = null;
    this.group.visible = false;
    this.wind?.stop();
    this.wind = null;
  }

  cancelAll() {
    this.stop();
  }
}

const clamp = (v) => Math.max(-EDGE, Math.min(EDGE, v));
