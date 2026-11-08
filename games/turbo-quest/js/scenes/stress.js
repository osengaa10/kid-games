// ?stress: the performance check for the iPad. A dense level scrolls by at running speed with
// 4 parallax layers, about 150 tiles on screen, 40 Turbos (13 parts each, the real rig) and about 250 particles. Leave it running for 20 s and read the
// overlay: the bar is 95 % of frames within 17.5 ms and none over 50 ms.
import { PlayScene } from './play.js';
import { drawTurbo, neutralPose } from '../art/turbo.js';
import { starSprite } from '../art/items.js';
import { hash } from '../engine/rng.js';

const W = 420;
const H = 14;

function stressLevel() {
  const rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      if (y >= H - 2) r += '#';
      else if (x === 3 && y === H - 3) r += 'S';
      else if (x === W - 4 && y === H - 3) r += '>';
      else if (y >= 1 && y <= 9 && x > 6 && x < W - 8) {
        const h = hash(x * 13.7 + y * 91.3);
        r += h < 0.42 ? '#' : h < 0.58 ? '=' : h < 0.64 ? '*' : '.';
      } else r += '.';
    }
    rows.push(r);
  }
  return { id: 'stress', sections: [{ rows }] };
}

export class StressScene extends PlayScene {
  constructor(app) {
    super(app, stressLevel());
    this.actors = Array.from({ length: 40 }, (_, i) => ({ x: (i % 10) * 1.8 + 1, y: 2 + Math.floor(i / 10) * 2.6, phase: i }));
    this.allowQualityStep = false;
  }

  update(dt) {
    this.time += dt;
    const c = this.cam;
    const lvl = this.world.level;
    c.x = (this.time * 6) % (lvl.width - c.viewW);
    c.y = lvl.height - c.viewH;
    this.particles.scale = 1;
    this.particles.update(dt);
    while (this.particles.count < 250) {
      const kind = ['dust', 'sparkle', 'confetti'][(Math.random() * 3) | 0];
      this.particles.burst(kind, c.x + Math.random() * c.viewW, c.y + Math.random() * c.viewH, 10, { speed: 3, life: 1.5, g: kind === 'confetti' ? 4 : 0, drag: 1 });
    }
  }

  frame(elapsed) {
    super.frame(elapsed);
  }

  renderWorld() {
    super.renderWorld();
    const r = this.app.renderer;
    const g = r.g;
    const ppt = r.ppt;
    const st = starSprite();
    for (const a of this.actors) {
      const t = this.time * 8 + a.phase;
      g.save();
      g.translate(Math.round((a.x + 1) * ppt * 0.95), Math.round(a.y * ppt + Math.abs(Math.sin(t)) * -0.3 * ppt));
      g.scale(a.phase % 2 ? -1 : 1, 1);
      const pose = { ...neutralPose(), legs: [Math.sin(t) * 0.6, -Math.sin(t) * 0.6, -Math.sin(t) * 0.6, Math.sin(t) * 0.6], tail: Math.sin(t * 1.4) * 0.35 };
      drawTurbo(g, ppt * 0.8, pose, r.imgFn);
      g.restore();
      // a few stars circling each, to bring it to about 10 drawImage calls like a full rig
      for (let k = 0; k < 4; k++) {
        const ang = t * 0.5 + (k * Math.PI) / 2;
        r.img(st.canvas, (a.x + 1 + Math.cos(ang) * 0.7) * ppt * 0.95 - 0.2 * ppt, (a.y - 0.7 + Math.sin(ang) * 0.4) * ppt - 0.2 * ppt, 0.4 * ppt, 0.4 * ppt);
      }
    }
  }
}
