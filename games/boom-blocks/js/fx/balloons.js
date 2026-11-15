// Balloons from a surprise: they bob up into the sky, swaying on their strings, and pop into
// confetti high above the playground.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';

const COLORS = [0xff4d4d, 0xffd23f, 0x2ec4f1, 0x5fd35f, 0xb15cff, 0xff5fa2, 0xff9f1c];

export class Balloons {
  constructor(g) {
    this.g = g;
    this.live = [];
    this.geo = new THREE.SphereGeometry(1, 20, 14).scale(1, 1.2, 1);
    this.knot = new THREE.ConeGeometry(0.25, 0.4, 8).translate(0, -1.3, 0);
    this.string = new THREE.CylinderGeometry(0.04, 0.04, 3, 4).translate(0, -2.9, 0);
    this.stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mats = COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.05 }));
  }

  release(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const mat = this.mats[i % this.mats.length];
      const group = new THREE.Group();
      group.add(new THREE.Mesh(this.geo, mat), new THREE.Mesh(this.knot, mat), new THREE.Mesh(this.string, this.stringMat));
      group.position.set(x + (Math.random() - 0.5) * 3, y, z + (Math.random() - 0.5) * 3);
      group.scale.setScalar(0.01);
      this.g.scene.add(group);
      this.live.push({ group, t: -i * 0.12, speed: 5 + Math.random() * 3, phase: Math.random() * 6, top: 38 + Math.random() * 14 });
    }
  }

  update(dt) {
    const g = this.g;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const b = this.live[i];
      b.t += dt;
      if (b.t < 0) continue;
      const p = b.group.position;
      p.y += b.speed * dt;
      p.x += Math.sin(b.t * 1.7 + b.phase) * dt * 1.5;
      p.z += Math.cos(b.t * 1.3 + b.phase) * dt * 1.5;
      b.group.rotation.z = Math.sin(b.t * 2 + b.phase) * 0.15;
      b.group.scale.setScalar(Math.min(1.4, b.t * 4));
      if (p.y > b.top) {
        g.fx.confetti(p.x, p.y, p.z, 40, 10, { up: 0.3 });
        sfx.balloonPop(g.panOf(p.x, p.y, p.z));
        g.scene.remove(b.group);
        this.live.splice(i, 1);
      }
    }
  }

  clear() {
    for (const b of this.live) this.g.scene.remove(b.group);
    this.live = [];
  }
}
