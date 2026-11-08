// Menu focus (keyboard / controller): the arrows move between buttons, A picks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MenuScene } from '../js/scenes/menu.js';
import { Input } from '../js/engine/input.js';

// A fake controller the Input can poll.
function withPad(state, fn) {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [state.pad] }, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    if (desc) Object.defineProperty(globalThis, 'navigator', desc);
    else delete globalThis.navigator;
  }
}
const pad = (pressed = [], x = 0, y = 0) => ({ connected: true, axes: [x, y], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });

class Grid extends MenuScene {
  constructor(app) {
    super(app);
    this.main = 'b';
    this.picked = [];
  }
  buttons() {
    return [
      { id: 'a', x: 100, y: 100, r: 30 },
      { id: 'b', x: 300, y: 100, r: 30 },
      { id: 'c', x: 500, y: 110, r: 30 },
      { id: 'd', x: 300, y: 400, r: 30 },
      { id: 'gear', x: 500, y: 400, r: 30, hold: 2 },
      { id: 'gone', x: 100, y: 400, r: 30, hidden: true },
    ];
  }
  choose(id) {
    this.picked.push(id);
  }
}

function setup() {
  const input = new Input(null);
  const app = { input, ui: {}, controls: { releaseAll() {} } };
  return { app, input, scene: new Grid(app) };
}

test('arrows move the focus to the nearest button that way, skipping hidden and hold buttons', () => {
  const { scene } = setup();
  scene.moveFocus(1, 0);
  assert.equal(scene.focus, 'c');
  scene.moveFocus(1, 0);
  assert.equal(scene.focus, 'c', 'nothing further right (the gear is hold-only)');
  scene.moveFocus(0, 1);
  assert.equal(scene.focus, 'd');
  scene.moveFocus(0, -1);
  assert.equal(scene.focus, 'b');
  scene.moveFocus(0, 1);
  scene.moveFocus(-1, 0);
  assert.equal(scene.focus, 'a', 'the hidden button straight left is skipped');
});

test('on the map, left and right walk the path in level order', async () => {
  const { MapScene } = await import('../js/scenes/map.js');
  const { ORDER } = await import('../js/content/levels/index.js');
  const prof = { unlocked: [...ORDER], levels: {}, resume: null, look: {}, id: 'kid' };
  const app = { w: 1180, h: 820, inApp: false, input: new Input(null), ui: {}, store: { profile: () => prof }, settings: { mode: 'kid' } };
  const map = new MapScene(app);
  map.focus = ORDER[0];
  map.moveFocus(1, 0);
  assert.equal(map.focus, ORDER[1]);
  map.moveFocus(1, 0);
  assert.equal(map.focus, ORDER[2]);
  map.moveFocus(-1, 0);
  assert.equal(map.focus, ORDER[1]);
});

test('the controller works in menus: d-pad moves, A picks the focused button', () => {
  const { app, input, scene } = setup();
  const state = { pad: pad() };
  withPad(state, () => {
    input.source = 'pad';
    scene.frame(1 / 60);
    assert.equal(app.ui.extra, 'b', 'the ring starts on the main button');
    state.pad = pad([15]); // d-pad right
    scene.frame(1 / 60);
    state.pad = pad();
    scene.frame(1 / 60);
    assert.equal(scene.focus, 'c');
    state.pad = pad([0]); // A
    scene.frame(1 / 60);
    assert.deepEqual(scene.picked, ['c']);
  });
});

test('pushing the stick past halfway is one press; holding it does not repeat', () => {
  const { input, scene } = setup();
  const state = { pad: pad([], -0.9, 0) };
  withPad(state, () => {
    scene.frame(1 / 60);
    scene.frame(1 / 60);
    scene.frame(1 / 60);
    assert.equal(scene.focus, 'a', 'one step left from b');
    state.pad = pad([], 0, 0);
    scene.frame(1 / 60);
    state.pad = pad([], 0.9, 0);
    scene.frame(1 / 60);
    assert.equal(scene.focus, 'b');
  });
  void input;
});

test('the ring is hidden while touch is in use', () => {
  const { app, input, scene } = setup();
  withPad({ pad: pad() }, () => {
    input.source = 'touch';
    scene.frame(1 / 60);
    assert.equal(app.ui.extra, '');
  });
});
