// Draws the game view on the #world canvas, back to front: sky, sun, clouds, parallax, scenery,
// tiles, platforms, checkpoints, the goal, pickups, stars, Grumblies, balloons, Turbo, shots and
// particles. Everything is a baked sprite stamped with drawImage; nothing uses shadowBlur or
// filters per frame. It counts its drawImage calls for the debug overlay.
import { T, tileAt } from '../engine/collide.js';
import { setTileSize } from '../engine/sprites.js';
import { VIEW_TILES } from '../game/tuning.js';
import { PLAYER_H } from '../game/player.js';
import { hash } from '../engine/rng.js';
import { drawTurbo } from '../art/turbo.js';
import { drawGrumbly, balloon, grumblyFace } from '../art/grumblies.js';
import {
  SKY, LAYERS, paintLayer, groundTile, bambooTile, bridgeTile, leafyTile, thornTile, flowerTile, logSprite,
  palmTrunk, palmCrown, fernSprite, tikiSprite, flowersSprite, cloudSprite, sunSprite,
} from '../art/jungle.js';
import {
  starSprite, gemSprite, glowSprite, heartSprite, capsuleSprite, boneSprite, checkpointSprite, popperSprite,
  shotSprite, trapBubble, bubbleSprite, dustSprite, puffSprite, sparkleSprite, confettiSprite, leafSprite,
  heartBit, rainbowSprite, hintArrow, alertMark,
} from '../art/items.js';

const solidish = (t) => t === T.SOLID || t === T.BREAK;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });
    this.ppt = 64;
    this.draws = 0;
    this.strips = [];
    this.layerCount = 4;
    this.sky = null;
    this.anim = new WeakMap();
    this.imgFn = (s, x, y, w, h) => this.img(s, x, y, w, h);
  }

  resize(cssW, cssH, scale, layerCount = 4) {
    const W = Math.max(1, Math.round(cssW * scale));
    const H = Math.max(1, Math.round(cssH * scale));
    const c = this.canvas;
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    this.ppt = H / VIEW_TILES;
    setTileSize(this.ppt);
    this.layerCount = layerCount;
    this.buildBackdrop();
  }

  buildBackdrop() {
    const { width: W, height: H } = this.canvas;
    this.sky = this.g.createLinearGradient(0, 0, 0, H);
    this.sky.addColorStop(0, SKY[0]);
    this.sky.addColorStop(0.6, SKY[1]);
    this.sky.addColorStop(1, SKY[2]);
    this.strips = LAYERS.slice(LAYERS.length - this.layerCount).map((L) => {
      const s = document.createElement('canvas');
      s.width = W;
      s.height = Math.round(H * L.height);
      paintLayer(s.getContext('2d'), s.width, s.height, L);
      return { L, canvas: s };
    });
  }

  img(s, x, y, w, h) {
    this.g.drawImage(s, x, y, w, h);
    this.draws++;
  }

  // A sprite with its anchor at tile position (x, y), scaled by k.
  put(s, x, y, k = 1) {
    const ppt = this.ppt;
    this.img(s.canvas, Math.round(this.sx(x) - s.ox * ppt * k), Math.round(this.sy(y) - s.oy * ppt * k), s.w * ppt * k, s.h * ppt * k);
  }

  // A sprite drawn with a transform: anchor at (x, y), rotated and scaled.
  putT(s, x, y, rot = 0, kx = 1, ky = kx) {
    const g = this.g;
    const ppt = this.ppt;
    g.save();
    g.translate(this.sx(x), this.sy(y));
    if (rot) g.rotate(rot);
    if (kx !== 1 || ky !== 1) g.scale(kx, ky);
    this.img(s.canvas, -s.ox * ppt, -s.oy * ppt, s.w * ppt, s.h * ppt);
    g.restore();
  }

  // The sky and scenery only (menus use this behind their buttons).
  drawBackdrop(camX, camY, lowest, time) {
    const g = this.g;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ppt = this.ppt;
    g.fillStyle = this.sky;
    g.fillRect(0, 0, W, H);
    const sun = sunSprite();
    this.img(sun.canvas, W * 0.26 - 2 * ppt, -0.9 * ppt, sun.w * ppt, sun.h * ppt); // clear of the HUD
    for (let i = 0; i < 3; i++) {
      const cs = cloudSprite(i);
      const f = 0.05 + i * 0.03;
      const span = W / ppt + 6;
      const cx = ((((i * 7.3 + time * 0.25 - camX * f) % span) + span) % span) - 3;
      this.img(cs.canvas, Math.round(cx * ppt), Math.round((0.8 + i * 1.4 + (camY - lowest) * -0.05) * ppt), cs.w * ppt, cs.h * ppt);
    }
    for (const { L, canvas: s } of this.strips) {
      const off = (((camX * ppt * L.factor) % s.width) + s.width) % s.width;
      const y = Math.round(H - s.height + (lowest - camY) * ppt * L.vfactor);
      if (y >= H) continue;
      this.img(s, -Math.round(off), y, s.width, s.height);
      this.img(s, s.width - Math.round(off), y, s.width, s.height);
      if (y + s.height < H) {
        g.fillStyle = '#3f9156';
        g.fillRect(0, y + s.height, W, H - y - s.height);
      }
    }
  }

  // view: { world, cam, pview, particles, time, hint, idleHint }
  draw(view) {
    const { world, cam, time } = view;
    const ppt = this.ppt;
    this.draws = 0;
    const level = world.level;
    const camX = cam.x + cam.shakeX;
    const camY = cam.y + cam.shakeY;
    this.sx = (x) => Math.round((x - camX) * ppt);
    this.sy = (y) => Math.round((y - camY) * ppt);
    const x0 = camX - 2;
    const x1 = camX + cam.viewW + 2;
    const inView = (x, m = 0) => x > x0 - m && x < x1 + m;

    this.drawBackdrop(camX, camY, level.height - VIEW_TILES, time);

    // Scenery behind everything that matters.
    for (const d of world.decor) {
      if (!inView(d.x, 3)) continue;
      if (d.kind === 'palm') {
        const h = 4 + (d.seed % 2);
        const trunk = palmTrunk(h);
        this.put(trunk, d.x, d.y);
        const lean = Math.sin((0.6 * (h * 3 - 0.5)) / (h * 3) * 2.2) * 0.22;
        this.putT(palmCrown(), d.x + lean, d.y - h + 0.15, Math.sin(time * 1.3 + d.seed) * 0.04);
      } else if (d.kind === 'fern') this.putT(fernSprite(), d.x, d.y, 0, 1 + Math.sin(time * 2 + d.seed) * 0.03, 1);
      else if (d.kind === 'tiki') this.put(tikiSprite(), d.x, d.y);
      else this.put(flowersSprite(), d.x, d.y);
    }

    this.drawTiles(world, cam, camX, camY);

    for (const p of world.platforms) {
      if (!inView(p.x, p.w)) continue;
      const s = logSprite(p.w);
      this.img(s.canvas, this.sx(p.x), this.sy(p.y - 0.05), s.w * ppt, s.h * ppt);
    }

    // Checkpoints (not the start) and the Party Popper.
    level.checkpoints.forEach((cp, i) => {
      if (i === 0 || !inView(cp.x)) return;
      this.put(checkpointSprite(i <= world.checkpoint), cp.x + 0.4, cp.y + PLAYER_H);
    });
    const g0 = level.goal;
    this.putT(popperSprite(world.won), g0.x + 0.5, g0.y, world.won ? 0 : Math.sin(time * 3) * 0.03);

    this.drawItems(world, time, inView);

    const st = starSprite();
    for (const s of world.stars) {
      if (s.got || !inView(s.x)) continue;
      const bob = s.homing ? 0 : Math.sin(time * 3 + s.i * 0.7) * 0.06;
      this.put(st, s.x, s.y + bob, 1 + Math.sin(time * 5 + s.i) * 0.05);
    }

    this.drawEnemies(world, time, inView);
    for (const b of world.balloons) {
      const s = balloon(b.kind);
      const rot = Math.sin(b.t * 3) * 0.12;
      const k = b.t < 0.15 ? 0.6 + b.t * 2.7 : 1;
      this.putT(s, b.x, b.y, rot, k);
      this.putT(grumblyFace('happy'), b.x + 0.02, b.y - 0.02, rot, k * 0.95);
    }

    this.drawPlayer(view);
    this.drawShots(world, time);
    this.drawParticles(view.particles);
  }

  drawTiles(world, cam, camX, camY) {
    const level = world.level;
    const grid = world.grid;
    const ppt = this.ppt;
    const kid = world.mode === 'kid';
    const c0 = Math.max(0, Math.floor(camX));
    const c1 = Math.min(level.width - 1, Math.floor(camX + cam.viewW) + 1);
    const r0 = Math.max(0, Math.floor(camY));
    const r1 = Math.min(level.height - 1, Math.floor(camY + cam.viewH) + 1);
    for (let cy = r0; cy <= r1; cy++) {
      const y0 = this.sy(cy);
      const y1 = this.sy(cy + 1);
      for (let cx = c0; cx <= c1; cx++) {
        const t = grid.tiles[cy * grid.w + cx];
        if (t === T.EMPTY) continue;
        const v = (hash(cx * 31 + cy * 7) * 3) | 0;
        let s;
        if (t === T.SOLID) {
          let depth = 0;
          while (depth < 3 && tileAt(grid, cx, cy - depth - 1) === T.SOLID) depth++;
          s = groundTile(depth === 0, !solidish(tileAt(grid, cx - 1, cy)), !solidish(tileAt(grid, cx + 1, cy)), depth, v);
        } else if (t === T.ONEWAY) s = bambooTile(tileAt(grid, cx - 1, cy) !== T.ONEWAY, tileAt(grid, cx + 1, cy) !== T.ONEWAY);
        else if (t === T.BRIDGE) s = bridgeTile();
        else if (t === T.BREAK) s = leafyTile(v % 2);
        else if (t === T.THORN) s = thornTile(kid);
        else s = flowerTile();
        const x0 = this.sx(cx);
        this.img(s.canvas, x0, y0, this.sx(cx + 1) - x0, y1 - y0);
      }
    }
  }

  drawItems(world, time, inView) {
    for (const it of world.items) {
      if (it.got || !inView(it.x)) continue;
      const bob = Math.sin(time * 3 + it.x) * 0.08;
      if (it.kind === 'gem') {
        this.put(glowSprite('#fff0a0'), it.x, it.y + bob, 0.9 + Math.sin(time * 4) * 0.12);
        this.putT(gemSprite(), it.x, it.y + bob, Math.sin(time * 2) * 0.08);
        if (Math.sin(time * 5 + it.x) > 0.8) this.put(sparkleSprite(1), it.x + 0.3, it.y - 0.3 + bob, 1.2);
      } else if (it.kind === 'heart') this.put(heartSprite(), it.x, it.y + bob, 1 + Math.sin(time * 6) * 0.06);
      else if (it.kind === 'giant') {
        this.put(glowSprite('#fff0a0'), it.x, it.y + bob, 0.8);
        this.putT(boneSprite(), it.x, it.y + bob, Math.sin(time * 2.5) * 0.15);
      } else if (it.kind === 'drop') {
        if (it.life < 2 && Math.floor(time * 10) % 2) continue;
        this.put(capsuleSprite(it.weapon), it.x, it.y + bob, 0.85);
      } else this.put(capsuleSprite(it.kind), it.x, it.y + bob);
    }
  }

  drawEnemies(world, time, inView) {
    const ppt = this.ppt;
    const g = this.g;
    for (const e of world.enemies) {
      if (!e.alive || !inView(e.cx)) continue;
      let a = this.anim.get(e);
      if (!a) {
        a = { squash: 1, step: 0, wing: 0, last: time };
        this.anim.set(e, a);
      }
      const dt = Math.min(0.05, time - a.last);
      a.last = time;
      const target = e.state === 'crouch' ? 0.72 : e.state === 'air' ? 1.15 : 1;
      a.squash += (target - a.squash) * Math.min(1, dt * 14);
      a.step += Math.abs(e.vx) * dt * 9;
      a.wing += dt * (e.state === 'wiggle' ? 60 : 28);
      const alert = e.state === 'alert' || e.state === 'wiggle' || e.state === 'hurry' || e.state === 'swoop';
      const wob = e.state === 'wiggle' ? Math.sin(time * 50) * 0.06 : 0;
      g.save();
      g.translate(this.sx(e.cx + wob), this.sy(e.y + e.h + (e.def.move === 'fly' ? 0.1 : 0)));
      g.scale(e.facing, 1);
      drawGrumbly(g, ppt, {
        kind: e.kind, mood: alert ? 'alert' : 'grumpy', squash: a.squash, step: a.step, wing: a.wing,
        cloudY: e.bubbled ? undefined : (e.kind === 'hopper' ? -1.2 : -1.4) + Math.sin(time * 2 + e.phase) * 0.05,
        flash: e.flash > 0,
      }, this.imgFn);
      g.restore();
      if (e.bubbled) this.putT(trapBubble(), e.cx, e.cy - 0.05, 0, 1 + Math.sin(time * 6) * 0.04, 1 - Math.sin(time * 6) * 0.04);
      if (e.state === 'alert' || e.state === 'wiggle') this.put(alertMark(), e.cx, e.y - 0.75 - Math.abs(Math.sin(time * 10)) * 0.1);
    }
  }

  drawPlayer(view) {
    const { world, pview: v, time } = view;
    const p = world.player;
    const g = this.g;
    const ppt = this.ppt;
    const footX = this.sx(p.x + p.w / 2);
    const footY = this.sy(p.y + p.h);
    const blinking = p.state === 'play' && p.invuln > 0 && p.turbo <= 0 && Math.floor(time * 16) % 2 === 0;
    if (p.turbo > 0) this.put(glowSprite('#fff0a0'), p.cx, p.y + 0.4, 1.4 + Math.sin(time * 12) * 0.1);
    if (!blinking) {
      g.save();
      g.translate(footX, footY);
      g.rotate(v.tilt);
      g.scale(v.sx * v.turn * v.giant, v.sy * v.giant);
      drawTurbo(g, ppt, v.pose, this.imgFn);
      g.restore();
    }
    const gun = p.gun;
    if (gun && gun.charging) {
      const k = Math.min(1, gun.charge / 0.7);
      this.put(glowSprite('#ffb13d'), p.cx + p.facing * 0.45, p.y + 0.45, 0.4 + k * 0.6 + Math.sin(time * 30) * 0.05);
    }
    if (p.shield > 0 && p.state !== 'rescue') this.put(bubbleSprite(), p.cx, p.y + p.h * 0.55, 0.9 * v.giant + Math.sin(time * 5) * 0.03);
    if (p.state === 'rescue') {
      const wob = Math.sin(time * 9) * 0.04;
      this.putT(bubbleSprite(), p.cx, p.y + 0.6, 0, 1.05 + wob, 1.05 - wob);
    }
    if (view.hint && p.waiting) this.put(hintArrow(), p.cx, p.y - 0.8 - Math.abs(Math.sin(time * 5)) * 0.35);
    if (view.idleHint) this.putT(hintArrow(), p.cx + p.facing * 1.4 + Math.abs(Math.sin(time * 5)) * 0.3 * p.facing, p.y + 0.4, (Math.PI / 2) * p.facing);
  }

  drawShots(world, time) {
    const pool = world.shots;
    for (let i = 0; i < pool.count; i++) {
      const s = pool.items[i];
      const sp = shotSprite(s.kind, s.big);
      const k = (s.r / 0.25) * (s.kind === 'pop' ? 0.9 : 1);
      if (s.kind === 'spread') this.putT(sp, s.x, s.y, time * 12, k * 0.8);
      else if (s.kind === 'bubble') this.put(sp, s.x, s.y, k * 0.95);
      else {
        // a short glowing trail behind each spark
        this.put(sp, s.x - s.vx * 0.025, s.y - s.vy * 0.025, k * 0.6);
        this.put(sp, s.x, s.y, k);
      }
    }
  }

  drawParticles(particles) {
    const g = this.g;
    const items = particles.pool.items;
    for (let i = 0; i < particles.pool.count; i++) {
      const p = items[i];
      const a = Math.min(1, p.life / (p.max * 0.5));
      let s;
      if (p.kind === 'dust') s = dustSprite();
      else if (p.kind === 'sparkle') s = sparkleSprite(p.variant);
      else if (p.kind === 'puff') s = puffSprite();
      else if (p.kind === 'leaf') s = leafSprite(p.variant);
      else if (p.kind === 'heart') s = heartBit();
      else if (p.kind === 'rainbow') s = rainbowSprite(p.variant);
      else s = confettiSprite(p.variant);
      g.globalAlpha = a;
      if (p.kind === 'confetti' || p.kind === 'leaf') this.putT(s, p.x, p.y, p.rot, p.size, p.size * Math.cos(p.rot * 1.7));
      else this.put(s, p.x, p.y, p.size);
    }
    g.globalAlpha = 1;
  }
}
