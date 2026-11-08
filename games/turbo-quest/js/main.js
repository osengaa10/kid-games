// Turbo Quest: boot, canvases, the game loop, screens and the app's lifecycle.
//
// Screens: title (who's playing) → level cards → playing ⇄ pause → results → level cards.
// URL flags for testing: ?level=w1-1 (or greybox) to jump straight in, ?mode=kid|dad (picks that
// player), ?auto=1 (Kid Auto-Go), ?debug (FPS overlay), ?tune (settings), ?stress, ?q=high|medium|low,
// ?card=1024 / ?icon=512 (draw the launcher card / the icon instead of the game).
import { Stepper, STEP, runFrames } from './engine/loop.js';
import { FrameStats } from './engine/stats.js';
import { attachPointers } from './engine/pointers.js';
import { TouchControls, layoutControls } from './engine/controls.js';
import { Input } from './engine/input.js';
import { unlockAudio, suspendAudio, setVolume } from './engine/audio.js';
import { setSpeechVolume, unlockSpeech } from './engine/speech.js';
import { music } from './engine/music.js';
import { spriteBytes, spriteCount } from './engine/sprites.js';
import { Store } from './engine/save.js';
import { tuningFor } from './game/tuning.js';
import { Renderer } from './render/renderer.js';
import { Ui } from './render/ui.js';
import { quality, stepDown, qualityForced, FrameWatch } from './render/quality.js';
import { PlayScene } from './scenes/play.js';
import { PauseScene } from './scenes/pause.js';
import { TitleScene } from './scenes/title.js';
import { MapScene } from './scenes/map.js';
import { ClosetScene } from './scenes/closet.js';
import { StickersScene } from './scenes/stickers.js';
import { ResultsScene } from './scenes/results.js';
import { StressScene } from './scenes/stress.js';
import { openSettings } from './dev/settings.js';
import { drawCardPage } from './card.js';
import { logRun, showStatsPage } from './dev/stats.js';
import { LabScene } from './scenes/lab.js';
import { LEVELS } from './content/levels/index.js';

const params = new URLSearchParams(location.search);
const TUNE_KEY = 'turbo-quest:tune';

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v && typeof v === 'object' ? v : fallback;
  } catch {
    return fallback;
  }
}

if (params.has('card') || params.has('icon')) drawCardPage(params);
else if (params.has('stats')) showStatsPage();
else boot();

function boot() {
  const store = new Store();
  const overrides = loadJSON(TUNE_KEY, {});
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Session-only overrides from the URL (they aren't saved).
  const session = {};
  if (params.get('mode') === 'dad' || params.get('mode') === 'kid') {
    store.data.lastProfile = params.get('mode');
    session.mode = params.get('mode');
  }
  if (params.has('auto')) session.autoGo = params.get('auto') !== '0';
  if (params.has('debug')) session.debug = true;

  const controls = new TouchControls();
  const input = new Input(controls);
  const stats = new FrameStats(600);
  const watch = new FrameWatch();
  const stepper = new Stepper();
  const stack = [];

  const app = {
    store,
    settings: {},
    tuneOverrides: { kid: overrides.kid || {}, dad: overrides.dad || {} },
    renderer: new Renderer(document.getElementById('world')),
    ui: new Ui(document.getElementById('ui')),
    controls,
    input,
    stepper,
    quality,
    w: 1,
    h: 1,
    dpr: 1,
    layout: null,
    panelOpen: false,
    inApp: !!window.Capacitor?.isNativePlatform?.(),
    debugText: '',
    debugLines: [],

    get top() {
      return stack[stack.length - 1];
    },
    get playScene() {
      return stack.find((s) => s instanceof PlayScene) || null;
    },
    tuneFor(mode) {
      return tuningFor(mode, this.tuneOverrides[mode]);
    },
    scheme() {
      return this.settings.mode === 'dad' ? 'dad' : this.settings.autoGo ? 'kidAuto' : 'kid';
    },
    controlsVisible() {
      return input.source !== 'key' && input.source !== 'pad';
    },
    // The settings in use: this player's, the device's, and any URL overrides.
    syncSettings() {
      const p = store.profile(store.data.lastProfile || 'kid');
      const g = store.data.settings;
      Object.assign(this.settings, {
        profile: p.id, mode: p.mode, autoGo: p.autoGo, autoFire: p.autoFire, aimAssist: p.aimAssist !== false,
        leftHanded: p.leftHanded, bigButtons: p.bigButtons, debug: g.debug, reduceFlash: g.reduceFlash,
        reducedMotion: g.reducedMotion ?? systemReduced, ...session,
      });
      setVolume('music', g.music);
      setVolume('sfx', g.sfx);
      setSpeechVolume(this.settings.mode === 'kid' ? g.voice : 0);
    },
    relayout() {
      this.layout = layoutControls(this.scheme(), this.w, this.h, { leftHanded: this.settings.leftHanded, big: this.settings.bigButtons, abilities: { turbo: true } });
      controls.setLayout(this.layout);
      this.ui.sig = '';
    },
    // Something changed in settings. `playerChanged`: a different player or mode was picked.
    applySettings(playerChanged = false) {
      const before = { profile: this.settings.profile, mode: this.settings.mode };
      if (playerChanged) {
        delete session.mode;
        delete session.autoGo;
      }
      store.save();
      try {
        localStorage.setItem(TUNE_KEY, JSON.stringify(this.tuneOverrides));
      } catch {
        /* not fatal */
      }
      this.syncSettings();
      this.relayout();
      const play = this.playScene;
      if (play && playerChanged && before.profile !== this.settings.profile) this.showMap();
      else if (play && play.world.mode !== this.settings.mode) {
        // A new mode starts from the last checkpoint (not mid-jump).
        play.build(play.world.resumeData());
        if (this.top instanceof PauseScene) this.resume();
      } else for (const s of stack) s.applySettings?.();
    },
    resize,
    pause() {
      const top = this.top;
      if (!(top instanceof PlayScene) || top.winTimer >= 0) return;
      this.saveResume(top.world.resumeData());
      stack.push(new PauseScene(this, top));
      this.top.enter();
    },
    resume() {
      if (this.top instanceof PauseScene) stack.pop();
      controls.releaseAll();
      input.flush();
      stepper.reset();
      this.ui.sig = '';
    },
    openSettings() {
      openSettings(this);
    },
    setScene(s) {
      // Leaving a level part way through goes in the playtest log too (where he stops matters).
      const play = this.playScene;
      if (play && !play.world.won && play.world.time > 5) logRun(play.world, store.data.lastProfile || 'kid');
      stack.length = 0;
      stack.push(s);
      music.setTurbo(false);
      controls.releaseAll();
      input.flush();
      this.ui.sig = '';
      s.enter?.();
    },
    showTitle() {
      this.setScene(new TitleScene(this));
    },
    showMap() {
      this.setScene(new MapScene(this));
    },
    showCloset() {
      this.setScene(new ClosetScene(this));
    },
    showStickers() {
      this.setScene(new StickersScene(this));
    },
    chooseProfile(id) {
      store.choose(id);
      this.applySettings(true);
      this.showMap();
    },
    startLevel(id, resume = null) {
      this.setScene(new PlayScene(this, LEVELS[id] || LEVELS['w1-1'], { resume }));
    },
    showResults(playScene, res) {
      logRun(playScene.world, store.data.lastProfile || 'kid');
      const r = new ResultsScene(this, playScene, res);
      stack.push(r);
      r.enter();
    },
    startStress() {
      this.setScene(new StressScene(this));
    },
    saveResume(r) {
      if (r && r.level !== 'greybox' && r.level !== 'stress') store.setResume(store.data.lastProfile || 'kid', r);
    },
    saveNow() {
      const p = this.playScene;
      if (p && !p.world.won) this.saveResume(p.world.resumeData());
      store.flush();
    },
  };

  // Fingers go to whatever is on top.
  attachPointers({
    down(id, x, y) {
      unlockAudio();
      unlockSpeech();
      input.setSource('touch');
      app.top?.pointer('down', id, x, y);
    },
    move(id, x, y) {
      app.top?.pointer('move', id, x, y);
    },
    up(id, x, y) {
      app.top?.pointer('up', id, x, y);
    },
    cancelAll() {
      controls.releaseAll();
    },
  });
  input.onSourceChange = () => (app.ui.sig = '');
  window.addEventListener('keydown', (e) => {
    unlockAudio();
    if (e.code === 'Backquote' && !app.panelOpen) app.openSettings();
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    app.w = w;
    app.h = h;
    app.dpr = dpr;
    const q = quality();
    app.renderer.resize(w, h, Math.min(dpr, q.scale), q.layers);
    app.ui.resize(w, h, Math.min(dpr, 2));
    app.relayout();
    for (const s of stack) s.resized?.();
    // Held upright: the "turn me sideways" picture shows (CSS), and the game waits.
    if (h > w) app.pause();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // Going to the background: pause (it stays paused until ▶ is tapped), stop the sound, save.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    app.pause();
    app.saveNow();
    suspendAudio();
    controls.releaseAll();
  });
  window.addEventListener('pagehide', () => app.saveNow());
  navigator.storage?.persist?.().catch(() => {});

  app.syncSettings();
  resize();
  if (params.has('stress')) app.startStress();
  else if (params.has('lab')) app.setScene(new LabScene(app));
  else if (params.has('level')) {
    if (!store.data.lastProfile) store.data.lastProfile = 'kid';
    app.syncSettings();
    app.relayout();
    app.startLevel(params.get('level'));
  } else app.showTitle();
  if (params.has('tune')) app.openSettings();

  let debugAt = 0;
  runFrames((now, elapsed) => {
    stats.add(elapsed);
    if (!app.panelOpen) {
      const n = stepper.advance(elapsed);
      for (let i = 0; i < n; i++) app.top.update(STEP);
    } else stepper.reset();
    app.top.frame?.(elapsed);
    if (app.settings.debug && now - debugAt > 250) {
      debugAt = now;
      updateDebug(app, stats);
    }
    app.top.render();
    app.top.overlay?.();
    // Slow for a while: drop the quality one step (and remember it).
    if (watch.add(elapsed) && !qualityForced() && app.top.allowQualityStep !== false && stepDown()) {
      resize();
      watch.reset();
    }
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (params.has('debug') || params.has('test')) window.__tq = app; // for poking at in the console and for test scripts
}

function updateDebug(app, stats) {
  const s = stats.summary();
  const q = app.quality();
  const r = app.renderer;
  const top = app.playScene;
  const w = top && top.world;
  app.debugLines = [
    `FPS ${s.fps.toFixed(1)}   avg ${s.avg.toFixed(1)} ms`,
    `p95 ${s.p95.toFixed(1)}   worst ${s.worst.toFixed(1)} ms`,
    `≤17.5 ms: ${(s.good * 100).toFixed(1)} %  (${s.frames} frames)`,
    `tier ${q.name}  ${r.canvas.width}×${r.canvas.height}`,
    `draws ${r.draws}   particles ${top ? top.particles.count : 0}`,
    `sprites ${spriteCount()}  ${(spriteBytes() / 1048576).toFixed(1)} MB`,
    w ? `${app.scheme()}  ★${w.starsGot}/${w.starsTotal}  hits ${w.hits}  rescues ${w.rescues}` : app.top.constructor.name,
  ];
  app.debugText = app.debugLines.join('|');
}
