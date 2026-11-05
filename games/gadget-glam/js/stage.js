// A full-screen canvas showing one case on the craft table. It works out where the case goes on
// screen, converts between screen pixels and item units, zooms and pans with two fingers, can show
// the case turned around in 3D, and adds a bit of life (a boing when the style changes, a lift
// for the ta-da).
import { drawTable } from './table.js';
import { pinchView, zoomAt, zoomOf } from './view.js';
import { faceMatrix, unproject } from './view3d.js';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.art = null;
    this.scale = 1;
    this.ox = 0;
    this.oy = 0;
    this.fitView = { scale: 1, ox: 0, oy: 0 };
    this.view3d = null; // { yaw, pitch } to show the case turned around
    this.pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 }; // extra movement of the case (screen px)
    this.boingAt = -10;
    this.resize();
  }

  resize() {
    const dpr = (this.dpr = Math.min(2, window.devicePixelRatio || 1));
    const w = (this.w = window.innerWidth);
    const h = (this.h = window.innerHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.bg = drawTable(w, h, dpr);
  }

  // The part of item space to show: the case as it is now (ears and all), with room for its shadow.
  frame() {
    const [x0, y0, x1, y1] = this.art.bounds;
    const m = 30 * this.art.u;
    return { x: x0 - m, y: y0 - m, w: x1 - x0 + m * 2, h: y1 - y0 + m * 2 };
  }

  scaleFor(rect) {
    const f = this.frame();
    return Math.min(rect.w / f.w, rect.h / f.h);
  }

  // Fit the case into a rectangle of the screen (CSS px), as big as it goes, zoomed out.
  // Smooth: glide there.
  fit(rect, smooth = false) {
    this.rect = rect;
    if (!this.art) return;
    const box = this.frame();
    const s = Math.min(rect.w / box.w, rect.h / box.h);
    this.fitView = { scale: s, ox: rect.x + (rect.w - box.w * s) / 2 - box.x * s, oy: rect.y + (rect.h - box.h * s) / 2 - box.y * s };
    this.goTo(this.fitView, smooth);
  }

  goTo(to, smooth) {
    if (smooth) this.glide = { from: { scale: this.scale, ox: this.ox, oy: this.oy }, to: { ...to }, t0: performance.now() };
    else {
      this.glide = null;
      Object.assign(this, to);
    }
  }

  stepGlide() {
    const gl = this.glide;
    if (!gl) return;
    const f = Math.min(1, (performance.now() - gl.t0) / 450);
    const e = 1 - (1 - f) ** 3;
    for (const k of ['scale', 'ox', 'oy']) this[k] = gl.from[k] + (gl.to[k] - gl.from[k]) * e;
    if (f >= 1) this.glide = null;
  }

  // -------------------------------------------------------------------------- zoom and pan

  get zoom() {
    return zoomOf(this, this.fitView);
  }

  get view() {
    return { scale: this.scale, ox: this.ox, oy: this.oy };
  }

  pinchStart(a, b) {
    this.glide = null;
    this.pinch = { start: this.view, m: mid(a, b), d: dist(a, b) };
  }

  pinchMove(a, b) {
    const p = this.pinch;
    if (!p) return;
    Object.assign(this, pinchView(p.start, p.m, p.d, mid(a, b), dist(a, b), this.fitView, this.rect, this.frame()));
  }

  pinchEnd() {
    this.pinch = null;
  }

  wheel(x, y, factor) {
    this.glide = null;
    Object.assign(this, zoomAt(this.view, [x, y], factor, this.fitView, this.rect, this.frame()));
  }

  zoomOut(smooth = true) {
    this.goTo(this.fitView, smooth);
  }

  // ----------------------------------------------------------------------- screen ↔ item units

  toUnits(x, y) {
    return [(x - this.ox) / this.scale, (y - this.oy) / this.scale];
  }

  toScreen(ux, uy) {
    return [this.ox + ux * this.scale, this.oy + uy * this.scale];
  }

  // Where the middle of the case is on screen (what it turns around in 3D).
  get middle() {
    return this.toScreen(...this.art.middle);
  }

  // The spot on the front of a turned case under a screen point (null if it's edge on).
  toUnits3d(x, y) {
    const { yaw, pitch } = this.view3d;
    const [mx, my] = this.middle;
    const p = unproject(faceMatrix(yaw, pitch, this.art.depth / 2), (x - mx) / this.scale, (y - my) / this.scale);
    if (!p) return null;
    const [cx, cy] = this.art.middle;
    return [p[0] + cx, p[1] + cy];
  }

  // Where the case's box is on screen.
  get boxRect() {
    const { box } = this.art.shape;
    const [x, y] = this.toScreen(box.x, box.y);
    return { x, y, w: box.w * this.scale, h: box.h * this.scale };
  }

  boing(now) {
    this.boingAt = now;
  }

  render(now, { under, over } = {}) {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.drawImage(this.bg, 0, 0, this.w, this.h);
    this.stepGlide();
    if (this.art) {
      const [cx, cy] = this.middle;
      const age = now - this.boingAt;
      const b = age < 0.7 ? Math.exp(-age * 6) * Math.sin(age * 26) * 0.07 : 0;
      const p = this.pose;
      g.save();
      g.translate(cx + p.dx, cy + p.dy);
      g.rotate(p.rot);
      g.scale(p.sx * (1 + b), p.sy * (1 - b));
      g.translate(-cx, -cy);
      under?.(g);
      if (this.view3d) {
        g.translate(cx, cy);
        g.scale(this.scale, this.scale);
        this.art.draw3d(g, now, { ...this.view3d, px: this.scale * p.sx });
      } else {
        g.translate(this.ox, this.oy);
        g.scale(this.scale, this.scale);
        this.art.draw(g, now);
      }
      g.restore();
    }
    over?.(g);
  }
}

const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
