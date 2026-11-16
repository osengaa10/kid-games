// UFO: a flying saucer with a little green alien in its glass dome. Put a finger down and it
// swoops in over the spot and switches on its tractor beam: blocks get pulled off the top of
// whatever stands under it, and loose blocks and chunks float up into a slowly turning cloud
// beneath it. Drag to carry the lot anywhere; let go and it all drops and smashes. Little bits
// that float right up to the saucer get beamed aboard. A moment after letting go it zooms off,
// unless you grab again.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { linearRGB } from '../render/voxels.js';
import { columnTop } from '../core/grid.js';
import { steerPieces } from './wind.js';

const R = 4;
const REACH = 5.5;
const RIP_RATE = 8;
const LINGER = 1.5;
const MAX_SPEED = 14;
const EDGE = 38;
const MINT = [0x9fffd8, 0xffffff, 0x7fd6ff].map(linearRGB);
const LIGHTS = [0xff4d4d, 0xffd23f, 0x5fd35f, 0x2ec4f1, 0xb15cff];

const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
varying float vFace;
void main() {
  vUv = uv;
  vec3 n = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFace = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uLen;
varying vec2 vUv;
varying float vFace;
void main() {
  // Rings of light climbing up the beam (vUv.y is 1 at the saucer, 0 at the ground).
  float rings = smoothstep(0.55, 1.0, sin((vUv.y * uLen * 0.9) - uTime * 7.0) * 0.5 + 0.5);
  vec3 col = mix(vec3(0.45, 1.0, 0.8), vec3(1.0), rings * 0.6);
  float a = (0.3 + 0.45 * rings) * mix(0.4, 1.0, vFace) * smoothstep(0.0, 0.15, vUv.y) * uAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

function makeSaucer() {
  const root = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xd7dceb, roughness: 0.25, metalness: 0.55 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x8a90b0, roughness: 0.35, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 36, 14), silver);
  body.scale.set(1, 0.28, 1);
  body.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.32, 10, 44).rotateX(Math.PI / 2), rimMat);
  const belly = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9fffd8, side: THREE.DoubleSide }));
  belly.position.y = -1.13;
  // The glass dome, and the alien inside it.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xbff3ff, roughness: 0.05, transparent: true, opacity: 0.4 }));
  dome.position.y = 0.6;
  const alien = new THREE.Group();
  alien.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 12), new THREE.MeshStandardMaterial({ color: 0x5fd35f, roughness: 0.5 }));
  head.scale.set(1, 1.1, 0.95);
  alien.add(head);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x163a63 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), white);
    eye.position.set(s * 0.33, 0.15, 0.72);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 6), black);
    pupil.position.set(s * 0.33, 0.15, 0.98);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), head.material);
    stalk.position.set(s * 0.35, 1, 0);
    stalk.rotation.z = -s * 0.35;
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    bob.position.set(s * 0.47, 1.3, 0);
    alien.add(eye, pupil, stalk, bob);
  }
  // Lights round the rim that chase round in rainbow colors.
  const lights = [];
  const bulb = new THREE.SphereGeometry(0.28, 10, 8);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const m = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: LIGHTS[k % LIGHTS.length] }));
    m.position.set(Math.cos(a) * R * 1.02, 0, Math.sin(a) * R * 1.02);
    lights.push(m);
    root.add(m);
  }
  root.add(body, rim, belly, dome, alien);
  root.userData = { alien, lights };
  return root;
}

export class Ufo {
  constructor(g) {
    this.g = g;
    this.id = 'ufo';
    this.dragOrbits = false;
    this.saucer = makeSaucer();
    this.saucer.visible = false;
    g.scene.add(this.saucer);
    this.beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uLen: { value: 10 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // A cone from the saucer's belly to the ground: 1 unit tall here, stretched each frame.
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, REACH, 1, 32, 1, true).translate(0, -0.5, 0), this.beamMat);
    this.beam.visible = false;
    this.beam.frustumCulled = false;
    this.beam.renderOrder = 4;
    g.scene.add(this.beam);
    this.u = null;
    this.hum = null;
  }

  press(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (!hit) return;
    this.grab(hit.x, hit.z, true);
  }
  move(sx, sy) {
    if (!this.u?.held) return;
    const hit = this.g.aim(sx, sy);
    if (!hit) return;
    this.u.tx = clamp(hit.x);
    this.u.tz = clamp(hit.z);
  }
  release() {
    if (!this.u?.held) return;
    this.u.held = false;
    this.u.left = LINGER;
  }
  cancel() {
    this.release();
  }

  // Beams up at a world point for a moment, then drops it all (testing, the stress test).
  strike(hit) {
    this.grab(hit.x, hit.z, true);
    this.u.until = this.g.time + 1.5;
  }

  // Comes over to (x, z) and starts beaming (swooping in from the sky if it isn't here yet).
  grab(x, z, held) {
    const g = this.g;
    x = clamp(x);
    z = clamp(z);
    if (!this.u) {
      const cam = g.camera.position;
      this.u = { x: (x + cam.x) / 2, y: 60, z: (z + cam.z) / 2, rip: 0, t: 0, leaving: false };
      this.saucer.visible = true;
      this.saucer.position.set(this.u.x, this.u.y, this.u.z);
      sfx.ufoArrive(g.panOf(x, 20, z));
    }
    Object.assign(this.u, { tx: x, tz: z, held, left: LINGER, leaving: false, climb: 0, until: 0 });
    if (!this.hum) this.hum = sfx.ufoHum();
  }

  update(dt) {
    const u = this.u;
    if (!u) return;
    const g = this.g;
    u.t += dt;
    if (u.until && g.time > u.until) this.release();
    if (!u.held && !u.leaving) {
      u.left -= dt;
      if (u.left <= 0) u.leaving = true;
    }
    const dx = u.tx - u.x;
    const dz = u.tz - u.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, MAX_SPEED * dt, d * Math.min(1, dt * 5));
    if (d > 1e-3) {
      u.x += (dx / d) * step;
      u.z += (dz / d) * step;
    }
    // Zoom off upward when leaving. Otherwise hover a little above whatever stands under it
    // (lower as it eats the top away), but never so high it leaves the screen: over the tallest
    // towers it pulls the very top off first.
    if (u.leaving) {
      u.climb = (u.climb || 0) + dt * 60;
      u.y += u.climb * dt;
    } else u.y += (Math.min(38, Math.max(12, columnTop(g.grid, u.tx, u.tz, 3) + 6)) - u.y) * Math.min(1, dt * 3);
    const wob = Math.sin(u.t * 2.3) * 0.3;
    this.saucer.position.set(u.x, u.y + wob, u.z);
    this.saucer.rotation.y += dt * 0.8;
    this.saucer.rotation.z = Math.max(-0.25, Math.min(0.25, -dx * 0.02));
    this.saucer.rotation.x = Math.max(-0.25, Math.min(0.25, dz * 0.02));
    // The alien always looks at you; the rim lights chase round.
    const { alien, lights } = this.saucer.userData;
    const cam = g.camera.position;
    alien.rotation.y = Math.atan2(cam.x - u.x, cam.z - u.z) - this.saucer.rotation.y;
    lights.forEach((m, k) => m.material.color.setHex(LIGHTS[(k + Math.floor(u.t * 8)) % LIGHTS.length]));
    // The beam fades on while held and off when let go.
    const on = u.held && !u.leaving;
    u.beam = Math.max(0, Math.min(1, (u.beam || 0) + (on ? dt * 4 : -dt * 6)));
    const ground = Math.max(0, columnTop(g.grid, u.x, u.z, 1));
    const len = Math.max(1, u.y - 1.1 - ground);
    this.beam.visible = u.beam > 0.01;
    this.beam.position.set(u.x, u.y - 1.1 + wob, u.z);
    this.beam.scale.set(1, len, 1);
    this.beamMat.uniforms.uTime.value = g.real;
    this.beamMat.uniforms.uAlpha.value = u.beam;
    this.beamMat.uniforms.uLen.value = len;
    this.hum?.set(0.18 + 0.2 * u.beam, 0.9 + 0.3 * u.beam);
    if (u.beam > 0.5) this.pull(dt, u, ground);
    if (u.leaving && u.y > 80) this.stop();
  }

  // The tractor beam at work.
  pull(dt, u, ground) {
    const g = this.g;
    const belly = u.y - 1.2;
    // Rip blocks off the top of whatever stands under it: they fly up into the beam.
    u.rip += dt;
    while (u.rip > 1 / RIP_RATE) {
      u.rip -= 1 / RIP_RATE;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.6;
      const px = u.x + Math.cos(a) * r;
      const pz = u.z + Math.sin(a) * r;
      const top = columnTop(g.grid, px, pz, 0.6);
      if (top > 0.5) g.destruction.impact({ x: px, y: top - 0.6, z: pz, radius: 1.3, power: 0.5, dir: { x: 0, y: 1, z: 0 }, shellChance: 0.85, chunky: 0.6, quiet: true });
    }
    // Everything loose in the beam floats up into a slow cloud under the saucer.
    const hover = belly - 2.2;
    g.spray.vortex(u.x, u.z, REACH + 1.5, { top: u.y + 4, hover, spin: 4, pull: 8, ring: 2.2, a: 0.25, dt });
    steerPieces(g, () => [u.x, u.z], REACH, {
      top: u.y,
      max: 24,
      rate: 6,
      dt,
      wake: REACH,
      want: (r, y, ux, uz) => {
        const vin = Math.max(-6, Math.min(6, (2.2 - r) * 3));
        return { x: -uz * 3 + ux * vin, y: Math.max(-4, Math.min(12, (hover - y) * 3)), z: ux * 3 + uz * vin };
      },
    });
    // Little bits that reach the saucer are beamed aboard.
    let n = g.spray.take(u.x, belly, u.z, 1.8);
    for (const p of [...g.pieces.list]) {
      if (p.dead || p.n > 24) continue;
      const t = p.body.translation();
      if (Math.hypot(t.x - u.x, t.y - belly, t.z - u.z) > 2) continue;
      g.pieces.remove(p);
      n++;
    }
    if (n) {
      g.fx.sparkBurst(u.x, belly, u.z, 6 + n * 2, 6, { up: 0.6, colors: MINT, life: 0.6, size: 0.35 });
      sfx.bloop(g.panOf(u.x, belly, u.z));
    }
    // Sparkles drifting up the beam.
    if (Math.random() < 0.6) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * REACH * 0.8;
      g.fx.sparkBurst(u.x + Math.cos(a) * r, ground + 0.5 + Math.random() * 2, u.z + Math.sin(a) * r, 1, 3, { up: 1, colors: MINT, life: 1.2, size: 0.3 });
    }
  }

  stop() {
    this.u = null;
    this.saucer.visible = false;
    this.beam.visible = false;
    this.hum?.stop();
    this.hum = null;
  }

  cancelAll() {
    this.stop();
  }
}

const clamp = (v) => Math.max(-EDGE, Math.min(EDGE, v));
