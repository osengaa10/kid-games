import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../js/engine/camera.js';
import { LEVELS } from '../js/content/levels/index.js';
const greybox = LEVELS.greybox;
import { World } from '../js/game/world.js';
import { tuningFor } from '../js/game/tuning.js';
import { worldFrom, flat, settle, DT } from './helpers.js';

function inView(cam, p) {
  return p.x >= cam.x - 0.01 && p.x + p.w <= cam.x + cam.viewW + 0.01 && p.y >= cam.y - 0.01 && p.y + p.h <= cam.y + cam.viewH + 0.01;
}

test('a small jump does not move the camera up and down', () => {
  const w = worldFrom(flat(80, ['.'.repeat(80)]), { mode: 'kid' });
  settle(w);
  const cam = new Camera(12);
  cam.snap(w.player, w.level, 3);
  for (let i = 0; i < 60; i++) {
    w.step({ mx: 0, my: 0, jump: false, jumpPressed: false }, DT);
    cam.update(w.player, w.level, DT);
  }
  const y0 = cam.y;
  w.step({ mx: 0, my: 0, jump: true, jumpPressed: true }, DT);
  for (let i = 0; i < 50; i++) {
    w.step({ mx: 0, my: 0, jump: true, jumpPressed: false }, DT);
    cam.update(w.player, w.level, DT);
    assert.ok(Math.abs(cam.y - y0) < 1e-6, `camera moved to ${cam.y} (was ${y0})`);
  }
});

test('looks ahead the way Turbo is facing', () => {
  const w = worldFrom(flat(120), { mode: 'kid' });
  settle(w);
  const cam = new Camera(12);
  cam.setAspect(1180 / 820);
  cam.snap(w.player, w.level, 3);
  for (let i = 0; i < 240; i++) {
    w.step({ mx: 1, my: 0, jump: false, jumpPressed: false }, DT);
    cam.update(w.player, w.level, DT, { lookAhead: 3 });
  }
  const p = w.player;
  const at = (p.x + p.w / 2 - cam.x) / cam.viewW;
  assert.ok(at > 0.25 && at < 0.42, `Turbo sits ${(at * 100).toFixed(0)} % from the left`);
});

test('Turbo stays fully on screen for the whole greybox level (Auto-Go bot)', () => {
  for (const aspect of [1180 / 820, 1133 / 744, 4 / 3]) {
    const w = new World(greybox, { mode: 'kid', tune: tuningFor('kid'), autoGo: true });
    const cam = new Camera(12);
    cam.setAspect(aspect);
    cam.snap(w.player, w.level, 3);
    let hold = 0;
    for (let s = 0; s < 60 * 120 && !w.won; s++) {
      const press = w.player.waiting && hold === 0;
      if (press) hold = 18;
      w.step({ mx: 0, my: 0, jump: hold > 0, jumpPressed: press }, DT);
      if (hold > 0) hold--;
      cam.update(w.player, w.level, DT, { lookAhead: 3 });
      if (w.player.state === 'play') assert.ok(inView(cam, w.player), `off screen at x=${w.player.x.toFixed(1)}, y=${w.player.y.toFixed(1)}`);
    }
    assert.ok(w.won);
  }
});

test('stays inside the level', () => {
  const w = worldFrom(flat(40), { mode: 'dad' });
  settle(w);
  const cam = new Camera(12);
  cam.snap(w.player, w.level, 2.6);
  for (let i = 0; i < 200; i++) {
    w.step({ mx: -1, my: 0, jump: false, jumpPressed: false }, DT);
    cam.update(w.player, w.level, DT);
  }
  assert.ok(cam.x >= 0 && cam.x + cam.viewW <= w.level.width + 1e-9);
  assert.ok(cam.y + cam.viewH <= w.level.height + 1e-9);
});

test('shake fades out, and reduced motion turns it off', () => {
  const w = worldFrom(flat(40));
  settle(w);
  const cam = new Camera(12);
  cam.shake(1);
  cam.update(w.player, w.level, DT, { reducedMotion: true });
  assert.equal(cam.shakeX, 0);
  for (let i = 0; i < 120; i++) cam.update(w.player, w.level, DT);
  assert.equal(cam.trauma, 0);
  assert.equal(cam.shakeY, 0);
});
