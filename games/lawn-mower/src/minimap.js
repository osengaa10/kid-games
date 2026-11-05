// A little round map for the driver's seat. It's turned so straight ahead is
// always up, with the mower in the middle, so tall grass at the top of the
// map is grass in front of you. Tall grass is the world's dark tall-grass
// color, mowed grass is pale, like on the lawn itself.
import { CUT, TALL } from './lawn.js';
import { drawEmoji } from './util.js';

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export class MiniMap {
  constructor(lawn) {
    this.lawn = lawn;
    const { cols, rows } = lawn;
    this.canvas = document.createElement('canvas');
    this.canvas.width = cols;
    this.canvas.height = rows;
    this.g = this.canvas.getContext('2d');
    this.img = this.g.createImageData(cols, rows);
    this.tallRGBA = rgba(lawn.theme.tallBase, 255);
    this.cutRGBA = rgba(lawn.theme.cutA, 120);
    for (let i = 0; i < lawn.grid.length; i++) this.paint(i);
    this.dirty = true;
  }

  paint(i) {
    const v = this.lawn.grid[i];
    const c = v === TALL ? this.tallRGBA : v === CUT ? this.cutRGBA : null;
    const d = this.img.data;
    if (c) d.set(c, i * 4);
    else d.fill(0, i * 4, i * 4 + 4);
  }

  cut(i) {
    this.paint(i);
    this.dirty = true;
  }

  // A circle of radius r at (cx, cy) on the HUD.
  draw(ctx, cx, cy, r, mower, alpha = 1) {
    if (alpha <= 0.01) return;
    const { cols, rows } = this.lawn;
    if (this.dirty) {
      this.dirty = false;
      this.g.putImageData(this.img, 0, 0);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f7f2';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // the lawn, turned so the way the mower faces is up
    ctx.save();
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 2 - mower.heading);
    const s = r / (Math.max(cols, rows) * 0.55);
    ctx.scale(s, s);
    ctx.translate(-mower.x, -mower.y);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 0, 0, cols, rows);
    ctx.restore();

    // the mower in the middle, pointing up
    const k = r * 0.2;
    ctx.fillStyle = '#ef5350';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - k * 1.6);
    ctx.lineTo(cx + k * 0.8, cy - k * 0.6);
    ctx.lineTo(cx - k * 0.8, cy - k * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawEmoji(ctx, mower.skin.driver, cx, cy + k * 0.2, k * 1.7);
    ctx.restore();
  }
}
