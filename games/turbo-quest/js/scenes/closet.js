// The Pup Closet: dress Turbo up. A big Turbo on the left wears whatever is picked; on the right,
// three tabs (hats, fur, Pop-Pack paint) and a grid of picture tiles. Locked tiles show a
// padlock and the star count that unlocks them; the bar at the bottom fills toward the next one.
// Stars are all-time and never spent. No reading needed.
import { MenuScene } from './menu.js';
import { CLOSET, isUnlocked, nextUnlock } from '../content/cosmetics.js';
import { drawTurbo, neutralPose, HAT_IDS } from '../art/turbo.js';
import { withTileSize } from '../engine/sprites.js';
import { play } from '../engine/audio.js';
import { say } from '../engine/speech.js';

const TABS = ['hat', 'fur', 'pack'];

export class ClosetScene extends MenuScene {
  constructor(app) {
    super(app);
    this.tab = 'hat';
    this.hop = 0;
    void HAT_IDS;
  }

  layout() {
    const { w, h } = this.app;
    const px = w * 0.46;
    const pw = w * 0.5;
    const py = h * 0.14;
    const ph = h * 0.74;
    const cols = 3;
    const cell = Math.min((pw - 40) / cols, (ph - 170) / 2);
    // the grid sits in the middle of the space between the tabs and the star bar
    const gy = py + 100 + (ph - 170 - cell * 2) / 2;
    return { px, pw, py, ph, cols, cell, gy };
  }

  buttons() {
    const a = this.app;
    const L = this.layout();
    const m = Math.max(56, a.h * 0.07);
    const list = [{ id: 'back', x: m, y: m, r: 34, color: '#8d6cf2', icon: 'map' }];
    TABS.forEach((t, i) => list.push({ id: `tab-${t}`, x: L.px + L.pw * (0.2 + i * 0.3), y: L.py + 50, r: 36, color: this.tab === t ? '#4fc3ff' : '#c9d3e6', icon: `tab-${t}` }));
    CLOSET[this.tab].forEach((item, i) => {
      const cx = L.px + 20 + L.cell * ((i % L.cols) + 0.5) + (L.pw - 40 - L.cell * L.cols) / 2;
      const cy = L.gy + L.cell * (Math.floor(i / L.cols) + 0.5);
      list.push({ id: `item-${item.id}`, x: cx, y: cy, r: L.cell * 0.42, invisible: true, item });
    });
    return list;
  }

  back() {
    this.app.showMap();
  }

  choose(id) {
    const a = this.app;
    const prof = a.store.profile();
    if (id === 'back') {
      play('tap');
      a.showMap();
    } else if (id.startsWith('tab-')) {
      this.tab = id.slice(4);
      play('tap');
    } else if (id.startsWith('item-')) {
      const item = CLOSET[this.tab].find((x) => `item-${x.id}` === id);
      if (!isUnlocked(item, prof.stars)) {
        play('locked');
        return;
      }
      prof.look = { ...prof.look, [this.tab]: item.id };
      a.store.save();
      play('select');
      this.hop = 1;
      if (prof.mode === 'kid') say(['Ooh!', 'So cool!', 'Looking good!'][Math.floor(Math.random() * 3)], { force: true });
    }
  }

  update(dt) {
    this.hop = Math.max(0, this.hop - dt * 3);
  }

  render() {
    const a = this.app;
    const r = a.renderer;
    const g = r.g;
    const k = r.canvas.width / a.w;
    const prof = a.store.profile();
    r.draws = 0;
    r.drawBackdrop(this.time * 0.5, 4, 4, this.time);
    // big Turbo on a little stage
    const cx = a.w * 0.23;
    const cy = a.h * 0.78;
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath();
    g.ellipse(cx * k, cy * k, a.h * 0.2 * k, a.h * 0.04 * k, 0, 0, Math.PI * 2);
    g.fill();
    const ppt = a.h * 0.26 * k;
    g.save();
    g.translate(cx * k, (cy - Math.sin(this.hop * Math.PI) * a.h * 0.08) * k);
    const pose = { ...neutralPose(), eye: this.hop > 0 ? 'happy' : Math.sin(this.time * 1.3) > 0.97 ? 'blink' : 'open', mouth: this.hop > 0 ? 'grin' : 'smile', tail: Math.sin(this.time * 9) * 0.4 - 0.2, look: prof.look, earB: Math.sin(this.time * 2) * 0.05 };
    withTileSize(ppt, () => drawTurbo(g, ppt, pose, (c, x, y, w2, h2) => g.drawImage(c, x, y, w2, h2)));
    g.restore();

    const ui = a.ui;
    const sig = ['closet', a.w, a.h, this.tab, this.down, JSON.stringify(prof.look), prof.stars].join('|');
    if (!ui.begin(sig)) return;
    const L = this.layout();
    ui.panel(L.px, L.py, L.pw, L.ph, 28);
    for (const b of this.buttons()) {
      if (b.item) {
        const open = isUnlocked(b.item, prof.stars);
        const on = prof.look[this.tab] === b.item.id;
        ui.closetTile(b.x, b.y, b.r * (this.down === b.id ? 0.94 : 1), this.tab, b.item, open, on);
      } else if (!b.invisible) ui.button(b, this.down === b.id);
    }
    // the star bar toward the next unlock
    const nxt = nextUnlock(prof.stars);
    const bx = L.px + 44;
    const by = L.py + L.ph - 46;
    const bw = L.pw - 74;
    ui.starBar(bx, by, bw, 26, prof.stars, nxt ? nxt.stars : prof.stars);
  }
}
