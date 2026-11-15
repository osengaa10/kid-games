// The orbit camera: always looking at the playground from a nice three-quarter view. Fingers
// can swing it around and zoom, within limits that keep the scene in frame, and it eases
// back to the scene's framing on rebuild.
import * as THREE from '../vendor/three.module.min.js';

const LANDSCAPE_FOV = 42;

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.goal = { yaw: 0.6, pitch: 0.3, dist: 66, tx: 0, ty: 12, tz: 0 };
    this.cur = { ...this.goal };
    this.home = { ...this.goal };
    this.aspect = 1.4;
  }

  // Frames a scene: { target: [x, y, z], yaw, pitch, dist }.
  frame(c, instant = false) {
    this.home = { yaw: c.yaw, pitch: c.pitch, dist: c.dist, tx: c.target[0], ty: c.target[1], tz: c.target[2] };
    // Turn the short way round to the home yaw.
    const turns = Math.round((this.goal.yaw - c.yaw) / (Math.PI * 2));
    this.goal = { ...this.home, yaw: c.yaw + turns * Math.PI * 2 };
    if (instant) this.cur = { ...this.goal };
  }

  goHome() {
    this.frame({ target: [this.home.tx, this.home.ty, this.home.tz], yaw: this.home.yaw, pitch: this.home.pitch, dist: this.home.dist });
  }

  // dx, dy: drag in screen fractions (1 = the whole width).
  orbit(dx, dy) {
    this.goal.yaw -= dx * Math.PI * 1.4;
    this.goal.pitch = Math.max(0.1, Math.min(1.15, this.goal.pitch + dy * 1.6));
  }

  zoom(factor) {
    this.goal.dist = Math.max(this.home.dist * 0.5, Math.min(this.home.dist * 1.45, this.goal.dist / factor));
  }

  resize(w, h) {
    this.aspect = w / h;
    const cam = this.camera;
    cam.aspect = this.aspect;
    // Upright screens keep the same width of view as a landscape iPad, so the scene still fits.
    if (this.aspect < 1.33) {
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(LANDSCAPE_FOV) / 2) * 1.33);
      cam.fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / this.aspect)));
    } else cam.fov = LANDSCAPE_FOV;
    cam.updateProjectionMatrix();
  }

  update(dt, shake) {
    const k = 1 - Math.exp(-dt * 7);
    for (const key of Object.keys(this.goal)) this.cur[key] += (this.goal[key] - this.cur[key]) * k;
    const { yaw, pitch, dist, tx, ty, tz } = this.cur;
    const cam = this.camera;
    this.target.set(tx, ty, tz);
    cam.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
    if (cam.position.y < 3) cam.position.y = 3;
    cam.lookAt(this.target);
    if (shake) {
      cam.position.x += shake.x;
      cam.position.y += shake.y;
      cam.position.z += shake.z;
      cam.rotateZ(shake.roll);
    }
    cam.updateMatrixWorld();
  }
}
