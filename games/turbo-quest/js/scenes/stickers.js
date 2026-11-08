// The Sticker Book: one slot for each kind of Grumbly and the boss. A kind he has cheered shows
// its happy sticker and how many times; one he hasn't met yet is a grey silhouette with a "?".
// Picture-only completion he can see fill up.
import { MenuScene } from './menu.js';
import { STICKER_KINDS } from '../content/enemies.js';
import { drawSticker } from '../art/grumblies.js';
import { withTileSize } from '../engine/sprites.js';
import { play } from '../engine/audio.js';

export class StickersScene extends MenuScene {
  buttons() {
    const m = Math.max(56, this.app.h * 0.07);
    return [{ id: 'back', x: m, y: m, r: 34, color: '#8d6cf2', icon: 'map' }];
  }

  back() {
    this.app.showMap();
  }

  choose(id) {
    if (id === 'back') {
      play('tap');
      this.app.showMap();
    }
  }

  render() {
    const a = this.app;
    const r = a.renderer;
    r.draws = 0;
    r.drawBackdrop(this.time * 0.4, 4, 4, this.time);
    const ui = a.ui;
    const prof = a.store.profile();
    const sig = ['stickers', a.w, a.h, this.down, JSON.stringify(prof.stickers)].join('|');
    if (!ui.begin(sig)) return;
    const g = ui.g;
    const pw = Math.min(a.w * 0.8, 1000);
    const ph = a.h * 0.74;
    const px = (a.w - pw) / 2;
    const py = a.h * 0.16;
    ui.panel(px, py, pw, ph, 30);
    const cols = 4;
    const cw = pw / cols;
    const ch = ph / 2;
    const got = STICKER_KINDS.filter((k) => prof.stickers[k]).length;
    ui.text(`${got} / ${STICKER_KINDS.length}`, a.w / 2, py - 34, 34, '#ffffff');
    STICKER_KINDS.forEach((kind, i) => {
      const cx = px + cw * ((i % cols) + 0.5);
      const cy = py + ch * (Math.floor(i / cols) + 0.5);
      const n = prof.stickers[kind] || 0;
      const s = Math.min(cw, ch) * 0.78;
      g.save();
      g.translate(cx, cy);
      g.rotate(((i * 37) % 7) / 60 - 0.05);
      g.beginPath();
      g.roundRect ? g.roundRect(-s / 2, -s / 2, s, s, 18) : g.rect(-s / 2, -s / 2, s, s);
      g.fillStyle = n ? '#fff7d6' : '#eceff6';
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = n ? '#ffd23a' : '#d3d8e6';
      g.stroke();
      const ppt = s * 0.42;
      g.translate(0, s * 0.28);
      if (!n) g.globalAlpha = 0.18;
      withTileSize(ppt, () => drawSticker(g, ppt, kind, n > 0));
      g.restore();
      if (n) ui.text(`×${n}`, cx + s * 0.32, cy + s * 0.36, s * 0.16, '#ff8a2a');
      else ui.text('?', cx, cy - s * 0.05, s * 0.4, '#b9bfd6');
    });
    for (const b of this.buttons()) ui.button(b, this.down === b.id);
  }
}
