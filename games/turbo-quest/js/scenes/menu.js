// Screens made of big round picture buttons (title, level cards, results, pause). A button acts
// when the finger lifts on it; a button with `hold` (the grown-up gear) acts after being held
// that many seconds, with a ring filling up. Keyboard and controller: the arrows, d-pad or stick
// move a focus ring between the buttons (it starts on the main one), and Space/Enter/A picks.
// The ring only shows while a keyboard or controller is in use.
import { play } from '../engine/audio.js';

export class MenuScene {
  constructor(app) {
    this.app = app;
    this.down = null;
    this.hold = 0;
    this.time = 0;
    this.main = null; // the button Enter/Space/A picks
    this.focus = null; // the button the arrows have moved to
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
    i.pollPad();
    const keys = ['key', 'pad'];
    for (const [d, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (i.consume(d, keys)) this.moveFocus(dx, dy);
    const ok = this.focusables();
    if (this.focus && !ok.some((b) => b.id === this.focus)) this.focus = null;
    const pick = this.focus || this.main;
    if (i.consume('jump', keys) || i.consume('fire', keys)) {
      if (pick) this.choose(pick);
    }
    if (i.consume('pause', keys)) this.back?.();
    const shown = i.source === 'key' || i.source === 'pad' ? pick || '' : '';
    this.app.ui.extra = shown;
  }

  // The buttons the arrows can reach (not hidden, not the hold-to-confirm grown-up ones).
  focusables() {
    return this.buttons().filter((b) => !b.hidden && !b.hold);
  }

  // Moves the focus to the nearest button in a direction.
  moveFocus(dx, dy) {
    const list = this.focusables();
    const cur = list.find((b) => b.id === (this.focus || this.main));
    if (!cur) {
      this.focus = list[0]?.id || null;
      return;
    }
    let best = null;
    let bestScore = Infinity;
    for (const b of list) {
      if (b === cur) continue;
      const vx = b.x - cur.x;
      const vy = b.y - cur.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (best) {
      this.focus = best.id;
      play('tap', { vol: 0.4 });
    }
  }

  // After render: the focus ring, drawn over a fresh UI canvas.
  overlay() {
    const ui = this.app.ui;
    if (!ui.fresh || !ui.extra) return;
    const b = this.focusables().find((x) => x.id === ui.extra);
    if (b) ui.focusRing(b);
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
