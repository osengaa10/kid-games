// Boom Blocks: a toy-block playground where the only goal is to smash everything.
//
// URL flags for grown-ups and testing:
//   ?stats        frame-time overlay        ?q=high|medium|low   force a quality tier
//   ?scene=<id>   start on a playground     ?seed=<n>            fixed crack patterns
//   ?debug        window.__bb for scripted testing
//   ?fx=full      effects at full strength no matter how slow (screenshots)
//   ?stress       run the 1-minute stress test on load and print the result
// The grown-up panel (hold the sound button 2 s) has stats, quality, calm mode and the stress test.
import * as THREE from '../vendor/three.module.min.js';
import { createStage } from './render/stage.js';
import { createIsland } from './render/island.js';
import { StaticVoxels, DebrisVoxels } from './render/voxels.js';
import { blockUniforms, WAVES } from './render/blockMaterial.js';
import { Grid, RES } from './core/grid.js';
import { Structure } from './core/connect.js';
import { SCENES, sceneById, buildScene } from './core/scenes/index.js';
import { rng, newSeed, hash01 } from './core/rng.js';
import { Combo, COMBO_TIERS } from './core/combo.js';
import { MATERIALS, MAT } from './core/materials.js';
import { loadRapier, Physics } from './physics/world.js';
import { Pieces } from './physics/pieces.js';
import { Fx, sunDirFrom } from './fx/effects.js';
import { Destruction } from './destruction.js';
import { Quality, FrameWatch, Governor, FrameStats } from './quality.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import * as audio from './audio.js';
import * as sfx from './sfx.js';
import { Meteor } from './tools/meteor.js';
import { WreckingBall } from './tools/wreckingBall.js';
import { Laser } from './tools/laser.js';
import { Bomb } from './tools/bomb.js';
import { Hammer } from './tools/hammer.js';
import { Cannon } from './tools/cannon.js';
import { Tornado } from './tools/tornado.js';
import { Dynamite } from './tools/dynamite.js';
import { GrownUpPanel } from './dev/panel.js';
import { Balloons } from './fx/balloons.js';
import { setting } from './settings.js';

const params = new URLSearchParams(location.search);

// The loading screen's slots (index.html), and a pause that lets it actually get drawn.
// Each step's time is kept in window.bbBoot, for checking how long start-up takes.
const boot = (window.bbBoot = []);
const progress = (n) => {
  boot.push([n, Math.round(performance.now())]);
  window.bbProgress?.(n);
};
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const STEP = 1 / 60;
const MAX_STEP = 1 / 30;
// Most little blocks a playground can have (each scene unit is 2×2×2 of them).
const MAX_BLOCKS = 60000;
// Little blocks per old-size block, for anything sized by block count.
const PER = RES * RES * RES;

class Game {
  async start() {
    progress(2);
    await nextPaint();
    this.canvas = document.getElementById('view');
    this.quality = new Quality();
    const pref = setting('quality', 'auto');
    if (pref !== 'auto' && !this.quality.locked) this.quality.set(pref, true);
    // A copy: stepping down a tier changes this, never the tier table itself.
    this.budget = { ...this.quality.tier };
    const stage = createStage(this.canvas);
    Object.assign(this, { renderer: stage.renderer, scene: stage.scene, camera: stage.camera, sun: stage.sun, stage });
    this.island = createIsland(this.scene);
    this.rig = new CameraRig(this.camera);
    this.grid = new Grid();
    this.structure = new Structure(this.grid);
    this.statics = new StaticVoxels(this.scene, MAX_BLOCKS, this.grid.size);
    // Room to draw every block of a playground loose at once (plus the dominoes and crates), so
    // nothing ever has to vanish for lack of space. Only the used part is drawn.
    this.debris = new DebrisVoxels(this.scene, MAX_BLOCKS + 12000);
    this.fx = new Fx(this.scene, this.camera, this.budget, sunDirFrom(this.sun));
    this.combo = new Combo();
    this.stats = new FrameStats();
    this.watch = new FrameWatch();
    this.governor = new Governor();
    this.time = 0;
    this.real = 0;
    this.acc = 0;
    this.buildStart = -100;
    this.waveIndex = 0;
    this.seed = params.has('seed') ? Number(params.get('seed')) : newSeed();
    this.rand = rng(this.seed);
    this.sceneIndex = Math.max(0, SCENES.indexOf(sceneById(params.get('scene'))));
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.proj = new THREE.Vector3();
    this.idle = 0;
    this.touched = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => {
      this.resize();
      setTimeout(() => this.resize(), 250);
    });

    progress(3);
    await nextPaint();
    const R = await loadRapier();
    progress(4);
    await nextPaint();
    this.physics = new Physics(R);
    this.pieces = new Pieces(this.physics, this.debris, this.budget);
    this.destruction = new Destruction(this);
    this.pieces.on = {
      shatter: (p, dv) => this.destruction.shatters.push([p, dv]),
      land: (p, dv) => {
        const t = p.body.translation();
        const eq = p.n / PER;
        sfx.land(eq, MATERIALS[p.main].sound, this.panOf(t), Math.min(1, dv / 20));
        if (eq >= 20) this.fx.landing(t.x, t.y, t.z, eq, p.colors[0]);
      },
      splash: (p) => {
        const t = p.body.translation();
        this.fx.splash(t.x, t.z);
        sfx.splash(this.panOf(t));
      },
      poof: (p) => {
        const t = p.body.translation();
        this.fx.poof(t.x, t.y, t.z, p.colors[0]);
      },
      // A little flying bit turned to crumbs (too many pieces moving at once).
      crumble: (p) => {
        this.pieces.eachBlock(p, (x, y, z, k) => this.fx.crumble(x, y, z, p.colors[k], p.mats[k], x, y - 0.5, z, 0.25));
      },
      // A TNT crate that gets knocked over goes off.
      knocked: (p) => {
        if (!p.mats.includes(MAT.TNT)) return;
        const t = p.body.translation();
        const at = { x: t.x, y: t.y, z: t.z };
        this.destruction.timers.push({ at: this.time + 0.3, run: () => this.tnt(at.x, at.y, at.z, 14 * PER) });
        this.fuse(at.x, at.y, at.z, 0.3);
        this.destruction.timers.push({ at: this.time + 0.29, run: () => this.pieces.remove(p) });
      },
    };

    this.balloons = new Balloons(this);
    this.tools = {
      meteor: new Meteor(this),
      ball: new WreckingBall(this),
      laser: new Laser(this),
      bomb: new Bomb(this),
      hammer: new Hammer(this),
      cannon: new Cannon(this),
      tornado: new Tornado(this),
      dynamite: new Dynamite(this),
    };
    this.toolId = 'meteor';
    this.ui = new UI(document.getElementById('hud'), {
      tools: Object.keys(this.tools),
      scenes: SCENES.map((s) => s.icon),
      onTool: (id) => this.selectTool(id),
      onRebuild: () => this.rebuild(),
      onSound: () => {
        audio.unlock();
        audio.setMuted(!audio.isMuted());
        this.ui.setSound(!audio.isMuted());
        sfx.tap();
      },
      onPickScene: (i) => {
        sfx.tap();
        this.rebuild({ scene: i });
      },
      onPlunger: () => this.tools.dynamite.detonate(),
      onGames: () => {
        sfx.tap();
        location.href = '../../index.html';
      },
      onGrownUp: () => this.panel.open(),
    });
    this.ui.setInApp(!!window.Capacitor?.isNativePlatform?.());
    this.ui.selectTool(this.toolId);

    this.input = new Input(this.canvas, {
      any: () => {
        audio.unlock();
        this.idle = 0;
        this.touched = true;
        this.ui.showHand(null);
      },
      down: (x, y) => {
        // A tap on the playground while the playground picker is open just closes it.
        if (this.ui.pickerOpen) {
          this.ui.closePicker();
          this.gesture = { x, y, orbit: false, skip: true };
          return;
        }
        this.gesture = { x, y, orbit: false };
        this.tool.press(x, y);
      },
      move: (x, y, moved, dx, dy) => {
        if (this.gesture?.skip) return;
        const t = this.tool;
        if (t.dragOrbits) {
          if (!this.gesture.orbit && moved > 14) {
            this.gesture.orbit = true;
            t.cancel();
          }
          if (this.gesture.orbit) this.rig.orbit(dx, dy);
        } else t.move(x, y);
      },
      up: (x, y) => {
        if (!this.gesture?.skip) this.tool.release(x, y);
      },
      cancel: () => this.tool.cancel(),
      orbit: (dx, dy) => this.rig.orbit(dx, dy),
      zoom: (f) => this.rig.zoom(f),
    });
    window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audio.suspend();
      else this.last = performance.now();
    });
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      document.body.classList.add('lost');
    });
    this.canvas.addEventListener('webglcontextrestored', () => location.reload());

    this.panel = new GrownUpPanel(this);
    this.statsEl = document.getElementById('stats');
    this.setStats(params.has('stats') || setting('stats', false));
    this.setCalm(setting('calm', false));
    if (params.has('debug') || params.has('stats') || params.has('stress')) window.__bb = this.debugApi();

    this.rebuild({ first: true });
    progress(5);
    await nextPaint();
    await this.warmUp();
    progress(6);
    await nextPaint();
    // Start the build drop-in now, as the loading screen fades.
    this.buildStart = this.time;
    document.body.classList.add('ready');
    this.last = performance.now();
    const loop = (t) => {
      this.frame(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (params.has('stress')) await this.panel.runOne();
    else await this.panel.resume();
  }

  // Compiles every shader now, behind the loading screen, so the first meteor or bomb doesn't
  // stall for a moment while the iPad builds its effect shaders.
  async warmUp() {
    const { meteor, ball, hammer, bomb } = this.tools;
    const m = meteor.take();
    m.busy = false;
    ball.balls.push(ball.make());
    hammer.pool.push(hammer.make());
    const bombMesh = new THREE.Mesh(bomb.geo, new THREE.MeshStandardMaterial({ color: 0x2b2f45, emissive: 0xff2020 }));
    this.scene.add(bombMesh);
    this.balloons.release(0, -50, 0, 1);
    const shown = [];
    this.scene.traverse((o) => {
      if (!o.visible) {
        o.visible = true;
        shown.push(o);
      }
    });
    try {
      // In the background where the browser can, so the loading screen keeps moving.
      if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
    } catch (e) {
      console.warn('warm-up', e);
    }
    for (const o of shown) o.visible = false;
    // The tool props made just for compiling go back out of sight until they're used.
    m.rock.visible = m.ring.visible = false;
    for (const b of ball.balls) b.ball.visible = b.chain.visible = b.hook.visible = false;
    this.scene.remove(bombMesh);
    this.balloons.clear();
  }

  setStats(on) {
    this.statsOn = on;
    this.statsEl.textContent = '';
    this.statsEl.classList.toggle('hidden', !on);
  }

  setCalm(on) {
    this.fx.calm = on;
    this.fx.shake.calm = on;
  }

  // 'auto' (start high, step down when slow) or a fixed tier. Particle field sizes stay as they
  // were until the next launch; everything else changes now.
  setQuality(v) {
    if (v === 'auto') {
      this.quality.locked = false;
      this.quality.set('high');
    } else this.quality.set(v, true);
    Object.assign(this.budget, this.quality.tier);
    this.watch.reset();
    this.resize();
  }

  sceneIndexOf(id) {
    return Math.max(0, SCENES.findIndex((s) => s.id === id));
  }

  // Fires a tool straight at a world point (testing, stress test).
  fire(tool, x, y, z) {
    const t = this.tools[tool];
    if (!t) return;
    if (this.toolId !== tool) this.selectTool(tool);
    const hit = { x, y, z, nx: 0, ny: 1, nz: 0 };
    if (t.launch) t.launch(hit);
    else if (t.swing) t.swing(hit);
    else if (t.drop) t.drop(hit);
    else if (t.smash) t.smash(hit);
    else if (t.strike) t.strike(hit);
  }

  screenOf(x, y, z) {
    this.proj.set(x, y, z).project(this.camera);
    return [((this.proj.x + 1) / 2) * window.innerWidth, ((1 - this.proj.y) / 2) * window.innerHeight];
  }

  get tool() {
    return this.tools[this.toolId];
  }

  selectTool(id) {
    if (!this.tools[id]) return;
    this.tool.cancel();
    this.tool.deselect?.();
    this.toolId = id;
    this.tool.select?.();
    this.ui.selectTool(id);
    sfx.tap();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.stage.applyQuality(this.quality.tier, w, h);
    this.rig.resize(w, h);
  }

  // ----- building -----

  rebuild({ first = false, scene = null } = {}) {
    if (scene !== null) this.sceneIndex = scene;
    const def = SCENES[this.sceneIndex];
    // A second tap while it's still building just finishes it.
    if (!first && scene === null && this.time - this.buildStart < 1.6 && this.destruction.wrecked < 0.02) {
      this.buildStart = this.time - 10;
      return;
    }
    // Everything loose pops away in a puff.
    let k = 0;
    for (const p of this.pieces.list) {
      if (k++ > 40) break;
      const t = p.body.translation();
      this.fx.poof(t.x, t.y, t.z, p.colors[0]);
    }
    this.pieces.clear();
    this.balloons.clear();
    for (const t of Object.values(this.tools)) {
      t.cancel?.();
      t.cancelAll?.();
    }
    if (!params.has('seed')) this.seed = newSeed();
    this.rand = rng(this.seed);
    const b = buildScene(this.grid, def, this.seed);
    this.gifts = b.gifts;
    this.physics.setStatic(this.grid);
    this.spawnProps(b.props);
    const top = Math.max(1, this.grid.top - 1);
    // Blocks drop in bottom layer first, with a little scatter, over about a second and a half.
    this.statics.fill(this.grid, (c) => (this.grid.cy(c) / top) * 1.0 + hash01(c, this.seed) * 0.28);
    this.buildStart = this.time;
    this.plinks = 0;
    this.destruction.reset(this.grid.count);
    this.combo.reset();
    this.rig.frame(def.camera, first);
    this.ui.setScene(this.sceneIndex, def.icon);
    this.ui.wrecked(0);
    if (!first) sfx.whoosh();
  }

  // If the physics engine ever fails mid-step, its world can't be used again. Rather than
  // freezing, start a fresh world from the blocks still standing; loose pieces vanish in a puff.
  recoverPhysics(err) {
    console.warn('physics reset', err);
    for (const p of this.pieces.list.slice(0, 40)) {
      try {
        this.fx.poof(p.body.translation().x, p.body.translation().y, p.body.translation().z, p.colors[0]);
      } catch {
        // the old world can't even tell us where they were
      }
    }
    this.physics = new Physics(this.physics.R);
    this.physics.setStatic(this.grid);
    this.pieces.forget(this.physics);
    for (const t of Object.values(this.tools)) t.physicsReset?.();
    this.acc = 0;
  }

  // Loose things placed in the scene (dominoes, crates): asleep until something knocks them.
  // Their cells are in scene units; each becomes RES×RES×RES little blocks.
  spawnProps(props) {
    for (const { cells: units, center, yaw } of props) {
      const h = yaw / 2;
      const cells = [];
      for (const [x, y, z, m, c] of units)
        for (let dy = 0; dy < RES; dy++) for (let dz = 0; dz < RES; dz++) for (let dx = 0; dx < RES; dx++) cells.push([x * RES + dx, y * RES + dy, z * RES + dz, m, c]);
      this.pieces.spawn(
        { xs: cells.map((c) => c[0]), ys: cells.map((c) => c[1]), zs: cells.map((c) => c[2]), mats: cells.map((c) => c[3]), colors: cells.map((c) => c[4]) },
        { px: center[0], py: center[1], pz: center[2], q: { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) } },
        {},
        { kind: 'prop', asleep: true },
      );
    }
  }

  // ----- what tools and the destruction code call -----

  // The point under a screen position: { x, y, z, nx, ny, nz, water? } or null.
  aim(sx, sy) {
    this.ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const o = this.raycaster.ray.origin;
    const d = this.raycaster.ray.direction;
    const hit = this.physics.cast(o.x, o.y, o.z, d.x, d.y, d.z, 600);
    if (hit) return hit;
    // Missed the island: aim at the sea.
    if (d.y < -0.01) {
      const t = (-3 - o.y) / d.y;
      return { x: o.x + d.x * t, y: -3, z: o.z + d.z * t, nx: 0, ny: 1, nz: 0, water: true };
    }
    return null;
  }

  // Stereo pan (-1..1) for a world point, from where it is on screen.
  panOf(x, y, z) {
    if (typeof x === 'object') ({ x, y, z } = x);
    this.proj.set(x, y, z).project(this.camera);
    return Math.max(-1, Math.min(1, this.proj.x * 0.8));
  }

  // A shockwave ring rolling through the standing blocks (they jiggle as it passes).
  wave(x, z, amp = 1) {
    if (!this.budget.wobble) return;
    blockUniforms.uWaves.value[this.waveIndex].set(x, z, this.time, amp);
    this.waveIndex = (this.waveIndex + 1) % WAVES;
  }

  // Blocks broke: count them toward the combo and the celebration.
  onBroke(n, x, y, z) {
    const tier = this.combo.add(n, this.time);
    if (tier) {
      sfx.comboUp(tier);
      this.fx.confetti(x, y + 2, z, 40 + tier * 30, 16);
      this.ui.bumpCombo();
      if (tier >= 2) this.fx.shake.add(0.15);
    }
    // A huge chain reaction goes into slow motion for a moment.
    if (this.combo.rate(this.time) > 2600 && !this.slowUntil) {
      this.fx.time.slowMo(0.8, 0.45);
      this.slowUntil = this.time + 4;
    }
  }

  // A crate of n (little) TNT blocks goes off: bigger crates, bigger bangs.
  tnt(x, y, z, little = PER) {
    const n = little / PER;
    const power = Math.min(1.3, 0.55 + n * 0.07);
    this.destruction.impact({ x, y, z, radius: Math.min(5.2, 2.6 + n * 0.3), power });
    this.fx.blast(x, y, z, power);
    this.pieces.blast(x, y, z, 10 + n, 8, 0.9);
    this.blastNear(x, y, z, 8 + n * 0.3);
    this.wave(x, z, power);
    sfx.boom(power, this.panOf(x, y, z));
  }

  // Bombs and dynamite near a blast go off almost at once (chain reactions).
  blastNear(x, y, z, radius) {
    this.tools.bomb?.nudge(x, y, z, radius);
    this.tools.dynamite?.nudge(x, y, z, radius);
  }

  // A lit fuse: sparks fizzing on the crate until it blows.
  fuse(x, y, z, seconds) {
    const end = this.time + seconds;
    const fizz = () => {
      if (this.time > end) return;
      this.fx.sparkBurst(x, y + 1.2, z, 3, 6, { up: 0.9, life: 0.35, size: 0.25 });
      this.destruction.timers.push({ at: this.time + 0.05, run: fizz });
    };
    fizz();
    sfx.fizz(seconds, this.panOf(x, y, z));
  }

  // A gift block popped open: what's inside depends on the scene's gift (fireworks, treasure or
  // balloons), always with a burst of confetti and a happy jingle.
  surprise(x, y, z) {
    const gift = this.gifts?.find((g) => Math.hypot(g.x + 0.5 - x, g.y + 0.5 - y, g.z + 0.5 - z) < 1.5);
    // A gift is several little blocks: only the first one to break opens it.
    if (gift) {
      if (gift.opened) return;
      gift.opened = true;
    }
    const kind = gift?.kind || 'fireworks';
    this.fx.confetti(x, y, z, 160, 20, { up: 0.9 });
    this.fx.embers(x, y, z, 30, 10);
    sfx.sparkle(this.panOf(x, y, z));
    sfx.fanfare();
    if (kind === 'treasure') return this.treasure(x, y, z);
    if (kind === 'balloons') return this.balloons.release(x, y, z, 9);
    // Fireworks over it.
    for (let i = 0; i < 4; i++) {
      this.destruction.timers.push({
        at: this.time + 0.35 + i * 0.3,
        run: () => {
          const fx = x + (Math.random() - 0.5) * 16;
          const fy = y + 12 + Math.random() * 10;
          const fz = z + (Math.random() - 0.5) * 16;
          const colors = [[1, 0.3, 0.6], [0.3, 0.8, 1], [1, 0.85, 0.2], [0.6, 1, 0.4], [0.8, 0.4, 1]];
          const c = colors[Math.floor(Math.random() * colors.length)];
          this.fx.sparkBurst(fx, fy, fz, 90, 16, { up: 0, colors: [c, [1, 1, 1]], life: 1.2, size: 0.4 });
          this.fx.bursts.star(fx, fy, fz, 3, 0xffffff, { calm: true });
          sfx.boom(0.25, this.panOf(fx, fy, fz));
        },
      });
    }
  }

  // A fountain of gems bouncing out over a second and a half, each burst with a ding.
  treasure(x, y, z) {
    for (let i = 0; i < 6; i++)
      this.destruction.timers.push({
        at: this.time + i * 0.22,
        run: () => {
          this.fx.gems(x, y + 0.5, z, 26);
          sfx.ding(i, this.panOf(x, y, z));
        },
      });
  }

  // Nearly everything is wrecked: a party.
  celebrate() {
    sfx.fanfare();
    const cam = this.camera.position;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize();
    const back = new THREE.Vector3(cam.x, 0, cam.z).normalize();
    for (const side of [-1, 1]) {
      const x = right.x * side * 28 + back.x * 20;
      const z = right.z * side * 28 + back.z * 20;
      for (let k = 0; k < 3; k++)
        this.destruction.timers.push({ at: this.time + k * 0.25, run: () => this.fx.confetti(x, 1, z, 110, 26, { up: 0.95 }) });
    }
    for (let i = 0; i < 6; i++)
      this.destruction.timers.push({
        at: this.time + 0.4 + i * 0.35,
        run: () => {
          const fx = (Math.random() - 0.5) * 50;
          const fz = (Math.random() - 0.5) * 50;
          const fy = 30 + Math.random() * 15;
          const hue = [[1, 0.35, 0.5], [0.3, 0.8, 1], [1, 0.85, 0.2], [0.6, 1, 0.4], [0.8, 0.4, 1]][i % 5];
          this.fx.sparkBurst(fx, fy, fz, 140, 20, { up: 0, colors: [hue, [1, 1, 1]], life: 1.4, size: 0.45 });
          sfx.boom(0.3, this.panOf(fx, fy, fz));
        },
      });
  }

  // ----- the loop -----

  frame(nowMs) {
    const t0 = performance.now();
    const dtReal = Math.min(0.1, Math.max(0, (nowMs - this.last) / 1000));
    this.last = nowMs;
    this.real += dtReal;
    this.stats.add(dtReal * 1000);
    if (!this.stressing && this.watch.add(dtReal) && this.quality.stepDown()) {
      this.budget = Object.assign(this.budget, this.quality.tier);
      this.resize();
      this.watch.reset();
    }
    this.fx.intensity = params.get('fx') === 'full' || this.stressing ? 1 : this.governor.add(dtReal);
    // When frames run long the physics gets fewer moving pieces to juggle too (it's the biggest
    // cost): falling things then break into fewer, bigger pieces.
    this.budget.awake = Math.round(this.quality.tier.awake * (0.5 + 0.5 * this.fx.intensity));
    const dt = this.fx.time.scale(dtReal);
    this.time += dt;
    if (this.slowUntil && this.time > this.slowUntil) this.slowUntil = 0;

    const held = this.input.held();
    if (held && this.tool.hold && !this.gesture?.orbit && !this.gesture?.skip) this.tool.hold(held.x, held.y, dt);
    for (const t of Object.values(this.tools)) t.update(dt);
    this.balloons.update(dt);

    // One physics step per frame. At 60 fps that's 1/60 s; when frames run slow it's one longer
    // step (up to 1/30 s) rather than two short ones, so a struggling iPad doesn't end up doing
    // twice the physics work exactly when it can least afford it. Below 30 fps the game just
    // runs a little slow-motion.
    this.acc += dt;
    const tPhys = performance.now();
    try {
      if (this.acc >= STEP) {
        const h = Math.min(this.acc, MAX_STEP);
        this.physics.world.timestep = h;
        this.physics.step();
        this.physics.events.drainContactForceEvents((e) => this.destruction.contact(e));
        this.pieces.update(this.time);
        this.acc -= h;
      }
    } catch (e) {
      this.recoverPhysics(e);
    }
    if (this.acc > STEP) this.acc = 0;
    const tDest = performance.now();
    this.destruction.update();
    this.physMs = tDest - tPhys;
    this.destMs = performance.now() - tDest;

    this.pieces.sync();
    this.statics.flush();

    // The rebuild drop-in, with rising plinks as the layers land.
    const bt = this.time - this.buildStart;
    blockUniforms.uBuildT.value = bt;
    if (bt < 1.5 && this.plinks < 14 && bt > this.plinks * 0.1 + 0.15) sfx.plink(this.plinks++);
    blockUniforms.uTime.value = this.time;

    // Celebrate once when nearly everything is down.
    const wrecked = this.destruction.wrecked;
    this.ui.wrecked(wrecked);
    if (!this.destruction.celebrated && wrecked > 0.9) {
      this.destruction.celebrated = true;
      this.celebrate();
    }
    const live = this.combo.live(this.time) && this.combo.count >= 150;
    this.ui.showCombo(this.combo.count, this.combo.tier, live);

    this.fx.update(this.time);
    this.fx.shake.update(dtReal);
    this.rig.update(dtReal, this.fx.shake);
    this.island.update(this.time);
    this.stage.update(this.time);
    const tDraw = performance.now();
    this.renderer.render(this.scene, this.camera);
    const tEnd = performance.now();
    // For the stress test: how long the frame took, and how much of it was our own work
    // (physics, the destruction code, telling the graphics chip what to draw). The rest is the
    // browser and the graphics chip.
    this.onFrame?.(dtReal * 1000, { cpu: tEnd - t0, physics: this.physMs, destruction: this.destMs, draw: tEnd - tDraw, scene: SCENES[this.sceneIndex].id });

    this.hint(dtReal);
    if (this.statsOn && Math.floor(this.real * 4) !== this.statsTick) {
      this.statsTick = Math.floor(this.real * 4);
      this.showStats();
    }
  }

  // The ghost hand: shows up at the start and after a while with nothing happening, tapping on
  // the tallest standing thing.
  hint(dt) {
    this.idle += dt;
    const wait = this.touched ? 12 : 2.5;
    if (this.idle < wait || this.time - this.buildStart < 1.6) return;
    if (this.handShown && this.idle < wait + 4) return;
    this.handShown = this.idle >= wait + 4 ? false : true;
    if (!this.handShown) {
      this.idle = wait - 6;
      this.ui.showHand(null);
      return;
    }
    // Aim at the middle of what's standing.
    const def = SCENES[this.sceneIndex];
    this.proj.set(def.camera.target[0], def.camera.target[1] * 0.9, def.camera.target[2]).project(this.camera);
    this.ui.showHand(((this.proj.x + 1) / 2) * window.innerWidth, ((1 - this.proj.y) / 2) * window.innerHeight);
  }

  showStats() {
    const s = this.stats.summary();
    const info = this.renderer.info.render;
    this.statsEl.textContent = [
      `fps ${s.fps.toFixed(0)}  avg ${s.avg.toFixed(1)}  p95 ${s.p95.toFixed(1)}  worst ${s.worst.toFixed(0)} ms`,
      `tier ${this.quality.name}  fx ${(this.fx.intensity * 100).toFixed(0)}%  ${this.canvas.width}×${this.canvas.height}`,
      `blocks ${this.grid.count}  moving ${this.pieces.awakeCount}/${this.budget.awake}  pieces ${this.pieces.count}/${this.budget.pieces}  loose blocks ${this.debris.used}`,
      `physics ${this.physMs.toFixed(1)} ms  draws ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k`,
    ].join('\n');
  }

  debugApi() {
    return {
      game: this,
      fire: (tool, x, y, z) => this.fire(tool, x, y, z),
      // Presses at a screen point, drags through `path` ([[x, y], ...]) one frame apart, lets go.
      drag: async (tool, path) => {
        if (tool) this.selectTool(tool);
        const [x0, y0] = path[0];
        this.tool.press(x0, y0);
        for (const [x, y] of path) {
          this.tool.move(x, y);
          await new Promise((r) => requestAnimationFrame(r));
        }
        this.tool.release();
      },
      tapAt: (tool, sx, sy) => {
        if (tool) this.selectTool(tool);
        this.tool.press(sx, sy);
        this.tool.release(sx, sy);
      },
      rebuild: (scene) => this.rebuild({ scene: scene ?? null }),
      stats: () => ({ ...this.stats.summary(), blocks: this.grid.count, pieces: this.pieces.count, loose: this.debris.used, tier: this.quality.name, combo: COMBO_TIERS }),
      screenOf: (x, y, z) => this.screenOf(x, y, z),
      stress: () => this.panel.runOne(),
    };
  }
}

// Offline play on the web (the app has everything on the iPad already).
if (location.protocol === 'https:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

const game = new Game();
game.start().catch((e) => {
  console.error(e);
  document.body.classList.add('failed');
});
