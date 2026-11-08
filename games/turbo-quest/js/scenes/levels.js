// The level cards (a stand-in for the world map, which comes with more levels): the World 1
// card and the practice field. Each card shows its picture, the three gem slots (filled for
// gems found), the Dad Mode medal, and a flag when there's a checkpoint to come back to (tapping
// the card resumes there; the small ↻ starts the level over).
import { MenuScene } from './menu.js';
import { paintScene } from '../card.js';
import { ORDER } from '../content/levels/index.js';
import { play } from '../engine/audio.js';
import { music } from '../engine/music.js';

const pictures = new Map();

function picture(kind, w, h, dpr) {
  const key = `${kind}${Math.round(w)}x${Math.round(h)}@${dpr}`;
  let c = pictures.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    paintScene(c.getContext('2d'), c.width, c.height, kind);
    pictures.set(key, c);
  }
  return c;
}

export class LevelsScene extends MenuScene {
  enter() {
    super.enter();
    music.play('title');
  }

  cards() {
    const { w, h } = this.app;
    const cw = Math.min(w * 0.42, h * 0.72);
    const ch = cw * 0.92;
    const pw = cw * 0.55;
    const ph = pw * 0.92;
    const cy = h * 0.53;
    return [
      { id: 'w1-1', kind: 'level', x: w * 0.42 - cw / 2, y: cy - ch / 2, w: cw, h: ch },
      { id: 'greybox', kind: 'practice', x: w * 0.8 - pw / 2, y: cy - ph / 2 + ch * 0.12, w: pw, h: ph },
    ];
  }

  buttons() {
    const a = this.app;
    const m = Math.max(56, a.h * 0.07);
    const prof = a.store.profile();
    const main = this.cards()[0];
    const resume = prof.resume && prof.resume.level === main.id;
    return [
      ...this.cards().map((c) => ({ id: c.id, rect: c, invisible: true })),
      { id: 'restart', x: main.x + main.w - 8, y: main.y + 8, r: 28, color: '#ff9a3c', icon: 'again', hidden: !resume },
      { id: 'back', x: m, y: m, r: 34, color: '#8d6cf2', icon: 'home' },
      { id: 'games', x: m, y: a.h - m, r: 34, color: '#ffffff', icon: 'games', hidden: !a.inApp },
      { id: 'gear', x: a.w - m, y: a.h - m, r: 30, color: 'rgba(30,70,130,0.55)', icon: 'gear', hold: 2 },
    ];
  }

  hit(x, y) {
    // the small buttons first (the restart button sits on the card's corner)
    const list = this.buttons().filter((b) => !b.hidden);
    for (const b of list) if (!b.rect && (x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r * 1.15) ** 2) return b;
    for (const b of list) if (b.rect && x >= b.rect.x && x <= b.rect.x + b.rect.w && y >= b.rect.y && y <= b.rect.y + b.rect.h) return b;
    return null;
  }

  get main() {
    return 'w1-1';
  }

  set main(v) {}

  back() {
    this.app.showTitle();
  }

  choose(id) {
    const a = this.app;
    if (id === 'games') location.href = '../../index.html';
    else if (id === 'gear') a.openSettings();
    else if (id === 'back') {
      play('tap');
      a.showTitle();
    } else if (id === 'restart') {
      play('tap');
      a.store.setResume(a.store.data.lastProfile, null);
    } else {
      play('select');
      const prof = a.store.profile();
      const resume = prof.resume && prof.resume.level === id && prof.resume.mode === a.settings.mode ? prof.resume : null;
      a.startLevel(id, resume);
    }
  }

  render() {
    const a = this.app;
    const r = a.renderer;
    r.draws = 0;
    r.drawBackdrop(this.time * 0.6, 4, 4, this.time);
    const ui = a.ui;
    const prof = a.store.profile();
    const sig = ['levels', a.w, a.h, a.inApp, this.down, this.hold.toFixed(2), JSON.stringify(prof.levels), JSON.stringify(prof.resume), prof.id, a.settings.debug ? a.debugText : ''].join('|');
    if (!ui.begin(sig)) return;
    const g = ui.g;
    for (const c of this.cards()) {
      const press = this.down === c.id ? 0.97 : 1;
      g.save();
      g.translate(c.x + c.w / 2, c.y + c.h / 2);
      g.scale(press, press);
      g.translate(-c.w / 2, -c.h / 2);
      ui.panel(0, 0, c.w, c.h, 26);
      const pad = c.w * 0.05;
      const pw = c.w - pad * 2;
      const ph = c.h * 0.7;
      g.save();
      g.beginPath();
      g.roundRect ? g.roundRect(pad, pad, pw, ph, 18) : g.rect(pad, pad, pw, ph);
      g.clip();
      g.drawImage(picture(c.kind, pw, ph, ui.dpr), pad, pad, pw, ph);
      g.restore();
      const info = prof.levels[c.id];
      if (c.kind === 'level') {
        const gy = pad + ph + (c.h - ph - pad) / 2;
        for (let i = 0; i < 3; i++) ui.gem(pad + c.w * 0.1 + i * c.w * 0.12, gy, c.w * 0.045, info && info.gems[i], true);
        const medal = info?.best?.dad?.medal || 0;
        if (medal) ui.medal(c.w * 0.56, gy + c.w * 0.02, c.w * 0.04, medal);
        ui.button({ x: c.w - pad - c.w * 0.08, y: gy, r: c.w * 0.075, color: '#35c25a', icon: 'play' }, false);
        if (prof.resume && prof.resume.level === c.id) ui.flagBadge(pad + c.w * 0.07, pad + c.w * 0.07, c.w * 0.06);
      } else {
        const gy = pad + ph + (c.h - ph - pad) / 2;
        ui.text('🐾', c.w * 0.3, gy, c.w * 0.12, '#ff8a2a');
        ui.button({ x: c.w - pad - c.w * 0.12, y: gy, r: c.w * 0.1, color: '#35c25a', icon: 'play' }, false);
      }
      g.restore();
    }
    for (const b of this.buttons()) {
      if (b.hidden || b.invisible) continue;
      ui.button(b, this.down === b.id);
      if (b.hold && this.down === b.id) ui.holdRing(b, this.hold / b.hold);
    }
    // which player, top right: a small pup badge
    ui.profileBadge(a.w - Math.max(56, a.h * 0.07), Math.max(56, a.h * 0.07), 30, prof.id);
    if (a.settings.debug) ui.debug(a.debugLines);
    void ORDER;
  }
}
