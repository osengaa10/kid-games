// METEOR: tap anywhere and a glowing space rock with a rainbow tail whistles down from the sky
// behind you. A target ring shows where it'll land. Hold your finger down for a meteor shower.
// It digs a round crater, flings chunks outward, rolls a shockwave across the ground and
// breaks into glowing embers.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { linearRGB } from '../render/voxels.js';

const FALL = 0.62;
const RAINBOW = [0xff4d4d, 0xff9f1c, 0xffd23f, 0x5fd35f, 0x2ec4f1, 0x5b6cff, 0xb15cff].map(linearRGB);

export class Meteor {
  constructor(g) {
    this.g = g;
    this.id = 'meteor';
    this.dragOrbits = true;
    this.flying = [];
    this.holdT = 0;
    const rockGeo = new THREE.IcosahedronGeometry(1.7, 1);
    // Lumpy: push the corners in and out a little.
    const p = rockGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 0.85 + ((Math.sin(p.getX(i) * 9.1) + Math.cos(p.getY(i) * 7.3 + p.getZ(i) * 5.7)) * 0.5 + 1) * 0.12;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    rockGeo.computeVertexNormals();
    this.rockGeo = rockGeo;
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x7a4fb0, emissive: 0xff7a1a, emissiveIntensity: 0.9, roughness: 0.6, flatShading: true });
    const ringGeo = new THREE.RingGeometry(1.1, 1.6, 40);
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide });
    this.ringGeo = ringGeo;
    this.pool = [];
  }

  take() {
    let m = this.pool.find((x) => !x.busy);
    if (!m) {
      const rock = new THREE.Mesh(this.rockGeo, this.rockMat);
      rock.castShadow = true;
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat.clone());
      ring.renderOrder = 5;
      m = { rock, ring, busy: false };
      this.g.scene.add(rock, ring);
      this.pool.push(m);
    }
    m.busy = true;
    m.rock.visible = m.ring.visible = true;
    return m;
  }

  press(sx, sy) {
    this.holdT = -0.25;
    this.fire(sx, sy);
  }
  move() {}
  release() {}
  cancel() {}

  // Finger held still: more meteors, scattered around it.
  hold(sx, sy, dt) {
    this.holdT += dt;
    if (this.holdT >= 0.2) {
      this.holdT = 0;
      this.fire(sx + (Math.random() - 0.5) * 120, sy + (Math.random() - 0.5) * 90);
    }
  }

  // Launches at a screen point.
  fire(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (hit) this.launch(hit);
  }

  // Launches at a world point hit = { x, y, z, nx, ny, nz }.
  launch(hit) {
    const g = this.g;
    const cam = g.camera.position;
    let hx = cam.x - hit.x;
    let hz = cam.z - hit.z;
    const hl = Math.hypot(hx, hz) || 1;
    hx /= hl;
    hz /= hl;
    const side = (Math.random() - 0.5) * 16;
    const start = new THREE.Vector3(hit.x + hx * 26 - hz * side, hit.y + 52, hit.z + hz * 26 + hx * side);
    const end = new THREE.Vector3(hit.x - hit.nx * 0.4, hit.y - hit.ny * 0.4, hit.z - hit.nz * 0.4);
    const m = this.take();
    m.start = start;
    m.end = end;
    m.hit = hit;
    m.t = 0;
    m.trail = 0;
    m.spin = new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    m.rock.position.copy(start);
    m.ring.position.set(hit.x + hit.nx * 0.08, hit.y + hit.ny * 0.08, hit.z + hit.nz * 0.08);
    m.ring.lookAt(hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz);
    this.flying.push(m);
    sfx.meteorFall(FALL, g.panOf(hit.x, hit.y, hit.z));
  }

  update(dt) {
    const g = this.g;
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const m = this.flying[i];
      m.t += dt / FALL;
      const t = Math.min(1, m.t);
      // Speeds up as it falls.
      const e = t * t * (0.6 + 0.4 * t);
      m.rock.position.lerpVectors(m.start, m.end, e);
      m.rock.rotation.x += m.spin.x * dt;
      m.rock.rotation.y += m.spin.y * dt;
      m.rock.scale.setScalar(1 + 0.15 * Math.sin(g.time * 40));
      // The target ring pulses and closes in as it arrives.
      const s = 2.6 - 1.4 * t + 0.15 * Math.sin(g.time * 18);
      m.ring.scale.setScalar(s);
      m.ring.material.opacity = 0.5 + 0.45 * t;
      // A rainbow tail.
      m.trail += dt;
      while (m.trail > 0.012) {
        m.trail -= 0.012;
        const c = RAINBOW[Math.floor((g.time * 14 + i) % RAINBOW.length)];
        g.fx.trail(m.rock.position.x, m.rock.position.y, m.rock.position.z, c);
      }
      if (m.t >= 1) {
        this.flying.splice(i, 1);
        m.busy = false;
        m.rock.visible = m.ring.visible = false;
        this.explode(m.end, m.hit);
      }
    }
  }

  explode(p, hit) {
    const g = this.g;
    if (hit.water) {
      g.fx.splash(p.x, p.z);
      g.fx.splash(p.x + 1, p.z - 1);
      g.fx.dustCloud(p.x, -2.5, p.z, 12, 6, 0xffffff, { ring: true, size: 2.5 });
      sfx.splash(g.panOf(p.x, p.y, p.z));
      sfx.boom(0.5, g.panOf(p.x, p.y, p.z));
      return;
    }
    const n = g.destruction.impact({ x: p.x, y: p.y, z: p.z, radius: 4, power: 1.15 });
    g.fx.blast(p.x, p.y, p.z, 1.15);
    // The rock itself breaks into glowing pieces.
    g.fx.embers(p.x, p.y + 1, p.z, 30, 16);
    g.pieces.blast(p.x, p.y, p.z, 14, 9, 0.6);
    g.blastNear(p.x, p.y, p.z, 9);
    g.wave(p.x, p.z, 1);
    sfx.boom(1, g.panOf(p.x, p.y, p.z));
    return n;
  }
}
