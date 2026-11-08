// ?lab: every piece of art on one sheet, to review it (and its proportions) in one screenshot:
// Turbo's poses and faces, the Grumblies' moods, balloons, tiles, pickups, shots and scenery.
import { drawTurbo, neutralPose } from '../art/turbo.js';
import { drawGrumbly, balloon, grumblyFace } from '../art/grumblies.js';
import { groundTile, bambooTile, bridgeTile, leafyTile, thornTile, flowerTile, logSprite, palmTrunk, palmCrown, fernSprite, tikiSprite, flowersSprite } from '../art/jungle.js';
import {
  starSprite, gemSprite, glowSprite, heartSprite, capsuleSprite, boneSprite, checkpointSprite, popperSprite, shotSprite,
  trapBubble, bubbleSprite, puffSprite, sparkleSprite, leafSprite, alertMark, hintArrow,
} from '../art/items.js';

export class LabScene {
  constructor(app) {
    this.app = app;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  pointer() {}

  render() {
    const r = this.app.renderer;
    const g = r.g;
    const ppt = r.ppt;
    const W = r.canvas.width;
    const H = r.canvas.height;
    r.draws = 0;
    g.fillStyle = '#bfe6ff';
    g.fillRect(0, 0, W, H);
    const img = r.imgFn;
    const at = (s, x, y, k = 1) => img(s.canvas, x * ppt - s.ox * ppt * k, y * ppt - s.oy * ppt * k, s.w * ppt * k, s.h * ppt * k);
    const t = this.time;
    // Row 1: Turbo
    const poses = [
      {},
      { eye: 'blink' },
      { legs: [0.6, -0.6, -0.6, 0.6], mouth: 'open', earB: -0.3, earF: -0.3, bodyY: -0.04 },
      { legs: [0.7, 0.7, -0.6, -0.6], mouth: 'open', earB: -0.45, earF: -0.45, headRot: -0.12 },
      { legs: [0.25, 0.25, -0.2, -0.2], eye: 'wide', mouth: 'o', earB: 0.5, earF: 0.55 },
      { flutter: t * 40, eye: 'happy', mouth: 'grin', earB: 0.3, earF: 0.35 },
      { eye: 'hurt', mouth: 'o' },
      { eye: 'happy', mouth: 'grin', nozzle: 'bubble' },
      { accessory: 'shades', nozzle: 'spread' },
    ];
    poses.forEach((p, i) => {
      g.save();
      g.translate((1.2 + i * 1.95) * ppt, 2.3 * ppt);
      drawTurbo(g, ppt, { ...neutralPose(), ...p }, img);
      g.restore();
    });
    // Row 2: Grumblies, balloons, the trap bubble
    let x = 1;
    for (const kind of ['waddler', 'hopper', 'flapper']) {
      for (const mood of ['grumpy', 'alert']) {
        g.save();
        g.translate(x * ppt, 4.9 * ppt);
        drawGrumbly(g, ppt, { kind, mood, squash: 1, step: t * 6, wing: t * 28, cloudY: -1.4 }, img);
        g.restore();
        x += 1.35;
      }
    }
    g.save();
    g.translate(x * ppt, 4.9 * ppt);
    drawGrumbly(g, ppt, { kind: 'waddler', squash: 1, flash: true }, img);
    g.restore();
    x += 1.4;
    for (const kind of ['waddler', 'hopper', 'flapper']) {
      at(balloon(kind), x, 4.0);
      at(grumblyFace('happy'), x + 0.02, 3.98, 0.95);
      x += 1.2;
    }
    at(trapBubble(), x + 0.3, 4.2);
    // Row 3: tiles
    const tiles = [
      groundTile(true, true, false, 0, 0), groundTile(true, false, false, 0, 1), groundTile(true, false, true, 0, 2), groundTile(false, true, false, 1, 1),
      groundTile(false, false, false, 2, 0), bambooTile(true, false), bambooTile(false, true), bridgeTile(), leafyTile(0), thornTile(true), thornTile(false), flowerTile(),
    ];
    tiles.forEach((s, i) => img(s.canvas, (0.6 + i * 1.15) * ppt, 5.6 * ppt, ppt, ppt));
    at(logSprite(3), 14.6, 5.7);
    // Row 4: pickups, shots, effects
    const items = [
      [starSprite(), 1], [glowSprite('#fff0a0'), 0.8], [heartSprite(), 1], [capsuleSprite('bubble'), 1], [capsuleSprite('spread'), 1],
      [capsuleSprite('shield'), 1], [boneSprite(), 1], [shotSprite('pop'), 0.7], [shotSprite('pop', true), 1], [shotSprite('bubble'), 0.8],
      [shotSprite('spread'), 0.7], [puffSprite(), 1], [sparkleSprite(0), 1.3], [leafSprite(0), 1.4], [alertMark(), 1], [hintArrow(), 0.8], [bubbleSprite(), 0.5],
    ];
    items.forEach(([s, k], i) => at(s, 0.9 + i * 1.0, 7.6, k));
    at(gemSprite(), 2.9, 7.6);
    // Row 5: checkpoints, the popper, scenery
    at(checkpointSprite(false), 1.0, 11.6);
    at(checkpointSprite(true), 2.2, 11.6);
    at(popperSprite(false), 4.2, 11.6);
    at(popperSprite(true), 6.6, 11.6);
    at(palmTrunk(4), 9.2, 11.6);
    at(palmCrown(), 9.4, 7.75);
    at(fernSprite(), 12.0, 11.6);
    at(tikiSprite(), 13.8, 11.6);
    at(flowersSprite(), 15.4, 11.6);
  }
}
