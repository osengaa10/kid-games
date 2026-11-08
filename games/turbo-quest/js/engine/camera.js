// The camera, in tiles. No DOM.
// - Sideways it looks ahead the way Turbo faces (easing over about half a second), so what's
//   coming is always in view.
// - Up and down it snaps to platforms: it only moves when he lands somewhere higher or lower,
//   or when he'd leave a band near the top or bottom of the screen. A jump doesn't bob the view.
// - Shake is "trauma" that fades, and none at all with reduced motion.
import { clamp, damp, wobble } from './math.js';

const GROUND_AT = 0.7; // where the ground he stands on sits, down the screen
const TOP_BAND = 0.1; // never let his head go above this
const BOTTOM_BAND = 0.9; // or his feet below this

export class Camera {
  constructor(viewH = 12) {
    this.viewH = viewH;
    this.viewW = viewH * 1.44;
    this.x = 0;
    this.y = 0;
    this.look = 0;
    this.groundY = 0;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.time = 0;
    this.lookDown = 0;
  }

  setAspect(aspect) {
    this.viewW = this.viewH * aspect;
  }

  // Jump straight to the player (level start, respawn).
  snap(p, level, lookAhead = 0) {
    this.look = p.facing * lookAhead;
    this.groundY = p.y + p.h;
    this.x = this.clampX(p.x + p.w / 2 + this.look - this.viewW / 2, level);
    this.y = this.clampY(this.groundY - this.viewH * GROUND_AT, level);
  }

  // p: the player; opts: { lookAhead, lookDown (0..1), reducedMotion }
  update(p, level, dt, opts = {}) {
    this.time += dt;
    const lookAhead = opts.lookAhead ?? 3;
    this.look = damp(this.look, p.facing * lookAhead, 3.2, dt);
    this.x = this.clampX(p.x + p.w / 2 + this.look - this.viewW / 2, level);

    const feet = p.y + p.h;
    if (p.grounded || p.state === 'rescue' || feet > this.groundY) this.groundY = feet;
    this.lookDown = damp(this.lookDown, opts.lookDown || 0, 4, dt);
    let target = this.groundY - this.viewH * GROUND_AT + this.lookDown * this.viewH * 0.25;
    this.y = damp(this.y, target, p.state === 'rescue' ? 3 : 5, dt);
    // Hard limits so he never leaves the screen, however fast he moves.
    if (p.y < this.y + this.viewH * TOP_BAND) this.y = p.y - this.viewH * TOP_BAND;
    if (feet > this.y + this.viewH * BOTTOM_BAND && p.state !== 'rescue') this.y = feet - this.viewH * BOTTOM_BAND;
    this.y = this.clampY(this.y, level);

    // Shake.
    this.trauma = Math.max(0, this.trauma - 1.6 * dt);
    if (opts.reducedMotion || this.trauma <= 0) {
      this.shakeX = 0;
      this.shakeY = 0;
    } else {
      const a = this.trauma * this.trauma * 0.3;
      this.shakeX = a * wobble(this.time * 30, 1);
      this.shakeY = a * wobble(this.time * 30, 7);
    }
  }

  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  clampX(x, level) {
    return clamp(x, 0, Math.max(0, level.width - this.viewW));
  }

  // The bottom of the level sits at the bottom of the screen; above the top is open sky.
  clampY(y, level) {
    return clamp(y, -this.viewH, level.height - this.viewH);
  }
}
