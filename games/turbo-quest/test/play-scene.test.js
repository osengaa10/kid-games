// The play and results scenes with a stand-in app (no canvas or sound), driven by fake fingers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayScene } from '../js/scenes/play.js';
import { ResultsScene } from '../js/scenes/results.js';
import { TouchControls, layoutControls } from '../js/engine/controls.js';
import { Input } from '../js/engine/input.js';
import { Store } from '../js/engine/save.js';
import { tuningFor } from '../js/game/tuning.js';
import { LEVELS } from '../js/content/levels/index.js';
import { DT } from './helpers.js';

const greybox = LEVELS.greybox;
const W = 1180;
const H = 820;

function fakeApp(scheme) {
  const controls = new TouchControls();
  const store = new Store(null);
  store.data.lastProfile = scheme === 'dad' ? 'dad' : 'kid';
  const app = {
    settings: { mode: scheme === 'dad' ? 'dad' : 'kid', autoGo: scheme === 'kidAuto', reducedMotion: false },
    tuneFor: (m) => tuningFor(m),
    w: W,
    h: H,
    controls,
    store,
    input: new Input(controls),
    quality: () => ({ particles: 1 }),
    results: null,
    pause() {},
    openSettings() {},
    showResults(scene, res) {
      this.results = res;
    },
  };
  app.layout = layoutControls(scheme, W, H);
  controls.setLayout(app.layout);
  return app;
}

const item = (app, id) => app.layout.items.find((i) => i.id === id);

// Runs the scene for `seconds`, one screen frame per step like the real loop.
function run(scene, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    scene.update(DT);
    scene.frame(DT);
  }
}

function nearGoal(scene) {
  const w = scene.world;
  w.player.x = w.level.goal.x - 3;
  w.player.y = w.level.goal.y - w.player.h;
}

for (const scheme of ['kid', 'dad']) {
  test(`${scheme}: forward held into the goal is let go by the results screen, and the next run starts still`, () => {
    const app = fakeApp(scheme);
    const scene = new PlayScene(app, greybox);
    nearGoal(scene);
    if (scheme === 'kid') {
      const r = item(app, 'right');
      scene.pointer('down', 1, r.cx, r.cy);
    } else {
      scene.pointer('down', 1, 200, 600);
      scene.pointer('move', 1, 270, 600);
    }
    run(scene, 4);
    assert.ok(app.results, 'reached the goal and asked for the results screen');
    const results = new ResultsScene(app, scene, app.results);
    results.enter();
    assert.equal(app.controls.held('right'), false, '▶ is not still held');
    assert.equal(app.controls.stick(), null, 'the stick is not still pushed');
    // The finger lifting later (on the results screen) changes nothing.
    results.pointer('up', 1, 0, 0);
    const next = new PlayScene(app, greybox);
    const x0 = next.world.player.x;
    run(next, 1);
    assert.ok(Math.abs(next.world.player.x - x0) < 0.01, `Turbo walked by himself: ${(next.world.player.x - x0).toFixed(2)} tiles`);
  });
}

test('the results are saved: stars, gems and stickers for this player', () => {
  const app = fakeApp('kid');
  const scene = new PlayScene(app, LEVELS['w1-1']);
  const res = { ...scene.world.results(), stars: 30, gems: [true, false, false], kinds: ['waddler'] };
  const results = new ResultsScene(app, scene, res);
  assert.deepEqual(results.saved.firstStickers, ['waddler']);
  assert.equal(app.store.profile('kid').stars, 30);
  assert.deepEqual(app.store.profile('kid').levels['w1-1'].gems, [true, false, false]);
});

test('a checkpoint saves where to resume', () => {
  const app = fakeApp('kid');
  let saved = null;
  app.saveResume = (r) => (saved = r);
  const scene = new PlayScene(app, LEVELS['w1-1']);
  // Just before the second section's checkpoint.
  const cp = scene.world.level.checkpoints[1];
  scene.world.player.reset(cp.x - 5, cp.y);
  const right = item(app, 'right');
  scene.pointer('down', 1, right.cx, right.cy);
  run(scene, 3);
  assert.ok(saved && saved.checkpoint >= 1 && saved.level === 'w1-1', JSON.stringify(saved));
});
