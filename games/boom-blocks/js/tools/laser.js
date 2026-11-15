// LASER: a cute floating laser-bot hovers by your shoulder. Put your finger on the screen and it
// fires a pulsing rainbow beam wherever the finger goes. The beam slices a groove up to three
// blocks deep, leaves glowing scorch marks that cool down, and showers sparks and molten drips.
// Slice through the bottom of a tower and the weak-neck check topples it.
import * as THREE from '../../vendor/three.module.min.js';
import * as sfx from '../sfx.js';
import { linearRGB } from '../render/voxels.js';
import { toCellX, toCellY, toCellZ } from '../core/grid.js';

const CUT_RATE = 30;
const SPARK = [0xffffff, 0xfff2a8, 0xff9ff3, 0x9ff3ff].map(linearRGB);
const MOLTEN = [0xffd23f, 0xff9f1c, 0xff5a3c].map(linearRGB);

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
uniform float uLen;
varying vec2 vUv;
varying float vFace;
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
void main() {
  float along = vUv.y * uLen;
  vec3 rainbow = hue(fract(along * 0.04 - uTime * 1.6));
  float core = pow(vFace, 6.0);
  float glow = pow(vFace, 1.5);
  float pulse = 0.85 + 0.15 * sin(uTime * 40.0 + along * 0.8);
  vec3 col = (rainbow * glow * 0.9 + vec3(1.0) * core * 1.2) * pulse;
  gl_FragColor = vec4(col, 1.0);
}`;

function makeBot() {
  const bot = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshStandardMaterial({ color: 0x2ec4f1, roughness: 0.3 }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.22, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 }));
  band.rotation.x = Math.PI / 2;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
  eye.position.set(0, 0.15, 1.15);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), new THREE.MeshBasicMaterial({ color: 0x163a63 }));
  pupil.position.set(0, 0.15, 1.75);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1), new THREE.MeshStandardMaterial({ color: 0x555b70 }));
  antenna.position.y = 2;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5fa2 }));
  tip.position.y = 2.6;
  // Little propeller on top.
  const prop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0xff5fa2 }));
  prop.position.y = 1.55;
  bot.add(body, band, eye, pupil, antenna, tip, prop);
  bot.userData = { eye, pupil, prop };
  return bot;
}

export class Laser {
  constructor(g) {
    this.g = g;
    this.id = 'laser';
    this.dragOrbits = false;
    this.active = false;
    this.bot = makeBot();
    this.bot.visible = false;
    g.scene.add(this.bot);
    this.beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uTime: { value: 0 }, uLen: { value: 1 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 16, 1, true).translate(0, 0.5, 0), this.beamMat);
    this.beam.visible = false;
    this.beam.renderOrder = 5;
    this.beam.frustumCulled = false;
    g.scene.add(this.beam);
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.cutT = 0;
    this.hum = null;
    this.sx = 0;
    this.sy = 0;
    this.lastSx = 0;
    this.lastSy = 0;
    this.up = new THREE.Vector3(0, 1, 0);
    this.tmp = new THREE.Vector3();
  }

  select() {
    this.bot.visible = true;
    this.placeBot(1);
  }
  deselect() {
    this.cancel();
    this.bot.visible = false;
  }

  press(sx, sy) {
    this.active = true;
    this.sx = this.lastSx = sx;
    this.sy = this.lastSy = sy;
    this.hum = sfx.laserHum();
    this.hum?.set(0.5, 1);
  }
  move(sx, sy) {
    this.sx = sx;
    this.sy = sy;
  }
  release() {
    this.cancel();
  }
  cancel() {
    this.active = false;
    this.beam.visible = false;
    this.hum?.stop();
    this.hum = null;
  }

  // The bot floats beside the camera, a little right and in front.
  placeBot(k) {
    const cam = this.g.camera;
    const right = this.tmp.setFromMatrixColumn(cam.matrixWorld, 0);
    const fwd = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
    // Middle-right of the screen, clear of the buttons in the corners.
    const want = cam.position.clone().addScaledVector(right, 12).addScaledVector(fwd, 30).add(new THREE.Vector3(0, 2 + Math.sin(this.g.real * 2.2) * 0.5, 0));
    this.bot.position.lerp(want, k);
  }

  update(dt) {
    const g = this.g;
    if (!this.bot.visible) return;
    this.placeBot(1 - Math.exp(-dt * 8));
    this.bot.userData.prop.rotation.y += dt * 30;
    if (!this.active) {
      this.bot.lookAt(g.rig.target);
      return;
    }
    const hit = g.aim(this.sx, this.sy);
    const eye = this.bot.userData.pupil.getWorldPosition(this.from);
    if (hit) this.to.set(hit.x, hit.y, hit.z);
    else {
      // Pointing at the sky: the beam just goes off into the distance.
      g.raycaster.ray.at(300, this.to);
    }
    this.bot.lookAt(this.to);
    const v = this.tmp.subVectors(this.to, eye);
    const len = v.length();
    this.beam.visible = true;
    this.beam.position.copy(eye);
    const w = 1 + 0.25 * Math.sin(g.real * 50);
    this.beam.scale.set(w, len, w);
    this.beam.quaternion.setFromUnitVectors(this.up, v.normalize());
    this.beamMat.uniforms.uTime.value = g.real;
    this.beamMat.uniforms.uLen.value = len;
    // Pitch follows how fast the finger moves.
    const moved = Math.hypot(this.sx - this.lastSx, this.sy - this.lastSy);
    this.lastSx = this.sx;
    this.lastSy = this.sy;
    this.hum?.set(0.45, 1 + Math.min(0.6, moved / 40));
    let cutting = false;
    if (hit && !hit.water) {
      this.cutT += dt;
      const dir = v;
      while (this.cutT > 1 / CUT_RATE) {
        this.cutT -= 1 / CUT_RATE;
        if (g.physics.isStatic(hit.collider)) {
          const n = g.destruction.impact({
            x: hit.x - dir.x * 0.3,
            y: hit.y - dir.y * 0.3,
            z: hit.z - dir.z * 0.3,
            shape: 'capsule',
            to: { x: hit.x + dir.x * 2.6, y: hit.y + dir.y * 2.6, z: hit.z + dir.z * 2.6 },
            radius: 1.05,
            power: 0.35,
            shellChance: 0.15,
            chunky: 0.6,
            heat: true,
            quiet: true,
          });
          if (n) cutting = true;
          this.scorch(hit.x, hit.y, hit.z);
        } else {
          // A loose piece (rubble, a fallen section, frozen or not): the beam bites through it.
          const body = hit.collider?.parent();
          const p = body && g.pieces.byHandle.get(body.handle);
          if (p && g.destruction.bite(p, { x: hit.x - dir.x * 0.2, y: hit.y - dir.y * 0.2, z: hit.z - dir.z * 0.2 }, 1.3, 0.4)) cutting = true;
        }
      }
      // Sparks spraying off the surface, molten drips, now and then a puff of smoke.
      const P = g.fx;
      P.sparkBurst(hit.x + hit.nx * 0.3, hit.y + hit.ny * 0.3, hit.z + hit.nz * 0.3, 5, 16, { up: 0.5, colors: SPARK, life: 0.5, size: 0.28 });
      if (Math.random() < 0.6) P.embers(hit.x, hit.y, hit.z, 1, 5, MOLTEN);
      if (Math.random() < 0.12) P.dustCloud(hit.x, hit.y, hit.z, 1, 1, 0x666677, { rise: 4, size: 1.6, life: 1.2 });
      P.trail(hit.x + hit.nx * 0.2, hit.y + hit.ny * 0.2, hit.z + hit.nz * 0.2, SPARK[0]);
      if (cutting) P.shake.add(0.012);
    }
    this.hum?.parts?.sizzle(cutting ? 1 : 0);
  }

  // The blocks around a cut glow orange and cool down by themselves.
  scorch(x, y, z) {
    const { grid, statics, time } = this.g;
    const gx = toCellX(x);
    const gy = toCellY(y);
    const gz = toCellZ(z);
    for (let dy = -4; dy <= 4; dy++)
      for (let dz = -4; dz <= 4; dz++)
        for (let dx = -4; dx <= 4; dx++) {
          if (dx * dx + dy * dy + dz * dz > 22) continue;
          const cx = gx + dx;
          const cy = gy + dy;
          const cz = gz + dz;
          if (!grid.inside(cx, cy, cz)) continue;
          const c = grid.index(cx, cy, cz);
          if (grid.mat[c]) statics.scorch(c, time);
        }
  }
}
