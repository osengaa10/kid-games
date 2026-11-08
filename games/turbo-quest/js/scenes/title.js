// The title: "who's playing?" Two big pups, his (plain Turbo) and yours (Turbo in sunglasses),
// each showing its star total. The last player bounces and glows, so for him it's one tap.
// Corners: four tiles back to all the games (inside the app), the gear (hold 2 s) for settings.
import { MenuScene } from './menu.js';
import { drawTurbo, neutralPose } from '../art/turbo.js';
import { withTileSize } from '../engine/sprites.js';
import { VIEW_TILES } from '../game/tuning.js';
import { play } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { say } from '../engine/speech.js';

export class TitleScene extends MenuScene {
  constructor(app) {
    super(app);
    this.hop = { kid: 0, dad: 0 };
  }

  enter() {
    super.enter();
    music.play('title');
  }

  layout() {
    const { w, h } = this.app;
    const R = Math.min(h * 0.24, w * 0.17);
    return { R, kid: { x: w * 0.3, y: h * 0.6 }, dad: { x: w * 0.7, y: h * 0.6 } };
  }

  buttons() {
    const a = this.app;
    const L = this.layout();
    const m = Math.max(56, a.h * 0.07);
    return [
      { id: 'kid', x: L.kid.x, y: L.kid.y, r: L.R, invisible: true },
      { id: 'dad', x: L.dad.x, y: L.dad.y, r: L.R, invisible: true },
      { id: 'games', x: m, y: a.h - m, r: 34, color: '#ffffff', icon: 'games', hidden: !a.inApp },
      { id: 'gear', x: a.w - m, y: a.h - m, r: 30, color: 'rgba(30,70,130,0.55)', icon: 'gear', hold: 2 },
    ];
  }

  get main() {
    return this.app.store.data.lastProfile || 'kid';
  }

  set main(v) {}

  choose(id) {
    const a = this.app;
    if (id === 'games') {
      location.href = '../../index.html';
      return;
    }
    if (id === 'gear') {
      a.openSettings();
      return;
    }
    this.hop[id] = 1;
    play('select');
    if (id === 'kid') say('Let\'s go!', { force: true });
    setTimeout(() => a.chooseProfile(id), 250);
  }

  update(dt) {
    for (const k of ['kid', 'dad']) this.hop[k] = Math.max(0, this.hop[k] - dt * 3);
  }

  render() {
    const a = this.app;
    const r = a.renderer;
    const g = r.g;
    const k = r.canvas.width / a.w;
    r.draws = 0;
    r.drawBackdrop(this.time * 1.2, 4, 4, this.time);
    // the logo
    const L = this.layout();
    logo(g, r.canvas.width / 2, a.h * 0.17 * k, Math.min(a.h * 0.13, a.w * 0.085) * k, this.time);
    // the two pups on round stages
    const last = a.store.data.lastProfile;
    for (const id of ['kid', 'dad']) {
      const p = L[id];
      const chosen = last === id;
      const bob = chosen ? Math.abs(Math.sin(this.time * 3)) * 0.05 : 0;
      const pressed = this.down === id ? 0.94 : 1;
      g.save();
      g.translate(p.x * k, p.y * k);
      g.beginPath();
      g.arc(0, 0, L.R * k * pressed, 0, Math.PI * 2);
      g.fillStyle = chosen ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.32)';
      g.fill();
      g.lineWidth = (chosen ? 10 : 6) * k;
      g.strokeStyle = chosen ? '#ffd23a' : 'rgba(255,255,255,0.85)';
      g.stroke();
      const ppt = L.R * k * (id === 'dad' ? 0.62 : 0.54) * pressed;
      g.translate(0, L.R * k * (0.62 - bob - this.hop[id] * 0.2));
      const pose = {
        ...neutralPose(), eye: chosen ? 'happy' : Math.sin(this.time * 1.7 + (id === 'dad' ? 2 : 0)) > 0.97 ? 'blink' : 'open',
        mouth: chosen ? 'grin' : 'smile', tail: Math.sin(this.time * 9) * 0.4 - 0.2, accessory: id === 'dad' ? 'shades' : null,
        earB: Math.sin(this.time * 2) * 0.05, earF: Math.sin(this.time * 2 + 1) * 0.05,
      };
      if (id === 'dad') g.scale(-1, 1);
      withTileSize(ppt, () => drawTurbo(g, ppt, pose, (s, x, y, w, h) => g.drawImage(s, x, y, w, h)));
      g.restore();
    }
    void VIEW_TILES;
    const ui = a.ui;
    const stars = ['kid', 'dad'].map((id) => a.store.profile(id).stars).join(',');
    if (!ui.begin(['title', a.w, a.h, a.inApp, this.down, this.hold.toFixed(2), stars, a.settings.debug ? a.debugText : ''].join('|'))) return;
    for (const id of ['kid', 'dad']) {
      const p = L[id];
      ui.starCount(a.store.profile(id).stars, p.x, p.y + L.R + 34, 30);
    }
    for (const b of this.buttons()) {
      if (b.hidden || b.invisible) continue;
      ui.button(b, this.down === b.id);
      if (b.hold && this.down === b.id) ui.holdRing(b, this.hold / b.hold);
    }
    if (a.settings.debug) ui.debug(a.debugLines);
  }
}

// TURBO QUEST in chunky bouncing letters.
function logo(g, cx, cy, size, t) {
  const text = 'TURBO QUEST';
  g.save();
  g.font = `900 ${Math.round(size)}px system-ui, -apple-system, 'Arial Rounded MT Bold', sans-serif`;
  g.textBaseline = 'middle';
  const widths = [...text].map((c) => g.measureText(c).width + size * 0.02);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  const colors = ['#ff8a2a', '#ffd23a', '#ff4f8a', '#4fc3ff', '#7be05a'];
  [...text].forEach((c, i) => {
    const y = cy + Math.sin(t * 3 + i * 0.6) * size * 0.05;
    if (c !== ' ') {
      g.lineJoin = 'round';
      g.lineWidth = size * 0.2;
      g.strokeStyle = '#ffffff';
      g.strokeText(c, x, y);
      g.lineWidth = size * 0.1;
      g.strokeStyle = '#2b2a6b';
      g.strokeText(c, x, y);
      g.fillStyle = colors[i % colors.length];
      g.fillText(c, x, y);
    }
    x += widths[i];
  });
  g.restore();
}
