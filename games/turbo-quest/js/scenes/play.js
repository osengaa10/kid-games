// Playing a level: runs the world each step, turns its events into sounds, squash and stretch,
// particles, hit-stop and camera shake, and draws the game view, the controls and the HUD.
import { World } from '../game/world.js';
import { Camera } from '../engine/camera.js';
import { VIEW_TILES } from '../game/tuning.js';
import { PlayerView } from '../render/player-view.js';
import { Particles } from '../render/particles.js';
import { play } from '../engine/audio.js';
import { say } from '../engine/speech.js';
import { music } from '../engine/music.js';
import { STAR_STEPS } from '../content/sfx.js';

const HOLD_FOR_SETTINGS = 2; // seconds holding pause to open the grown-up settings
const IDLE_HINT = 8; // Kid Mode: seconds without progress before a gentle hint
const WEAPON_WORDS = { bubble: 'Bubble blaster!', spread: 'Star spread!' };

export class PlayScene {
  // opts: { resume } (a saved checkpoint to start from)
  constructor(app, def, opts = {}) {
    this.app = app;
    this.def = def;
    this.opts = opts;
    this.particles = new Particles();
    this.build();
  }

  build(resume = this.opts.resume) {
    const a = this.app;
    const s = a.settings;
    this.world = new World(this.def, {
      mode: s.mode, tune: a.tuneFor(s.mode), autoGo: s.autoGo, resume,
      settings: { autoFire: !!s.autoFire, aimAssist: s.aimAssist !== false },
    });
    this.cam = new Camera(VIEW_TILES);
    this.cam.setAspect(a.w / a.h);
    this.cam.snap(this.world.player, this.world.level, this.world.tune.lookAhead);
    this.pview = new PlayerView();
    this.particles.clear();
    this.time = 0;
    this.pauseHeld = 0;
    this.settingsOpened = false;
    this.flutterSound = 0;
    this.freeze = 0;
    this.winTimer = -1;
    this.bestX = this.world.player.x;
    this.idle = 0;
    this.idleHint = false;
    this.hook();
    music.play(this.world.level.music || 'jungle');
  }

  // Settings or tuning changed while playing: keep playing with the new ones.
  applySettings() {
    const a = this.app;
    this.world.setMode(a.settings.mode, a.tuneFor(this.world.mode), a.settings.autoGo);
    this.world.settings.autoFire = !!a.settings.autoFire;
    this.world.settings.aimAssist = a.settings.aimAssist !== false;
  }

  resized() {
    this.cam.setAspect(this.app.w / this.app.h);
    this.cam.snap(this.world.player, this.world.level, this.world.tune.lookAhead);
  }

  get kid() {
    return this.world.mode === 'kid';
  }

  hook() {
    const ev = this.world.events;
    const P = this.particles;
    const cam = this.cam;
    const v = this.pview;
    const a = this.app;
    const kidSay = (text) => this.kid && say(text);
    ev.on('jump', (e) => {
      play('jump');
      v.jump();
      P.burst('dust', e.x, e.y, 5, { speed: 2, spread: 1.4, angle: -Math.PI / 2, life: 0.35, size: 0.9, drag: 5 });
    });
    ev.on('land', (e) => {
      v.land(e.speed);
      if (e.speed > 6) {
        play(e.speed > 12 ? 'bigland' : 'land');
        P.burst('dust', e.x, e.y, Math.min(10, e.speed * 0.6), { speed: 2.5, spread: Math.PI * 0.9, angle: -Math.PI / 2, life: 0.4, drag: 5 });
      }
      if (e.speed > 13) cam.shake(0.2);
    });
    ev.on('spring', () => {
      play('boing');
      v.spring();
    });
    ev.on('bounce', (e) => {
      play('bounce');
      v.spring();
      P.burst('sparkle', e.x, e.y, 10, { speed: 5, life: 0.6, drag: 3 });
      cam.shake(0.12);
    });
    ev.on('shoot', (e) => {
      play(e.big ? 'bigpop' : e.kind === 'bubble' ? 'bloop' : e.kind === 'spread' ? 'ting' : 'pew');
      v.shoot();
      P.burst('sparkle', e.x, e.y, e.big ? 8 : 2, { speed: 2, life: 0.18, drag: 6, size: 0.7 });
      if (e.big) cam.shake(0.15);
    });
    ev.on('cheer', (e) => {
      this.freeze = this.kid ? 2 : 3;
      play('cheer', { pitch: 2 ** (STAR_STEPS[Math.min(e.chain, STAR_STEPS.length - 1)] / 12) });
      P.burst('puff', e.x, e.y, 6, { speed: 3, life: 0.45, drag: 4, size: 1.1 });
      P.burst('confetti', e.x, e.y, 14, { speed: 6, life: 0.9, g: 8, drag: 2 });
      P.burst('sparkle', e.x, e.y, 6, { speed: 4, life: 0.5, drag: 3 });
      cam.shake(0.08);
      if (e.first) kidSay('Yay!');
    });
    ev.on('hurt', (p) => {
      play('yip');
      v.hurt();
      cam.shake(0.3);
      P.burst('sparkle', p.cx, p.y + 0.5, 8, { speed: 4, life: 0.4, drag: 4 });
    });
    ev.on('shieldHit', (p) => {
      play('shieldpop');
      P.burst('sparkle', p.cx, p.y + 0.6, 12, { speed: 5, life: 0.5, drag: 3 });
    });
    ev.on('faint', () => play('faint'));
    ev.on('gem', (e) => {
      play('gem');
      P.burst('rainbow', e.x, e.y, 18, { speed: 6, life: 0.9, drag: 2.5, size: 1.2 });
      P.burst('sparkle', e.x, e.y, 12, { speed: 5, life: 0.8, drag: 2 });
      cam.shake(0.1);
      kidSay('A gem!');
    });
    ev.on('heart', (e) => {
      play('heart');
      P.burst('heart', e.x, e.y, 6, { speed: 3, life: 0.8, g: -2, drag: 2 });
    });
    ev.on('heartBack', (p) => {
      play('heart', { vol: 0.5 });
      P.burst('heart', p.cx, p.y, 3, { speed: 1.5, life: 0.8, g: -2, drag: 2 });
    });
    ev.on('weapon', (e) => {
      play('powerup');
      const p = this.world.player;
      P.burst('sparkle', p.cx, p.y + 0.5, 14, { speed: 5, life: 0.6, drag: 3 });
      kidSay(WEAPON_WORDS[e.id] || 'Pow!');
    });
    ev.on('weaponUp', () => {
      play('powerup', { pitch: 1.25 });
      const p = this.world.player;
      P.burst('sparkle', p.cx, p.y + 0.5, 14, { speed: 5, life: 0.6, drag: 3 });
    });
    ev.on('weaponEmpty', () => play('empty'));
    ev.on('trap', () => play('bloop', { pitch: 0.8 }));
    ev.on('break', (e) => {
      play('rustle');
      P.burst('leaf', e.x, e.y, 10, { speed: 5, life: 1, g: 6, drag: 2 });
    });
    ev.on('turbo', () => {
      play('turbo');
      music.setTurbo(true);
      kidSay('Turbo time!');
    });
    ev.on('turboEnd', () => music.setTurbo(false));
    ev.on('giant', () => {
      play('grow');
      kidSay('Giant pup!');
    });
    ev.on('giantEnd', () => play('shrink'));
    ev.on('shield', () => {
      play('powerup', { pitch: 0.9 });
      kidSay('Bubble shield!');
    });
    ev.on('help', (e) => {
      play('help');
      for (const c of e.cols) P.burst('sparkle', c + 0.5, e.row + 0.2, 4, { speed: 3, life: 0.7, drag: 3 });
    });
    ev.on('balloonBounce', (b) => P.burst('confetti', b.x, b.y, 12, { speed: 5, life: 0.8, g: 8, drag: 2 }));
    ev.on('balloonPop', (b) => {
      play('pop', { vol: 0.5 });
      P.burst('confetti', b.x, b.y, 8, { speed: 4, life: 0.7, g: 6, drag: 2 });
    });
    ev.on('alert', () => play('alert', { vol: 0.6 }));
    ev.on('chargeStart', () => play('charge'));
    ev.on('chargeFull', () => play('ding'));
    ev.on('star', (e) => {
      play('star', { pitch: 2 ** (STAR_STEPS[e.chain] / 12) });
      P.burst('sparkle', e.x, e.y, 6, { speed: 3, life: 0.45, drag: 4 });
    });
    ev.on('bonk', () => play('bonk'));
    ev.on('rescue', () => play('rescue'));
    ev.on('respawn', (p) => {
      play('respawn');
      P.burst('sparkle', p.x + p.w / 2, p.y + p.h / 2, 12, { speed: 4, life: 0.6, drag: 3 });
    });
    ev.on('checkpoint', (cp) => {
      play('checkpoint');
      P.burst('confetti', cp.x + 0.6, cp.y - 0.4, 12, { speed: 5, life: 0.8, g: 6, drag: 2 });
      a.saveResume?.(this.world.resumeData());
    });
    ev.on('win', (e) => {
      play('win');
      music.stop();
      this.winTimer = 0;
      P.burst('confetti', e.x, e.y - 3, 40, { speed: 10, spread: Math.PI * 0.8, angle: -Math.PI / 2, life: 2.2, g: 9, drag: 1.2 });
      cam.shake(0.3);
    });
  }

  // One game step.
  update(dt) {
    this.time += dt;
    const a = this.app;
    const intent = a.input.read();
    this.particles.scale = (a.settings.reducedMotion ? 0.5 : 1) * a.quality().particles;
    this.particles.update(dt);
    if (this.freeze > 0) {
      // Hit-stop: a tiny pause on each cheer makes it land.
      this.freeze--;
      return;
    }
    const w = this.world;
    w.step(intent, dt);
    const p = w.player;
    const lookDown = w.mode === 'dad' && p.grounded && intent.my > 0.6 && Math.abs(p.vx) < 0.5 ? 1 : 0;
    this.cam.update(p, w.level, dt, { lookAhead: w.tune.lookAhead, lookDown, reducedMotion: a.settings.reducedMotion });
    this.pview.update(p, dt);
    if (p.fluttering) {
      this.flutterSound -= dt;
      if (this.flutterSound <= 0) {
        play('flutter');
        this.flutterSound = 0.16;
      }
    } else this.flutterSound = 0;
    if (p.turbo > 0 && Math.random() < 0.6) this.particles.burst('rainbow', p.cx - p.facing * 0.4, p.y + 0.4 + Math.random() * 0.6, 1, { speed: 0.5, life: 0.5, drag: 2 });
    this.updateHint(dt);
    if (this.winTimer >= 0) {
      this.winTimer += dt;
      if (this.winTimer < 2 && Math.random() < 0.08) {
        const c = this.cam;
        this.particles.burst('confetti', c.x + c.viewW * (0.2 + Math.random() * 0.6), c.y + c.viewH * 0.2, 18, { speed: 6, life: 1.8, g: 6, drag: 1.5 });
      }
      if (this.winTimer >= 2.2) {
        this.winTimer = -1;
        a.showResults?.(this, w.results());
      }
    }
  }

  // Kid Mode: if he hasn't got any further for a while, Turbo points the way and barks.
  updateHint(dt) {
    const p = this.world.player;
    if (!this.kid || this.world.won || p.state !== 'play') {
      this.idleHint = false;
      return;
    }
    if (p.x > this.bestX + 0.5) {
      this.bestX = p.x;
      this.idle = 0;
      this.idleHint = false;
      return;
    }
    this.idle += dt;
    if (this.idle >= IDLE_HINT && !this.idleHint) {
      this.idleHint = true;
      play('bark');
    }
    if (this.idle >= IDLE_HINT + 6) this.idle = IDLE_HINT - 4; // bark again a bit later
  }

  // Once per screen frame: the pause button (a tap pauses; holding it opens grown-up settings).
  frame(elapsed) {
    const a = this.app;
    const c = a.controls;
    // A tap so quick it was pressed and let go between two frames still counts.
    const presses = c.presses.pause || 0;
    const tapped = this.seenPause !== undefined && presses !== this.seenPause;
    this.seenPause = presses;
    if (c.held('pause')) {
      this.pauseHeld += elapsed;
      if (this.pauseHeld >= HOLD_FOR_SETTINGS && !this.settingsOpened) {
        this.settingsOpened = true;
        c.releaseAll();
        a.openSettings();
      }
    } else {
      if ((this.pauseHeld > 0 || tapped) && !this.settingsOpened) a.pause();
      this.pauseHeld = 0;
      this.settingsOpened = false;
    }
    if (a.input.consume('pause', ['key', 'pad'])) a.pause();
  }

  pointer(type, id, x, y) {
    const c = this.app.controls;
    if (type === 'down') c.down(id, x, y);
    else if (type === 'move') c.move(id, x, y);
    else c.up(id);
  }

  renderWorld() {
    this.app.renderer.draw({
      world: this.world, cam: this.cam, pview: this.pview, particles: this.particles, time: this.time,
      hint: this.world.autoGo, idleHint: this.idleHint,
    });
  }

  render() {
    const a = this.app;
    this.renderWorld();
    const ui = a.ui;
    const c = a.controls;
    const w = this.world;
    const p = w.player;
    const L = a.layout;
    const visible = a.controlsVisible() && this.winTimer < 0;
    const hold = this.pauseHeld > 0.3 ? (this.pauseHeld - 0.3) / (HOLD_FOR_SETTINGS - 0.3) : 0;
    const st = c.stick();
    const held = L.items.map((i) => (c.held(i.id) ? 1 : 0)).join('');
    const hud = ui.hudState(w);
    const pulse = this.idleHint ? Math.floor(this.time * 4) % 2 : 0;
    const sig = [L.scheme, L.leftHanded, a.w, a.h, visible, hud, hold.toFixed(2), held, pulse, st ? `${st.ox | 0},${st.oy | 0},${st.x.toFixed(2)},${st.y.toFixed(2)}` : '-', a.settings.debug ? a.debugText : ''].join('|');
    if (!ui.begin(sig)) return;
    // The TURBO button shows up when the meter is full (Dad Mode).
    const turboBtn = L.items.find((i) => i.id === 'turbo');
    if (turboBtn) turboBtn.hidden = !(w.combo.full && w.mode === 'dad' && p.turbo <= 0);
    ui.controls(L, c, { visible, holdPause: hold, pulse: pulse ? (this.app.scheme() === 'kid' ? 'right' : 'jump') : null });
    ui.hud(w, a);
    if (a.settings.debug) ui.debug(a.debugLines);
  }
}
