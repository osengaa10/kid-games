// The pause menu, over a frozen game: big picture buttons only.
//   ▶ (green, middle)    keep playing
//   ↻ (orange)           back to the last checkpoint
//   house (purple)       back to the map (the checkpoint is saved)
//   four tiles (white)   back to all the games (only inside the Kid Games app)
//   gear (corner, hold)  grown-up settings
import { MenuScene } from './menu.js';
import { play, unlockAudio } from '../engine/audio.js';

export class PauseScene extends MenuScene {
  constructor(app, below) {
    super(app);
    this.below = below;
    this.main = 'resume';
  }

  enter() {
    super.enter();
    play('pause');
  }

  buttons() {
    const a = this.app;
    const cx = a.w / 2;
    const cy = a.h / 2;
    const R = Math.min(a.h * 0.12, 110);
    const m = Math.max(56, a.h * 0.07);
    return [
      { id: 'resume', x: cx, y: cy, r: R * 1.3, color: '#35c25a', icon: 'play' },
      { id: 'checkpoint', x: cx - R * 3.1, y: cy, r: R, color: '#ff9a3c', icon: 'again' },
      { id: 'home', x: cx + R * 3.1, y: cy, r: R, color: '#8d6cf2', icon: 'home' },
      { id: 'games', x: m, y: a.h - m, r: 34, color: '#ffffff', icon: 'games', hidden: !a.inApp },
      { id: 'gear', x: a.w - m, y: a.h - m, r: 30, color: 'rgba(30,70,130,0.55)', icon: 'gear', hold: 2 },
    ];
  }

  back() {
    this.choose('resume');
  }

  choose(id) {
    const a = this.app;
    unlockAudio(); // coming back from the background, sound restarts inside this tap
    if (id === 'gear') {
      a.openSettings();
      return;
    }
    play('tap');
    if (id === 'games') {
      a.saveNow?.();
      location.href = '../../index.html';
      return;
    }
    if (id === 'home') {
      a.showMap();
      return;
    }
    if (id === 'checkpoint') {
      const s = this.below;
      s.world.toCheckpoint();
      s.cam.snap(s.world.player, s.world.level, s.world.tune.lookAhead);
    }
    a.resume();
  }

  render() {
    const a = this.app;
    this.below.renderWorld();
    const ui = a.ui;
    if (!ui.begin(['pause', a.w, a.h, a.inApp, this.down, this.hold.toFixed(2), a.settings.debug ? a.debugText : ''].join('|'))) return;
    ui.dim(0.5);
    this.drawButtons(ui);
    if (a.settings.debug) ui.debug(a.debugLines);
  }
}
