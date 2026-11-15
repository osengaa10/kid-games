// CANNON: a toy cannon riding a little cloud at the side of the screen. Tap and it swings round
// and fires a cannonball at the spot. The ball punches straight through whatever it meets,
// leaving a tunnel, and keeps going out the other side and into the next thing, slowing down a
// little for every block it plows through, until it drops, bounces and puffs away. Shoot a
// tower low down and it topples away from you. Hold a finger down for rapid fire.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { linearRGB } from '../render/voxels.js';
import { ISLAND } from '../physics/world.js';

const SPEED = 80;
const GRAVITY = 18;
const RADIUS = 1.15;
// The tunnel a ball digs is a little wider than the ball.
const BITE = 1.55;
const MAX_BALLS = 6;
const REPEAT = 0.24;
const SMOKE = linearRGB(0xd8dce6);

function makeCannon() {
  const root = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd9363e, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.35, metalness: 0.3 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x2b3a67, roughness: 0.3, metalness: 0.45 });
  const cloud = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfefff, emissiveIntensity: 0.35, roughness: 0.9 });
  const puff = new THREE.BoxGeometry(1, 0.8, 1);
  for (const [x, y, z, s] of [
    [0, -1.1, 0, 2.5],
    [-1.6, -1.35, 0.3, 1.8],
    [1.6, -1.35, -0.2, 1.9],
    [0.3, -1.5, 1.5, 1.6],
    [-0.4, -1.45, -1.5, 1.7],
  ]) {
    const m = new THREE.Mesh(puff, cloud);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    root.add(m);
  }
  const yaw = new THREE.Group();
  root.add(yaw);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 3), red);
  carriage.position.y = 0.1;
  yaw.add(carriage);
  const wheelGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.45, 18).rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 10).rotateZ(Math.PI / 2);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wheelGeo, gold);
    w.position.set(s * 1.35, 0, 0.2);
    const h = new THREE.Mesh(hubGeo, red);
    h.position.copy(w.position);
    yaw.add(w, h);
  }
  // The barrel, on a pivot that tips it up and down. Its muzzle points along +z.
  const pivot = new THREE.Group();
  pivot.position.y = 1.15;
  yaw.add(pivot);
  const slide = new THREE.Group();
  pivot.add(slide);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.85, 4.6, 22).rotateX(Math.PI / 2).translate(0, 0, 1.1), navy);
  const ring = new THREE.TorusGeometry(0.68, 0.17, 8, 22);
  const front = new THREE.Mesh(ring, gold);
  front.position.z = 3.3;
  const back = new THREE.Mesh(ring.clone().scale(1.22, 1.22, 1), gold);
  back.position.z = -0.7;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), gold);
  knob.position.z = -1.45;
  const muzzle = new THREE.Object3D();
  muzzle.position.z = 3.6;
  slide.add(barrel, front, back, knob, muzzle);
  for (const m of [carriage, barrel]) m.castShadow = true;
  root.userData = { yaw, pivot, slide, muzzle };
  return root;
}

export class Cannon {
  constructor(g) {
    this.g = g;
    this.id = 'cannon';
    this.dragOrbits = true;
    this.balls = [];
    this.holdT = 0;
    this.recoil = 0;
    this.rig = makeCannon();
    this.rig.visible = false;
    g.scene.add(this.rig);
    this.ballGeo = new THREE.SphereGeometry(RADIUS, 22, 16);
    this.ballMat = new THREE.MeshStandardMaterial({ color: 0x2b2f45, roughness: 0.25, metalness: 0.5 });
    this.pool = [];
    // One ball made now, so its look is ready before the first shot.
    this.pool.push(this.makeBall());
    this.tmp = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.want = { yaw: 0, pitch: 0.2 };
  }

  makeBall() {
    const mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
    mesh.castShadow = true;
    mesh.visible = false;
    this.g.scene.add(mesh);
    return { mesh, busy: false, pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3() };
  }

  select() {
    this.rig.visible = true;
    this.place(1);
  }
  deselect() {
    this.rig.visible = false;
  }

  press(sx, sy) {
    this.holdT = -0.15;
    this.fire(sx, sy);
  }
  // Finger held still: rapid fire, scattered a little round the finger.
  hold(sx, sy, dt) {
    this.holdT += dt;
    if (this.holdT >= REPEAT) {
      this.holdT = 0;
      this.fire(sx + (Math.random() - 0.5) * 50, sy + (Math.random() - 0.5) * 40);
    }
  }
  move() {}
  release() {}
  cancel() {}

  fire(sx, sy) {
    const hit = this.g.aim(sx, sy);
    const target = new THREE.Vector3();
    // Into the sky: it just flies off that way.
    if (!hit) this.g.raycaster.ray.at(140, target);
    else target.set(hit.x, hit.y, hit.z);
    this.shoot(target);
  }

  // Fires at a world point (testing, the stress test).
  strike(hit) {
    this.shoot(new THREE.Vector3(hit.x, hit.y, hit.z));
  }

  // The cannon floats beside the camera, a little left and in front, on its cloud.
  place(k) {
    const cam = this.g.camera;
    const right = this.tmp.setFromMatrixColumn(cam.matrixWorld, 0);
    const fwd = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const want = cam.position.clone().addScaledVector(right, -13).addScaledVector(fwd, 32).add(new THREE.Vector3(0, -1.5 + Math.sin(this.g.real * 1.9) * 0.4, 0));
    this.rig.position.lerp(want, k);
  }

  // Points the barrel along `dir` at once (a shot doesn't wait for it to turn).
  aimAlong(dir) {
    this.want.yaw = Math.atan2(dir.x, dir.z);
    this.want.pitch = Math.asin(Math.max(-0.6, Math.min(1, dir.y)));
    const { yaw, pivot } = this.rig.userData;
    yaw.rotation.y = this.want.yaw;
    pivot.rotation.x = -this.want.pitch;
    this.rig.updateMatrixWorld(true);
  }

  shoot(target) {
    const g = this.g;
    if (!this.rig.visible) this.select();
    // Aim from the pivot first, then once more from where the muzzle ended up, so the ball
    // really passes through the spot that was tapped.
    const from = this.rig.userData.pivot.getWorldPosition(new THREE.Vector3());
    const vel = new THREE.Vector3();
    for (let i = 0; i < 2; i++) {
      const d = target.distanceTo(from);
      const t = Math.max(0.05, d / SPEED);
      vel.subVectors(target, from).divideScalar(t);
      vel.y += 0.5 * GRAVITY * t;
      this.aimAlong(this.dir.copy(vel).normalize());
      this.rig.userData.muzzle.getWorldPosition(from);
    }
    let b = this.pool.find((x) => !x.busy);
    if (!b) {
      if (this.pool.length >= MAX_BALLS) {
        b = this.balls.shift();
        b.busy = false;
      } else {
        b = this.makeBall();
        this.pool.push(b);
      }
    }
    Object.assign(b, { busy: true, t: 0, hits: 0, spent: false, bounces: 0, fade: 0, frame: 0 });
    b.pos.copy(from);
    b.prev.copy(from);
    b.vel.copy(vel);
    b.mesh.position.copy(from);
    b.mesh.scale.setScalar(1);
    b.mesh.visible = true;
    this.balls.push(b);
    this.recoil = 1;
    // A puff of smoke and a flash at the muzzle.
    g.fx.dustCloud(from.x, from.y, from.z, 4, 1.2, 0xffffff, { rise: 2, size: 2.2, life: 1 });
    g.fx.sparkBurst(from.x, from.y, from.z, 14, 10, { up: 0.2, life: 0.25, size: 0.35 });
    sfx.cannon(g.panOf(from.x, from.y, from.z));
  }

  update(dt) {
    const g = this.g;
    if (this.rig.visible) {
      this.place(1 - Math.exp(-dt * 8));
      // Between shots it slowly turns back to look at the playground.
      if (!this.balls.length && this.recoil < 0.05) {
        const look = this.tmp.subVectors(g.rig.target, this.rig.position).normalize();
        const yaw = Math.atan2(look.x, look.z);
        const { yaw: y, pivot } = this.rig.userData;
        let d = yaw - y.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        y.rotation.y += d * Math.min(1, dt * 2);
        const pitch = Math.max(-0.35, Math.asin(Math.max(-1, Math.min(1, look.y))));
        pivot.rotation.x += (-pitch - pivot.rotation.x) * Math.min(1, dt * 2);
      }
      this.recoil = Math.max(0, this.recoil - dt * 4);
      this.rig.userData.slide.position.z = -0.9 * Math.sin(this.recoil * Math.PI * 0.5) * this.recoil;
    }
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      if (this.fly(b, dt)) continue;
      b.busy = false;
      b.mesh.visible = false;
      this.balls.splice(i, 1);
    }
  }

  // Moves one ball along; returns false when it's done.
  fly(b, dt) {
    const g = this.g;
    b.t += dt;
    b.frame++;
    if (b.fade > 0) {
      b.fade -= dt;
      b.mesh.scale.setScalar(Math.max(0.01, b.fade / 0.4));
      if (b.fade <= 0) {
        g.fx.poof(b.pos.x, b.pos.y, b.pos.z, 0x2b2f45);
        return false;
      }
      return true;
    }
    b.prev.copy(b.pos);
    b.vel.y -= GRAVITY * dt;
    b.pos.addScaledVector(b.vel, dt);
    b.mesh.position.copy(b.pos);
    b.mesh.rotation.x += dt * 12;
    const speed = b.vel.length();
    if (!b.spent && speed < 16) b.spent = true;
    // Smoke trailing behind.
    if (b.frame % 2 === 0) g.fx.trail(b.pos.x, b.pos.y, b.pos.z, SMOKE);
    if (!b.spent) {
      const d = this.dir.copy(b.vel).divideScalar(speed);
      const n = g.destruction.impact({ x: b.prev.x, y: b.prev.y, z: b.prev.z, shape: 'capsule', to: b.pos, radius: BITE, power: Math.min(1.25, speed / 60), dir: { x: d.x, y: d.y, z: d.z }, shellChance: 0.75, chunky: 0.9, quiet: true });
      if (n > 0) {
        // Plowing through blocks slows it down.
        b.vel.multiplyScalar(Math.max(0.55, 1 - n * 0.0022));
        g.fx.sparkBurst(b.pos.x, b.pos.y, b.pos.z, 5, 12, { up: 0.3 });
        g.fx.shake.add(Math.min(0.12, 0.02 + n * 0.002));
        if (!b.hits++) {
          sfx.boom(0.45, g.panOf(b.pos.x, b.pos.y, b.pos.z));
          g.fx.bursts.star(b.pos.x, b.pos.y, b.pos.z, 4, 0xffffff, { calm: g.fx.calm });
          g.fx.time.hitStop(0.03);
        }
      }
      // It chews through rubble and fallen sections in its way, and shoves the rest aside.
      if (b.frame % 3 === 0) {
        g.destruction.biteLoose(b.pos.x, b.pos.y, b.pos.z, BITE + 0.4, 0.8, 2);
        g.pieces.blast(b.pos.x, b.pos.y, b.pos.z, 3.5, 5, 0.3);
      }
    }
    const onIsland = Math.abs(b.pos.x) < ISLAND && Math.abs(b.pos.z) < ISLAND;
    if (onIsland && b.pos.y < RADIUS) {
      b.pos.y = RADIUS;
      if (!b.spent && b.vel.y < -6) g.destruction.impact({ x: b.pos.x, y: 0.3, z: b.pos.z, radius: 1.8, power: 0.6, quiet: true });
      g.fx.dustCloud(b.pos.x, 0.3, b.pos.z, 4, 2, null, { ring: true, rise: 1.2, size: 2, life: 1.4 });
      sfx.land(6, 'stone', g.panOf(b.pos.x, b.pos.y, b.pos.z), Math.min(1, -b.vel.y / 20));
      if (b.bounces++ >= 2 || Math.abs(b.vel.y) < 4) {
        b.fade = 0.4;
        return true;
      }
      b.vel.y = -b.vel.y * 0.45;
      b.vel.x *= 0.7;
      b.vel.z *= 0.7;
    }
    if (b.pos.y < -3) {
      g.fx.splash(b.pos.x, b.pos.z);
      sfx.splash(g.panOf(b.pos.x, b.pos.y, b.pos.z));
      return false;
    }
    return b.t < 4.5 && b.pos.y < 200;
  }

  cancelAll() {
    for (const b of this.balls) {
      b.busy = false;
      b.mesh.visible = false;
    }
    this.balls = [];
  }
}
