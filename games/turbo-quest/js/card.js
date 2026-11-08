// Pictures drawn by the game itself:
//   ?card=1024  the Kid Games home screen card (Turbo leaping through stars, a Grumbly cheered
//               into a balloon, the jungle behind)
//   ?icon=512   the app icon
// and paintScene (the card's scene). The page sets
// body[data-ready] when done, so a script can save the canvas.
import { withTileSize } from './engine/sprites.js';
import { drawTurbo, neutralPose } from './art/turbo.js';
import { drawGrumbly, balloon, grumblyFace } from './art/grumblies.js';
import { LAYERS, SKY, paintLayer, groundTile, flowerTile, palmTrunk, palmCrown, cloudSprite, sunSprite } from './art/jungle.js';
import { starSprite, gemSprite, glowSprite } from './art/items.js';

export function drawCardPage(params) {
  const isIcon = params.has('icon');
  const S = Number(params.get(isIcon ? 'icon' : 'card')) || (isIcon ? 512 : 1024);
  document.body.innerHTML = '';
  document.body.style.background = '#000';
  const c = document.createElement('canvas');
  c.width = c.height = S;
  c.style.cssText = `width:${S}px;height:${S}px;display:block`;
  document.body.append(c);
  const g = c.getContext('2d');
  if (isIcon) paintIcon(g, S);
  else paintScene(g, S, S, 'card');
  document.body.dataset.ready = '1';
}

const draw = (g) => (s, x, y, w, h) => g.drawImage(s, x, y, w, h);
const at = (g, s, x, y, ppt, k = 1) => g.drawImage(s.canvas, x - s.ox * ppt * k, y - s.oy * ppt * k, s.w * ppt * k, s.h * ppt * k);

function sky(g, W, H) {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, SKY[0]);
  grd.addColorStop(0.6, SKY[1]);
  grd.addColorStop(1, SKY[2]);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

// A jungle scene W × H pixels. kind: 'card' (the launcher picture: Turbo mid-leap),
// 'level' (a level card), 'practice' (the practice field: calmer, no Grumbly).
export function paintScene(g, W, H, kind = 'card') {
  const ppt = H / 6.4;
  withTileSize(ppt, () => {
    sky(g, W, H);
    at(g, sunSprite(), W * 0.84, H * 0.12, ppt, 0.9);
    at(g, cloudSprite(0), W * 0.04, H * 0.07, ppt, 0.7);
    at(g, cloudSprite(1), W * 0.55, H * 0.2, ppt, 0.55);
    for (const L of LAYERS) {
      const h = Math.round(H * L.height * 0.95);
      const strip = document.createElement('canvas');
      strip.width = W;
      strip.height = h;
      paintLayer(strip.getContext('2d'), W, h, L);
      g.drawImage(strip, 0, H - h - ppt * 0.9);
    }
    const gy = H - ppt;
    for (let i = 0; i * ppt < W; i++) g.drawImage(groundTile(true, false, false, 0, i % 3).canvas, i * ppt, gy, ppt + 1, ppt + 1);
    at(g, palmTrunk(4), W * 0.12, gy, ppt);
    at(g, palmCrown(), W * 0.12 + ppt * 0.18, gy - 4 * ppt + 0.15 * ppt, ppt);
    g.drawImage(flowerTile().canvas, W * 0.28, gy - ppt, ppt, ppt);
    const st = starSprite();
    for (const [x, y] of [[0.36, 0.42], [0.47, 0.3], [0.6, 0.26], [0.73, 0.32], [0.84, 0.44]]) at(g, st, W * x, H * y, ppt, 1.15);
    if (kind !== 'practice') {
      // a Grumbly just cheered into a balloon, and a gem
      at(g, glowSprite('#fff0a0'), W * 0.9, H * 0.68, ppt, 0.8);
      at(g, gemSprite(), W * 0.9, H * 0.68, ppt, 0.9);
      at(g, balloon('waddler'), W * 0.78, H * 0.5, ppt, 1.0);
      at(g, grumblyFace('happy'), W * 0.785, H * 0.495, ppt, 0.95);
      if (kind === 'level') {
        g.save();
        g.translate(W * 0.94, gy);
        g.scale(-1, 1);
        drawGrumbly(g, ppt, { kind: 'hopper', mood: 'grumpy', squash: 1, step: 0, wing: 0, cloudY: -1.2 }, draw(g));
        g.restore();
      }
    }
    g.save();
    g.translate(W * 0.56, kind === 'card' ? H * 0.66 : H * 0.7);
    g.rotate(-0.12);
    const k = kind === 'card' ? 1.65 : 1.4;
    g.scale(k, k);
    const pose = { ...neutralPose(), legs: [0.7, 0.7, -0.6, -0.6], earB: -0.45, earF: -0.4, eye: 'happy', mouth: 'grin', tail: -0.5 };
    drawTurbo(g, ppt, pose, draw(g));
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, r] of [[0.3, 0.64, 0.03], [0.35, 0.59, 0.022], [0.26, 0.67, 0.017]]) {
      g.beginPath();
      g.arc(W * x, H * y, H * r, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function paintIcon(g, S) {
  const ppt = S / 2.4;
  withTileSize(ppt, () => {
    sky(g, S, S);
    g.fillStyle = '#62cf45';
    g.beginPath();
    g.ellipse(S / 2, S * 1.1, S * 0.85, S * 0.32, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.translate(S * 0.5, S * 0.93);
    drawTurbo(g, ppt, { ...neutralPose(), eye: 'open', mouth: 'grin', earB: -0.1, earF: -0.05 }, draw(g));
    g.restore();
  });
}
