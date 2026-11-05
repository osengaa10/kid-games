// The shelf: every case he's finished, standing on wooden display shelves, newest first. Tap
// one to see it big, in 3D: drag to spin it round (the gadget's screen is on the other side),
// tap the pop-it bubbles to push them in and out, tap gems to make them ring, pinch to zoom,
// and ✏️ opens it to decorate some more. Deleting is for grown-ups: hold the trash can for two
// seconds.
import { listCases, deleteCase } from './storage.js';
import { CaseArt } from './art.js';
import { Stage } from './stage.js';
import { Particles } from './effects.js';
import { popitDomes } from './patterns.js';
import { gemsOf, stickerSize } from './paint.js';
import { onCase } from './items.js';
import { facing } from './view3d.js';
import * as sound from './sound.js';
import { say } from './speech.js';

const $ = (id) => document.getElementById(id);
const HOLD_MS = 2000;
const TAP_PX = 10;
const MAX_TILT = 0.6; // about 35°
const REST_TILT = 0.08;

export class Shelf {
  constructor({ onHome, onEdit }) {
    this.onHome = onHome;
    this.onEdit = onEdit;
    this.list = $('shelf-list');
    this.view = $('view');
    this.stage = new Stage($('view-stage'));
    this.fx = new Particles();
    this.entry = null;
    this.now = 0;
    this.pointers = new Map();
    this.spin = { yaw: 0, pitch: REST_TILT, vy: 0, vp: 0 };

    $('shelf-home').addEventListener('click', () => {
      sound.pop();
      this.onHome();
    });
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('.hang');
      if (!b) return;
      const entry = this.entries.find((x) => x.id === b.dataset.id);
      if (entry) this.openView(entry);
    });
    $('view-back').addEventListener('click', () => {
      sound.pop();
      this.closeView();
    });
    $('view-edit').addEventListener('click', () => {
      sound.pop();
      const entry = this.entry;
      this.closeView();
      this.onEdit(entry);
    });
    $('view-reset').addEventListener('click', () => {
      sound.pop();
      this.faceFront();
      this.stage.zoomOut();
    });
    const c = this.stage.canvas;
    c.addEventListener('pointerdown', (e) => this.down(e));
    c.addEventListener('pointermove', (e) => this.move(e));
    c.addEventListener('pointerup', (e) => this.up(e));
    c.addEventListener('pointercancel', (e) => this.up(e, true));
    c.addEventListener('wheel', (e) => {
      if (!this.art) return;
      e.preventDefault();
      this.stage.wheel(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
    }, { passive: false });
    window.addEventListener('resize', () => {
      if (!this.entry) return;
      this.stage.resize();
      this.fitView();
    });

    // Hold the trash can to delete (a ring fills up while it's held).
    const trash = $('view-trash');
    const cancel = () => {
      clearTimeout(this.holdTimer);
      trash.classList.remove('holding');
    };
    trash.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      trash.classList.add('holding');
      sound.pop();
      this.holdTimer = setTimeout(() => {
        trash.classList.remove('holding');
        this.remove();
      }, HOLD_MS);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) trash.addEventListener(ev, cancel);
  }

  async show(openId = null) {
    this.closeView();
    this.entries = await listCases();
    this.list.innerHTML = '';
    $('shelf').classList.toggle('empty', this.entries.length === 0);
    for (const e of this.entries) {
      const b = document.createElement('button');
      b.className = 'hang';
      b.dataset.id = e.id;
      b.innerHTML = `<img alt="" src="${e.thumb || ''}" />`;
      if (e.id === openId) b.classList.add('new');
      this.list.append(b);
    }
    if (!this.entries.length) say('Make a case, and it goes on your shelf!');
  }

  openView(entry) {
    sound.pop();
    this.entry = entry;
    this.art = new CaseArt(entry.design);
    this.art.pushed = new Set();
    this.stage.art = this.art;
    this.view.classList.add('show');
    this.stage.resize();
    this.fitView();
    // It turns a little as it comes in, to show it can be spun round.
    this.spin = { yaw: -0.8, pitch: REST_TILT, vy: 0, vp: 0, target: 0 };
    this.stage.view3d = { yaw: this.spin.yaw, pitch: this.spin.pitch };
    say('Spin it around!');
  }

  fitView() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const side = Math.max(90, w * 0.12);
    this.stage.fit({ x: side, y: 40, w: w - side * 2, h: h - 120 });
  }

  closeView() {
    clearTimeout(this.holdTimer);
    this.view.classList.remove('show');
    this.art?.dispose();
    this.art = null;
    this.stage.art = null;
    this.stage.view3d = null;
    this.entry = null;
    this.pointers.clear();
  }

  async remove() {
    const entry = this.entry;
    if (!entry) return;
    sound.trash();
    const r = this.stage.boxRect;
    this.fx.poof(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.4);
    await deleteCase(entry.id);
    setTimeout(() => this.show(), 350);
  }

  // Spin back round to the front (whichever way is shortest).
  faceFront() {
    this.spin.target = Math.round(this.spin.yaw / (Math.PI * 2)) * Math.PI * 2;
    this.spin.vy = 0;
  }

  // ---------------------------------------------------------------------------------- fingers

  down(e) {
    if (!this.art) return;
    e.preventDefault();
    try {
      this.stage.canvas.setPointerCapture(e.pointerId);
    } catch {
      // not fatal: the finger just has to stay on the canvas
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.spin.target = null;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinching = true;
      this.stage.pinchStart(a, b);
    }
    if (this.pointers.size === 1) {
      this.spin.vy = 0;
      this.spin.vp = 0;
    }
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const dt = Math.max(0.008, (performance.now() - p.t) / 1000);
    p.x = e.clientX;
    p.y = e.clientY;
    p.t = performance.now();
    if (this.pinching) {
      if (this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        this.stage.pinchMove(a, b);
      }
      return;
    }
    if (this.pointers.size !== 1 || Math.hypot(p.x - p.sx, p.y - p.sy) < TAP_PX) return;
    // One finger turns it: across spins, up and down tips it.
    const s = this.spin;
    s.yaw += dx * 0.009;
    s.pitch = Math.max(-MAX_TILT, Math.min(MAX_TILT, s.pitch - dy * 0.006));
    s.vy = s.vy * 0.5 + ((dx * 0.009) / dt) * 0.5;
    s.vp = 0;
    p.moved = true;
  }

  up(e, cancelled = false) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (!p) return;
    if (this.pinching) {
      if (this.pointers.size < 2) {
        this.pinching = false;
        this.stage.pinchEnd();
        this.afterPinch = this.pointers.size > 0;
      }
      return;
    }
    if (this.afterPinch) {
      if (this.pointers.size === 0) this.afterPinch = false;
      return;
    }
    if (!cancelled && !p.moved) this.tap(p.x, p.y);
  }

  // Play with the finished case: only the front can be tapped; tapping it while it's turned
  // away spins it back round.
  tap(sx, sy) {
    const { u, shape } = this.art;
    const { yaw, pitch } = this.spin;
    if (facing(yaw, pitch) < 0.35) {
      this.faceFront();
      sound.whoosh();
      return;
    }
    const pt = this.stage.toUnits3d(sx, sy);
    if (!pt) return;
    const [x, y] = pt;
    const popit = this.art.popitOp();
    if (popit) {
      const domes = popitDomes(shape);
      const i = domes.findIndex((d) => Math.hypot(d.x - x, d.y - y) < d.cell * 0.5);
      if (i >= 0) {
        const pushed = this.art.pushed;
        const back = pushed.has(i);
        if (back) pushed.delete(i);
        else pushed.add(i);
        this.art.dirty = true;
        sound.bubble(back);
        return;
      }
    }
    let n = 0;
    for (const op of this.art.design.layers.gem) {
      if (op.k !== 'gems') continue;
      for (const g of gemsOf(op, u)) {
        n++;
        if (Math.hypot(g.x - x, g.y - y) < g.r * 1.4) {
          sound.tink(n);
          this.fx.sparkle(sx, sy, 10);
          return;
        }
      }
    }
    for (const op of this.art.design.layers.sticker) {
      if (Math.hypot(op.x - x, op.y - y) < stickerSize(op, u) * 0.45) {
        sound.boing();
        this.fx.sparkle(sx, sy, 8);
        return;
      }
    }
    if (onCase(shape, x, y)) {
      sound.sparkle();
      this.fx.sparkle(sx, sy, 8);
    }
  }

  frame(now, dt) {
    this.now = now;
    if (!this.art) return;
    const s = this.spin;
    const holding = this.pointers.size > 0;
    if (!holding) {
      if (s.target != null) {
        // Gliding to a set angle (coming in, or back to the front).
        s.yaw += (s.target - s.yaw) * Math.min(1, dt * 5);
        if (Math.abs(s.target - s.yaw) < 0.002) {
          s.yaw = s.target;
          s.target = null;
        }
      } else {
        // Let go mid-spin: it keeps turning and slows down.
        s.yaw += s.vy * dt;
        s.vy *= Math.exp(-dt * 2.2);
      }
      s.pitch += (REST_TILT - s.pitch) * Math.min(1, dt * 1.5);
    }
    this.stage.view3d = { yaw: s.yaw, pitch: s.pitch };
    const turned = Math.abs(s.yaw - Math.round(s.yaw / (Math.PI * 2)) * Math.PI * 2) > 0.08;
    $('view-reset').classList.toggle('show', turned || this.stage.zoom > 1.02);
    this.fx.update(dt);
    this.stage.render(now, { over: (g) => this.fx.draw(g) });
  }
}
