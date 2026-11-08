// Screens made of big round picture buttons (title, level cards, results, pause). A button acts
// when the finger lifts on it; a button with `hold` (the grown-up gear) acts after being held
// that many seconds, with a ring filling up. Enter/Space or the controller's A picks the main one.
import { play } from '../engine/audio.js';

export class MenuScene {
  constructor(app) {
    this.app = app;
    this.down = null;
    this.hold = 0;
    this.time = 0;
    this.main = null; // the button Enter/Space/A picks
  }

  enter() {
    this.app.controls.releaseAll();
    this.app.input.flush();
  }

  // [{ id, x, y, r, color, icon, iconColor, hold, hidden }]
  buttons() {
    return [];
  }

  hit(x, y) {
    return this.buttons().find((b) => !b.hidden && (x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r * 1.12) ** 2) || null;
  }

  pointer(type, id, x, y) {
    if (type === 'down') {
      const b = this.hit(x, y);
      this.down = b ? b.id : null;
      this.hold = 0;
      if (b && !b.hold) play('tap', { vol: 0.6 });
    } else if (type === 'move') {
      if (this.down && this.hit(x, y)?.id !== this.down) this.down = null;
    } else {
      const b = this.down && this.hit(x, y);
      const chosen = this.down;
      this.down = null;
      this.hold = 0;
      if (b && !b.hold) this.choose(chosen);
    }
  }

  frame(elapsed) {
    this.time += elapsed;
    const b = this.down && this.buttons().find((x) => x.id === this.down);
    if (b && b.hold) {
      this.hold += elapsed;
      if (this.hold >= b.hold) {
        this.down = null;
        this.hold = 0;
        this.choose(b.id);
      }
    }
    const i = this.app.input;
    if (this.main && (i.consume('jump', ['key', 'pad']) || i.consume('fire', ['key', 'pad']))) this.choose(this.main);
    if (i.consume('pause', ['key', 'pad'])) this.back?.();
  }

  choose() {}

  update(dt) {
    this.time += 0 * dt;
  }

  drawButtons(ui) {
    for (const b of this.buttons()) {
      if (b.hidden) continue;
      ui.button(b, this.down === b.id);
      if (b.hold && this.down === b.id) ui.holdRing(b, this.hold / b.hold);
    }
  }
}
