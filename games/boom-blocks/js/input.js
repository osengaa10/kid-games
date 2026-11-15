// Fingers on the playground (pointer events, so mouse works too for testing).
//   one finger:  down → move → up, reported with screen positions
//   two fingers: orbit (both moving together) and pinch zoom; the one-finger gesture is cancelled
// Buttons sit on top in their own elements, so they never reach here.
export class Input {
  constructor(el, h) {
    this.el = el;
    this.h = h;
    this.fingers = new Map();
    this.mode = 'none';
    const opts = { passive: false };
    el.addEventListener('pointerdown', (e) => this.down(e), opts);
    el.addEventListener('pointermove', (e) => this.move(e), opts);
    el.addEventListener('pointerup', (e) => this.up(e), opts);
    el.addEventListener('pointercancel', (e) => this.up(e, true), opts);
    el.addEventListener('lostpointercapture', (e) => this.fingers.has(e.pointerId) && this.up(e, true));
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      h.zoom(Math.exp(-e.deltaY * 0.0015));
    }, opts);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), opts);
    document.addEventListener('touchmove', (e) => e.preventDefault(), opts);
  }

  down(e) {
    e.preventDefault();
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      // older browsers
    }
    this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    this.h.any?.();
    if (this.fingers.size === 1) {
      // Right mouse button (or ctrl-click) orbits on a desktop.
      if (e.button === 2 || e.ctrlKey) this.mode = 'orbit';
      else {
        this.mode = 'one';
        this.h.down(e.clientX, e.clientY);
      }
    } else if (this.fingers.size === 2) {
      if (this.mode === 'one') this.h.cancel();
      this.mode = 'two';
      const [a, b] = [...this.fingers.values()];
      this.spread = Math.hypot(a.x - b.x, a.y - b.y);
      this.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }

  move(e) {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    e.preventDefault();
    const dx = e.clientX - f.x;
    const dy = e.clientY - f.y;
    f.x = e.clientX;
    f.y = e.clientY;
    const W = window.innerWidth;
    if (this.mode === 'one') this.h.move(e.clientX, e.clientY, Math.hypot(f.x - f.sx, f.y - f.sy), dx / W, dy / W);
    else if (this.mode === 'orbit') this.h.orbit(dx / W, dy / W);
    else if (this.mode === 'two' && this.fingers.size >= 2) {
      const [a, b] = [...this.fingers.values()];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this.spread > 10) this.h.zoom(spread / this.spread);
      this.h.orbit((mid.x - this.mid.x) / W, (mid.y - this.mid.y) / W);
      this.spread = spread;
      this.mid = mid;
    }
  }

  up(e, cancelled = false) {
    if (!this.fingers.has(e.pointerId)) return;
    e.preventDefault?.();
    this.fingers.delete(e.pointerId);
    if (this.mode === 'one') {
      if (cancelled) this.h.cancel();
      else this.h.up(e.clientX, e.clientY);
    }
    if (this.fingers.size === 0) this.mode = 'none';
    else if (this.mode === 'two' && this.fingers.size === 1) this.mode = 'after';
  }

  // The one finger still down and not moved (for hold-to-repeat), or null.
  held() {
    if (this.mode !== 'one' || this.fingers.size !== 1) return null;
    return [...this.fingers.values()][0];
  }
}
