// The exam room: one patient on the table, the tool tray, the clipboard and the monitor.
//
// Using a tool: he drags it from the tray to the glowing spot on the patient, or taps it (it
// floats up beside the patient and the next touch picks it up). Near its spot a tool snaps on;
// the stethoscope, ear camera, light and needle stay put if he lets go and keep working. Each step
// (steps.js) turns what the tool is doing into events, and this file turns those into sounds,
// faces, voice, the monitor picture and ticks on the clipboard. When all seven are ticked he picks
// a sticker for the patient, there's a party, and the patient waves goodbye.
import { PATIENTS } from './patients.js';
import { rig, hotspots, defaultPose, partAt, inside, FEET_Y, HEAD_TOP, standingTop } from './rig.js';
import { drawPatient, faceFor } from './patient-art.js';
import { examLayout } from './layout.js';
import { bakeExam, drawScaleDial, drawHeightBar, heightBarKnob, screenRect } from './room.js';
import { drawMonitor } from './monitor.js';
import { drawTool, drawHand, drawSpotRing } from './tool-art.js';
import { STEPS, STEP_INFO, markDone, isComplete, nextStep } from './checklist.js';
import { newStep, updateStep, toolOf, progress, TOOL_SPOTS, STICKY } from './steps.js';
import { ICONS, CHECK } from './icons.js';
import { Particles } from './effects.js';
import { sheet, drawSticker, STICKER_SAY } from './stickers.js';
import { BANDAGES, BANDAGE_SAY, drawBandage } from './bandages.js';
import { rng, newSeed } from './rng.js';
import { arrivalLine, pickAilment, sickLevel, betterLine, sickPose, restArm, Symptoms, SNEEZE_AT, AILMENTS } from './sickness.js';
import * as sound from './sound.js';
import { say, hush, NARRATOR } from './speech.js';

const OFF = 0.85; // the tool's tip sits this far above his finger (rig units)
const SNAP = 0.85; // extra reach around a spot for snapping (rig units)
const TAP_MS = 350;
const TAP_PX = 12;
const IDLE_HINT = 8; // seconds before the hint hand
const IDLE_SAY = 9; // ...and before the narrator repeats the prompt

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ease = (k) => 1 - (1 - k) ** 3;
const STEP_OF = { temp: 'temp', heart: 'heart', ears: 'ears', ahh: 'ahh', reflex: 'reflex', cotton: 'shot', syringe: 'shot', bandage: 'shot' };

export class Exam {
  constructor(stage, cb) {
    this.stage = stage;
    this.cb = cb;
    this.active = false;
    this.timers = [];
    this.fx = new Particles();
    this.trayEl = $('tray');
    this.clipEl = $('clip');
    this.pickerEl = $('picker');
    this.homeEl = $('ex-home');
    this.screen = $('exam');
    this.buildTray();
    this.buildClip();

    this.trayEl.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.slot');
      if (b) this.slotDown(b.dataset.step, e);
    });
    this.pickerEl.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.pick');
      if (b) this.pickDown(b.dataset.kind, b.dataset.id, e);
    });
    this.homeEl.addEventListener('click', () => {
      sound.pop();
      this.cb.onHome();
    });
    stage.canvas.addEventListener('pointerdown', (e) => this.active && this.canvasDown(e));
    window.addEventListener('pointermove', (e) => this.active && this.move(e));
    window.addEventListener('pointerup', (e) => this.active && this.up(e));
    window.addEventListener('pointercancel', (e) => this.active && this.up(e, true));
    window.addEventListener('blur', () => this.active && this.letGo());
  }

  // ------------------------------------------------------------------------------- the DOM

  buildTray() {
    this.slots = {};
    for (const id of STEPS) {
      const b = document.createElement('button');
      b.className = 'slot';
      b.dataset.step = id;
      b.setAttribute('aria-label', STEP_INFO[id].label);
      b.innerHTML = `${ICONS[id]}<span class="tick">${CHECK}</span>`;
      this.trayEl.append(b);
      this.slots[id] = b;
    }
  }

  buildClip() {
    this.boxes = {};
    const paper = document.createElement('div');
    paper.className = 'paper';
    for (const id of [...STEPS, 'star']) {
      const d = document.createElement('div');
      d.className = `box ${id === 'star' ? 'star' : ''}`;
      d.innerHTML = `${ICONS[id]}<span class="tick">${CHECK}</span>`;
      paper.append(d);
      this.boxes[id] = d;
    }
    this.clipEl.append(paper);
  }

  refreshTicks() {
    for (const id of STEPS) {
      const on = this.done.includes(id);
      this.slots[id].classList.toggle('done', on);
      this.boxes[id].classList.toggle('done', on);
    }
    this.boxes.star.classList.toggle('done', !!this.sticker);
    this.boxes.star.classList.toggle('glow', isComplete(this.done) && !this.sticker);
  }

  place() {
    const L = this.L;
    const set = (el, r) => Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    set(this.homeEl, { x: L.home.x, y: L.home.y, w: L.home.s, h: L.home.s });
    this.homeEl.style.setProperty('--btn', `${L.home.s}px`);
    set(this.trayEl, L.tray);
    this.trayEl.style.setProperty('--slot', `${L.tray.slot}px`);
    this.trayEl.style.gap = `${L.tray.gap}px`;
    this.trayEl.style.padding = `${L.tray.pad}px`;
    set(this.clipEl, L.clip);
    this.clipEl.style.setProperty('--box', `${L.clip.box}px`);
    this.clipEl.style.setProperty('--head', `${L.clip.head}px`);
    const cp = Math.round(L.clip.w * 0.09);
    this.clipEl.style.padding = `${L.clip.head}px ${cp}px ${cp}px`;
    const n = 4;
    const ps = Math.round(L.tray.slot * 1.05);
    const pw = n * ps + (n - 1) * L.tray.gap * 2 + L.tray.pad * 2;
    set(this.pickerEl, { x: (L.w - pw) / 2, y: L.tray.y + L.tray.h - ps - L.tray.pad * 2, w: pw, h: ps + L.tray.pad * 2 });
    this.pickerEl.style.setProperty('--pick', `${ps}px`);
    this.pickerEl.style.gap = `${L.tray.gap * 2}px`;
    this.pickerEl.style.padding = `${L.tray.pad}px`;
  }

  // ---------------------------------------------------------------------------- open / close

  // visit: { done, shot: { stage, bandage } } from a saved check-up, or null for a new one.
  open(pid, visit = null, { skipEnter = false, ail = null } = {}) {
    this.active = true;
    this.pid = pid;
    this.sp = PATIENTS[pid];
    this.rand = rng(newSeed());
    this.steps = Object.fromEntries(STEPS.map((id) => [id, newStep(id, this.sp, this.rand)]));
    this.done = [...(visit?.done || [])].filter((s) => STEPS.includes(s));
    for (const id of this.done) {
      this.steps[id].done = true;
      if (id === 'measure') this.steps.measure.stage = 'done';
    }
    this.bandage = null;
    const shot = this.steps.shot;
    if (visit?.shot) {
      if (visit.shot.stage === 'done' || this.done.includes('shot')) {
        shot.stage = 'done';
        shot.done = true;
        this.bandage = visit.shot.bandage || 'stars';
      } else if (['wipe', 'needle', 'bandage'].includes(visit.shot.stage)) {
        shot.stage = visit.shot.stage;
        if (shot.stage === 'bandage') shot.push = 1;
      }
    }
    this.sticker = null;
    // sick on arrival, better with every step done
    this.ail = AILMENTS[visit?.ail] ? visit.ail : AILMENTS[ail] ? ail : pickAilment(this.rand);
    this.sickShown = sickLevel(this.done.length);
    this.symptoms = new Symptoms(this.ail, this.rand);
    this.tempHot = false;
    this.tool = null;
    this.held = null; // a sticker or bandage from the picker, in his finger
    this.fly = null;
    this.meas = null;
    this.bar = { y: null, drag: null, auto: false, back: null };
    this.pressing = null;
    this.pose = defaultPose();
    this.kick = [{ a: 0, v: 0 }, { a: 0, v: 0 }];
    this.thump = { a: 0, v: 0 };
    this.mood = null;
    this.mouth = 0;
    this.tilt = 0;
    this.puffAt = -10;
    this.blinkAt = 2;
    this.beats = [];
    this.view = { mode: 'idle', since: 0, lastBusy: 0 };
    this.checkAt = -10;
    this.lastAct = performance.now() / 1000;
    this.hinted = 0;
    this.spoke = 0;
    this.timers = [];
    this.nervousSaid = false;
    this.surpriseAt = 0;
    this.tempHappyAt = 0;
    this.dial = null;
    this.waveUntil = 0;
    this.headBob = 0;
    this.finished = false;
    this.fx.clear();
    this.pickerEl.classList.remove('show');
    this.screen.classList.remove('away', 'party');
    this.refreshTicks();
    this.resize();
    const now = performance.now() / 1000;
    if (skipEnter) {
      this.pat = { at: 'seat', stand: 0, mv: null };
      this.phase = 'exam';
      this.arrived(now);
    } else {
      this.pat = { at: 'offR', stand: 1, mv: null };
      this.phase = 'enter';
      this.walk('offR', 'floorR', 1, 1, this.sickShown > 0.5 ? 1.6 : 1.1, 3, now, () => this.hop('floorR', 'seat', 1, 0, 0.55, 1.3, () => this.arrived(performance.now() / 1000)));
    }
  }

  arrived(now) {
    this.phase = 'exam';
    this.waveUntil = now + 1.4;
    this.lastAct = now;
    if (isComplete(this.done)) {
      this.later(0.6, () => this.stickerTime());
      return;
    }
    if (this.steps.shot.stage === 'bandage') {
      this.later(0.4, () => this.showPicker('bandage'));
      return;
    }
    if (this.done.length) this.sayN("Let's finish the check-up!", { queue: true });
    else this.sayN(arrivalLine(this.sp, this.ail), { queue: true });
  }

  close() {
    this.active = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    sound.loopStop();
    hush();
    this.tool = null;
    this.held = null;
    this.pickerEl.classList.remove('show');
  }

  later(s, fn) {
    this.timers.push(setTimeout(() => this.active && fn(), s * 1000));
  }

  visit() {
    const shot = this.steps.shot;
    return { p: this.pid, done: this.done, shot: { stage: shot.stage, bandage: this.bandage }, ail: this.ail };
  }

  resize() {
    const st = this.stage;
    this.L = examLayout(st.w, st.h, st.inset);
    this.bg = bakeExam(this.L, st.dpr);
    this.screenR = screenRect(this.L);
    this.place();
  }

  // ------------------------------------------------------------------------------- voices

  sayN(text, opts = {}) {
    say(text, { ...NARRATOR, ...opts });
  }

  sayP(text, opts = {}) {
    say(text, { voice: this.sp.id, pitch: this.sp.pitch, rate: 1.0, ...opts });
  }

  setMood(name, secs, now = performance.now() / 1000) {
    this.mood = { name, until: now + secs };
  }

  // ------------------------------------------------------------------------- where things are

  anchor(name) {
    const L = this.L;
    const s = this.sp.size;
    const standY = L.floorY - FEET_Y * s * L.u;
    switch (name) {
      case 'seat':
        return { x: L.table.x, y: L.table.y };
      case 'scale':
        return { x: L.scale.x, y: L.scale.y - FEET_Y * s * L.u };
      case 'floorR':
        return { x: Math.min(L.table.x + 4.4 * L.u, L.w - 2.5 * L.u), y: standY };
      default: // offR
        return { x: L.w + 4 * L.u, y: standY };
    }
  }

  // The patient's hip on screen right now (following any hop or walk in progress).
  patPos(now) {
    const p = this.pat;
    if (!p.mv) return { ...this.anchor(p.at), stand: p.stand };
    const m = p.mv;
    const k = clamp((now - m.t0) / m.dur, 0, 1);
    const a = this.anchor(m.from);
    const b = this.anchor(m.to);
    const e = m.bounces ? k : ease(k);
    const u = this.L.u;
    let y = lerp(a.y, b.y, e) - Math.sin(Math.PI * k) * m.arc * u;
    if (m.bounces) y -= Math.abs(Math.sin(Math.PI * k * m.bounces)) * 0.45 * u;
    return { x: lerp(a.x, b.x, e), y, stand: lerp(m.s0, m.s1, clamp(k * 1.4 - 0.2, 0, 1)) };
  }

  hop(from, to, s0, s1, dur, arc, then, now = performance.now() / 1000) {
    sound.hop();
    this.pat.mv = { from, to, s0, s1, dur, arc, bounces: 0, t0: now, then };
  }

  walk(from, to, s0, s1, dur, bounces, now, then) {
    this.pat.mv = { from, to, s0, s1, dur, arc: 0, bounces, t0: now, then };
  }

  // Spots on screen for the current pose.
  spotsNow() {
    const { x, y } = this.pp;
    const u = this.L.u;
    const hs = this.hs;
    const out = {};
    for (const [k, h] of Object.entries(hs)) {
      if (k === 'forehead') out[k] = { x0: x + h.x0 * u, x1: x + h.x1 * u, x: x + h.x * u, y: y + h.y * u, r: h.r * u };
      else if (k === 'headTop') out[k] = { x: x + h.x * u, y: y + h.y * u };
      else out[k] = { x: x + h.x * u, y: y + h.y * u, r: h.r * u };
    }
    return out;
  }

  // The nearest of this tool's spots within reach of the tip or the finger.
  snapFor(kind, tip, finger) {
    const S = this.spots;
    const u = this.L.u;
    let best = null;
    for (const name of TOOL_SPOTS[kind] || []) {
      const s = S[name];
      let d;
      if (name === 'forehead') {
        const px = (p) => clamp(p.x, s.x0, s.x1);
        d = Math.min(Math.hypot(tip.x - px(tip), tip.y - s.y), Math.hypot(finger.x - px(finger), finger.y - s.y));
      } else d = Math.min(dist(tip, s), dist(finger, s) + 0.3 * u);
      const reach = s.r + SNAP * u;
      if (d <= reach && (!best || d < best.d)) best = { name, d };
    }
    return best?.name || null;
  }

  // ------------------------------------------------------------------------------ the tools

  slotDown(id, e) {
    if (this.phase !== 'exam' || this.held || this.fly) return;
    this.poke();
    const now = performance.now() / 1000;
    if (id === 'measure') {
      sound.pop();
      this.startMeasure(now);
      return;
    }
    if (this.meas) this.endMeasure(now, false);
    const st = this.steps[id];
    if (id === 'shot' && st.stage === 'bandage') {
      this.showPicker('bandage');
      return;
    }
    const kind = id === 'shot' && st.done ? 'syringe' : toolOf(st);
    this.pickTool(kind, e, now, true);
    sound.pop();
    // name it and say what to do
    if (id === 'shot' && !st.done) {
      if (st.stage === 'wipe') this.sayN('First, clean the arm!', { force: true });
      else this.shotPrompt();
    } else this.sayN(`${STEP_INFO[id].name} ${st.done ? '' : STEP_INFO[id].prompt}`, { force: true });
  }

  shotPrompt() {
    this.sayN('Now the shot! Put it on the arm.', { force: true });
    if (!this.nervousSaid) {
      this.nervousSaid = true;
      this.sayP(this.sp.nervous, { queue: true });
      this.sayN('Take a big breath. You can do it!', { queue: true });
    }
  }

  pickTool(kind, e, now, fromTray) {
    if (this.tool && this.tool.kind !== kind) this.toolHome();
    const f = { x: e.clientX, y: e.clientY };
    const tip = { x: f.x, y: f.y - OFF * this.L.u };
    if (!this.tool || this.tool.mode === 'home') {
      this.tool = { kind, step: STEP_OF[kind], x: tip.x, y: tip.y, swing: -0.4, tapAt: -10 };
    }
    Object.assign(this.tool, { mode: 'held', pid: e.pointerId, fx: f.x, fy: f.y, down: { x: f.x, y: f.y, t: now }, moved: false, fromTray });
    if (!fromTray) this.snapNow(this.tool);
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {
      /* fine */
    }
  }

  // Work out right now which spot a held tool is on (normally done every frame).
  snapNow(t) {
    if (!this.spots) return;
    const finger = { x: t.fx, y: t.fy };
    const raw = { x: t.fx, y: t.fy - OFF * this.L.u };
    t.raw = raw;
    t.spot = this.snapFor(t.kind, raw, finger);
    const at = t.spot ? this.snapTarget(t, t.spot, raw) : raw;
    t.x = at.x;
    t.y = at.y;
  }

  toolHome() {
    const t = this.tool;
    if (!t) return;
    if (t.kind === 'cotton') sound.loopStop('squeak');
    if (this.sp.id === 'kitty') sound.loopStop('purr');
    const slot = this.slots[t.step === 'shot' ? 'shot' : t.step];
    const r = slot.getBoundingClientRect();
    t.mode = 'home';
    t.home = { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
    t.spot = null;
  }

  letGo() {
    if (this.tool?.mode === 'held') this.tool.mode = 'ready';
    this.pressing = null;
    this.bar.drag = null;
    if (this.held) this.dropHeld();
    sound.loopStop('squeak');
  }

  poke() {
    this.lastAct = performance.now() / 1000;
    this.hinted = 0;
    for (const s of Object.values(this.slots)) s.classList.remove('nudge');
  }

  canvasDown(e) {
    const now = performance.now() / 1000;
    this.poke();
    if (this.phase !== 'exam') return;
    const f = { x: e.clientX, y: e.clientY };
    const u = this.L.u;
    // the height bar
    if (this.meas?.stage === 'bar') {
      const knob = heightBarKnob(this.L, this.bar.y);
      const onBar = Math.abs(f.y - (this.bar.y - 0.15 * u)) < 1.1 * u && f.x > this.L.chart.x - u && f.x < knob.x + u;
      if (dist(f, knob) < 1.3 * u || onBar) {
        this.bar.drag = { pid: e.pointerId, dy: this.bar.y - f.y, down: f, t: now, moved: false };
        sound.click();
        return;
      }
    }
    const t = this.tool;
    if (t && t.mode === 'ready') {
      this.pickTool(t.kind, e, now, false);
      return;
    }
    if (t && t.mode === 'stuck') {
      if (t.kind === 'syringe' && this.steps.shot.stage === 'push') {
        this.pressing = e.pointerId;
        return;
      }
      if (dist(f, t) < 2.2 * u || dist(f, { x: t.x + u, y: t.y + 1.5 * u }) < 1.6 * u) {
        this.pickTool(t.kind, e, now, false);
        return;
      }
    }
    this.patientTap(f, now);
  }

  patientTap(f, now) {
    const { x, y } = this.pp;
    const u = this.L.u;
    const part = partAt(this.rig, (f.x - x) / u, (f.y - y) / u);
    if (!part) return;
    this.fx.sparkle(f.x, f.y, 6);
    if (part === 'nose') {
      sound.honk();
      this.setMood('surprised', 0.8, now);
    } else if (part === 'head') {
      sound.trill();
      this.sayP(this.sp.hi);
      this.setMood('happy', 1.2, now);
      this.headBob = now;
    } else if (part === 'tummy') {
      sound.trill();
      this.sayP(this.sp.giggle);
      this.setMood('giggle', 1.4, now);
    } else {
      sound.pop();
      this.setMood('happy', 0.8, now);
    }
  }

  move(e) {
    const t = this.tool;
    if (t && t.mode === 'held' && e.pointerId === t.pid) {
      t.fx = e.clientX;
      t.fy = e.clientY;
      if (Math.hypot(t.fx - t.down.x, t.fy - t.down.y) > TAP_PX) t.moved = true;
      this.lastAct = performance.now() / 1000;
    }
    if (this.bar.drag && e.pointerId === this.bar.drag.pid) {
      this.bar.drag.y = e.clientY;
      if (Math.abs(e.clientY - this.bar.drag.down.y) > TAP_PX) this.bar.drag.moved = true;
    }
    if (this.held && e.pointerId === this.held.pid) {
      this.held.fx = e.clientX;
      this.held.fy = e.clientY;
      if (Math.hypot(e.clientX - this.held.down.x, e.clientY - this.held.down.y) > TAP_PX) this.held.moved = true;
    }
  }

  up(e) {
    const now = performance.now() / 1000;
    const t = this.tool;
    if (t && t.mode === 'held' && e.pointerId === t.pid) {
      const st = this.steps[t.step];
      if (t.kind === 'cotton') sound.loopStop('squeak');
      // a quick tap may not have lasted a whole frame: settle where it is first, and let the
      // step see it there once (so a tap on a knee still taps it)
      this.snapNow(t);
      if (t.spot && this.phase === 'exam') this.feed(t, null, now, 0);
      if (this.tool !== t) return;
      if (t.spot && STICKY.has(t.kind) && !st.done) t.mode = 'stuck';
      else t.mode = 'ready';
    }
    if (this.pressing === e.pointerId) this.pressing = null;
    const d = this.bar.drag;
    if (d && e.pointerId === d.pid) {
      if (!d.moved && now - d.t < TAP_MS) this.bar.auto = true;
      this.bar.drag = null;
    }
    if (this.held && e.pointerId === this.held.pid) this.dropHeld();
  }

  // ----------------------------------------------------------------- height and weight

  startMeasure(now) {
    if (this.meas || this.pat.mv) return;
    this.toolHome();
    this.meas = { stage: 'hop', t0: now };
    this.sayN(this.steps.measure.done ? 'Height and weight!' : 'Height and weight! Hop on the scale!', { force: true });
    this.hop('seat', 'scale', 0, 1, 0.75, 1.6, () => {
      const t = performance.now() / 1000;
      this.pat.at = 'scale';
      this.pat.stand = 1;
      this.pat.mv = null;
      sound.spring();
      this.meas.stage = 'dial';
      this.meas.t0 = t;
      this.dial = { turn: 0, v: 0, target: this.sp.weight };
    }, now);
  }

  endMeasure(now, finished) {
    if (!this.meas) return;
    this.meas = null;
    this.bar.drag = null;
    this.bar.auto = false;
    this.bar.back = { from: this.bar.y, t0: now };
    if (!this.steps.measure.done) this.steps.measure.stage = 'idle';
    const go = () => this.hop('scale', 'seat', 1, 0, 0.7, 1.6, () => {
      this.pat.at = 'seat';
      this.pat.stand = 0;
      this.pat.mv = null;
    });
    if (this.pat.mv) this.pat.mv.then = () => go();
    else go();
    if (finished) this.lastAct = now;
  }

  barRest() {
    return this.L.chart.top + 0.75 * this.L.u;
  }

  updateMeasure(now, dt) {
    const L = this.L;
    const restY = this.barRest();
    if (this.bar.y == null) this.bar.y = restY;
    // sliding back up after a measure
    if (this.bar.back) {
      const k = clamp((now - this.bar.back.t0) / 0.6, 0, 1);
      this.bar.y = lerp(this.bar.back.from, restY, ease(k));
      if (k >= 1) this.bar.back = null;
    }
    const m = this.meas;
    if (!m) return;
    if (m.stage === 'dial') {
      const d = this.dial;
      d.v += (-(d.turn - d.target) * 40 - d.v * 5) * dt;
      d.turn += d.v * dt;
      if (now - m.t0 > 1.4) {
        m.stage = 'bar';
        d.turn = d.target;
        d.settled = true;
        this.steps.measure.stage = 'bar';
        this.sayN('Slide the bar down to the head!', { queue: true });
        this.lastAct = now - 3; // hint sooner here
      }
      return;
    }
    if (m.stage !== 'bar') return;
    const headY = this.spots.headTop.y;
    if (this.bar.drag?.y != null) this.bar.y = clamp(this.bar.drag.y + this.bar.drag.dy, restY, headY);
    else if (this.bar.auto) this.bar.y = Math.min(headY, this.bar.y + 7 * L.u * dt);
    const touch = this.bar.y >= headY - 1;
    for (const ev of updateStep(this.steps.measure, { touch }, dt)) {
      if (ev.type === 'touch') {
        sound.boop();
        this.fx.bigStar(L.chart.x + L.chart.w / 2, headY, 0.6 * L.u);
        this.fx.sparkle(this.spots.headTop.x, headY, 12);
        this.sayP(this.sp.big, { queue: true });
        this.setMood('happy', 1.8, now);
        m.stage = 'done';
        this.bar.drag = null;
        this.bar.auto = false;
        this.complete('measure', now);
        this.later(1.7, () => this.endMeasure(performance.now() / 1000, true));
      }
    }
    if (this.done.includes('measure') && m.stage === 'bar' && touch) {
      // measuring again, just for fun
      sound.boop();
      this.fx.bigStar(L.chart.x + L.chart.w / 2, headY, 0.6 * L.u);
      this.sayP(this.sp.big);
      this.setMood('happy', 1.5, now);
      m.stage = 'done';
      this.bar.drag = null;
      this.bar.auto = false;
      this.later(1.4, () => this.endMeasure(performance.now() / 1000, true));
    }
  }

  // --------------------------------------------------------------------- tool each frame

  updateTool(now, dt) {
    const t = this.tool;
    if (!t) return;
    const u = this.L.u;
    if (t.mode === 'home') {
      const k = Math.min(1, dt * 9);
      t.x = lerp(t.x, t.home.x, k);
      t.y = lerp(t.y, t.home.y, k);
      if (dist(t, t.home) < 8) this.tool = null;
      return;
    }
    if (t.mode === 'ready') {
      const r = this.L.ready;
      const k = Math.min(1, dt * 8);
      t.x = lerp(t.x, r.x, k);
      t.y = lerp(t.y, r.y + Math.sin(now * 3) * 0.12 * u, k);
      t.spot = null;
      t.swing = -0.3;
      this.feed(t, null, now, dt);
      return;
    }
    let target;
    if (t.mode === 'held') {
      const finger = { x: t.fx, y: t.fy };
      const raw = { x: t.fx, y: t.fy - OFF * u };
      t.spot = this.snapFor(t.kind, raw, finger);
      target = t.spot ? this.snapTarget(t, t.spot, raw) : raw;
      t.raw = raw;
    } else {
      // stuck: stay on the spot as he breathes and wiggles
      target = this.snapTarget(t, t.spot, { x: t.x, y: t.y });
    }
    const prev = { x: t.x, y: t.y };
    const k = t.spot ? Math.min(1, dt * 22) : 1;
    t.x = lerp(t.x, target.x, k);
    t.y = lerp(t.y, target.y, k);
    this.feed(t, prev, now, dt);
    if (t.spot === null && t.mode === 'stuck') t.mode = 'ready';
  }

  snapTarget(t, spot, raw) {
    const s = this.spots[spot];
    const u = this.L.u;
    if (!s) return raw;
    if (spot === 'forehead') return { x: clamp(raw.x, s.x0 - 0.3 * u, s.x1 + 0.3 * u), y: s.y };
    if (t.kind === 'cotton') {
      const dx = raw.x - s.x;
      const dy = raw.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(d, 0.75 * u);
      return { x: s.x + (dx / d) * m, y: s.y + (dy / d) * m };
    }
    // a little give, so it feels held, not glued
    return { x: s.x + clamp(raw.x - s.x, -0.2 * u, 0.2 * u) * 0.5, y: s.y + clamp(raw.y - s.y, -0.2 * u, 0.2 * u) * 0.5 };
  }

  // Tell the tool's step what the tool is doing, and react to what it says back.
  feed(t, prev, now, dt) {
    const st = this.steps[t.step];
    const u = this.L.u;
    const spot = t.mode === 'held' || t.mode === 'stuck' ? t.spot : null;
    const input = { spot };
    if (t.kind === 'temp' && spot === 'forehead') {
      const f = this.spots.forehead;
      input.along = (t.x - f.x0) / (f.x1 - f.x0 || 1);
    }
    if (t.kind === 'cotton' && spot === 'arm' && prev) {
      // rubbing counts how far his finger goes, so quick little scrubs count in full
      const raw = t.raw || t;
      const moved = t.lastRaw ? Math.min(0.5, dist(raw, t.lastRaw) / u) : 0;
      t.lastRaw = { x: raw.x, y: raw.y };
      input.rub = moved;
      t.rubbing = moved > 0.01;
      sound.loopStart('squeak');
      sound.loopLevel(Math.min(1, moved * 12));
    } else if (t.kind === 'cotton') {
      t.lastRaw = null;
      sound.loopStop('squeak');
    }
    if (t.kind === 'syringe') input.pressing = this.pressing != null || t.mode === 'held';
    if (t.kind === 'bandage') return;
    // a tool from a finished step still does its thing for fun, but ticks nothing
    if (st.done) {
      this.playForFun(t, spot, now);
      return;
    }
    if ((t.kind === 'syringe' && st.stage === 'wipe') || (t.kind === 'cotton' && st.stage !== 'wipe')) return;
    for (const ev of updateStep(st, input, dt)) this.onEvent(t, st, ev, now);
  }

  // After a step is done its tool still works: the heart still beats, the knees still kick.
  playForFun(t, spot, now) {
    const was = t.funSpot;
    t.funSpot = spot;
    if (!spot || spot === was) {
      if (spot === 'chest' && now - (t.funBeat || 0) > 60 / this.sp.bpm) {
        t.funBeat = now;
        this.beat(now);
      }
      return;
    }
    if (t.kind === 'reflex') this.kickLeg(spot === 'kneeL' ? 0 : 1, this.rand() < 0.3, now);
    else if (t.kind === 'ears') sound.whirr();
    else if (t.kind === 'ahh') this.sayP(this.sp.ahh);
    else if (t.kind === 'temp') sound.beep(8);
    else if (spot === 'tummy') {
      sound.gurgle();
      this.setMood('giggle', 1, now);
    }
  }

  beat(now) {
    sound.heartbeat(this.sp.bpm > 150 ? 0.7 : 1);
    this.beats.push(now);
    if (this.beats.length > 12) this.beats.shift();
    const c = this.spots.chest;
    this.fx.heart(c.x + this.L.u * 0.2, c.y - this.L.u * 0.3, this.L.u * 0.22);
  }

  kickLeg(side, mega, now) {
    sound.tok();
    this.tool && (this.tool.tapAt = now);
    this.later(0.08, () => sound.boing(mega));
    this.kick[side].v += mega ? 17 : 6.5;
    if (this.sp.tail === 'dino') this.thump.v += mega ? 14 : 8;
    if (mega) {
      this.setMood('surprised', 1.1, now);
      this.sayP(this.sp.whoa, { force: true });
    }
  }

  onEvent(t, st, ev, now) {
    const sp = this.sp;
    const S = this.spots;
    const u = this.L.u;
    switch (ev.type) {
      // thermometer
      case 'beep':
        sound.beep(ev.n);
        break;
      // stethoscope
      case 'listen':
        if (sp.id === 'kitty') sound.loopStart('purr');
        break;
      case 'unlisten':
        if (sp.id === 'kitty') sound.loopStop('purr');
        break;
      case 'beat':
        this.beat(now);
        break;
      case 'breath':
        this.sayN('Deep breath!', { force: true });
        this.puffAt = now + 0.4;
        this.later(0.4, () => sound.breath());
        if (this.ail === 'cold' && this.sickShown > 0.3) {
          this.later(1.9, () => {
            sound.cough();
            this.sayP('Cough, cough!', { queue: true });
            this.setMood('sneeze', 0.6);
          });
        }
        break;
      case 'gurgle':
        sound.gurgle();
        break;
      case 'giggle':
        this.sayP(sp.giggle, { force: true });
        this.setMood('giggle', 1.6, now);
        sound.trill();
        break;
      // ear camera
      case 'look':
        sound.whirr();
        break;
      case 'surprise':
        this.surpriseAt = now;
        sound.trill();
        this.sayN('Peek-a-boo! A ladybug says hi!', { force: true });
        break;
      case 'ear':
        sound.click();
        this.fx.sparkle(S[ev.side ? 'earR' : 'earL'].x, S[ev.side ? 'earR' : 'earL'].y, 8);
        if (ev.other >= 0) {
          this.sayN('Now the other ear!', { queue: true });
          // hop the camera over to the other side if he let go of it
          if (t.mode === 'stuck') t.mode = 'ready';
        }
        break;
      // say ahh
      case 'open':
        this.sayP(sp.ahh, { force: true });
        break;
      // reflex hammer
      case 'tap':
        this.kickLeg(ev.side, ev.mega, now);
        break;
      // the shot
      case 'cold':
        this.sayP(sp.cold, { force: true });
        this.setMood('surprised', 0.8, now);
        break;
      case 'clean':
        sound.loopStop('squeak');
        sound.sparkle();
        this.fx.sparkle(S.arm.x, S.arm.y, 14, ['#ffffff', '#9ee8ff', '#c8f7ff']);
        this.fx.poof(t.x, t.y, 0.8 * u);
        sound.poof();
        // the needle is next: it pops up beside him, ready to pick up
        this.tool = { kind: 'syringe', step: 'shot', mode: 'ready', x: t.x, y: t.y, swing: 0, tapAt: -10 };
        this.later(0.5, () => this.shotPrompt());
        break;
      case 'poke':
        sound.pinch();
        this.sayN('Hold your finger down to push!', { queue: true });
        break;
      case 'ouch':
        this.sayP(sp.ouch, { force: true });
        this.setMood('ouch', 1.1, now);
        this.fx.sparkle(S.arm.x, S.arm.y, 5, ['#ffffff', '#ffd6e0']);
        break;
      case 'pushed':
        sound.hiss();
        this.pressing = null;
        this.sayP(sp.notBad, { queue: true });
        this.setMood('proud', 2, now);
        this.toolHome();
        this.save();
        this.later(1.2, () => this.showPicker('bandage'));
        break;
      case 'done':
        this.complete(t.step, now);
        break;
      default:
        break;
    }
  }

  // A step is finished: a tick on the clipboard, a ding, a cheer.
  complete(id, now) {
    if (this.done.includes(id)) return;
    const before = this.done.length;
    if (id === 'temp') this.tempHot = this.ail === 'fever' && sickLevel(before) > 0.25;
    this.done = markDone(this.done, id);
    this.feelBetter(before, this.done.length, now);
    sound.ding();
    const box = this.boxes[id];
    box.classList.add('pop');
    setTimeout(() => box.classList.remove('pop'), 700);
    this.refreshTicks();
    if (id === 'temp') {
      this.tempHappyAt = now;
      sound.tripleBeep();
    }
    this.checkAt = now + (id === 'temp' ? 1.3 : 0.5);
    const t = this.tool;
    const cheer = id === 'temp' && this.tempHot ? STEP_INFO.temp.hot : STEP_INFO[id].cheer;
    const better = betterLine(before, this.done.length);
    if (id === 'shot') this.sayP(this.sp.brave, { queue: true });
    // the patient saying they feel better is the cheer, when they say it
    if (better) this.sayP(better, { queue: true });
    else this.sayN(cheer, { queue: true });
    if (t && t.step === id && id !== 'shot') this.later(0.8, () => this.tool === t && this.toolHome());
    this.save();
    if (isComplete(this.done)) this.later(2.6, () => this.stickerTime());
  }

  // Each step done, the patient visibly perks up: sparkles of plus signs and hearts, a chime, a
  // happy face, and the sick look fades a step (animatePose eases it down).
  feelBetter(before, after, now) {
    const u = this.L.u;
    const p = this.pp;
    const s = this.sp.size;
    const all = after >= STEPS.length;
    this.later(0.3, () => sound.heal());
    this.fx.plusses(p.x, p.y - 3.6 * s * u, all ? 30 : 14, 2.8 * s * u);
    if (all) {
      this.fx.sparkle(p.x, p.y - 4.5 * s * u, 24);
      this.headBob = now;
    }
    this.setMood('happy', all ? 2.4 : 1.3, now);
  }

  save() {
    this.cb.onSave(this.visit());
  }

  // ------------------------------------------------------------ the pickers: bandage, sticker

  showPicker(kind) {
    const items = kind === 'bandage' ? BANDAGES.map((b) => b[0]) : sheet(this.rand);
    this.pickerEl.innerHTML = '';
    for (const id of items) {
      const b = document.createElement('button');
      b.className = 'pick';
      b.dataset.kind = kind;
      b.dataset.id = id;
      b.setAttribute('aria-label', kind === 'bandage' ? BANDAGE_SAY[id] : STICKER_SAY[id]);
      const c = document.createElement('canvas');
      const S = 160;
      c.width = c.height = S;
      const g = c.getContext('2d');
      if (kind === 'bandage') drawBandage(g, id, S / 2, S / 2, S * 0.9, S * 0.4, -0.35);
      else drawSticker(g, id, S / 2, S / 2, S * 0.92);
      b.append(c);
      this.pickerEl.append(b);
    }
    this.pickerKind = kind;
    this.pickerEl.classList.add('show');
    this.screen.classList.add('away');
    this.sayN(kind === 'bandage' ? 'Pick a bandage!' : 'All done! Pick a sticker!', { queue: true });
    this.lastAct = performance.now() / 1000;
  }

  hidePicker() {
    this.pickerEl.classList.remove('show');
    if (this.phase === 'exam') this.screen.classList.remove('away');
  }

  pickDown(kind, id, e) {
    if (this.held || this.fly) return;
    this.poke();
    sound.peel();
    this.sayN(kind === 'bandage' ? BANDAGE_SAY[id] : `${STICKER_SAY[id]}!`, { force: true });
    const now = performance.now() / 1000;
    this.held = { kind, id, pid: e.pointerId, fx: e.clientX, fy: e.clientY, down: { x: e.clientX, y: e.clientY, t: now }, moved: false };
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {
      /* fine */
    }
  }

  heldPos(h) {
    return { x: h.fx, y: h.fy - 0.7 * this.L.u };
  }

  dropHeld() {
    const h = this.held;
    this.held = null;
    if (!h) return;
    const now = performance.now() / 1000;
    const at = this.heldPos(h);
    const u = this.L.u;
    const { x, y } = this.pp;
    if (h.kind === 'sticker') {
      const rx = (at.x - x) / u;
      const ry = (at.y - y) / u;
      // stuck where he put it if that's on the patient (but not on the face), else onto the tummy
      const r = this.rig;
      const onFace = Math.hypot(rx - r.head.x, (ry - r.head.y) * 1.1) < r.head.rx * 0.95;
      const ok = h.moved && inside(r, rx, ry) && !onFace;
      const to = ok ? { x: rx, y: ry } : { x: -0.35 * this.sp.size, y: -1.35 * this.sp.size };
      this.fly = { kind: 'sticker', id: h.id, from: at, to, t0: now, dur: ok ? 0.12 : 0.4 };
    } else {
      this.fly = { kind: 'bandage', id: h.id, from: at, to: 'arm', t0: now, dur: 0.35 };
    }
    this.pickerEl.classList.remove('show');
  }

  updateFly(now) {
    const f = this.fly;
    if (!f) return;
    const k = clamp((now - f.t0) / f.dur, 0, 1);
    if (k < 1) return;
    this.fly = null;
    if (f.kind === 'bandage') {
      sound.slap();
      this.fx.sparkle(this.spots.arm.x, this.spots.arm.y, 12);
      this.bandage = f.id;
      this.hidePicker();
      for (const ev of updateStep(this.steps.shot, { placed: f.id }, 0)) if (ev.type === 'done') this.complete('shot', now);
      this.setMood('happy', 2, now);
    } else {
      sound.slap();
      this.sticker = { e: f.id, x: f.to.x, y: f.to.y, rot: (this.rand() - 0.5) * 0.5 };
      const { x, y } = this.pp;
      this.fx.sparkle(x + f.to.x * this.L.u, y + f.to.y * this.L.u, 16);
      this.refreshTicks();
      this.party(now);
    }
  }

  flyPos(f, now) {
    const k = ease(clamp((now - f.t0) / f.dur, 0, 1));
    const { x, y } = this.pp;
    const u = this.L.u;
    const to = f.to === 'arm' ? this.spots.arm : { x: x + f.to.x * u, y: y + f.to.y * u };
    return { x: lerp(f.from.x, to.x, k), y: lerp(f.from.y, to.y, k) - Math.sin(Math.PI * k) * 0.8 * u };
  }

  // -------------------------------------------------------------------- the happy ending

  stickerTime() {
    if (this.phase !== 'exam') return;
    if (this.tool) this.toolHome();
    this.phase = 'sticker';
    this.refreshTicks();
    this.screen.classList.add('away');
    this.showPicker('sticker');
  }

  party(now) {
    this.phase = 'party';
    this.partyAt = now;
    // into the sticker book right away, so leaving early can't lose it
    this.finished = true;
    this.cb.onFinish(this.pid, this.sticker?.e || '⭐');
    this.screen.classList.add('party');
    sound.fanfare();
    this.fx.confetti(this.L.w, this.L.h, 140);
    this.sayN('Check-up all done!', { force: true });
    this.sayP(this.sp.thanks, { queue: true });
    this.later(3.6, () => this.leave());
  }

  leave() {
    const now = performance.now() / 1000;
    this.phase = 'leave';
    this.sayP(this.sp.bye, { queue: true });
    this.hop('seat', 'floorR', 0, 1, 0.55, 1.2, () => {
      this.pat.at = 'floorR';
      this.pat.stand = 1;
      this.walk('floorR', 'offR', 1, 1, 1.3, 4, performance.now() / 1000, () => {
        this.pat.at = 'offR';
        this.pat.mv = null;
        this.cb.onLeft();
      });
    }, now);
  }

  // ------------------------------------------------------------------------------- per frame

  frame(now, dt) {
    if (!this.active) return;
    const L = this.L;
    const u = L.u;
    // the patient's position, and finishing any hop or walk
    const m = this.pat.mv;
    if (m && now - m.t0 >= m.dur) {
      this.pat.mv = null;
      this.pat.at = m.to;
      this.pat.stand = m.s1;
      m.then?.();
    }
    const p = this.patPos(now);
    this.animatePose(now, dt, p);
    this.rig = rig(this.sp, this.pose);
    this.hs = hotspots(this.sp, this.rig);
    this.pp = p;
    this.spots = this.spotsNow();
    if (this.phase === 'exam') {
      this.updateMeasure(now, dt);
      this.updateTool(now, dt);
    } else this.updateMeasure(now, dt);
    if (this.phase !== 'exam' && this.tool) this.updateTool(now, dt);
    this.updateFly(now);
    this.updateSymptoms(now);
    this.fx.update(dt);
    this.updateHints(now);
    this.updateView(now);
    this.draw(now);
  }

  // Now and then a symptom: an "ah-choo", a shiver, a sore tummy. Not in the middle of the shot
  // or the height bar, and none once they're mostly better (sickness.js).
  updateSymptoms(now) {
    if (this.phase !== 'exam' && this.phase !== 'enter') return;
    const shot = this.steps.shot.stage;
    const busy = this.meas || (this.tool && this.tool.kind === 'syringe' && (shot === 'needle' || shot === 'push'));
    if (busy) {
      this.symptoms.nextAt = Math.max(this.symptoms.nextAt ?? 0, now + 2);
      return;
    }
    const ev = this.symptoms.update(now, this.sickShown);
    if (ev === 'sneeze') {
      sound.sneeze();
      this.later(SNEEZE_AT, () => {
        const m = this.spots.mouth;
        this.fx.poof(m.x, m.y - 0.3 * this.L.u, 0.5 * this.L.u);
        this.fx.sparkle(m.x, m.y, 6, ['#ffffff', '#cfefff'], 0.6);
      });
    } else if (ev === 'shiver') {
      sound.shiver();
      this.sayP('Brrr!');
    } else if (ev === 'tummy') {
      sound.gurgle();
      this.sayP('Ooh, my tummy…');
    }
  }

  animatePose(now, dt, p) {
    const pose = this.pose;
    const t = this.tool;
    const sp = this.sp;
    pose.stand = p.stand;
    pose.breathe = Math.sin(now * 1.7);
    // deep breath from the stethoscope
    const pk = (now - this.puffAt) / 1.8;
    pose.puff = pk >= 0 && pk <= 1 ? Math.sin(Math.PI * pk) : 0;
    // springy legs and tail
    for (const k of [...this.kick, this.thump]) {
      k.v += (-k.a * 60 - k.v * 6) * dt;
      k.a += k.v * dt;
      if (k.a < -0.05) {
        k.a = -0.05;
        k.v = Math.abs(k.v) * 0.3;
      }
    }
    pose.kick = [this.kick[0].a, this.kick[1].a];
    // ears lift out of the ear camera's way (floppy ones), trunk lifts for "ahh"
    const S = this.spots;
    for (const [i, name] of [[0, 'earL'], [1, 'earR']]) {
      const near = t && t.kind === 'ears' && t.mode !== 'home' && S && dist(t, S[name]) < 2.2 * this.L.u;
      pose.earLift[i] = lerp(pose.earLift[i], near ? 1 : 0, Math.min(1, dt * 10));
    }
    const ahhOn = t && t.kind === 'ahh' && t.spot === 'mouth';
    pose.trunk = lerp(pose.trunk, ahhOn ? 1 : 0, Math.min(1, dt * 8));
    this.mouth = lerp(this.mouth, ahhOn ? 1 : 0, Math.min(1, dt * 10));
    // the height bar squashes tall ears
    pose.squish = 0;
    if (this.meas || this.bar.back) {
      const barRig = (this.bar.y - p.y) / this.L.u;
      const top = -(standingTop(sp) - FEET_Y * sp.size);
      const head = HEAD_TOP * sp.size;
      if (top < head - 0.1 && barRig > top) pose.squish = clamp((barRig - top) / (head - top), 0, 1);
    }
    // head turns toward the tool
    const hx = p.x;
    const look = t && t.mode !== 'home' ? clamp((t.x - hx) / (8 * this.L.u), -0.1, 0.1) : Math.sin(now * 0.6) * 0.04;
    this.tilt = lerp(this.tilt, look, Math.min(1, dt * 4));
    pose.tilt = this.tilt;
    // wiggles
    const mood = this.currentMood(now);
    let dx = 0;
    let dy = 0;
    if (mood === 'nervous') dx = Math.sin(now * 38) * 0.02;
    if (mood === 'giggle') dx = Math.sin(now * 24) * 0.06;
    if (this.phase === 'party') {
      dx = Math.sin(now * 6.5) * 0.18;
      dy = -Math.abs(Math.sin(now * 6.5)) * 0.25;
    }
    if (this.headBob && now - this.headBob < 0.4) dy = -Math.sin(((now - this.headBob) / 0.4) * Math.PI) * 0.2;
    // feeling sick: ease toward how sick they are now, droop, and the symptom playing
    const target = this.phase === 'party' || this.phase === 'leave' ? 0 : sickLevel(this.done.length);
    this.sickShown = lerp(this.sickShown, target, Math.min(1, dt * 1.6));
    if (Math.abs(this.sickShown - target) < 0.002) this.sickShown = target;
    sickPose(pose, this.sickShown);
    const sym = this.symptoms.anim(now);
    pose.dx = dx + sym.dx;
    pose.headDy = dy + sym.headDy;
    // arms: wave hello, cheer at the party, wave goodbye (a sore tummy gets held)
    let arm = [restArm(this.sickShown, this.ail), 0];
    if (this.phase === 'party') arm = [2.15 + Math.sin(now * 9) * 0.25, 2.15 + Math.sin(now * 9 + 1.5) * 0.25];
    else if (this.phase === 'leave' || (this.waveUntil && now < this.waveUntil)) arm = [arm[0], 1.95 + Math.sin(now * 11) * 0.3];
    pose.arm = [lerp(pose.arm[0], arm[0], Math.min(1, dt * 10)), lerp(pose.arm[1], arm[1], Math.min(1, dt * 10))];
  }

  currentMood(now) {
    if (this.phase === 'party' || this.phase === 'leave') return 'happy';
    if (this.mood && now < this.mood.until) return this.mood.name;
    const sym = this.symptoms?.anim(now);
    if (sym?.mood) return sym.mood;
    const t = this.tool;
    if (t && t.mode !== 'home') {
      if (t.kind === 'ahh' && t.spot === 'mouth') return 'ahh';
      const shot = this.steps.shot;
      if (t.kind === 'syringe' && (shot.stage === 'needle' || shot.stage === 'push') && t.mode !== 'ready') return 'nervous';
      if (t.kind === 'heart' && this.pose.puff > 0.3) return 'calm';
      if (t.kind === 'ears' && t.spot) return 'focus';
    }
    return 'idle';
  }

  face(now) {
    const mood = this.currentMood(now);
    const f = faceFor(mood);
    if (mood === 'ahh') f.open = this.mouth;
    const t = this.tool;
    const head = this.spots?.mouth;
    if (t && t.mode !== 'home' && head) {
      const dx = t.x - head.x;
      const dy = t.y - (head.y - 0.8 * this.L.u);
      const d = Math.hypot(dx, dy) || 1;
      f.look = { x: dx / d, y: dy / d };
    } else f.look = { x: Math.sin(now * 0.4) * 0.5, y: 0.2 };
    if (mood === 'ahh') f.look = { x: 0, y: -1 };
    // blink now and then
    if (now > this.blinkAt) this.blinkAt = now + 2.5 + Math.random() * 3;
    if (f.eyes === 'open' && this.blinkAt - now > 2.4 && this.blinkAt - now < 2.55) f.eyes = 'closed';
    return f;
  }

  updateView(now) {
    const v = this.view;
    const t = this.tool;
    let mode = null;
    const extra = {};
    if (this.meas && (this.meas.stage === 'dial' || this.meas.stage === 'bar' || this.meas.stage === 'done')) mode = 'scale';
    else if (t && t.mode !== 'home' && t.spot) {
      if (t.kind === 'heart') {
        mode = 'heart';
        extra.tummy = t.spot === 'tummy';
      } else if (t.kind === 'ears') {
        mode = 'ear';
        const s = this.spots[t.spot];
        const raw = t.raw || t;
        extra.pan = { x: clamp((raw.x - s.x) / (1.2 * this.L.u), -1, 1), y: clamp((raw.y - s.y) / (1.2 * this.L.u), -1, 1) };
        const ears = this.steps.ears;
        extra.surprise = ears.surprised && ears.surprise === (t.spot === 'earL' ? 0 : 1);
      } else if (t.kind === 'ahh') mode = 'throat';
      else if (t.kind === 'temp') mode = 'temp';
    }
    if (this.tempHappyAt && now - this.tempHappyAt < 1.3) mode = 'temp';
    if (now >= this.checkAt && now < this.checkAt + 1.3) mode = 'check';
    if (mode) v.lastBusy = now;
    else if (now - v.lastBusy < 0.7 && v.mode !== 'check') mode = v.mode; // don't flicker
    else mode = 'idle';
    if (mode !== v.mode) {
      v.mode = mode;
      v.since = now;
    }
    Object.assign(v, { tummy: false, pan: null, surprise: false }, extra);
    v.sp = this.sp;
    v.sick = { level: this.sickShown, ail: this.ail };
    v.hot = this.done.includes('temp') ? this.tempHot : this.ail === 'fever' && sickLevel(this.done.length) > 0.25;
    v.redThroat = this.ail === 'cold' ? this.sickShown : 0;
    v.progress = STEPS.map((s) => this.done.includes(s));
    v.beats = this.beats;
    v.surpriseAt = this.surpriseAt;
    v.tooth = this.steps.ahh.tooth;
    v.open = this.mouth;
    v.fill = this.done.includes('temp') ? 1 : progress(this.steps.temp);
    v.happy = this.done.includes('temp');
    v.happyAt = this.tempHappyAt;
    v.turn = this.dial?.turn || 0;
    v.settled = this.dial?.settled && this.meas?.stage !== 'dial';
  }

  // ------------------------------------------------------------------------------- hints

  updateHints(now) {
    const idle = now - this.lastAct;
    const busy = this.tool?.mode === 'held' || this.held || this.bar.drag || this.pat.mv || this.fly;
    if (busy || (this.phase !== 'exam' && this.phase !== 'sticker')) {
      this.hint = null;
      return;
    }
    if (idle < IDLE_HINT) {
      this.hint = null;
      return;
    }
    const want = this.hintTarget();
    this.hint = want;
    if (!this.hinted) {
      this.hinted = 1;
      if (want?.slot) this.slots[want.slot]?.classList.add('nudge');
    }
    if (idle > IDLE_SAY && now - this.spoke > 14) {
      this.spoke = now;
      this.sayN(want?.say || 'Pick a tool!', { force: true });
    }
  }

  // Where the hint hand should go: from what to touch to where it goes, and what to say.
  hintTarget() {
    const S = this.spots;
    const u = this.L.u;
    if (this.phase === 'sticker' || this.pickerEl.classList.contains('show')) {
      const b = this.pickerEl.querySelector('.pick');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const to = this.pickerKind === 'bandage' ? S.arm : S.tummy;
      return { from: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, to, say: this.pickerKind === 'bandage' ? 'Pick a bandage!' : 'Pick a sticker!' };
    }
    if (this.meas?.stage === 'bar') {
      const k = heightBarKnob(this.L, this.bar.y);
      return { from: k, to: { x: k.x, y: S.headTop.y }, say: 'Slide the bar down to the head!' };
    }
    const t = this.tool;
    if (t && (t.mode === 'ready' || t.mode === 'stuck') && !this.steps[t.step].done) {
      const to = this.toolGoal(t);
      if (t.kind === 'syringe' && this.steps.shot.stage === 'push') return { from: t, to: t, say: 'Hold your finger down to push!' };
      return { from: { x: t.x, y: t.y }, to, say: this.promptFor(t) };
    }
    const id = nextStep(this.done);
    if (!id) return null;
    const r = this.slots[id].getBoundingClientRect();
    const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    let to;
    if (id === 'measure') to = from;
    else to = this.toolGoal({ kind: toolOf(this.steps[id]), step: id });
    return { slot: id, from, to, say: `${STEP_INFO[id].name} ${STEP_INFO[id].prompt}` };
  }

  toolGoal(t) {
    const S = this.spots;
    const st = this.steps[t.step];
    switch (t.kind) {
      case 'temp':
        return { x: S.forehead.x0, y: S.forehead.y, sweep: S.forehead.x1 };
      case 'ears':
        return st.seen?.[0] ? S.earR : S.earL;
      case 'reflex':
        return st.tapped?.[0] ? S.kneeR : S.kneeL;
      case 'heart':
        return S.chest;
      case 'ahh':
        return S.mouth;
      default:
        return S.arm;
    }
  }

  promptFor(t) {
    if (t.kind === 'cotton') return 'Rub the arm clean!';
    if (t.kind === 'syringe') return 'Put the shot on the arm!';
    if (t.kind === 'ears' && (this.steps.ears.seen[0] || this.steps.ears.seen[1])) return 'Now the other ear!';
    return STEP_INFO[t.step].prompt;
  }

  // ------------------------------------------------------------------------------- drawing

  draw(now) {
    const st = this.stage;
    const g = st.ctx;
    const L = this.L;
    const u = L.u;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    // the scale's needle and the height bar
    drawScaleDial(g, L, this.meas ? this.dial?.turn || 0 : 0);
    const barGlow = this.meas?.stage === 'bar' && !this.bar.drag ? 1 : 0;
    drawHeightBar(g, L, this.bar.y ?? this.barRest(), barGlow, now);
    // where the tool goes
    this.drawRings(g, now);
    // the patient
    const p = this.pp;
    const extras = { face: this.face(now), sick: { level: this.sickShown, ail: this.ail }, bandage: this.bandage, sticker: this.sticker, wagFast: ['happy', 'giggle', 'proud'].includes(this.currentMood(now)), thump: this.thump.a };
    drawPatient(g, this.sp, this.pose, p.x, p.y, u, now, extras);
    // the tool (or the sticker or bandage on its way)
    const t = this.tool;
    if (t) {
      const shot = this.steps.shot;
      const sw = t.kind === 'reflex' ? this.hammerSwing(t, now) : 0;
      drawTool(g, t.kind, t.x, t.y, u, {
        t: now,
        lifted: t.mode === 'held' || t.mode === 'ready',
        swing: sw,
        plunger: t.kind === 'syringe' ? (shot.stage === 'bandage' || shot.done ? 1 : shot.push) : 0,
        light: !!t.spot,
        done: this.done.includes('temp'),
        rubbing: t.rubbing,
        tube: { x: Math.max(t.x + 1.4 * u, L.w * 0.5), y: L.h + 60 },
      });
    }
    if (this.held) {
      const at = this.heldPos(this.held);
      if (this.held.kind === 'sticker') drawSticker(g, this.held.id, at.x, at.y, 1.25 * u, 0, true);
      else drawTool(g, 'bandage', at.x, at.y, u, { bandage: this.held.id, lifted: true, rot: -0.35 });
    }
    if (this.fly) {
      const at = this.flyPos(this.fly, now);
      if (this.fly.kind === 'sticker') drawSticker(g, this.fly.id, at.x, at.y, 1.2 * u, 0, true);
      else drawTool(g, 'bandage', at.x, at.y, u, { bandage: this.fly.id, lifted: true, rot: -0.35 });
    }
    drawMonitor(g, this.screenR, this.view, now);
    this.fx.draw(g);
    this.drawHint(g, now);
    if (this.debugSpots) this.drawSpotsDebug(g);
  }

  hammerSwing(t, now) {
    const since = now - t.tapAt;
    if (since < 0.5) return -0.5 * (1 - Math.exp(-since * 9)) + 0.05 * Math.exp(-since * 20);
    return t.spot ? -0.5 : -0.25;
  }

  drawRings(g, now) {
    const t = this.tool;
    const S = this.spots;
    const u = this.L.u;
    let spots = [];
    if (this.held?.kind === 'bandage' || this.fly?.kind === 'bandage') spots = ['arm'];
    else if (t && (t.mode === 'held' || t.mode === 'ready') && !t.spot && !this.steps[t.step].done) {
      const st = this.steps[t.step];
      spots = (TOOL_SPOTS[t.kind] || []).filter((s) => {
        if (t.kind === 'heart') return s === 'chest';
        if (t.kind === 'ears') return !st.seen[s === 'earL' ? 0 : 1];
        if (t.kind === 'reflex') return !st.tapped[s === 'kneeL' ? 0 : 1];
        return true;
      });
    }
    for (const name of spots) {
      const s = S[name];
      if (name === 'forehead') {
        g.save();
        g.setLineDash([0.18 * u, 0.14 * u]);
        g.lineDashOffset = -now * u;
        g.lineWidth = 0.12 * u;
        g.strokeStyle = 'rgba(255,214,10,0.95)';
        g.beginPath();
        g.moveTo(s.x0, s.y);
        g.lineTo(s.x1, s.y);
        g.stroke();
        g.restore();
        drawSpotRing(g, s.x0, s.y, s.r, now);
        drawSpotRing(g, s.x1, s.y, s.r, now + 0.35);
      } else drawSpotRing(g, s.x, s.y, s.r, now);
    }
  }

  drawHint(g, now) {
    const h = this.hint;
    if (!h || !h.from || !h.to) return;
    const u = this.L.u;
    const k = ((now - this.lastAct) % 2) / 2;
    let p;
    let press = 0;
    if (k < 0.2) {
      p = h.from;
      press = Math.sin((k / 0.2) * Math.PI);
    } else if (k < 0.75) {
      const e = ease((k - 0.2) / 0.55);
      p = { x: lerp(h.from.x, h.to.x, e), y: lerp(h.from.y, h.to.y, e) };
      if (h.to.sweep != null && e > 0.9) p = { x: lerp(h.to.x, h.to.sweep, (e - 0.9) * 10), y: h.to.y };
    } else p = h.to.sweep != null ? { x: h.to.sweep, y: h.to.y } : h.to;
    drawHand(g, p.x, p.y, 1.1 * u, press);
  }

  drawSpotsDebug(g) {
    g.save();
    g.lineWidth = 2;
    for (const [k, s] of Object.entries(this.spots)) {
      if (k === 'headTop') continue;
      g.strokeStyle = 'rgba(0,100,255,0.8)';
      g.beginPath();
      if (k === 'forehead') {
        g.moveTo(s.x0, s.y);
        g.lineTo(s.x1, s.y);
      } else g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(0,100,255,0.25)';
      g.beginPath();
      if (k !== 'forehead') g.arc(s.x, s.y, s.r + SNAP * this.L.u, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }

  // For the scripted browser tests (?debug): where to touch.
  debugInfo() {
    const slot = (id) => {
      const r = this.slots[id].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    return {
      phase: this.phase,
      done: [...this.done],
      spots: this.spots,
      slot,
      tool: this.tool && { kind: this.tool.kind, mode: this.tool.mode, spot: this.tool.spot, x: this.tool.x, y: this.tool.y },
      shot: { ...this.steps.shot },
      measure: this.meas?.stage || null,
      bar: this.bar.y,
      knob: heightBarKnob(this.L, this.bar.y ?? this.barRest()),
      picks: [...this.pickerEl.querySelectorAll('.pick')].map((b) => {
        const r = b.getBoundingClientRect();
        return { id: b.dataset.id, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
      u: this.L.u,
      mood: this.currentMood(performance.now() / 1000),
      monitor: this.view.mode,
    };
  }
}
