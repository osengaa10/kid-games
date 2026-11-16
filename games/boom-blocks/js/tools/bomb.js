// BOMB: tap and a round cartoon bomb drops in, bounces and rolls (it's a real physics ball), its
// fuse fizzing. It swells and blinks faster and faster, then BOOM: the biggest blast of all,
// throwing everything nearby up into the air. Bombs caught in another blast go off early.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';

const FUSE = 1.2;
const R = 1.5;
const MAX = 5;

export class Bomb {
  constructor(g) {
    this.g = g;
    this.id = 'bomb';
    this.dragOrbits = true;
    this.live = [];
    this.geo = new THREE.SphereGeometry(R, 24, 16);
    this.capGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.6, 12);
    this.fuseGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 6).translate(0, 0.5, 0);
    this.capMat = new THREE.MeshStandardMaterial({ color: 0x8a90b0, roughness: 0.4, metalness: 0.4 });
    this.fuseMat = new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.8 });
  }

  press(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (hit) this.drop(hit);
  }
  move() {}
  release() {}
  cancel() {}

  drop(hit) {
    const g = this.g;
    if (this.live.length >= MAX) this.explode(this.live[0]);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2b2f45, roughness: 0.25, metalness: 0.1, emissive: 0xff2020, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.castShadow = true;
    const cap = new THREE.Mesh(this.capGeo, this.capMat);
    cap.position.y = R * 0.95;
    const fuse = new THREE.Mesh(this.fuseGeo, this.fuseMat);
    fuse.position.y = R * 1.15;
    fuse.rotation.z = 0.4;
    mesh.add(cap, fuse);
    g.scene.add(mesh);
    const Rp = g.physics.R;
    const y = Math.max(hit.y, 0) + 9;
    const body = g.physics.world.createRigidBody(
      Rp.RigidBodyDesc.dynamic()
        .setTranslation(hit.x + hit.nx * R, y, hit.z + hit.nz * R)
        .setLinvel((Math.random() - 0.5) * 3, -6, (Math.random() - 0.5) * 3)
        .setAngvel({ x: Math.random() * 4, y: 0, z: Math.random() * 4 })
        .setCcdEnabled(false),
    );
    g.physics.world.createCollider(g.physics.roundDesc(R).setRestitution(0.55).setFriction(0.6).setDensity(2), body);
    const b = { mesh, body, mat, fuse, t: 0, fuseLeft: FUSE };
    this.live.push(b);
    sfx.fizz(FUSE, g.panOf(hit.x, hit.y, hit.z));
  }

  // Another blast at (x, z) within radius: bombs in it go off almost at once.
  nudge(x, y, z, radius) {
    for (const b of this.live) {
      const p = b.body.translation();
      if (Math.hypot(p.x - x, p.y - y, p.z - z) < radius) b.fuseLeft = Math.min(b.fuseLeft, 0.12 + Math.random() * 0.1);
    }
  }

  update(dt) {
    const g = this.g;
    for (const b of [...this.live]) {
      b.t += dt;
      b.fuseLeft -= dt;
      const p = b.body.translation();
      const q = b.body.rotation();
      b.mesh.position.set(p.x, p.y, p.z);
      b.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      // Swells and blinks faster as the fuse runs down.
      const urgency = 1 - Math.max(0, b.fuseLeft) / FUSE;
      const blink = Math.sin(b.t * (8 + urgency * 40)) > 0 ? 1 : 0;
      b.mat.emissiveIntensity = blink * (0.2 + urgency * 1.2);
      b.mesh.scale.setScalar(1 + urgency * 0.35 + blink * urgency * 0.08);
      // Sparks fizzing off the fuse tip.
      const tip = b.fuse.localToWorld(new THREE.Vector3(0, 1, 0));
      g.fx.sparkBurst(tip.x, tip.y, tip.z, 2, 5, { up: 0.8, life: 0.3, size: 0.25 });
      if (p.y < -4) {
        this.remove(b);
        continue;
      }
      if (b.fuseLeft <= 0) this.explode(b);
    }
  }

  remove(b) {
    const i = this.live.indexOf(b);
    if (i >= 0) this.live.splice(i, 1);
    this.g.physics.world.removeRigidBody(b.body);
    this.g.scene.remove(b.mesh);
    b.mat.dispose();
  }

  explode(b) {
    const g = this.g;
    const p = { ...b.body.translation() };
    this.remove(b);
    g.destruction.impact({ x: p.x, y: p.y, z: p.z, radius: 5.8, power: 1.5, shellChance: 0.85 });
    g.fx.blast(p.x, p.y, p.z, 1.55);
    g.fx.bursts.ring(p.x, Math.max(0, p.y - 1), p.z, 20, { color: 0xffffff, life: 0.8, width: 0.15, alpha: 0.8 });
    // A rising smoke column.
    g.fx.dustCloud(p.x, p.y + 2, p.z, 14, 2.5, 0x9a9aa8, { rise: 10, size: 3.6, life: 3.2 });
    // Throws everything nearby UP.
    g.push(p.x, p.y, p.z, 17, 11, 1.6);
    g.blastNear(p.x, p.y, p.z, 12);
    g.wave(p.x, p.z, 1.4);
    g.fx.shake.add(0.3);
    sfx.boom(1.5, g.panOf(p.x, p.y, p.z));
  }

  cancelAll() {
    for (const b of [...this.live]) this.remove(b);
  }

  // The physics world was replaced: the old bodies are gone with it.
  physicsReset() {
    for (const b of this.live) {
      this.g.scene.remove(b.mesh);
      b.mat.dispose();
    }
    this.live = [];
  }
}
