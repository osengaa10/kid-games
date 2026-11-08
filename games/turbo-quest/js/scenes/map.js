// The World 1 map: an island in the sea with a dotted path between the levels. Turbo stands on
// the last level played; tapping another (unlocked) stop makes him hop along the path to it, and
// then it starts. Each stop shows its picture, the gems found (three dots) and, in Dad Mode, its
// medal. Locked stops are grey with a padlock. The next one to play pulses. A stop with a
// checkpoint to come back to has a flag (tapping it resumes there; the small ↻ starts over).
// Corners: house (title), hat (the Pup Closet), book (the Sticker Book), paw (the practice
// field), four tiles (all games, in the app), gear (hold 2 s, settings).
import { MenuScene } from './menu.js';
import { ORDER } from '../content/levels/index.js';
import { drawTurbo, neutralPose } from '../art/turbo.js';
import { withTileSize } from '../engine/sprites.js';
import { palmTrunk, palmCrown, tikiSprite } from '../art/jungle.js';
import { play } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { say } from '../engine/speech.js';

// Where each stop sits (fractions of the screen) and its picture.
const STOPS = {
  'w1-1': { x: 0.17, y: 0.66, icon: 'flower' },
  'w1-2': { x: 0.38, y: 0.46, icon: 'shield' },
  'w1-3': { x: 0.6, y: 0.66, icon: 'raft' },
  'w1-b': { x: 0.81, y: 0.43, icon: 'tiki', noGems: true },
};

export class MapScene extends MenuScene {
  constructor(app) {
    super(app);
    const prof = app.store.profile();
    this.at = prof.mapAt && STOPS[prof.mapAt] ? prof.mapAt : ORDER[0];
    this.walk = null; // { from, to, t }
  }

  // Space / A: the next level to play, or the one Turbo stands on.
  get main() {
    return this.next() || this.at;
  }

  set main(v) {}

  enter() {
    super.enter();
    music.play('title');
  }

  stop(id) {
    const s = STOPS[id];
    return { x: this.app.w * s.x, y: this.app.h * s.y };
  }

  // The next level to play (the first unlocked one not done yet), for the pulse.
  next() {
    const prof = this.app.store.profile();
    return ORDER.find((id) => prof.unlocked.includes(id) && !(prof.levels[id] && prof.levels[id].done)) || null;
  }

  buttons() {
    const a = this.app;
    const R = Math.min(a.h * 0.075, 64);
    const m = Math.max(56, a.h * 0.07);
    const prof = a.store.profile();
    const resumeAt = prof.resume && STOPS[prof.resume.level] ? this.stop(prof.resume.level) : null;
    const list = [];
    if (resumeAt) list.push({ id: 'restart', x: resumeAt.x + R * 1.05, y: resumeAt.y - R * 1.05, r: 24, color: '#ff9a3c', icon: 'again' });
    list.push(...ORDER.map((id) => ({ id, ...this.stop(id), r: R, invisible: true })));
    return list.concat([
      { id: 'back', x: m, y: m, r: 34, color: '#8d6cf2', icon: 'home' },
      { id: 'closet', x: a.w - m - 0, y: m, r: 36, color: '#ff8a2a', icon: 'hat' },
      { id: 'stickers', x: a.w - m - 86, y: m, r: 36, color: '#4fc3ff', icon: 'book' },
      { id: 'practice', x: a.w / 2, y: a.h - m, r: 32, color: '#7be05a', icon: 'paw' },
      { id: 'games', x: m, y: a.h - m, r: 34, color: '#ffffff', icon: 'games', hidden: !a.inApp },
      { id: 'gear', x: a.w - m, y: a.h - m, r: 30, color: 'rgba(30,70,130,0.55)', icon: 'gear', hold: 2 },
    ]);
  }

  back() {
    this.app.showTitle();
  }

  // Keyboard / controller: left and right step along the path; anything else finds the nearest
  // button that way (the corner buttons).
  moveFocus(dx, dy) {
    const i = ORDER.indexOf(this.focus || this.main);
    if (i >= 0 && dx && !dy) {
      const j = Math.max(0, Math.min(ORDER.length - 1, i + dx));
      if (j !== i) {
        this.focus = ORDER[j];
        play('tap', { vol: 0.4 });
      }
      return;
    }
    super.moveFocus(dx, dy);
  }

  choose(id) {
    const a = this.app;
    if (this.walk) return;
    if (id === 'games') location.href = '../../index.html';
    else if (id === 'gear') a.openSettings();
    else if (id === 'back') a.showTitle();
    else if (id === 'restart') {
      play('tap');
      a.store.setResume(a.store.data.lastProfile, null);
    }
    else if (id === 'closet') a.showCloset();
    else if (id === 'stickers') a.showStickers();
    else if (id === 'practice') {
      play('select');
      a.startLevel('greybox', null);
    } else if (STOPS[id]) {
      const prof = a.store.profile();
      if (!prof.unlocked.includes(id)) {
        play('locked');
        this.shake = { id, t: 0.4 };
        return;
      }
      play('select');
      if (id === 'w1-b') say('Tiki Temple!', { force: true });
      this.walk = { from: this.at, to: id, t: 0 };
    }
  }

  update(dt) {
    if (this.shake) {
      this.shake.t -= dt;
      if (this.shake.t <= 0) this.shake = null;
    }
    if (!this.walk) return;
    this.walk.t += dt / (this.walk.from === this.walk.to ? 0.25 : 0.7);
    if (this.walk.t >= 1) {
      const id = this.walk.to;
      this.walk = null;
      this.at = id;
      const a = this.app;
      const prof = a.store.profile();
      prof.mapAt = id;
      a.store.save();
      const resume = prof.resume && prof.resume.level === id && prof.resume.mode === a.settings.mode ? prof.resume : null;
      a.startLevel(id, resume);
    }
  }

  // Turbo's spot: on a stop, or partway along a hop between two.
  turboAt() {
    if (!this.walk) return { ...this.stop(this.at), hop: 0 };
    const a = this.stop(this.walk.from);
    const b = this.stop(this.walk.to);
    const t = Math.min(1, this.walk.t);
    const e = t * t * (3 - 2 * t);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, hop: Math.sin(t * Math.PI), dir: Math.sign(b.x - a.x) || 1 };
  }

  render() {
    const a = this.app;
    const r = a.renderer;
    const g = r.g;
    const k = r.canvas.width / a.w;
    const W = r.canvas.width;
    const H = r.canvas.height;
    r.draws = 0;
    const t = this.time;
    // sky and sea
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5cc4ff');
    sky.addColorStop(0.35, '#a7e3ff');
    sky.addColorStop(0.36, '#3ab0e6');
    sky.addColorStop(1, '#1f86c8');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 3 * k;
    for (let i = 0; i < 9; i++) {
      const y = H * (0.42 + i * 0.065);
      const x = ((i * 173 + t * 30 * k) % (W + 200 * k)) - 100 * k;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 30 * k, y - 8 * k, x + 60 * k, y);
      g.stroke();
    }
    // the island
    g.fillStyle = '#f3dc9a';
    g.beginPath();
    g.ellipse(W * 0.5, H * 0.58, W * 0.47, H * 0.33, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#5fcf4a';
    g.beginPath();
    g.ellipse(W * 0.5, H * 0.56, W * 0.44, H * 0.29, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4cb83c';
    g.beginPath();
    g.ellipse(W * 0.82, H * 0.4, W * 0.11, H * 0.14, 0, 0, Math.PI * 2);
    g.fill();
    // scenery
    withTileSize(36 * k, () => {
      const ppt = 36 * k;
      const at = (s, x, y) => g.drawImage(s.canvas, x - s.ox * ppt, y - s.oy * ppt, s.w * ppt, s.h * ppt);
      for (const [x, y] of [[0.08, 0.5], [0.27, 0.34], [0.5, 0.82], [0.66, 0.36], [0.92, 0.66]]) {
        at(palmTrunk(4), W * x, H * y);
        at(palmCrown(), W * x + 0.18 * ppt, H * y - 3.85 * ppt);
      }
      at(tikiSprite(), W * 0.86, H * 0.36);
      at(tikiSprite(), W * 0.76, H * 0.36);
    });
    // the dotted path
    g.fillStyle = '#fff7d6';
    for (let i = 0; i < ORDER.length - 1; i++) {
      const p0 = this.stop(ORDER[i]);
      const p1 = this.stop(ORDER[i + 1]);
      for (let s = 0.12; s < 0.9; s += 0.08) {
        const x = p0.x + (p1.x - p0.x) * s;
        const y = p0.y + (p1.y - p0.y) * s - Math.sin(s * Math.PI) * a.h * 0.06;
        g.beginPath();
        g.arc(x * k, y * k, 5 * k, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Turbo
    const tp = this.turboAt();
    const prof = a.store.profile();
    const ppt = Math.min(a.h * 0.075, 64) * 1.25 * k;
    g.save();
    g.translate(tp.x * k, (tp.y - Math.min(a.h * 0.075, 64) * 0.9 - tp.hop * a.h * 0.08) * k);
    if ((tp.dir || 1) < 0) g.scale(-1, 1);
    const pose = { ...neutralPose(), eye: this.walk ? 'happy' : 'open', mouth: this.walk ? 'grin' : 'smile', tail: Math.sin(t * 9) * 0.4 - 0.2, look: prof.look, accessory: prof.id === 'dad' && prof.look.hat === 'none' ? 'shades' : null };
    if (this.walk) pose.legs = [0.6, 0.6, -0.5, -0.5];
    withTileSize(ppt, () => drawTurbo(g, ppt, pose, (c, x, y, w2, h2) => g.drawImage(c, x, y, w2, h2)));
    g.restore();

    // The stops and corner buttons, on the sharp canvas.
    const ui = a.ui;
    const nxt = this.next();
    const pulse = Math.floor(t * 3) % 2;
    const sig = ['map', a.w, a.h, a.inApp, prof.id, this.down, this.hold.toFixed(2), JSON.stringify(prof.levels), JSON.stringify(prof.resume), prof.unlocked.join(), nxt, pulse, this.shake ? this.shake.t.toFixed(2) : '', a.settings.debug ? a.debugText : ''].join('|');
    if (!ui.begin(sig)) return;
    for (const id of ORDER) {
      const p = this.stop(id);
      const open = prof.unlocked.includes(id);
      const info = prof.levels[id];
      const R = Math.min(a.h * 0.075, 64);
      const sx = this.shake && this.shake.id === id ? Math.sin(this.shake.t * 60) * 6 : 0;
      ui.mapStop(p.x + sx, p.y, R * (this.down === id ? 0.93 : 1), STOPS[id].icon, open, id === nxt && pulse, id === 'w1-b');
      if (open) {
        if (!STOPS[id].noGems) for (let i = 0; i < 3; i++) ui.gem(p.x + (i - 1) * R * 0.5, p.y + R * 1.32, R * 0.17, info && info.gems[i], false);
        const medal = info?.best?.dad?.medal || 0;
        if (medal && a.settings.mode === 'dad') ui.medal(p.x + R * 0.95, p.y - R * 0.8, R * 0.24, medal);
        if (info && info.done) ui.checkBadge(p.x - R * 0.95, p.y - R * 0.8, R * 0.24);
        if (prof.resume && prof.resume.level === id) ui.flagBadge(p.x, p.y - R * 1.25, R * 0.22);
      }
    }
    for (const b of this.buttons()) {
      if (b.hidden || b.invisible) continue;
      ui.button(b, this.down === b.id);
      if (b.hold && this.down === b.id) ui.holdRing(b, this.hold / b.hold);
    }
    // which player: a small pup badge by the home button
    const m = Math.max(56, a.h * 0.07);
    ui.profileBadge(m + 82, m, 28, prof.id);
    if (a.settings.debug) ui.debug(a.debugLines);
  }
}
