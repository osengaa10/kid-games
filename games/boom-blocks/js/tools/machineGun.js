// MACHINE GUN: a chunky toy gatling gun hovers beside you on a propeller. Put a finger down and
// its six barrels spin up and it rattles off a stream of glowing bullets at the finger; drag to
// sweep it along a wall. Every bullet chips a little hole (the blocks spray out of it), sparks
// fly, and brass shells tumble off the side. Bullets that hit rubble send it jumping.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { linearRGB } from '../render/voxels.js';
import { MAT } from '../core/materials.js';

const RATE = 16;
const SPEED = 260;
const SPIN_UP = 0.22;
// Bullets scatter this far (screen pixels) round the finger.
const JITTER = 10;
const TRACERS = 24;
const SPARK = [0xffffff, 0xfff2a8, 0xffc23d].map(linearRGB);

function makeGun() {
  const root = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7b2e, roughness: 0.4 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc7cfdb, roughness: 0.3, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f45, roughness: 0.5 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2ec4f1, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 3), orange);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.9), dark);
  grip.position.set(0, -1.2, -0.7);
  grip.rotation.x = -0.3;
  // A round drum of bullets on the side.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.9, 20).rotateZ(Math.PI / 2), yellow);
  drum.position.set(-1.5, -0.2, 0);
  // The six barrels, on a cluster that spins.
  const spin = new THREE.Group();
  spin.position.z = 1.5;
  const barrel = new THREE.CylinderGeometry(0.17, 0.17, 3.6, 8).rotateX(Math.PI / 2).translate(0, 0, 1.8);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const b = new THREE.Mesh(barrel, steel);
    b.position.set(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0);
    spin.add(b);
  }
  for (const z of [0.2, 3.3]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 16).rotateX(Math.PI / 2), z > 1 ? blue : dark);
    plate.position.z = z;
    spin.add(plate);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.z = 5.4;
  // The muzzle flash: a bright cross of two flat stars, flickering while it fires.
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const star = new THREE.CircleGeometry(1, 6);
  const flash = new THREE.Group();
  for (const r of [0, Math.PI / 2]) {
    const m = new THREE.Mesh(star, flashMat);
    m.rotation.y = r;
    m.scale.set(0.5, 0.5, 1);
    flash.add(m);
  }
  flash.position.z = 5.6;
  flash.visible = false;
  // Where the empty shells pop out.
  const port = new THREE.Object3D();
  port.position.set(1.2, 0.4, 0.5);
  // A propeller on a little mast keeps it up.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), dark);
  mast.position.y = 1.2;
  const prop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xff5fa2 }));
  prop.position.y = 1.65;
  for (const m of [body, drum]) m.castShadow = true;
  root.add(body, grip, drum, spin, muzzle, flash, port, mast, prop);
  root.userData = { spin, muzzle, flash, port, prop };
  return root;
}

export class MachineGun {
  constructor(g) {
    this.g = g;
    this.id = 'gun';
    this.dragOrbits = false;
    this.active = false;
    this.gun = makeGun();
    this.gun.visible = false;
    g.scene.add(this.gun);
    this.sx = 0;
    this.sy = 0;
    this.spin = 0;
    this.shotT = 0;
    this.stopAt = 0;
    this.whir = null;
    this.look = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    // Tracers: thin glowing streaks, pooled.
    const tracerGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.tracers = [];
    for (let i = 0; i < TRACERS; i++) {
      const mesh = new THREE.Mesh(tracerGeo, tracerMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      g.scene.add(mesh);
      this.tracers.push({ mesh, busy: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, len: 1, hit: null });
    }
  }

  select() {
    this.gun.visible = true;
    this.place(1);
  }
  deselect() {
    this.cancel();
    this.gun.visible = false;
  }

  press(sx, sy) {
    this.active = true;
    this.sx = sx;
    this.sy = sy;
    this.shotT = 0;
    this.stopAt = 0;
  }
  move(sx, sy) {
    this.sx = sx;
    this.sy = sy;
  }
  release() {
    this.active = false;
  }
  cancel() {
    this.active = false;
  }

  // A one-second burst at a world point (testing, the stress test).
  strike(hit) {
    if (!this.gun.visible) this.select();
    [this.sx, this.sy] = this.g.screenOf(hit.x, hit.y, hit.z);
    this.active = true;
    this.spin = 1;
    this.stopAt = this.g.time + 1;
  }

  // The gun floats beside the camera, a little right and in front.
  place(k) {
    const cam = this.g.camera;
    const right = this.tmp.setFromMatrixColumn(cam.matrixWorld, 0);
    const fwd = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const want = cam.position.clone().addScaledVector(right, 13).addScaledVector(fwd, 33).add(new THREE.Vector3(0, -1 + Math.sin(this.g.real * 2.1) * 0.4, 0));
    this.gun.position.lerp(want, k);
  }

  update(dt) {
    const g = this.g;
    if (this.stopAt && g.time > this.stopAt) {
      this.active = false;
      this.stopAt = 0;
    }
    const { spin, flash, prop } = this.gun.userData;
    // Barrels spin up before the first shot and wind down after the last.
    this.spin = Math.max(0, Math.min(1, this.spin + ((this.active ? 1 : -0.6) * dt) / SPIN_UP));
    if (this.spin > 0 || this.active) {
      if (!this.whir) this.whir = sfx.gunSpin();
      this.whir?.set(0.2 * this.spin, 0.5 + this.spin);
    } else if (this.whir) {
      this.whir.stop();
      this.whir = null;
    }
    if (this.gun.visible) {
      this.place(1 - Math.exp(-dt * 8));
      prop.rotation.y += dt * 30;
      spin.rotation.z += dt * 40 * this.spin;
      // Turn toward the finger while firing, toward the playground otherwise.
      if (this.active) {
        const hit = g.aim(this.sx, this.sy);
        if (hit) this.tmp.set(hit.x, hit.y, hit.z);
        else g.raycaster.ray.at(150, this.tmp);
      } else this.tmp.copy(g.rig.target);
      this.look.lerp(this.tmp, 1 - Math.exp(-dt * 20));
      this.gun.lookAt(this.look);
    }
    let fired = false;
    if (this.active && this.spin >= 1) {
      this.shotT += dt;
      while (this.shotT > 1 / RATE) {
        this.shotT -= 1 / RATE;
        this.shoot();
        fired = true;
      }
    }
    flash.visible = fired || (this.active && this.spin >= 1 && Math.random() < 0.5);
    if (flash.visible) {
      flash.rotation.z = Math.random() * Math.PI;
      flash.scale.setScalar(0.7 + Math.random() * 0.6);
    }
    for (const t of this.tracers) {
      if (!t.busy) continue;
      t.t += dt;
      const k = Math.min(1, (t.t * SPEED) / t.len);
      // The streak's head runs from the muzzle to the target; its tail follows a few units back.
      t.mesh.position.lerpVectors(t.from, t.to, k);
      t.mesh.scale.set(1, 1, Math.min(4, k * t.len));
      if (k >= 1) {
        t.busy = false;
        t.mesh.visible = false;
        if (t.hit) this.land(t.hit, t.dir);
      }
    }
  }

  // Fires one bullet at the finger (scattered a little).
  shoot() {
    const g = this.g;
    const hit = g.aim(this.sx + (Math.random() - 0.5) * 2 * JITTER, this.sy + (Math.random() - 0.5) * 2 * JITTER);
    const { muzzle, port } = this.gun.userData;
    const from = muzzle.getWorldPosition(new THREE.Vector3());
    const to = new THREE.Vector3();
    if (hit) to.set(hit.x, hit.y, hit.z);
    else g.raycaster.ray.at(150, to);
    const t = this.tracers.find((x) => !x.busy) || this.tracers[0];
    t.busy = true;
    t.t = 0;
    t.from.copy(from);
    t.to.copy(to);
    t.len = Math.max(0.1, from.distanceTo(to));
    t.hit = hit;
    t.dir = to.clone().sub(from).normalize();
    t.mesh.position.copy(from);
    t.mesh.lookAt(to);
    t.mesh.scale.set(1, 1, 0.01);
    t.mesh.visible = true;
    // An empty shell pops out of the side and tumbles away.
    if (this.gun.visible) {
      const p = port.getWorldPosition(this.tmp);
      const out = new THREE.Vector3().setFromMatrixColumn(this.gun.matrixWorld, 0);
      g.fx.crumble(p.x, p.y, p.z, 0xe0a82e, MAT.METAL, p.x - out.x, p.y - 0.6, p.z - out.z, 0.5);
    }
    g.fx.shake.add(0.012);
    sfx.gunShot(g.panOf(to.x, to.y, to.z));
  }

  // A bullet arrives.
  land(hit, dir) {
    const g = this.g;
    const { x, y, z } = hit;
    if (hit.water) {
      g.fx.sparkBurst(x, y + 0.2, z, 6, 8, { up: 0.9, colors: [linearRGB(0xffffff), linearRGB(0x9fe3ff)], life: 0.5, size: 0.3 });
      return;
    }
    if (g.physics.isStatic(hit.collider)) {
      g.destruction.impact({ x: x - dir.x * 0.4, y: y - dir.y * 0.4, z: z - dir.z * 0.4, radius: 1.05, power: 0.7, dir, shellChance: 0.6, chunky: 0.4, quiet: true });
    } else {
      // A loose piece (a fallen section, a chunk of rubble): the bullet bites a bit off it.
      const body = hit.collider?.parent?.();
      const p = body && g.pieces.byHandle.get(body.handle);
      if (p) g.destruction.bite(p, { x, y, z }, 1, 0.45);
    }
    // Rubble round the hit jumps.
    g.push(x, y, z, 2.5, 3, 0.4);
    g.fx.sparkBurst(x + (hit.nx ?? 0) * 0.3, y + (hit.ny ?? 0) * 0.3, z + (hit.nz ?? 0) * 0.3, 6, 14, { up: 0.4, colors: SPARK, life: 0.35, size: 0.26 });
    if (Math.random() < 0.15) g.fx.dustCloud(x, y, z, 1, 0.8, null, { rise: 2, size: 1.2, life: 0.9 });
  }

  cancelAll() {
    this.active = false;
    this.spin = 0;
    this.stopAt = 0;
    for (const t of this.tracers) {
      t.busy = false;
      t.mesh.visible = false;
    }
  }
}
