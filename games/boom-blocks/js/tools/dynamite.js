// DYNAMITE: tap to stick bundles of dynamite onto things: walls, towers, rubble, the ground.
// Each one blinks and beeps. Press the big plunger that pops up over the tools and they go off
// one after another, BOOM-BOOM-BOOM, in the order they were put on: knock out all of a tower's
// feet and it drops straight down like a real demolition. If nobody presses it, they go off by
// themselves a few seconds after the last one. Dynamite caught in another blast goes off early,
// and so does a bundle whose wall gets knocked away from under it.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { toCellX, toCellY, toCellZ } from '../core/grid.js';
import { rotate } from '../physics/pieces.js';

const WAIT = 4.5;
const GAP = 0.16;
const MAX = 12;
const SIZE = 1.6;

// Shared by every bundle.
let parts = null;
function bundleParts() {
  if (parts) return parts;
  parts = {
    red: new THREE.MeshStandardMaterial({ color: 0xe8333b, roughness: 0.45 }),
    tape: new THREE.MeshStandardMaterial({ color: 0x2b2f45, roughness: 0.6 }),
    fuse: new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.8 }),
    // The blinking light: one material, so every bundle blinks together.
    light: new THREE.MeshBasicMaterial({ color: 0xff2020 }),
    stick: new THREE.CylinderGeometry(0.34, 0.34, 2.3, 14),
    band: new THREE.BoxGeometry(2.3, 0.42, 0.85),
    wick: new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6).translate(0, 0.45, 0),
    bulb: new THREE.SphereGeometry(0.2, 10, 8),
  };
  return parts;
}

// Three red sticks taped together, lying in their own x-y plane with +z facing out from
// whatever they're stuck to. Returns the group and the fuse tip.
function makeBundle() {
  const P = bundleParts();
  const root = new THREE.Group();
  for (const x of [-0.68, 0, 0.68]) {
    const m = new THREE.Mesh(P.stick, P.red);
    m.position.set(x, 0, 0.36);
    m.castShadow = true;
    root.add(m);
  }
  const band = new THREE.Mesh(P.band, P.tape);
  band.position.set(0, 0.2, 0.36);
  const light = new THREE.Mesh(P.bulb, P.light);
  light.position.set(0, 0.2, 0.86);
  const wick = new THREE.Mesh(P.wick, P.fuse);
  wick.position.set(0, 1.15, 0.36);
  wick.rotation.z = -0.5;
  const tip = new THREE.Object3D();
  tip.position.y = 0.9;
  wick.add(tip);
  root.add(band, light, wick);
  root.scale.setScalar(SIZE);
  return { root, tip };
}

export class Dynamite {
  constructor(g) {
    this.g = g;
    this.id = 'dynamite';
    this.dragOrbits = true;
    this.charges = [];
    this.timer = 0;
    this.beepT = 0;
    // One made now and kept out of sight, so its look is ready before the first tap.
    this.template = makeBundle().root;
    this.template.visible = false;
    g.scene.add(this.template);
    this.basis = new THREE.Matrix4();
    this.tmp = new THREE.Vector3();
  }

  press(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (!hit || hit.water) return;
    this.plant(hit);
  }
  move() {}
  release() {}
  cancel() {}

  // Plants one at a world point and sets it off soon after (testing, the stress test).
  strike(hit) {
    this.plant(hit);
    this.timer = Math.min(this.timer, 0.5);
  }

  get count() {
    return this.charges.length;
  }

  plant(hit) {
    const g = this.g;
    if (this.charges.length >= MAX) this.detonate();
    const n = new THREE.Vector3(hit.nx ?? 0, hit.ny ?? 1, hit.nz ?? 0).normalize();
    // Lying flat against the surface, the sticks standing up the wall (or, on a roof, pointing
    // away from the camera).
    const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3().setFromMatrixColumn(g.camera.matrixWorld, 2).negate().setY(0).normalize() : new THREE.Vector3(0, 1, 0);
    const y = up.clone().addScaledVector(n, -up.dot(n)).normalize();
    const x = new THREE.Vector3().crossVectors(y, n);
    const { root: mesh, tip } = makeBundle();
    mesh.quaternion.setFromRotationMatrix(this.basis.makeBasis(x, y, n));
    mesh.position.set(hit.x, hit.y, hit.z);
    g.scene.add(mesh);
    const c = { mesh, tip, x: hit.x, y: hit.y, z: hit.z, nx: n.x, ny: n.y, nz: n.z, fuse: Infinity, cell: -1, piece: null };
    // What it's stuck to: the standing blocks (it goes off if that block is knocked away), a
    // loose piece (it rides along), or the ground.
    const body = hit.collider?.parent?.();
    if (hit.collider && g.physics.isStatic(hit.collider)) {
      const cx = toCellX(hit.x - n.x * 0.25);
      const cy = toCellY(hit.y - n.y * 0.25);
      const cz = toCellZ(hit.z - n.z * 0.25);
      if (g.grid.inside(cx, cy, cz)) c.cell = g.grid.index(cx, cy, cz);
    } else if (body && g.pieces.byHandle.get(body.handle)) {
      const p = g.pieces.byHandle.get(body.handle);
      const t = p.body.translation();
      const q = p.body.rotation();
      const inv = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
      c.piece = p;
      c.local = rotate(inv, hit.x - t.x, hit.y - t.y, hit.z - t.z);
      c.localN = rotate(inv, n.x, n.y, n.z);
      c.localQ = new THREE.Quaternion(inv.x, inv.y, inv.z, inv.w).multiply(mesh.quaternion);
    }
    this.charges.push(c);
    this.timer = WAIT;
    this.beepT = 0.35;
    g.fx.dustCloud(hit.x + n.x * 0.5, hit.y + n.y * 0.5, hit.z + n.z * 0.5, 2, 0.8, 0xffffff, { rise: 1, size: 1.2, life: 0.6 });
    sfx.stick(g.panOf(hit.x, hit.y, hit.z));
    this.g.ui.showPlunger(true);
  }

  // The plunger: everything planted goes off, one after another.
  detonate() {
    if (!this.charges.length) return;
    this.charges.forEach((c, i) => (c.fuse = Math.min(c.fuse, 0.08 + i * GAP)));
    this.timer = Infinity;
    sfx.plunger();
    this.g.ui.showPlunger(false);
  }

  // Another blast at (x, y, z): dynamite in it goes off almost at once.
  nudge(x, y, z, radius) {
    for (const c of this.charges) if (Math.hypot(c.x - x, c.y - y, c.z - z) < radius) c.fuse = Math.min(c.fuse, 0.1 + Math.random() * 0.1);
  }

  update(dt) {
    const g = this.g;
    if (!this.charges.length) return;
    if (Number.isFinite(this.timer)) {
      this.timer -= dt;
      if (this.timer <= 0) this.detonate();
      // Beeping, faster and higher as time runs out.
      this.beepT -= dt;
      if (this.beepT <= 0) {
        const hurry = this.timer < 1.5;
        this.beepT = hurry ? 0.18 : 0.55;
        const c = this.charges[this.charges.length - 1];
        sfx.beep(hurry, g.panOf(c.x, c.y, c.z));
      }
    }
    const lit = Math.sin(g.real * (Number.isFinite(this.timer) && this.timer > 1.5 ? 9 : 30)) > 0;
    bundleParts().light.color.setHex(lit ? 0xff2020 : 0x550808);
    for (const c of [...this.charges]) {
      if (c.piece) {
        if (c.piece.dead) c.fuse = Math.min(c.fuse, 0.05);
        else {
          const t = c.piece.body.translation();
          const q = c.piece.body.rotation();
          const [ox, oy, oz] = rotate(q, c.local[0], c.local[1], c.local[2]);
          [c.nx, c.ny, c.nz] = rotate(q, c.localN[0], c.localN[1], c.localN[2]);
          c.x = t.x + ox;
          c.y = t.y + oy;
          c.z = t.z + oz;
          c.mesh.position.set(c.x, c.y, c.z);
          c.mesh.quaternion.set(q.x, q.y, q.z, q.w).multiply(c.localQ);
        }
      } else if (c.cell >= 0 && !g.grid.mat[c.cell]) c.fuse = Math.min(c.fuse, 0.12);
      // Once lit, the fuse fizzes.
      if (Number.isFinite(c.fuse)) {
        const tip = c.tip.getWorldPosition(this.tmp);
        g.fx.sparkBurst(tip.x, tip.y, tip.z, 2, 5, { up: 0.8, life: 0.3, size: 0.25 });
      }
      c.fuse -= dt;
      if (c.fuse <= 0) this.explode(c);
    }
  }

  explode(c) {
    const g = this.g;
    this.remove(c);
    const x = c.x - c.nx * 0.6;
    const y = c.y - c.ny * 0.6;
    const z = c.z - c.nz * 0.6;
    g.destruction.impact({ x, y, z, radius: 3.1, power: 1.2, shellChance: 0.8 });
    g.fx.blast(x, y, z, 1);
    g.push(x, y, z, 11, 8, 0.8);
    g.blastNear(x, y, z, 7);
    g.wave(x, z, 1);
    sfx.boom(1.1, g.panOf(x, y, z));
    if (!this.charges.length) g.ui.showPlunger(false);
  }

  remove(c) {
    const i = this.charges.indexOf(c);
    if (i >= 0) this.charges.splice(i, 1);
    this.g.scene.remove(c.mesh);
  }

  cancelAll() {
    for (const c of [...this.charges]) this.remove(c);
    this.timer = 0;
    this.g.ui?.showPlunger(false);
  }

  // The physics world was replaced: bundles riding on loose pieces go with them.
  physicsReset() {
    for (const c of [...this.charges]) if (c.piece) this.remove(c);
    if (!this.charges.length) this.g.ui.showPlunger(false);
  }
}
