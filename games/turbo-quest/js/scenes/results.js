// After the goal, over the frozen level. Saved first (best results, gems, stars, stickers).
// Kid Mode: a celebration with no score: stars counting up, gem slots popping in, and a sticker
// for each kind of Grumbly cheered for the first time. Dad Mode: the tally (score, time against
// par, gems, no-hit, best chain) and the medal. Buttons: ↻ play again, ▶ the level cards.
import { MenuScene } from './menu.js';
import { play } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { say } from '../engine/speech.js';
import { drawGrumbly } from '../art/grumblies.js';

export class ResultsScene extends MenuScene {
  constructor(app, below, res) {
    super(app);
    this.below = below;
    this.res = res;
    this.saved = app.store.recordResult(app.store.data.lastProfile || 'kid', res);
    this.shown = 0; // stars counted so far
    this.ticks = 0;
    this.main = 'next';
  }

  enter() {
    super.enter();
    music.play('title');
    if (this.res.mode === 'kid') say('Hooray! You did it!', { force: true });
  }

  buttons() {
    const { w, h } = this.app;
    const R = Math.min(h * 0.1, 84);
    return [
      { id: 'again', x: w / 2 - R * 1.6, y: h * 0.84, r: R * 0.85, color: '#ff9a3c', icon: 'again' },
      { id: 'next', x: w / 2 + R * 1.3, y: h * 0.84, r: R, color: '#35c25a', icon: 'play' },
    ];
  }

  choose(id) {
    const a = this.app;
    play('select');
    if (id === 'again') a.startLevel(this.res.level, null);
    else a.showLevels();
  }

  update(dt) {
    this.time += dt;
    // Stars count up, quickly, with a tick.
    const target = this.res.stars;
    if (this.shown < target && this.time > 0.4) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(target, this.shown + Math.max(18, target / 1.4) * dt);
      if (Math.floor(this.shown) !== before && this.ticks++ % 2 === 0) play('count', { pitch: 1 + Math.min(1, this.shown / Math.max(1, target)) * 0.5, vol: 0.6 });
    }
  }

  render() {
    const a = this.app;
    this.below.renderWorld();
    const ui = a.ui;
    const anim = this.time < 4.5;
    if (!ui.begin(anim ? `res${this.time}` : ['res', a.w, a.h, this.down, a.settings.debug ? a.debugText : ''].join('|'))) return;
    ui.dim(0.45);
    const { w, h } = a;
    const pw = Math.min(w * 0.62, 760);
    const ph = h * 0.6;
    const px = (w - pw) / 2;
    const py = h * 0.08;
    ui.panel(px, py, pw, ph, 34);
    if (this.res.mode === 'kid') this.drawKid(ui, px, py, pw, ph);
    else this.drawDad(ui, px, py, pw, ph);
    this.drawButtons(ui);
    if (a.settings.debug) ui.debug(a.debugLines);
  }

  drawKid(ui, px, py, pw, ph) {
    const g = ui.g;
    const cx = px + pw / 2;
    // big star and the count
    const s = ph * 0.13;
    ui.bigStar(cx - s * 1.2, py + ph * 0.2, s, this.time);
    ui.text(String(Math.floor(this.shown)), cx + s * 0.6, py + ph * 0.21, s * 1.5, '#ffb000');
    // gem slots, popping in one at a time
    const gy = py + ph * 0.48;
    for (let i = 0; i < 3; i++) {
      const t = this.time - 1.2 - i * 0.35;
      const got = this.res.gems[i];
      const k = got ? Math.max(0, Math.min(1, t * 4)) : 1;
      if (got && t > 0 && t < 0.05) play('heart');
      ui.gem(cx + (i - 1) * ph * 0.2, gy, ph * 0.065 * (0.6 + 0.4 * k + (got && t > 0 && t < 0.3 ? 0.25 : 0)), got && t > 0, true);
    }
    // new stickers: the Grumblies he cheered for the first time
    const kinds = this.saved.firstStickers;
    if (kinds.length) {
      const sy = py + ph * 0.8;
      kinds.forEach((kind, i) => {
        const t = this.time - 2.4 - i * 0.4;
        if (t < 0) return;
        const x = cx + (i - (kinds.length - 1) / 2) * ph * 0.26;
        const k = Math.min(1, t * 3);
        g.save();
        g.translate(x, sy);
        g.rotate(-0.08 + i * 0.08);
        g.beginPath();
        g.roundRect ? g.roundRect(-ph * 0.1, -ph * 0.1, ph * 0.2, ph * 0.2, 14) : g.rect(-ph * 0.1, -ph * 0.1, ph * 0.2, ph * 0.2);
        g.fillStyle = '#fff7d6';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = '#ffd23a';
        g.stroke();
        g.translate(0, ph * 0.08);
        g.scale(k, k);
        const ppt = ph * 0.13;
        drawGrumbly(g, ppt, { kind, mood: 'happy', squash: 1, step: 0, wing: this.time * 20 }, (c, x2, y2, w2, h2) => g.drawImage(c, x2, y2, w2, h2));
        g.restore();
      });
    }
  }

  drawDad(ui, px, py, pw, ph) {
    const r = this.res;
    const cx = px + pw / 2;
    const L = px + pw * 0.12;
    const R = px + pw * 0.88;
    const row = (i) => py + ph * (0.13 + i * 0.12);
    const ink = '#2b2a6b';
    const line = (i, label, value, color = ink) => {
      ui.text(label, L, row(i), ph * 0.06, ink, 'left', 700);
      ui.text(value, R, row(i), ph * 0.07, color, 'right', 800);
    };
    const t = r.time;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    line(0, '★ Stars', `${Math.floor(this.shown)} / ${r.starsTotal}`);
    line(1, '◆ Gems', `${r.gems.filter(Boolean).length} / ${r.gemCount}`);
    line(2, '⏱ Time', `${fmt(t)}  (par ${fmt(r.par)})`, t <= r.par ? '#1f9d4c' : ink);
    line(3, '× Best chain', `×${Math.min(10, r.bestChain)}   ${r.cheers} cheers`);
    line(4, '♥ No-hit', r.noHit ? '+2,000' : '—', r.noHit ? '#1f9d4c' : ink);
    ui.text(r.score.toLocaleString('en-US'), cx, row(5.4), ph * 0.13, '#ff8a2a');
    if (r.medal) ui.medal(cx + pw * 0.33, row(5.4), ph * 0.07, r.medal);
    if (this.saved.newBest) ui.text('NEW BEST', cx - pw * 0.33, row(5.4), ph * 0.05, '#1f9d4c');
  }
}
