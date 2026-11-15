// WRECKING BALL: tap a spot and a giant candy-striped ball on a chain swings in from your side,
// plows straight through, swings back for another hit, then gets hauled up. It loses swing for
// every block it plows through, so a big building slows it down, and the chunks fly the way it
// was swinging. The ball is a moving physics body, so it shoves loose pieces around too.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';

const LENGTH = 24;
const RADIUS = 2.7;
const OMEGA = 3.1;
const SWINGS = 3.2;

function stripedBall() {
  const geo = new THREE.SphereGeometry(RADIUS, 32, 20);
  const colors = [];
  const pos = geo.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Candy swirl: stripes that twist around the ball.
    const a = Math.atan2(z, x) + y * 0.9;
    c.setHex(Math.sin(a * 3) > 0 ? 0xff3b5c : 0xffffff);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 }));
}

export class WreckingBall {
  constructor(g) {
    this.g = g;
    this.id = 'ball';
    this.dragOrbits = true;
    this.balls = [];
    this.chainGeo = new THREE.CylinderGeometry(0.28, 0.28, 1, 8, 1).translate(0, 0.5, 0);
    this.chainMat = new THREE.MeshStandardMaterial({ color: 0x5b6070, roughness: 0.4, metalness: 0.6 });
    this.cloudGeo = new THREE.BoxGeometry(1, 0.8, 1);
    this.cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfefff, emissiveIntensity: 0.35, roughness: 0.9 });
  }

  make() {
    const g = this.g;
    const ball = stripedBall();
    ball.castShadow = true;
    const chain = new THREE.Mesh(this.chainGeo, this.chainMat);
    chain.castShadow = true;
    // The chain hangs from a fluffy cloud.
    const hook = new THREE.Group();
    for (const [x, y, z, s] of [
      [0, 0.6, 0, 4.2],
      [-3, 0, 0.5, 3.2],
      [3, 0, -0.4, 3.4],
      [-1.2, 1.8, 0.8, 2.8],
      [1.5, 1.6, -0.6, 2.6],
      [0.2, -0.4, 2, 2.6],
    ]) {
      const puff = new THREE.Mesh(this.cloudGeo, this.cloudMat);
      puff.position.set(x, y, z);
      puff.scale.setScalar(s);
      hook.add(puff);
    }
    g.scene.add(ball, chain, hook);
    const R = g.physics.R;
    const body = g.physics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -50, 0));
    g.physics.world.createCollider(g.physics.roundDesc(RADIUS).setFriction(0.4).setRestitution(0.3), body);
    ball.visible = chain.visible = hook.visible = false;
    return { ball, chain, hook, body, busy: false, axis: new THREE.Vector3() };
  }

  take() {
    let b = this.balls.find((x) => !x.busy);
    if (!b) {
      if (this.balls.length >= 2) b = this.balls[0];
      else {
        b = this.make();
        this.balls.push(b);
      }
    }
    b.busy = true;
    b.ball.visible = b.chain.visible = b.hook.visible = true;
    return b;
  }

  press(sx, sy) {
    const hit = this.g.aim(sx, sy);
    if (!hit || hit.water) return;
    this.swing(hit);
  }
  move() {}
  release() {}
  cancel() {}

  // Starts a swing whose lowest point passes through the hit point, swinging away from the camera.
  swing(hit) {
    const g = this.g;
    const cam = g.camera.position;
    let dx = hit.x - cam.x;
    let dz = hit.z - cam.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d;
    dz /= d;
    const low = Math.max(RADIUS + 0.3, hit.y);
    const b = this.take();
    Object.assign(b, {
      dir: new THREE.Vector3(dx, 0, dz),
      // The pivot sits back a little toward the camera so the ball is still going strong as it
      // reaches the target.
      pivot: new THREE.Vector3(hit.x - dx * 3, low + LENGTH, hit.z - dz * 3),
      amp: 1.25,
      t: 0,
      phase: 'swing',
      reel: 0,
      prev: null,
      hits: 0,
      lastWhoosh: -1,
    });
    this.place(b, -b.amp);
    b.prev = b.ball.position.clone();
    sfx.whoosh(g.panOf(hit.x, hit.y, hit.z));
  }

  // Puts the ball at swing angle a (radians from straight down, positive = away from camera).
  place(b, a) {
    const p = b.pivot;
    const L = LENGTH - b.reel;
    b.ball.position.set(p.x + b.dir.x * Math.sin(a) * L, p.y - Math.cos(a) * L, p.z + b.dir.z * Math.sin(a) * L);
    if (b.ball.position.y < RADIUS * 0.8) b.ball.position.y = RADIUS * 0.8;
    // Rolls as it swings.
    b.ball.quaternion.setFromAxisAngle(b.axis.set(b.dir.z, 0, -b.dir.x), a * 2.5);
    // The chain from the pivot down to the ball.
    const v = new THREE.Vector3().subVectors(b.ball.position, p);
    b.chain.position.copy(p);
    b.chain.scale.set(1, v.length(), 1);
    b.chain.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    b.hook.position.copy(p);
  }

  // The physics world was replaced: drop the old balls (they're made again when needed).
  physicsReset() {
    for (const b of this.balls) this.g.scene.remove(b.ball, b.chain, b.hook);
    this.balls = [];
  }

  update(dt) {
    const g = this.g;
    for (const b of this.balls) {
      if (!b.busy) continue;
      b.t += dt;
      if (b.phase === 'swing') {
        // A damped pendulum, sped up for cartoon punch.
        const a = -b.amp * Math.cos(OMEGA * b.t) * Math.exp(-0.18 * b.t);
        this.place(b, a);
        const speed = Math.abs(b.amp * OMEGA * Math.sin(OMEGA * b.t)) * LENGTH;
        const pos = b.ball.position;
        // Whoosh each time it swings through the bottom.
        const pass = Math.floor((OMEGA * b.t) / Math.PI + 0.5);
        if (pass !== b.lastWhoosh && Math.abs(a) < 0.25) {
          b.lastWhoosh = pass;
          sfx.whoosh(g.panOf(pos.x, pos.y, pos.z));
        }
        if (speed > 6) {
          const vx = pos.x - b.prev.x;
          const vy = pos.y - b.prev.y;
          const vz = pos.z - b.prev.z;
          const vl = Math.hypot(vx, vy, vz) || 1;
          const n = g.destruction.impact({ x: b.prev.x, y: b.prev.y, z: b.prev.z, shape: 'capsule', to: pos, radius: RADIUS * 1.05, power: Math.min(1.3, speed / 22), dir: { x: vx / vl, y: vy / vl, z: vz / vl }, shellChance: 0.85, chunky: 1.3, quiet: true });
          if (n > 0) {
            // Plowing through blocks costs swing.
            b.amp *= Math.max(0.55, 1 - n * 0.0035);
            g.fx.shake.add(Math.min(0.25, 0.04 + n * 0.004));
            if (!b.hits++) {
              sfx.boom(0.55, g.panOf(pos.x, pos.y, pos.z));
              g.fx.bursts.star(pos.x, pos.y, pos.z, 5, 0xffffff, { calm: g.fx.calm });
              g.fx.time.hitStop(0.05);
            }
            g.fx.sparkBurst(pos.x + (vx / vl) * RADIUS, pos.y, pos.z + (vz / vl) * RADIUS, 6, 14, { up: 0.4 });
          }
        }
        if (pos.y < RADIUS * 1.2 && speed > 8) g.fx.dustCloud(pos.x, 0.3, pos.z, 1, 3, null, { ring: true, size: 1.8, life: 1.4 });
        b.prev.copy(pos);
        if ((OMEGA * b.t) / Math.PI > SWINGS || b.amp < 0.25) {
          b.phase = 'reel';
          b.reelA = a;
        }
      } else {
        // Hauled up and away.
        b.reel += dt * 30;
        b.pivot.y += dt * 30;
        b.reelA *= 1 - dt * 3;
        this.place(b, b.reelA);
        b.prev.copy(b.ball.position);
        if (b.ball.position.y > 90) {
          b.busy = false;
          b.ball.visible = b.chain.visible = b.hook.visible = false;
          b.body.setNextKinematicTranslation({ x: 0, y: -50, z: 0 });
          continue;
        }
      }
      const p = b.ball.position;
      b.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    }
  }
}
