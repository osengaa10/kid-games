// The stress test: one minute of scripted chaos through every playground and every tool, at a
// fixed quality tier and full effects, timing every frame. The pass bar for an iPad is
// "95% of frames within 17.5 ms" on the high tier (steady 60 fps), and at least 30 fps on low.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Spots to hit in each playground (world coordinates), roughly where the action is.
const TARGETS = {
  tower: [[2, 3, 6], [-3, 2, 5.5], [5, 4, 3], [18, 6, -14], [-19, 8, 10], [-19, 10, -13], [0, 20, 6]],
  castle: [[19, 1, 2], [0, 10, 3], [16, 8, 16], [-16, 8, 16], [5, 6, 17], [0, 20, -3], [-16, 10, -16]],
  city: [[-11, 8, -9], [10, 8, -9], [12, 10, 9], [-13, 6, 11], [0, 4, 15], [0, 20, -22], [-8, 16, 4]],
};
const PLAN = ['meteor', 'meteor', 'ball', 'bomb', 'hammer', 'laser', 'meteor', 'bomb', 'meteor', 'ball', 'hammer', 'meteor'];

export async function runStress(game, seconds = 60) {
  const scenes = ['tower', 'castle', 'city', 'tower'];
  const per = (seconds * 1000) / scenes.length;
  game.stressing = true;
  let maxPieces = 0;
  let maxAwake = 0;
  let maxSpray = 0;
  const sample = setInterval(() => {
    maxPieces = Math.max(maxPieces, game.pieces.count);
    maxAwake = Math.max(maxAwake, game.pieces.awakeCount);
    maxSpray = Math.max(maxSpray, game.spray.count);
  }, 100);
  // Two and a half minutes of nobody touching the screen: ask for it to stay on, or Auto-Lock
  // can switch it off halfway (and a locked iPad stops drawing frames).
  let lock = null;
  try {
    lock = await navigator.wakeLock?.request('screen');
  } catch (e) {
    console.log('BOOMSTRESS-NOTE no wake lock:', e?.message);
  }
  console.log(`BOOMSTRESS-START ${game.quality.name} ${seconds}s, screen ${lock ? 'kept on' : 'may auto-lock'}`);
  const start = performance.now();
  const frameLog = [];
  game.onFrame = (ms, info) => frameLog.push({ ms, ...info });
  try {
    for (const id of scenes) {
      const index = game.sceneIndexOf(id);
      game.rebuild({ scene: index });
      await sleep(1700);
      const sceneStart = performance.now();
      let k = 0;
      while (performance.now() - sceneStart < per - 1700) {
        const tool = PLAN[k % PLAN.length];
        const [x, y, z] = TARGETS[id][k % TARGETS[id].length];
        k++;
        if (tool === 'laser') {
          game.selectTool('laser');
          const [sx, sy] = game.screenOf(x - 6, y, z);
          game.tool.press(sx, sy);
          for (let i = 0; i <= 30; i++) {
            const [mx, my] = game.screenOf(x - 6 + i * 0.4, y + Math.sin(i * 0.3) * 2, z);
            game.tool.move(mx, my);
            await sleep(33);
          }
          game.tool.release();
        } else {
          game.fire(tool, x, y, z);
          await sleep(700);
        }
      }
    }
  } finally {
    lock?.release?.().catch?.(() => {});
    clearInterval(sample);
    game.stressing = false;
    game.onFrame = null;
  }
  const s = frameLog.map((f) => f.ms).sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  const mean = (key) => frameLog.reduce((a, f) => a + (f[key] || 0), 0) / Math.max(1, frameLog.length);
  const p95 = (key) => {
    const v = frameLog.map((f) => f[key] || 0).sort((a, b) => a - b);
    return v[Math.floor(v.length * 0.95)] || 0;
  };
  // Where a frame's time goes: our physics, the rest of the destruction code, the loose single
  // blocks, telling the graphics chip what to draw, everything else we do; and what's left of the
  // frame after all our own work, which is the graphics chip (and the browser) catching up.
  const cpu = mean('cpu');
  const breakdown = {
    physics: mean('physics'),
    physicsP95: p95('physics'),
    destruction: mean('destruction'),
    spray: mean('spray'),
    draw: mean('draw'),
    other: Math.max(0, cpu - mean('physics') - mean('destruction') - mean('spray') - mean('draw')),
    cpu,
    cpuP95: p95('cpu'),
    graphics: Math.max(0, avg - cpu),
  };
  const perScene = {};
  for (const f of frameLog) {
    const k = f.scene || '?';
    (perScene[k] ||= []).push(f.ms);
  }
  for (const k of Object.keys(perScene)) perScene[k] = 1000 / (perScene[k].reduce((a, b) => a + b, 0) / perScene[k].length);
  return {
    seconds: Math.round((performance.now() - start) / 1000),
    frames: s.length,
    fps: 1000 / avg,
    avg,
    p95: s[Math.floor(s.length * 0.95)] || 0,
    worst: s[s.length - 1] || 0,
    good: s.filter((x) => x <= 17.5).length / Math.max(1, s.length),
    tier: game.quality.name,
    maxPieces,
    maxAwake,
    maxSpray,
    breakdown,
    perScene,
  };
}

// The speed check: what the graphics chip spends its time on. The castle stands still, the
// camera stays put, and the frame time is measured as it is and then with one costly thing
// switched off at a time. Standing still, our own code costs next to nothing, so what's left is
// the drawing. (A frame can't be shorter than the screen's 16.7 ms, so anything at that floor
// is already fast enough.)
export async function runProbe(game) {
  const { renderer, stage } = game;
  game.stressing = true;
  const frames = [];
  game.onFrame = (ms, info) => frames.push({ ms, cpu: info.cpu });
  const measure = async (settle) => {
    await sleep(settle);
    frames.length = 0;
    await sleep(1500);
    const n = Math.max(1, frames.length);
    const ms = frames.reduce((a, f) => a + f.ms, 0) / n;
    const cpu = frames.reduce((a, f) => a + f.cpu, 0) / n;
    return { ms: Math.round(ms * 10) / 10, graphics: Math.round((ms - cpu) * 10) / 10 };
  };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const tier = game.quality.tier;
  // Timed at each pixel ratio, with reflections and then without, and once without the shadow
  // pass: which mix holds 60 fps. Each sets its look outright; the first of each reflections
  // group waits longer, as the block shaders are rebuilt.
  const dpr = window.devicePixelRatio || 1;
  const ratios = [2, 1.75, 1.5, 1.25, 1].filter((r) => r <= dpr || r === 1);
  const tests = [['as is', () => game.resize(), 400]];
  for (const reflections of [true, false])
    for (const r of ratios) tests.push([`${r}x${reflections ? '' : ' no reflections'}`, () => stage.applyQuality({ ...tier, pixelRatio: r, reflections }, w, h), r === ratios[0] ? 2000 : 600]);
  tests.push([
    'no shadow pass',
    () => {
      game.resize();
      renderer.shadowMap.autoUpdate = false;
    },
    2000,
  ]);
  // The same as the first again: if the two differ a lot, something else was going on (the
  // iPad warming up, or leftovers of the stress test) and the numbers between need care.
  tests.push(['as is again', () => (renderer.shadowMap.autoUpdate = true), 400]);
  const out = { tier: tier.name, edgeSmoothing: renderer.getContextAttributes?.()?.antialias ?? null, pixels: [renderer.domElement.width, renderer.domElement.height], tests: {} };
  try {
    game.rebuild({ scene: game.sceneIndexOf('castle') });
    // Long enough for the build and any sparks, dust and crumbs from before to be gone.
    await sleep(6000);
    for (const [name, set, settle] of tests) {
      set();
      out.tests[name] = await measure(settle);
    }
  } finally {
    renderer.shadowMap.autoUpdate = true;
    game.resize();
    game.stressing = false;
    game.onFrame = null;
  }
  return out;
}
