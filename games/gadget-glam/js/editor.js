// The decorating screen: the case on the craft table, the step icons along the top, the tray of
// colors (or stickers, or gems) along the bottom, and the tool that follows his finger.
//
// Steps: style → spray → puffy → marker → sticker → gem → ta-da. He taps a step's icon to go
// there; the next step's icon gives a little bounce once he's done a bit.
//
// One finger decorates. Two fingers that land together pinch to zoom and slide to pan; a second
// finger that lands later (a palm resting on the screen) is ignored.
import { STEPS, newHistory, addOp, replaceOp, removeOp, setStyle, clearStep, undo, canUndo, hasContent, nextSize } from './design.js';
import { STYLE_PAGES, STYLE_SAY, onCase } from './items.js';
import { PATTERNS, PATTERN_SAY, popitDomes } from './patterns.js';
import { COLORS, SPRAY, PUFFY, MARKER, STAMPS, STAMP_SAY, STICKER_PAGES, STICKER_SAY, GEMS, GEM, GLITTER, hexRGB, rainbowRGB } from './palette.js';
import { CaseArt } from './art.js';
import { drawDeviceBack } from './devices.js';
import { Stage } from './stage.js';
import { Particles } from './effects.js';
import { SIZE, rgbAt, stickerSprite, stickerSize } from './paint.js';
import * as icons from './icons.js';
import * as tools from './tools.js';
import * as sound from './sound.js';
import { say } from './speech.js';
import { newSeed } from './rng.js';

const $ = (id) => document.getElementById(id);

const STEP_SAY = {
  style: 'Shapes!',
  spray: 'Spray paint!',
  puffy: 'Puffy paint!',
  marker: 'Markers!',
  sticker: 'Stickers!',
  gem: 'Gems!',
};
const PROMPT = {
  style: 'Pick a shape.',
  spray: 'Pick a color, and spray!',
  puffy: 'Squeeze out some puffy paint!',
  marker: 'Draw with the markers!',
  sticker: 'Drag on some stickers!',
  gem: 'Add sparkly gems!',
};
const CHEERS = [
  ['WOW!', 'Wow! You made it!'],
  ['AWESOME!', 'Awesome!'],
  ['SO COOL!', 'So cool!'],
  ['AMAZING!', 'Amazing!'],
  ['BEAUTIFUL!', 'Beautiful!'],
];
const TAP_MS = 350;
const TAP_PX = 12;
const PINCH_MS = 250; // a second finger this soon after the first means a pinch, not a palm
const ARROW_LEFT = '<svg viewBox="0 0 40 40"><path d="M25 8L12 20L25 32" /></svg>';
const ARROW_RIGHT = '<svg viewBox="0 0 40 40"><path d="M15 8L28 20L15 32" /></svg>';

export class Editor {
  constructor({ onHome, onShelf, onFinish, onChange }) {
    this.onHome = onHome;
    this.onShelf = onShelf;
    this.onFinish = onFinish;
    this.onChange = onChange;
    this.el = $('editor');
    this.stage = new Stage($('stage'));
    this.fx = new Particles();
    this.tray = $('tray');
    this.ghost = $('ghost');
    this.sel = { spray: 'red', puffy: 'white', marker: 'black', markerTool: 'pen', page: 0, stylePage: 0, gem: 'diamond' };
    this.finger = null; // the finger that's decorating
    this.pointers = new Map(); // every finger on the case
    this.pinching = false;
    this.waitLift = false; // after a pinch, the finger left behind does nothing until lifted
    this.tool = { x: -500, y: -500 };
    this.now = 0;
    this.open_ = false;

    const canvas = this.stage.canvas;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e, true));
    canvas.addEventListener('wheel', (e) => {
      if (!this.art || this.tada) return;
      e.preventDefault();
      this.stage.wheel(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
    }, { passive: false });
    window.addEventListener('resize', () => {
      if (!this.open_) return;
      this.stage.resize();
      this.layout();
    });

    for (const b of document.querySelectorAll('#steps .step')) {
      b.addEventListener('click', () => {
        if (this.tada || this.auto) return;
        sound.pop();
        if (b.dataset.step === 'tada') this.celebrate();
        else this.go(b.dataset.step);
      });
    }
    $('undo').addEventListener('click', () => this.undo());
    $('clear').addEventListener('click', () => this.clear());
    $('zoom-out').addEventListener('click', () => {
      sound.pop();
      this.stage.zoomOut();
    });
    $('ed-home').addEventListener('click', () => {
      sound.pop();
      this.onHome();
    });
    $('tada-shelf').addEventListener('click', () => {
      sound.pop();
      this.onShelf(this.id);
    });
    $('tada-new').addEventListener('click', () => {
      sound.pop();
      this.onHome();
    });
    $('tada-more').addEventListener('click', () => {
      sound.pop();
      this.endTada();
      this.go('gem');
    });
    this.tray.addEventListener('click', (e) => this.trayTap(e));
    this.tray.addEventListener('pointerdown', (e) => this.trayDown(e));
  }

  // ----------------------------------------------------------------------- opening and steps

  open(design, { id = null, step = null } = {}) {
    this.close();
    this.design = design;
    this.hist = newHistory();
    this.id = id;
    this.art = new CaseArt(design);
    this.stage.art = this.art;
    this.cheeredCover = this.art.coverage > 0.75;
    this.open_ = true;
    this.endTada();
    this.stage.resize();
    this.layout();
    this.tool = { ...this.parked() };
    this.go(step || (hasContent(design, 'spray') ? 'spray' : 'style'));
  }

  close() {
    this.cancelFinger();
    if (this.auto && this.art) {
      // Left while the bottle was drawing a pattern: finish it at once.
      addOp(this.design, this.hist, 'puffy', this.auto.op);
      this.onChange?.(this.design, this.id);
    }
    this.auto = null;
    this.art?.dispose();
    this.art = null;
    this.stage.art = null;
    this.stage.view3d = null;
    this.open_ = false;
    sound.loopStop();
  }

  // The case fits between the step icons and the tray, with room either side for the tool.
  layout(smooth = false) {
    if (!this.art) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.off = Math.max(24, Math.min(46, Math.min(w, h) * 0.05));
    this.toolSize = Math.max(64, Math.min(132, Math.min(w, h) * 0.13));
    let top = $('steps').getBoundingClientRect().bottom + 10;
    let bottom = this.tray.getBoundingClientRect().top - 12;
    if (this.tada) {
      // Room for the big word above and the three buttons below.
      top = h * 0.04 + Math.max(48, Math.min(150, Math.min(w, h) * 0.13)) + 10;
      bottom = h - $('tada-new').getBoundingClientRect().height - 36;
    }
    const side = Math.max(16, this.toolSize * 0.55);
    this.stage.fit({ x: side, y: top, w: w - side * 2, h: Math.max(80, bottom - top) }, smooth);
  }

  go(step) {
    this.cancelFinger();
    this.step = step;
    if (step === 'style') this.showStylePage();
    this.el.dataset.step = step;
    this.activity = 0;
    this.idle = 0;
    this.hinted = false;
    for (const b of document.querySelectorAll('#steps .step')) b.classList.toggle('on', b.dataset.step === step);
    this.buildTray();
    this.refresh();
    say(`${STEP_SAY[step]} ${PROMPT[step]}`, { force: true });
  }

  // Undo and clear show whether they'd do anything; the next step's icon bounces once he's done
  // a bit here (on the last step, it's the ⭐).
  refresh() {
    if (!this.art) return;
    $('undo').classList.toggle('off', !canUndo(this.hist, this.step));
    $('clear').classList.toggle('off', !hasContent(this.design, this.step));
    const ready = this.step === 'style' || this.activity > 1.2 || hasContent(this.design, this.step);
    const next = STEPS[STEPS.indexOf(this.step) + 1] || 'tada';
    this.nudging = ready;
    for (const b of document.querySelectorAll('#steps .step')) {
      b.classList.toggle('done', b.dataset.step !== 'tada' && hasContent(this.design, b.dataset.step));
      b.classList.toggle('nudge', ready && b.dataset.step === next);
    }
  }

  changed() {
    this.refresh();
    this.onChange?.(this.design, this.id);
  }

  undo() {
    if (this.tada || this.auto) return;
    if (!undo(this.design, this.hist, this.step)) return;
    sound.pop();
    this.redraw(this.step);
    this.changed();
  }

  clear() {
    if (this.tada || this.auto) return;
    if (!clearStep(this.design, this.hist, this.step)) return;
    sound.trash();
    const r = this.stage.boxRect;
    this.fx.poof(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.3);
    this.redraw(this.step);
    this.changed();
  }

  redraw(step) {
    if (step === 'style') {
      this.art.build();
      this.layout(true);
      this.stage.boing(this.now);
      if (this.step === 'style') {
        this.showStylePage();
        this.buildTray();
      }
    } else this.art.sync();
  }

  // The shapes tray opens on the page with the case's shape, so it's always there to see.
  showStylePage() {
    const i = STYLE_PAGES.findIndex((p) => p.includes(this.design.style));
    this.sel.stylePage = Math.max(0, i);
  }

  // --------------------------------------------------------------------------------- the tray

  buildTray() {
    const t = this.tray;
    t.innerHTML = '';
    t.dataset.step = this.step;
    const add = (kind, value, content, on = false, cls = '') => {
      const b = document.createElement('button');
      b.className = `slot ${cls} ${on ? 'on' : ''}`;
      b.dataset.kind = kind;
      b.dataset.v = value;
      if (typeof content === 'string') b.innerHTML = content;
      else b.append(content);
      t.append(b);
      return b;
    };
    const gap = () => t.append(Object.assign(document.createElement('span'), { className: 'gap' }));
    const step = this.step;
    if (step === 'style') {
      const paged = STYLE_PAGES.length > 1;
      if (paged) add('page', -1, ARROW_LEFT, false, 'arrow');
      for (const st of STYLE_PAGES[this.sel.stylePage]) add('style', st, icons.styleIcon(this.design.item, st), this.design.style === st);
      if (paged) add('page', 1, ARROW_RIGHT, false, 'arrow');
    } else if (step === 'spray') {
      for (const c of SPRAY) add('spray', c, icons.canIcon(c), this.sel.spray === c);
    } else if (step === 'puffy') {
      for (const c of PUFFY) add('puffy', c, icons.bottleIcon(c), this.sel.puffy === c);
      gap();
      for (const p of PATTERNS) add('pattern', p, icons.patternIcon(p, this.sel.puffy), false, 'tile');
    } else if (step === 'marker') {
      for (const c of MARKER) add('marker', c, icons.markerIcon(c), this.sel.markerTool === 'pen' && this.sel.marker === c);
      gap();
      for (const s of STAMPS) add('stamp', s, icons.stampIcon(s, this.sel.marker), this.sel.markerTool === s, 'tile');
    } else if (step === 'sticker') {
      add('page', -1, ARROW_LEFT, false, 'arrow');
      for (const [e] of STICKER_PAGES[this.sel.page]) add('sticker', e, icons.stickerIcon(e), false, 'sticker');
      add('page', 1, ARROW_RIGHT, false, 'arrow');
    } else if (step === 'gem') {
      for (const [id] of GEMS) add('gem', id, icons.gemIcon(id), this.sel.gem === id);
      add('gem', 'shaker', icons.shakerIcon(), this.sel.gem === 'shaker');
    }
    // Slots shrink to fit the screen when there are lots of them.
    const n = [...t.children].reduce((a, el) => a + (el.classList.contains('gap') ? 0.2 : el.classList.contains('arrow') ? 0.65 : 1), 0);
    t.style.setProperty('--n', n);
    // The case fits above the tray: if the tray changed height, fit it again (only then, so
    // picking a color doesn't undo his zoom).
    requestAnimationFrame(() => {
      const h = t.getBoundingClientRect().height;
      if (Math.abs(h - (this.trayH ?? -1)) > 1) {
        this.trayH = h;
        this.layout(true);
      }
    });
  }

  trayTap(e) {
    const b = e.target.closest('.slot');
    if (!b || this.tada || this.auto) return;
    const { kind, v } = b.dataset;
    if (kind === 'sticker') return; // stickers are dragged (see trayDown)
    if (kind === 'style') {
      if (setStyle(this.design, this.hist, v)) {
        this.art.build();
        this.layout(true);
        this.changed();
      }
      sound.boing();
      this.stage.boing(this.now);
      say(STYLE_SAY[v], { force: true });
      this.activity = 2;
    } else if (kind === 'spray') {
      this.sel.spray = v;
      sound.rattle();
      this.shakeAt = this.now;
      say(COLORS[v].say, { force: true });
    } else if (kind === 'puffy') {
      this.sel.puffy = v;
      sound.squeeze();
      this.squeezeAt = this.now;
      say(COLORS[v].say, { force: true });
      this.buildTray(); // the pattern tiles change color
      return;
    } else if (kind === 'pattern') {
      this.startPattern(v);
      say(PATTERN_SAY[v], { force: true });
      return;
    } else if (kind === 'marker') {
      this.sel.marker = v;
      this.sel.markerTool = 'pen';
      sound.click();
      say(COLORS[v].say, { force: true });
      this.buildTray();
      return;
    } else if (kind === 'stamp') {
      this.sel.markerTool = v;
      sound.thunk();
      say(STAMP_SAY[v], { force: true });
    } else if (kind === 'page') {
      // Shapes and stickers both come a page at a time.
      const [key, n] = this.step === 'style' ? ['stylePage', STYLE_PAGES.length] : ['page', STICKER_PAGES.length];
      this.sel[key] = (this.sel[key] + Number(v) + n) % n;
      sound.pop();
      this.buildTray();
      return;
    } else if (kind === 'gem') {
      this.sel.gem = v;
      if (v === 'shaker') {
        sound.loopStart('shaker');
        setTimeout(() => sound.loopStop(), 350);
        say('Glitter!', { force: true });
      } else {
        sound.tink(3);
        say(GEM[v].say, { force: true });
      }
    }
    for (const s of this.tray.querySelectorAll('.slot')) s.classList.toggle('on', s === b);
    this.refresh();
  }

  // Stickers are dragged straight off the tray.
  trayDown(e) {
    const b = e.target.closest('.slot');
    if (!b || b.dataset.kind !== 'sticker' || this.finger || this.pinching || this.tada) return;
    e.preventDefault();
    const op = { k: 'sticker', e: b.dataset.v, x: 0, y: 0, z: 1, r: (Math.random() - 0.5) * 0.4 };
    this.finger = this.newFinger(e);
    this.drag = { op, index: -1 };
    sound.peel();
    say(STICKER_SAY[op.e], { force: true });
    this.showGhost();
  }

  // -------------------------------------------------------------------------------- fingers

  newFinger(e) {
    return { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t0: performance.now(), speed: 0 };
  }

  // Where the paint lands: a little above his fingertip, in item units.
  paintAt(f = this.finger) {
    return this.stage.toUnits(f.x, f.y - this.off);
  }

  // Strokes made while zoomed in remember the zoom, so their brush is finer (see paint.js).
  zoomed(op) {
    const z = Math.round(this.stage.zoom * 100) / 100;
    if (z > 1.02) op.zm = z;
    return op;
  }

  down(e) {
    if (!this.art || this.tada || this.auto) return;
    e.preventDefault();
    try {
      this.stage.canvas.setPointerCapture(e.pointerId);
    } catch {
      // not fatal: moves still arrive on the window
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.idle = 0;
    if (this.pinching || this.waitLift) return;
    if (this.pointers.size === 2) {
      // A second finger: a pinch if it came right after the first (drop what the first one
      // started), otherwise a palm, and it's ignored.
      const f = this.finger;
      const fresh = !f || performance.now() - f.t0 < PINCH_MS || Math.hypot(f.x - f.sx, f.y - f.sy) < TAP_PX;
      if (fresh && !(this.drag && this.drag.index < 0)) {
        this.abortStroke();
        const [a, b] = [...this.pointers.values()];
        this.pinching = true;
        this.stage.pinchStart(a, b);
      }
      return;
    }
    if (this.pointers.size > 1 || this.finger) return;
    const f = (this.finger = this.newFinger(e));
    const [ux, uy] = this.paintAt();
    const u = this.art.u;
    const step = this.step;
    if (step === 'style') {
      sound.boing();
      this.stage.boing(this.now);
      return;
    }
    if (step === 'spray') {
      this.op = this.zoomed({ k: 'spray', c: this.sel.spray, s: newSeed(), p: [] });
      this.art.sprayBegin(this.op);
      sound.loopStart('spray');
    } else if (step === 'puffy') {
      this.op = this.zoomed({ k: 'puffy', c: this.sel.puffy, p: [Math.round(ux), Math.round(uy)] });
      this.art.setLive(this.op);
      sound.loopStart('squish');
    } else if (step === 'marker') {
      if (this.sel.markerTool === 'pen') {
        this.op = this.zoomed({ k: 'marker', c: this.sel.marker, s: newSeed(), p: [Math.round(ux), Math.round(uy)] });
        sound.loopStart('squeak');
        sound.loopLevel(0);
      } else {
        this.op = this.zoomed({ k: 'stamp', sh: this.sel.markerTool, c: this.sel.marker, s: newSeed(), p: [Math.round(ux), Math.round(uy)] });
        this.stamped(f.x, f.y - this.off);
      }
      this.art.setLive(this.op);
    } else if (step === 'sticker') {
      // Pick up a sticker that's on the case: the newest one under his finger.
      const ops = this.design.layers.sticker;
      const [px, py] = this.stage.toUnits(f.x, f.y);
      let best = -1;
      ops.forEach((op, i) => {
        if (Math.hypot(px - op.x, py - op.y) < stickerSize(op, u) * 0.48 && (best < 0 || op.n > ops[best].n)) best = i;
      });
      if (best >= 0) {
        const op = ops[best];
        this.drag = { op, index: best, moved: false };
        this.art.hidden = op;
        this.art.settle(Infinity);
        this.art.sync();
        sound.peel();
        this.showGhost();
        return;
      }
      say('Drag a sticker from the bottom!');
    } else if (step === 'gem') {
      if (this.sel.gem === 'shaker') {
        this.op = this.zoomed({ k: 'glitter', s: newSeed(), p: [] });
        this.art.setLive(this.op);
        sound.loopStart('shaker');
      } else {
        this.op = { k: 'gems', g: this.sel.gem, s: newSeed(), p: [] };
        this.gemCount = 0;
        this.placeGem(ux, uy);
        this.art.setLive(this.op);
      }
    }
  }

  move(e) {
    const pt = this.pointers.get(e.pointerId);
    if (pt) {
      pt.x = e.clientX;
      pt.y = e.clientY;
    }
    if (this.pinching) {
      if (this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        this.stage.pinchMove(a, b);
      }
      return;
    }
    const f = this.finger;
    if (!f || e.pointerId !== f.id) return;
    const evs = e.getCoalescedEvents?.() || [];
    for (const ev of evs.length ? evs : [e]) this.moveTo(ev.clientX, ev.clientY);
  }

  moveTo(x, y) {
    const f = this.finger;
    f.x = x;
    f.y = y;
    if (this.drag) {
      this.drag.moved ||= Math.hypot(x - f.sx, y - f.sy) > TAP_PX;
      this.placeGhost();
      return;
    }
    const op = this.op;
    if (!op) return;
    const u = this.art.u;
    const fine = u / (op.zm || 1);
    const [ux, uy] = this.paintAt();
    const last = [op.p[op.p.length - 2], op.p[op.p.length - 1]];
    const d = Math.hypot(ux - last[0], uy - last[1]);
    if (op.k === 'puffy' || op.k === 'marker') {
      if (d >= 2.5 * fine) {
        op.p.push(Math.round(ux), Math.round(uy));
        this.art.dirty = true;
      }
    } else if (op.k === 'stamp' || op.k === 'gems') {
      const gap = op.k === 'stamp' ? SIZE.stampGap * fine : SIZE.gemGap * u;
      // Gems measure from the last one tried, even one that missed the case and wasn't placed.
      let [lx, ly] = op.k === 'gems' ? this.lastGem : last;
      let dist = Math.hypot(ux - lx, uy - ly);
      while (dist >= gap) {
        lx += ((ux - lx) / dist) * gap;
        ly += ((uy - ly) / dist) * gap;
        dist -= gap;
        if (op.k === 'stamp') {
          op.p.push(Math.round(lx), Math.round(ly));
          const [sx, sy] = this.stage.toScreen(lx, ly);
          this.stamped(sx, sy);
        } else this.placeGem(lx, ly);
        this.art.dirty = true;
      }
    }
  }

  up(e, cancelled = false) {
    this.pointers.delete(e.pointerId);
    if (this.pinching) {
      if (this.pointers.size < 2) {
        this.pinching = false;
        this.stage.pinchEnd();
        this.waitLift = this.pointers.size > 0;
      }
      return;
    }
    if (this.pointers.size === 0) this.waitLift = false;
    const f = this.finger;
    if (!f || e.pointerId !== f.id) return;
    this.finger = null;
    sound.loopStop();
    if (this.drag) return this.drop(f, cancelled);
    this.endStroke();
  }

  // The stroke he was making becomes part of the design.
  endStroke() {
    const op = this.op;
    this.op = null;
    if (!op || !this.art) return;
    const layer = { spray: 'spray', puffy: 'puffy', marker: 'marker', stamp: 'marker', gems: 'gem', glitter: 'gem' }[op.k];
    if (!op.p.length) {
      if (op.k === 'spray') this.art.sprayAbort();
      this.art.dropLive();
      return;
    }
    addOp(this.design, this.hist, layer, op);
    if (op.k === 'spray') this.art.sprayEnd(op);
    else this.art.commit();
    this.changed();
  }

  // A pinch started: whatever the first finger began is taken back, as if it never happened.
  abortStroke() {
    const op = this.op;
    this.op = null;
    if (op?.k === 'spray') this.art.sprayAbort();
    this.art.dropLive();
    if (this.drag) {
      this.art.hidden = null;
      this.art.sync();
      this.drag = null;
      this.hideGhost();
    }
    this.finger = null;
    sound.loopStop();
  }

  // Leaving the step (or the screen) mid-stroke: keep what he's drawn (spray is already on the
  // case), and put a sticker he was carrying back where it was.
  cancelFinger() {
    if (this.drag) {
      if (this.art) {
        this.art.hidden = null;
        this.art.sync();
      }
      this.drag = null;
      this.hideGhost();
    }
    this.endStroke();
    this.finger = null;
    this.pointers.clear();
    if (this.pinching) this.stage.pinchEnd();
    this.pinching = false;
    this.waitLift = false;
    sound.loopStop();
  }

  stamped(x, y) {
    sound.thunk();
    this.fx.sparkle(x, y, 5);
    this.stampAt = this.now;
  }

  placeGem(ux, uy) {
    this.lastGem = [ux, uy];
    if (!onCase(this.art.shape, ux, uy)) return;
    this.op.p.push(Math.round(ux), Math.round(uy));
    this.art.gemAt = this.now;
    this.art.dirty = true;
    sound.tink(this.gemCount++);
    const [sx, sy] = this.stage.toScreen(ux, uy);
    this.fx.sparkle(sx, sy, 4);
  }

  // ---------------------------------------------------------------------------- sticker drag

  ghostCenter(f = this.finger) {
    const size = this.ghostPx || 0;
    return [f.x, f.y - size * 0.4];
  }

  showGhost() {
    const op = this.drag.op;
    const px = (this.ghostPx = stickerSize(op, this.art.u) * this.stage.scale);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = this.ghost;
    c.width = c.height = Math.round(px * 1.2 * dpr);
    c.style.width = c.style.height = `${px * 1.2}px`;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const sp = stickerSprite(op.e);
    g.translate(px * 0.6, px * 0.6);
    g.rotate(op.r || 0);
    g.globalAlpha = 0.22;
    g.drawImage(sp.shadow, -px / 2 + px * 0.06, -px / 2 + px * 0.1, px, px);
    g.globalAlpha = 1;
    g.drawImage(sp.img, -px / 2, -px / 2, px, px);
    c.classList.add('show');
    this.placeGhost();
  }

  placeGhost() {
    const [x, y] = this.ghostCenter();
    const half = this.ghostPx * 0.6;
    this.ghost.style.transform = `translate(${x - half}px, ${y - half}px) scale(1.08)`;
  }

  hideGhost() {
    this.ghost.classList.remove('show');
  }

  // Stick a sticker on (or back on): it goes on top of everything and bounces down.
  stick(op, index) {
    if (index >= 0) replaceOp(this.design, this.hist, 'sticker', index, op, { top: true });
    else addOp(this.design, this.hist, 'sticker', op);
    this.art.hidden = null;
    this.art.float(op, this.now);
  }

  drop(f, cancelled) {
    const d = this.drag;
    this.drag = null;
    this.hideGhost();
    const [gx, gy] = this.ghostCenter(f);
    const [ux, uy] = this.stage.toUnits(gx, gy);
    const quick = performance.now() - f.t0 < TAP_MS && !d.moved;
    if (cancelled) {
      this.art.hidden = null;
      this.art.sync();
      return;
    }
    if (d.index < 0 && quick) {
      // A tap on a sticker in the tray: it hops onto the case somewhere free-ish.
      const spot = this.freeSpot(stickerSize(d.op, this.art.u));
      this.stick({ ...d.op, x: spot[0], y: spot[1] }, -1);
      sound.slap();
      const [sx, sy] = this.stage.toScreen(...spot);
      this.fx.sparkle(sx, sy, 6);
      this.activity += 1;
    } else if (d.index >= 0 && quick) {
      // A tap on a sticker on the case: next size up.
      this.stick({ ...d.op, z: nextSize(d.op.z ?? 1) }, d.index);
      sound.boing();
    } else if (onCase(this.art.shape, ux, uy)) {
      this.stick({ ...d.op, x: Math.round(ux), y: Math.round(uy) }, d.index);
      sound.slap();
      this.fx.sparkle(gx, gy, 6);
      this.activity += 1;
    } else {
      if (d.index >= 0) removeOp(this.design, this.hist, 'sticker', d.index);
      this.art.hidden = null;
      this.art.sync();
      sound.poof();
      this.fx.poof(gx, gy, this.ghostPx * 0.5);
    }
    this.changed();
  }

  // A spot on the case for a tapped sticker: of a few random tries, the one furthest from the
  // stickers already there.
  freeSpot(size) {
    const { shape } = this.art;
    const [ax, ay, aw, ah] = shape.area;
    const placed = this.design.layers.sticker;
    let best = [ax + aw / 2, ay + ah / 2];
    let bestD = -1;
    for (let i = 0; i < 40; i++) {
      const x = ax + size * 0.4 + Math.random() * Math.max(1, aw - size * 0.8);
      const y = ay + size * 0.4 + Math.random() * Math.max(1, ah - size * 0.8);
      if (!onCase(shape, x, y)) continue;
      const d = placed.reduce((m, s) => Math.min(m, Math.hypot(s.x - x, s.y - y)), Infinity);
      if (d > bestD) {
        best = [x, y];
        bestD = d;
      }
    }
    return best.map(Math.round);
  }

  // ------------------------------------------------------------------- patterns by themselves

  startPattern(pat) {
    const op = { k: 'pattern', pat, c: this.sel.puffy };
    this.art.settle(Infinity);
    this.auto = { op, t0: this.now, dur: pat === 'popit' ? 1.6 : 2.2, shown: 0 };
    this.art.setLive(op, 0);
    if (pat !== 'popit') sound.loopStart('squish');
    this.idle = 0;
  }

  stepPattern() {
    const a = this.auto;
    const prog = Math.min(1, (this.now - a.t0) / a.dur);
    this.art.setLive(a.op, prog);
    if (a.op.pat === 'popit') {
      const n = Math.ceil(popitDomes(this.art.shape).length * prog);
      if (n > a.shown) {
        a.shown = n;
        sound.bubble(n % 2 === 0);
      }
    }
    if (prog >= 1) {
      this.auto = null;
      sound.loopStop();
      addOp(this.design, this.hist, 'puffy', a.op);
      this.art.commit();
      this.activity = 2;
      sound.sparkle();
      const r = this.stage.boxRect;
      this.fx.sparkle(r.x + r.w / 2, r.y + r.h / 2, 14);
      this.changed();
    }
  }

  // ------------------------------------------------------------------------------- ta-da!

  // The gadget slides in under the case (or the earbuds drop in), the case clicks on, then it
  // spins all the way round in 3D, showing the gadget's front halfway.
  celebrate() {
    if (!this.art || this.tada) return;
    this.cancelFinger();
    this.art.settle(Infinity);
    const [word, line] = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    this.tada = { t0: this.now, word, line, stage: 0 };
    this.el.classList.add('celebrating');
    const w = $('tada-word');
    w.innerHTML = [...word].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    sound.whoosh();
    // The tray slides away, so the case gets more room.
    setTimeout(() => this.layout(true), 0);
  }

  stepTada() {
    const T = this.tada;
    const a = this.now - T.t0;
    const p = this.stage.pose;
    const buds = this.art.shape.item === 'earbuds';
    if (a < 0.65) {
      p.dy = -14 * Math.min(1, a / 0.2);
      p.sx = p.sy = 1 + 0.05 * Math.min(1, a / 0.2);
      if (buds) this.art.budsLift = 260 * (1 - Math.min(1, a / 0.6)) ** 2;
    } else if (T.stage === 0) {
      T.stage = 1;
      p.dy = 0;
      p.sx = p.sy = 1;
      this.art.budsLift = 0;
      this.stage.boing(this.now);
      sound.click();
    }
    if (a > 0.8 && T.stage === 1) {
      T.stage = 2;
      sound.fanfare();
      say(T.line, { force: true });
      this.fx.confetti(this.stage.w, this.stage.h);
      $('tada').classList.add('show');
      this.finish();
    }
    // One full spin, easing in and out, tipped back a little at the middle.
    const spin = Math.min(1, Math.max(0, (a - 0.85) / 1.9));
    if (spin > 0 && spin < 1) {
      const e = spin < 0.5 ? 4 * spin ** 3 : 1 - (-2 * spin + 2) ** 3 / 2;
      this.stage.view3d = { yaw: e * Math.PI * 2, pitch: 0.2 * Math.sin(spin * Math.PI) };
    } else this.stage.view3d = null;
    if (a > 2.8 && T.stage === 2) {
      T.stage = 3;
      $('tada').classList.add('buttons');
    }
    if (T.stage >= 2 && Math.random() < 0.08) {
      const r = this.stage.boxRect;
      this.fx.sparkle(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 3);
    }
  }

  // Save it to the shelf (or update it there).
  finish() {
    const thumb = this.art.snapshot(360, this.now).toDataURL('image/png');
    this.onFinish(this.design, this.id, thumb).then((id) => {
      this.id = id;
    });
  }

  endTada() {
    this.tada = null;
    this.el.classList.remove('celebrating');
    $('tada').classList.remove('show', 'buttons');
    this.stage.view3d = null;
    if (this.art) this.art.budsLift = 0;
    Object.assign(this.stage.pose, { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 });
    setTimeout(() => this.layout(true), 0);
  }

  // The gadget sliding in under the case at the start of the ta-da.
  drawDevice(g) {
    if (!this.tada || this.art.shape.item === 'earbuds') return;
    const a = this.now - this.tada.t0;
    if (a > 0.75) return;
    const e = Math.min(1, a / 0.6);
    const slide = 1 - (1 - e) ** 3 - 1; // -1 → 0
    const st = this.stage;
    g.save();
    g.translate(st.ox + slide * st.w, st.oy);
    g.scale(st.scale, st.scale);
    drawDeviceBack(g, this.art.shape);
    g.restore();
  }

  // ----------------------------------------------------------------------------- each frame

  // Where the tool rests when he isn't using it: on the table just right of the case.
  parked() {
    const [x0, y0, x1, y1] = this.art.bounds;
    const [, top] = this.stage.toScreen(x0, y0);
    const [right, bottom] = this.stage.toScreen(x1, y1);
    const maxX = this.stage.w - this.toolSize * 0.75;
    return { x: Math.min(maxX, right + this.toolSize * 0.12), y: Math.min(top + (bottom - top) * 0.7, this.stage.h - this.toolSize) };
  }

  frame(now, dt) {
    if (!this.open_ || !this.art) return;
    this.now = now;
    const f = this.finger;
    if (f) {
      const sp = Math.hypot(f.x - f.lx, f.y - f.ly) / Math.max(dt, 0.001);
      f.speed += (sp - f.speed) * Math.min(1, dt * 10);
      f.lx = f.x;
      f.ly = f.y;
      this.activity += dt;
      if (this.activity > 1.2 && !this.nudging) this.refresh();
    } else if (!this.tada && !this.pinching) this.idle += dt;
    this.art.settle(now);
    $('zoom-out').classList.toggle('show', !this.tada && this.stage.zoom > 1.02);

    const op = this.op;
    if (f && op?.k === 'spray') {
      const [ux, uy] = this.paintAt();
      op.p.push(Math.round(ux), Math.round(uy));
      this.art.sprayFrame(op);
      const [px, py] = [f.x, f.y - this.off];
      const rgb = op.c === 'rainbow' ? rainbowRGB((op.p.length / 2) * 0.045) : op.c === 'glitter' ? hexRGB(GLITTER[Math.floor(Math.random() * GLITTER.length)]) : rgbAt(op.c);
      this.fx.spray(px + this.off * 0.6, py + this.off * 0.7, px, py, rgb, 3);
      sound.loopLevel(0.55 + Math.min(0.45, f.speed / 1500));
      if (!this.cheeredCover && this.art.coverage > 0.75) {
        this.cheeredCover = true;
        say('So colorful!', { force: true });
        sound.sparkle();
        const r = this.stage.boxRect;
        for (let i = 0; i < 4; i++) this.fx.sparkle(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 6);
      }
    } else if (f && op?.k === 'glitter') {
      const [ux, uy] = this.paintAt();
      op.p.push(Math.round(ux), Math.round(uy));
      this.art.dirty = true;
      for (let i = 0; i < 3; i++) this.fx.fleck(f.x, f.y - this.off - 10, GLITTER[Math.floor(Math.random() * GLITTER.length)]);
      sound.loopLevel(0.4 + Math.min(0.6, f.speed / 900));
    } else if (f && (op?.k === 'puffy' || op?.k === 'marker')) {
      const lvl = Math.min(1, f.speed / 700);
      sound.loopLevel(op.k === 'puffy' ? 0.35 + lvl * 0.65 : lvl, 0.8 + lvl * 0.5);
    }
    if (this.auto) this.stepPattern();
    if (this.tada) this.stepTada();
    if (this.idle > 9 && !this.hinted && this.step !== 'style') {
      this.hinted = true;
      say(PROMPT[this.step]);
    }

    // The tool follows the finger (exactly, so the paint is right under it) or rests by the case.
    const target = f && !this.drag ? { x: f.x, y: f.y - this.off } : this.auto && this.art.liveTip ? this.liveTipScreen() : this.parked();
    const k = f || this.auto ? 1 : Math.min(1, dt * 7);
    this.tool.x += (target.x - this.tool.x) * k;
    this.tool.y += (target.y - this.tool.y) * k;

    this.fx.update(dt);
    this.stage.render(now, { under: (g) => this.drawDevice(g), over: (g) => this.drawOver(g) });
  }

  liveTipScreen() {
    const [x, y] = this.stage.toScreen(...this.art.liveTip);
    return { x, y };
  }

  drawOver(g) {
    if (!this.tada) this.drawTool(g);
    this.fx.draw(g);
    // After a while with nothing happening, a hand shows what to do.
    if (this.idle > 8 && !this.tada && !this.auto && this.step !== 'style') {
      const r = this.stage.boxRect;
      const ph = ((this.idle - 8) % 2.6) / 2.6;
      const a = Math.min(1, (this.idle - 8) * 2) * Math.sin(ph * Math.PI);
      const s = this.toolSize * 0.7;
      if (this.step === 'sticker') {
        const tray = this.tray.getBoundingClientRect();
        const x0 = tray.left + tray.width * 0.3;
        const y0 = tray.top + tray.height * 0.3;
        const x1 = r.x + r.w * 0.5;
        const y1 = r.y + r.h * 0.45;
        tools.drawHand(g, x0 + (x1 - x0) * ph, y0 + (y1 - y0) * ph, s, a);
      } else {
        tools.drawHand(g, r.x + r.w * (0.25 + ph * 0.5), r.y + r.h * (0.55 + Math.sin(ph * Math.PI * 2) * 0.12), s, a);
      }
    }
  }

  drawTool(g) {
    const s = this.toolSize;
    const { x, y } = this.tool;
    const t = this.now;
    const down = !!this.finger;
    if (this.step === 'spray') {
      const c = this.sel.spray;
      const shake = this.now - (this.shakeAt ?? -9) < 0.4 ? 1 : 0;
      tools.drawCan(g, x + this.off * 0.6, y + this.off * 0.7, s, rgbAt(c), { glitter: c === 'glitter', rainbow: c === 'rainbow', shake, t });
    } else if (this.step === 'puffy') {
      const c = this.sel.puffy;
      const squeeze = down || this.auto ? 1 : Math.max(0, 1 - (this.now - (this.squeezeAt ?? -9)) * 3);
      tools.drawBottle(g, x, y, s, rgbAt(c), { rainbow: c === 'rainbow', squeeze });
    } else if (this.step === 'marker') {
      const c = this.sel.marker;
      if (this.sel.markerTool === 'pen') tools.drawMarker(g, x, y, s, c === 'glitter' ? [242, 181, 29] : rgbAt(c), { rainbow: c === 'rainbow' });
      else {
        const age = this.now - (this.stampAt ?? -9);
        const lift = down ? Math.min(1, age * 6) * 0.3 : 1;
        tools.drawStamper(g, x, y, s * 0.8, c === 'glitter' ? [242, 181, 29] : c === 'rainbow' ? rainbowRGB(t * 2) : rgbAt(c), lift);
      }
    } else if (this.step === 'gem') {
      if (this.sel.gem === 'shaker') tools.drawShaker(g, x, y, s * 0.85, t, down);
      else tools.drawTweezers(g, x, y, s, down ? 0 : 1);
    }
  }
}
