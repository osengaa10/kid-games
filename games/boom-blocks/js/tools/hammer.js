// HAMMER: tap and a giant squeaky toy mallet winds up behind you and slams straight down on the
// spot: whatever is under it gets crushed flat from the top down, chunks squirt out sideways,
// and the ground-slam shockwave makes every loose piece nearby jump. BONK!
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { BLOCK, toCellX, toCellZ } from '../core/grid.js';

const HANDLE = 14;
const HEAD_R = 2.8;
const HEAD_LEN = 7;
const WIND = 0.2;
const SLAM = 0.13;
const SQUASH = 0.28;
const LIFT = 0.45;

export class Hammer {
  constructor(g) {
    this.g = g;
    this.id = 'hammer';
    this.dragOrbits = true;
    this.pool = [];
    const pink = new THREE.MeshStandardMaterial({ color: 0xff5fa2, roughness: 0.35 });
    const light = new THREE.MeshStandardMaterial({ color: 0xff9cc8, roughness: 0.35 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 });
    this.make = () => {
      const outer = new THREE.Group();
      const swing = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, HANDLE, 12).rotateX(Math.PI / 2).translate(0, 0, HANDLE / 2), yellow);
      const head = new THREE.Group();
      head.position.z = HANDLE;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(HEAD_R, HEAD_R, HEAD_LEN, 28), [pink, light, light]);
      head.add(body);
      for (const s of [-1, 1]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R, 0.35, 8, 28).rotateX(Math.PI / 2), light);
        band.position.y = s * (HEAD_LEN / 2 - 0.7);
        head.add(band);
      }
      for (const m of [handle, body]) m.castShadow = true;
      swing.add(handle, head);
      outer.add(swing);
      outer.visible = false;
      g.scene.add(outer);
      return { outer, swing, head, busy: false };
    };
  }

  press(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (!hit || hit.water) return;
    this.smash(hit);
  }
  move() {}
  release() {}
  cancel() {}

  smash(hit) {
    const g = this.g;
    let h = this.pool.find((x) => !x.busy);
    if (!h) {
      h = this.make();
      this.pool.push(h);
    }
    const cam = g.camera.position;
    let dx = hit.x - cam.x;
    let dz = hit.z - cam.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d;
    dz /= d;
    // Find the top of whatever stands under the spot, so the head lands on it.
    const top = this.topAt(hit.x, hit.z);
    const y = Math.max(top, 0);
    h.outer.position.set(hit.x - dx * HANDLE, y + HEAD_LEN / 2, hit.z - dz * HANDLE);
    h.outer.rotation.set(0, Math.atan2(dx, dz), 0);
    h.outer.visible = true;
    h.outer.scale.setScalar(1);
    h.busy = true;
    h.t = 0;
    h.hit = { x: hit.x, y, z: hit.z };
    h.done = false;
    sfx.whoosh(g.panOf(hit.x, y, hit.z));
  }

  // Height of the top of the standing blocks around (x, z) (0 on bare ground).
  topAt(x, z) {
    const { grid } = this.g;
    const gx = toCellX(x);
    const gz = toCellZ(z);
    const reach = Math.round(2 / BLOCK);
    let top = 0;
    for (let oz = -reach; oz <= reach; oz++)
      for (let ox = -reach; ox <= reach; ox++) {
        if (!grid.inside(gx + ox, 0, gz + oz)) continue;
        for (let y = grid.top - 1; y >= 0; y--)
          if (grid.mat[grid.index(gx + ox, y, gz + oz)]) {
            top = Math.max(top, y + 1);
            break;
          }
      }
    return top * BLOCK;
  }

  update(dt) {
    for (const h of this.pool) {
      if (!h.busy) continue;
      h.t += dt;
      const t = h.t;
      let a;
      if (t < WIND) {
        // Wind up: raised high, pulling back a little further.
        const k = t / WIND;
        a = -1.5 - 0.6 * Math.sin(k * Math.PI * 0.5);
      } else if (t < WIND + SLAM) {
        // Slam: accelerating down.
        const k = (t - WIND) / SLAM;
        a = -2.1 * (1 - k * k);
      } else {
        if (!h.done) {
          h.done = true;
          this.bonk(h);
        }
        const k = t - WIND - SLAM;
        if (k < SQUASH) {
          a = -0.12 * Math.sin((k / SQUASH) * Math.PI);
          const s = 1 - 0.35 * Math.sin((k / SQUASH) * Math.PI) * Math.exp(-k * 6);
          h.head.scale.set(1 + (1 - s) * 0.8, s, 1 + (1 - s) * 0.8);
        } else {
          const j = (k - SQUASH) / LIFT;
          a = -1.4 * j;
          h.head.scale.setScalar(1);
          h.outer.scale.setScalar(Math.max(0.001, 1 - j));
          if (j >= 1) {
            h.busy = false;
            h.outer.visible = false;
          }
        }
      }
      h.swing.rotation.x = a;
    }
  }

  bonk(h) {
    const g = this.g;
    const { x, y, z } = h.hit;
    g.destruction.impact({ x, y: y - 6, z, shape: 'column', hw: 3.4, depth: 14, power: 1.15, bite: { x, y: Math.max(0.5, y - 1), z, radius: 3.6 } });
    // Ground slam: a ring rolls out and every loose piece around jumps.
    g.fx.bursts.ring(x, 0.1, z, 18, { color: 0xffffff, life: 0.6, width: 0.2, alpha: 0.9 });
    g.fx.bursts.ring(x, 0.1, z, 11, { color: 0xff9cc8, life: 0.8, width: 0.45, alpha: 0.6 });
    g.fx.bursts.star(x, y + 0.5, z, 6, 0xff9cc8, { calm: g.fx.calm });
    g.fx.dustCloud(x, Math.max(0.3, y), z, 22, 11, null, { ring: true, rise: 1.5, size: 3, life: 2.4 });
    g.fx.sparkBurst(x, y + 0.5, z, 40, 18, { up: 0.6, colors: undefined });
    g.pieces.blast(x, 0, z, 18, 7, 2.2);
    g.blastNear(x, 0, z, 10);
    g.wave(x, z, 1.5);
    g.fx.shake.add(0.5);
    g.fx.time.hitStop(0.07);
    sfx.bonk(g.panOf(x, y, z));
  }
}
