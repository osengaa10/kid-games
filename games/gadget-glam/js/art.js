// The picture of one case, painted from its design and kept up to date as he works.
//
// Everything he adds goes onto one `paint` canvas, in the order he made it (like real life:
// spray after puffy paint covers the puffy paint, and spray over a sticker paints the sticker).
// Each canvas is a fixed size (about 1300 px on the long side, whatever the screen), drawn in
// item units. From the bottom up:
//   behind (bits of the gadget sticking out), the shadow, the case's edge, then the face:
//   base (the plastic) + paint + the stroke he's making, clipped to the case → `comp`;
//   gloss (a soft bevel and shine), fixed (cameras, buttons), the earbuds, gem glints, twinkles.
//
// sync() brings the paint canvas up to date with the design: usually that's painting the newest
// stroke on top. After an undo (or picking up a sticker) it repaints from the nearest saved copy
// ("checkpoint") that still matches, or from scratch.
//
// draw3d() shows the case turned around in 3D: see view3d.js.
import { ITEMS, shapeOf, onCase, bounds } from './items.js';
import { orderedOps } from './design.js';
import { popitDomes } from './patterns.js';
import { rng } from './rng.js';
import { partPath } from './shapes.js';
import { drawFixed, drawBuds, drawBehind, drawEdge, drawDeviceFront } from './devices.js';
import { drawPlastic, drawTrim, drawTrimLive } from './trims.js';
import { faceMatrix, facing } from './view3d.js';
import {
  makeCanvas, sprayFrame, paintMarker, paintStamps, paintPuffy, paintPattern, dome, popitColor,
  flecksFor, paintFlecks, drawTwinkles, drawSticker, paintGems, drawGemGlints, popIn,
} from './paint.js';

export { partPath } from './shapes.js';

const LAYER_PX = 1300;
const LAYERS = ['base', 'paint', 'mask', 'comp', 'gloss', 'fixed', 'dark', 'behind'];
const CHECK_EVERY = 8; // keep a copy of the picture every this many strokes
const FLOAT_S = 0.5; // a sticker bounces on top this long before it's stuck down

const isPrefix = (a, b) => a.length <= b.length && a.every((x, i) => x === b[i]);

export class CaseArt {
  constructor(design, { px = LAYER_PX } = {}) {
    this.design = design;
    this.px = px;
    this.live = null; // a stroke still being made: { op, prog }, drawn on top until it's done
    this.floating = new Map(); // op → when it was placed: still bouncing, not stuck down yet
    this.hidden = null; // a sticker he's carrying (the editor draws it under his finger)
    this.pushed = null; // pop-it bubbles pushed in (the shelf's big view)
    this.budsLift = 0; // the earbuds hover this high (they drop in at ta-da)
    this.gemAt = -9; // when the last gem of the trail he's laying went down
    this.checks = [];
    this.build();
  }

  // (Re)make everything that depends on the shape: after a style change, this is all it takes.
  build() {
    const sh = (this.shape = shapeOf(this.design.item, this.design.style));
    const { box, u } = sh;
    this.u = u;
    const k = (this.k = this.px / Math.max(box.w, box.h));
    const W = Math.ceil(box.w * k);
    const H = Math.ceil(box.h * k);
    if (!this.c || this.W !== W || this.H !== H) {
      this.dispose();
      this.c = Object.fromEntries(LAYERS.map((n) => [n, makeCanvas(W, H)]));
      this.W = W;
      this.H = H;
    }
    this.bounds = bounds([...sh.parts, ...sh.behind]);
    this.depth = 40 * u; // how thick the case is, for the 3D view
    this.paintMask();
    this.paintBase();
    this.paintGloss();
    this.paintFixed();
    this.paintShadow();
    this.initCover();
    if (this.back) this.back.width = this.back.height = 1;
    this.back = null;
    this.compVersion = 0;
    this.edgeVersion = -1;
    this.repaint();
  }

  // A drawing context on a layer, set up to draw in item units.
  g(name, c = this.c[name]) {
    const g = c.getContext('2d');
    const { box } = this.shape;
    g.setTransform(this.k, 0, 0, this.k, -box.x * this.k, -box.y * this.k);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    return g;
  }

  clear(name, c = this.c[name]) {
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    return g;
  }

  // ------------------------------------------------------------------------- the case itself

  paintMask() {
    this.clear('mask');
    const g = this.g('mask');
    g.fillStyle = '#fff';
    for (const p of this.shape.parts) g.fill(partPath(p));
    g.globalCompositeOperation = 'destination-out';
    for (const p of this.shape.holes) g.fill(partPath(p));
    g.globalCompositeOperation = 'source-over';
    // The edge: a darkened copy of the case, drawn a little lower so the case has thickness.
    const d = this.clear('dark');
    d.drawImage(this.c.mask, 0, 0);
    d.globalCompositeOperation = 'source-in';
    d.fillStyle = 'rgba(30,22,60,0.38)';
    d.fillRect(0, 0, this.W, this.H);
    d.globalCompositeOperation = 'source-over';
  }

  // The plastic and its colored bits (inside the ears, a gold horn...): see trims.js.
  paintBase() {
    this.clear('base');
    drawPlastic(this.g('base'), this.shape);
  }

  // The shiny plastic look: a soft bevel round the edge and gloss streaks, clipped to the case.
  paintGloss() {
    const { u, style } = this.shape;
    const k = this.k;
    const t = this.clear('gloss');
    // Outside of the case in black, to cast an inner shadow and an inner light.
    const inv = makeCanvas(this.W, this.H);
    const ig = inv.getContext('2d');
    ig.fillRect(0, 0, this.W, this.H);
    ig.globalCompositeOperation = 'destination-out';
    ig.drawImage(this.c.mask, 0, 0);
    const far = this.W + 200;
    t.save();
    t.shadowColor = 'rgba(10,0,40,0.34)';
    t.shadowBlur = 9 * u * k;
    t.shadowOffsetX = far - 4 * u * k;
    t.shadowOffsetY = -5 * u * k;
    t.drawImage(inv, -far, 0);
    t.shadowColor = 'rgba(255,255,255,0.6)';
    t.shadowBlur = 7 * u * k;
    t.shadowOffsetX = far + 4 * u * k;
    t.shadowOffsetY = 5 * u * k;
    t.drawImage(inv, -far, 0);
    t.restore();
    inv.width = inv.height = 1; // free it now: iOS has a tight budget for canvas memory
    const gl = t.createLinearGradient(0, 0, this.W * 0.95, this.H * 0.75);
    gl.addColorStop(0, 'rgba(255,255,255,0.34)');
    gl.addColorStop(0.3, 'rgba(255,255,255,0.1)');
    gl.addColorStop(0.36, 'rgba(255,255,255,0)');
    gl.addColorStop(0.52, 'rgba(255,255,255,0)');
    gl.addColorStop(0.56, 'rgba(255,255,255,0.12)');
    gl.addColorStop(0.62, 'rgba(255,255,255,0)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    t.fillStyle = gl;
    t.fillRect(0, 0, this.W, this.H);
    TEXTURES[style]?.(this.g('gloss'), this.shape);
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(this.c.mask, 0, 0);
    t.globalCompositeOperation = 'source-over';
  }

  // Cameras, buttons and the style's trims (cactus flowers, jewels...) on top; the controller's
  // triggers behind.
  paintFixed() {
    this.clear('fixed');
    const f = this.g('fixed');
    drawFixed(f, this.shape);
    for (const t of this.shape.trims) drawTrim(f, t);
    this.clear('behind');
    drawBehind(this.g('behind'), this.shape);
  }

  paintShadow() {
    const { u } = this.shape;
    const k = this.k;
    const m = (this.shadowM = 70 * u);
    const pad = Math.ceil(m * k);
    if (this.shadow) this.shadow.width = this.shadow.height = 1;
    const c = (this.shadow = makeCanvas(this.W + pad * 2, this.H + pad * 2));
    const s = c.getContext('2d');
    const far = c.width + 200;
    s.shadowColor = 'rgba(25,30,50,0.4)';
    s.shadowBlur = 22 * u * k;
    s.shadowOffsetX = far + 8 * u * k;
    s.shadowOffsetY = 20 * u * k;
    s.drawImage(this.c.mask, pad - far, pad);
    s.shadowColor = 'rgba(20,20,40,0.3)';
    s.shadowBlur = 5 * u * k;
    s.shadowOffsetX = far + 2 * u * k;
    s.shadowOffsetY = 10 * u * k;
    s.drawImage(this.c.mask, pad - far, pad);
  }

  // ---------------------------------------------------------------- how much he's sprayed

  initCover() {
    const { box, u } = this.shape;
    const cell = (this.cell = 34 * u);
    this.nx = Math.ceil(box.w / cell);
    this.ny = Math.ceil(box.h / cell);
    this.onCase = new Uint8Array(this.nx * this.ny);
    this.covered = new Uint8Array(this.nx * this.ny);
    this.caseCells = 0;
    this.coveredCells = 0;
    for (let j = 0; j < this.ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        if (onCase(this.shape, box.x + (i + 0.5) * cell, box.y + (j + 0.5) * cell)) {
          this.onCase[j * this.nx + i] = 1;
          this.caseCells++;
        }
      }
    }
    this.coverFn = (x, y, r) => {
      const rr = r * 0.6;
      const i0 = Math.max(0, Math.floor((x - rr - box.x) / cell));
      const i1 = Math.min(this.nx - 1, Math.floor((x + rr - box.x) / cell));
      const j0 = Math.max(0, Math.floor((y - rr - box.y) / cell));
      const j1 = Math.min(this.ny - 1, Math.floor((y + rr - box.y) / cell));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const n = j * this.nx + i;
          if (this.onCase[n] && !this.covered[n]) {
            this.covered[n] = 1;
            this.coveredCells++;
          }
        }
      }
    };
  }

  get coverage() {
    return this.caseCells ? this.coveredCells / this.caseCells : 0;
  }

  // ---------------------------------------------------------------- keeping up with the design

  // What should be on the paint canvas: every stroke in order, except a sticker he's carrying
  // and stickers still bouncing on top.
  wanted() {
    const all = orderedOps(this.design);
    for (const op of this.floating.keys()) if (!all.includes(op)) this.floating.delete(op);
    return all.filter((op) => op !== this.hidden && !this.floating.has(op));
  }

  sync() {
    const want = this.wanted();
    if (!isPrefix(this.painted, want)) this.restore(want);
    const g = this.g('paint');
    for (let i = this.painted.length; i < want.length; i++) {
      this.paintOp(g, want[i]);
      this.painted.push(want[i]);
      this.checkpoint();
    }
    this.dirty = true;
  }

  // Paint everything again from scratch (a new shape, or a design just opened).
  repaint() {
    this.dropChecks();
    this.painted = [];
    this.twinkles = [];
    this.covered.fill(0);
    this.coveredCells = 0;
    this.clear('paint');
    this.sync();
  }

  // Go back to the newest checkpoint that still matches, or to a blank case.
  restore(want) {
    const ok = this.checks.filter((c) => isPrefix(c.ops, want));
    for (const c of this.checks) if (!ok.includes(c)) c.canvas.width = c.canvas.height = 1;
    this.checks = ok;
    const ck = ok[ok.length - 1];
    const g = this.clear('paint');
    if (ck) {
      g.drawImage(ck.canvas, 0, 0);
      this.painted = [...ck.ops];
      this.covered.set(ck.covered);
      this.coveredCells = ck.coveredCells;
      this.twinkles.length = ck.tw;
    } else {
      this.painted = [];
      this.covered.fill(0);
      this.coveredCells = 0;
      this.twinkles = [];
    }
  }

  // Every CHECK_EVERY strokes, keep a copy of the picture (the newest two), so undoing something
  // recent only repaints the last few strokes.
  checkpoint() {
    const n = this.painted.length;
    if (n % CHECK_EVERY || this.checks.some((c) => c.ops.length === n)) return;
    const ck = this.checks.length >= 2 ? this.checks.shift() : { canvas: makeCanvas(this.W, this.H) };
    if (ck.canvas.width !== this.W) [ck.canvas.width, ck.canvas.height] = [this.W, this.H];
    this.clear(null, ck.canvas).drawImage(this.c.paint, 0, 0);
    ck.ops = [...this.painted];
    ck.covered = Uint8Array.from(this.covered);
    ck.coveredCells = this.coveredCells;
    ck.tw = this.twinkles.length;
    this.checks.push(ck);
  }

  dropChecks() {
    for (const c of this.checks || []) c.canvas.width = c.canvas.height = 1;
    this.checks = [];
  }

  // One stroke, painted onto the picture.
  paintOp(g, op) {
    const { u, shape } = this;
    if (op.k === 'spray') {
      const R = rng(op.s || 1);
      for (let i = 0; i < op.p.length / 2; i++) sprayFrame(g, op, i, u, R, this.twinkles, this.coverFn);
    } else if (op.k === 'puffy') paintPuffy(g, op, u);
    else if (op.k === 'pattern') paintPattern(g, op, shape, u);
    else if (op.k === 'marker') paintMarker(g, op, u, this.twinkles);
    else if (op.k === 'stamp') paintStamps(g, op, u);
    else if (op.k === 'sticker') drawSticker(g, op, u);
    else if (op.k === 'gems') paintGems(g, op, u);
    else if (op.k === 'glitter') {
      const st = flecksFor(op, shape, u);
      paintFlecks(g, st.out);
      this.twinkles.push(...st.sparks);
    }
  }

  // ----------------------------------------------------------------------- strokes in progress

  // Spray paints straight onto the picture, a frame at a time. A copy from just before lets the
  // stroke be taken back at once (when a pinch starts).
  sprayBegin(op) {
    this.settle(Infinity);
    this.sync();
    this.stroke ||= makeCanvas(this.W, this.H);
    if (this.stroke.width !== this.W) [this.stroke.width, this.stroke.height] = [this.W, this.H];
    this.clear(null, this.stroke).drawImage(this.c.paint, 0, 0);
    this.before = { covered: Uint8Array.from(this.covered), cells: this.coveredCells, tw: this.twinkles.length };
    this.sprayRng = rng(op.s || 1);
  }

  sprayFrame(op) {
    sprayFrame(this.g('paint'), op, op.p.length / 2 - 1, this.u, this.sprayRng, this.twinkles, this.coverFn);
    this.dirty = true;
  }

  // The spray stroke is in the design now, and already on the picture.
  sprayEnd(op) {
    if (isPrefix([...this.painted, op], this.wanted())) {
      this.painted.push(op);
      this.checkpoint();
    } else this.sync();
  }

  sprayAbort() {
    this.clear('paint').drawImage(this.stroke, 0, 0);
    this.covered.set(this.before.covered);
    this.coveredCells = this.before.cells;
    this.twinkles.length = this.before.tw;
    this.dirty = true;
  }

  setLive(op, prog = 1) {
    this.live = { op, prog };
    this.dirty = true;
  }

  dropLive() {
    this.live = null;
    this.liveTip = null;
    this.liveFlecks = null;
    this.dirty = true;
  }

  // A finished stroke (now in the design) is painted on top.
  commit() {
    this.dropLive();
    this.settle(Infinity);
    this.sync();
  }

  // A sticker just stuck on: it bounces on top for a moment, then is painted in.
  float(op, now) {
    this.floating.set(op, now);
    this.sync();
  }

  settle(now) {
    let done = false;
    for (const [op, t] of this.floating) {
      if (now - t >= FLOAT_S) {
        this.floating.delete(op);
        done = true;
      }
    }
    if (done) this.sync();
  }

  // --------------------------------------------------------------------------------- drawing

  compose(now) {
    const g = this.clear('comp');
    g.drawImage(this.c.base, 0, 0);
    g.drawImage(this.c.paint, 0, 0);
    const ug = this.g('comp');
    const { u, shape } = this;
    const live = this.live;
    if (live) {
      const op = live.op;
      if (op.k === 'puffy') paintPuffy(ug, op, u);
      else if (op.k === 'pattern') this.liveTip = paintPattern(ug, op, shape, u, live.prog);
      else if (op.k === 'marker') paintMarker(ug, op, u, null);
      else if (op.k === 'stamp') paintStamps(ug, op, u);
      else if (op.k === 'gems') paintGems(ug, op, u, popIn(now - this.gemAt));
      else if (op.k === 'glitter') {
        if (this.liveFlecks?.op !== op) this.liveFlecks = { n: 0, R: null, out: [], sparks: [], op };
        flecksFor(op, shape, u, this.liveFlecks);
        paintFlecks(ug, this.liveFlecks.out);
      }
    }
    for (const [op, t] of this.floating) drawSticker(ug, op, u, popIn(now - t));
    if (this.pushed?.size) this.paintPushed(ug);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.c.mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    this.dirty = false;
    this.compVersion++;
  }

  needsCompose(now) {
    return this.dirty || this.floating.size > 0 || (this.live?.op.k === 'gems' && now - this.gemAt < 0.6);
  }

  // Pop-it bubbles he's pushed in (in the shelf's big view), drawn over the last pop-it.
  paintPushed(g) {
    const op = this.popitOp();
    if (!op) return;
    const domes = popitDomes(this.shape);
    for (const i of this.pushed) {
      const d = domes[i];
      if (d) dome(g, d.x, d.y, d.r, popitColor(op, d), true);
    }
  }

  popitOp() {
    const ops = this.design.layers.puffy;
    for (let i = ops.length - 1; i >= 0; i--) if (ops[i].pat === 'popit') return ops[i];
    return null;
  }

  // The live bits over the face: earbuds, the robot's blinking light, gem glints and glitter
  // twinkles.
  drawSparkle(ctx, now) {
    drawBuds(ctx, this.shape, -this.budsLift);
    for (const t of this.shape.trims) drawTrimLive(ctx, t, now);
    for (const op of this.design.layers.gem) if (op.k === 'gems') drawGemGlints(ctx, op, this.u, now);
    drawTwinkles(ctx, this.twinkles, now);
    if (this.liveFlecks) drawTwinkles(ctx, this.liveFlecks.sparks, now);
  }

  // Draw the case, seen straight on. ctx is set up in item units; `now` is in seconds.
  draw(ctx, now, { shadow = true } = {}) {
    if (this.needsCompose(now)) this.compose(now);
    const { box, u } = this.shape;
    const img = (c, dy = 0) => ctx.drawImage(c, box.x, box.y + dy, box.w, box.h);
    if (shadow) {
      const m = this.shadowM;
      ctx.drawImage(this.shadow, box.x - m, box.y - m, box.w + m * 2, box.h + m * 2);
    }
    img(this.c.behind);
    const th = 10 * u;
    img(this.c.comp, th);
    img(this.c.dark, th);
    drawEdge(ctx, this.shape, th);
    img(this.c.comp);
    img(this.c.gloss);
    img(this.c.fixed);
    this.drawSparkle(ctx, now);
  }

  // ------------------------------------------------------------------------------- in 3D

  // The far side: the gadget's screen side, framed by the case's lip. Made the first time it's
  // needed. The gadget is drawn mirrored, since it's seen from behind the case.
  makeBack() {
    const c = makeCanvas(this.W, this.H);
    const g = this.g(null, c);
    const { shape } = this;
    drawPlastic(g, shape, { back: true });
    const [bx0, , bx1] = bounds(shape.body);
    g.save();
    g.translate(bx0 + bx1, 0);
    g.scale(-1, 1);
    drawDeviceFront(g, shape);
    g.restore();
    // A soft shine across the whole back (the front's gloss has holes for the cameras, which
    // the back doesn't).
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    const shine = g.createLinearGradient(0, 0, this.W, this.H);
    shine.addColorStop(0, 'rgba(255,255,255,0.28)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0)');
    shine.addColorStop(1, 'rgba(20,10,40,0.14)');
    g.fillStyle = shine;
    g.fillRect(0, 0, this.W, this.H);
    g.globalCompositeOperation = 'source-over';
    this.back = c;
    // Its own shading for turning away from the light: the front's has holes (cameras, the
    // earbud insert) that the back doesn't.
    this.backDark ||= makeCanvas(this.W, this.H);
    const d = this.clear(null, this.backDark);
    d.drawImage(c, 0, 0);
    d.globalCompositeOperation = 'source-in';
    d.fillStyle = 'rgba(30,22,60,0.38)';
    d.fillRect(0, 0, this.W, this.H);
    d.globalCompositeOperation = 'source-over';
  }

  // The case's edge, as a darker (and, near the faces, lighter) copy of the face, at half size.
  makeEdges() {
    const w = Math.ceil(this.W / 2);
    const h = Math.ceil(this.H / 2);
    if (!this.edges || this.edges.dark.width !== w) this.edges = { dark: makeCanvas(w, h), light: makeCanvas(w, h) };
    for (const [name, tint] of [['dark', 'rgba(25,15,50,0.5)'], ['light', 'rgba(255,255,255,0.12)']]) {
      const g = this.clear(null, this.edges[name]);
      g.drawImage(this.c.comp, 0, 0, w, h);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = tint;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }
    this.edgeVersion = this.compVersion;
  }

  // A soft shine that slides across the face as it turns, clipped to the face (`shape`: the
  // mask for the front, the back picture for the back).
  makeSheen(yaw, shape) {
    const w = Math.ceil(this.W / 2);
    const h = Math.ceil(this.H / 2);
    if (!this.sheen || this.sheen.width !== w) this.sheen = makeCanvas(w, h);
    const g = this.clear(null, this.sheen);
    const p = 0.5 - Math.sin(yaw) * 0.9;
    const gr = g.createLinearGradient(0, 0, w, h * 0.4);
    const stop = (o, a) => gr.addColorStop(Math.min(1, Math.max(0, o)), `rgba(255,255,255,${a})`);
    stop(p - 0.18, 0);
    stop(p, 0.38);
    stop(p + 0.18, 0);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(shape, 0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }

  // The middle of the case: what it turns around.
  get middle() {
    const [x0, y0, x1, y1] = this.bounds;
    return [(x0 + x1) / 2, (y0 + y1) / 2];
  }

  // Draw the case turned by yaw and pitch (see view3d.js), with ctx set up in item units and its
  // origin where the middle of the case goes. px: screen pixels per unit, to space the edge slices.
  draw3d(ctx, now, { yaw, pitch, px = 1 }) {
    if (this.needsCompose(now)) this.compose(now);
    if (!this.back) this.makeBack();
    if (this.edgeVersion !== this.compVersion) this.makeEdges();
    const { box, u } = this.shape;
    const [cx, cy] = this.middle;
    const T = this.depth;
    const face = facing(yaw, pitch);
    const front = face >= 0;
    const img = (c) => ctx.drawImage(c, box.x, box.y, box.w, box.h);
    const plane = (z, fn) => {
      ctx.save();
      ctx.transform(...faceMatrix(yaw, pitch, z));
      ctx.translate(-cx, -cy);
      fn();
      ctx.restore();
    };
    // A soft shadow on the table under it.
    const [x0, y0, x1, y1] = this.bounds;
    const half = ((x1 - x0) / 2) * (0.35 + 0.65 * Math.abs(Math.cos(yaw))) + (T / 2) * Math.abs(Math.sin(yaw));
    const gy = ((y1 - y0) / 2) * Math.abs(Math.cos(pitch)) + 60 * u;
    ctx.save();
    ctx.translate(0, gy);
    ctx.scale(1, 0.12);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 1.1);
    sg.addColorStop(0, 'rgba(10,30,30,0.35)');
    sg.addColorStop(1, 'rgba(10,30,30,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, half * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The gadget's bits behind the case, then the edge from far to near, then the near face.
    plane(front ? -T * 0.1 : T * 0.1, () => img(this.c.behind));
    const len = Math.hypot(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch)) * T * px;
    const n = Math.max(1, Math.min(48, Math.ceil(len / 1.2)));
    const [zFar, zNear] = front ? [-T / 2, T / 2] : [T / 2, -T / 2];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const edge = Math.abs(t - 0.5) * 2 > 0.72 ? this.edges.light : this.edges.dark;
      plane(zFar + (zNear - zFar) * t, () => img(edge));
    }
    // Lit from the top left: a face turned away from the light is darker.
    const light = [-0.35, -0.45, 0.82];
    const nrm = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)].map((v) => (front ? v : -v));
    const lit = Math.max(0, nrm[0] * light[0] + nrm[1] * light[1] + nrm[2] * light[2]);
    this.makeSheen(yaw, front ? this.c.mask : this.back);
    plane(zNear, () => {
      if (front) {
        img(this.c.comp);
        img(this.c.gloss);
      } else img(this.back);
      ctx.globalAlpha = Math.min(1, (1 - lit) * 1.6);
      img(front ? this.c.dark : this.backDark);
      ctx.globalAlpha = 0.5 + Math.abs(face) * 0.5;
      img(this.sheen);
      ctx.globalAlpha = 1;
      if (front) img(this.c.fixed);
    });
    if (front) plane(zNear + 4 * u, () => this.drawSparkle(ctx, now));
  }

  // A picture of the case on its own (for the shelf), `h` px tall, cropped to the case as it is
  // (not the room kept for ears and arms), plus its shadow.
  snapshot(h, now = 0) {
    const [x0, y0, x1, y1] = this.bounds;
    const { u } = this.shape;
    const ml = 14 * u;
    const mt = 14 * u;
    const mr = 34 * u;
    const mb = 44 * u;
    const s = h / (y1 - y0 + mt + mb);
    const c = makeCanvas((x1 - x0 + ml + mr) * s, h);
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, (ml - x0) * s, (mt - y0) * s);
    this.draw(g, now);
    return c;
  }

  dispose() {
    const free = (c) => {
      if (c) c.width = c.height = 1;
    };
    for (const c of Object.values(this.c || {})) free(c);
    for (const c of [this.shadow, this.back, this.backDark, this.stroke, this.sheen, this.edges?.dark, this.edges?.light]) free(c);
    this.backDark = null;
    this.dropChecks();
    this.c = null;
    this.edges = null;
    this.sheen = null;
    this.stroke = null;
    this.back = null;
  }
}

// Textures in the plastic that still show through paint, drawn into the gloss.
const TEXTURES = {
  cactus: cactusRibs,
  unicorn: hornSpiral,
  shark: gills,
  robot: rivets,
};

function cactusRibs(g, shape) {
  const { u, box } = shape;
  g.lineCap = 'round';
  for (let x = box.x + 40 * u; x < box.x + box.w; x += 62 * u) {
    g.strokeStyle = 'rgba(10,40,10,0.13)';
    g.lineWidth = 4 * u;
    g.beginPath();
    g.moveTo(x, box.y);
    g.lineTo(x, box.y + box.h);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.2)';
    g.lineWidth = 3 * u;
    g.beginPath();
    g.moveTo(x + 4 * u, box.y);
    g.lineTo(x + 4 * u, box.y + box.h);
    g.stroke();
  }
}

// Grooves twisting up the unicorn's horn (only where it sticks out above the top edge).
function hornSpiral(g, shape) {
  const horn = shape.extra.find((p) => p.tag === 'horn');
  if (!horn) return;
  const { u } = shape;
  const [x0, y0, x1, y1] = bounds([horn]);
  const top = ITEMS[shape.item].ears.at[0][1];
  const w = x1 - x0;
  g.save();
  g.clip(partPath(horn));
  g.beginPath();
  g.rect(x0 - w, y0 - w, w * 3, top - y0 + w);
  g.clip();
  g.lineCap = 'round';
  const n = 7;
  for (let k = 1; k < n; k++) {
    const y = y0 + ((y1 - y0) * k) / n;
    for (const [c, lw, dy] of [['rgba(150,90,0,0.32)', 5, 0], ['rgba(255,255,255,0.55)', 3, 5]]) {
      g.strokeStyle = c;
      g.lineWidth = lw * u;
      g.beginPath();
      g.moveTo(x0 - 4 * u, y + w * 0.22 + dy * u);
      g.lineTo(x1 + 4 * u, y - w * 0.22 + dy * u);
      g.stroke();
    }
  }
  g.restore();
}

// Three gill slits on the shark's side, above its fin.
function gills(g, shape) {
  const { u } = shape;
  const { xl, y, s } = ITEMS[shape.item].fins;
  const R = s * 0.2;
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const x = xl + s * (0.3 + 0.12 * k);
    for (const [c, lw, dx] of [['rgba(20,50,90,0.3)', 6, 0], ['rgba(255,255,255,0.35)', 3, 4]]) {
      g.strokeStyle = c;
      g.lineWidth = lw * u;
      g.beginPath();
      g.arc(x + R + dx * u, y - s * 0.2, R, Math.PI - 0.75, Math.PI + 0.75);
      g.stroke();
    }
  }
}

// A rivet in each corner of the robot (where there's no camera in the way).
function rivets(g, shape) {
  const { u } = shape;
  const [ax, ay, aw, ah] = shape.area;
  const m = 30 * u;
  const r = 11 * u;
  for (const [x, y] of [[ax + m, ay + m], [ax + aw - m, ay + m], [ax + m, ay + ah - m], [ax + aw - m, ay + ah - m]]) {
    if (!onCase(shape, x, y) || !onCase(shape, x - r * 2, y - r * 2) || !onCase(shape, x + r * 2, y + r * 2)) continue;
    g.fillStyle = 'rgba(20,30,50,0.25)';
    g.beginPath();
    g.arc(x + 2 * u, y + 3 * u, r, 0, Math.PI * 2);
    g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.5, 'rgba(205,212,224,0.9)');
    gr.addColorStop(1, 'rgba(120,130,150,0.9)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}
