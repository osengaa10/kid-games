// Test helpers: build worlds from tiny ASCII maps and drive Turbo with scripted input.
import { World } from '../js/game/world.js';
import { tuningFor } from '../js/game/tuning.js';
import { STEP } from '../js/engine/loop.js';

export const DT = STEP;

export function worldFrom(rows, { mode = 'kid', autoGo = false, tune = null } = {}) {
  const def = { id: 'test', sections: [{ rows }] };
  return new World(def, { mode, tune: tune || tuningFor(mode), autoGo });
}

export const idle = () => ({ mx: 0, my: 0, jump: false, jumpPressed: false });

// Runs `steps` steps; input(i, world) returns the input for step i.
export function run(world, steps, input) {
  for (let i = 0; i < steps; i++) world.step(input(i, world), DT);
}

// Lets Turbo fall onto the ground and settle.
export function settle(world, steps = 90) {
  run(world, steps, idle);
}

// A flat floor `width` wide with the start near the left; extra rows can go above it.
export function flat(width = 60, above = []) {
  const blank = '.'.repeat(width);
  const top = Array.from({ length: 10 - above.length }, () => blank);
  const start = '..S' + '.'.repeat(width - 3);
  const goal = '.'.repeat(width - 3) + '>..';
  return [...top, ...above, merge(start, goal), '#'.repeat(width), '#'.repeat(width)];
}

function merge(a, b) {
  let s = '';
  for (let i = 0; i < a.length; i++) s += a[i] !== '.' ? a[i] : b[i];
  return s;
}
