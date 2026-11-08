// Touch controls, the keyboard and game controllers merged into one intent per game step:
//   { mx, my, jump, jumpPressed, fire, firePressed, dash, dashPressed, turbo, turboPressed }
// mx/my are -1..1 (my: down is +). "Pressed" is true for the one step after a new press, even
// when the press and release both happen between two steps.
//
// Keyboard: ←/→ or A/D move, ↑/↓ or W/S aim and drop, Space/Z jump, X/J fire, C/K dash,
// V turbo, Esc/P pause. Controller (standard layout): stick or d-pad, A jump, X or B fire,
// RB dash, Y or LB turbo, Menu pause. In menus the arrows, d-pad or stick move between buttons
// and A/Space picks.

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyX: 'fire', KeyJ: 'fire',
  KeyC: 'dash', KeyK: 'dash',
  KeyV: 'turbo',
  Escape: 'pause', KeyP: 'pause',
};
const PAD = { 0: 'jump', 1: 'fire', 2: 'fire', 3: 'turbo', 4: 'turbo', 5: 'dash', 9: 'pause', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const ACTIONS = ['jump', 'fire', 'dash', 'turbo', 'pause', 'left', 'right', 'up', 'down'];
const SOURCES = ['key', 'pad', 'touch'];
const DEAD = 0.25;

const axis = (v) => (Math.abs(v) < DEAD ? 0 : (Math.sign(v) * (Math.abs(v) - DEAD)) / (1 - DEAD));

export class Input {
  constructor(controls) {
    this.controls = controls;
    this.keys = new Set();
    this.keyPresses = {};
    this.padHeld = new Set();
    this.padPresses = {};
    this.padAxes = { x: 0, y: 0 };
    this.consumed = {};
    this.source = null; // 'touch' | 'key' | 'pad': what was used last (touch controls hide for the others)
    this.onSourceChange = null;
    this.intent = { mx: 0, my: 0, jump: false, jumpPressed: false, fire: false, firePressed: false, dash: false, dashPressed: false, turbo: false, turboPressed: false };
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      const a = KEYS[e.code];
      if (!a) return;
      e.preventDefault();
      this.setSource('key');
      if (e.repeat) return;
      this.keys.add(a);
      this.keyPresses[a] = (this.keyPresses[a] || 0) + 1;
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYS[e.code];
      if (a) this.keys.delete(a);
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  setSource(s) {
    if (this.source === s) return;
    this.source = s;
    this.onSourceChange?.(s);
  }

  pollPad() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && [...pads].find((p) => p && p.connected);
    if (!pad) {
      this.padHeld.clear();
      this.padAxes.x = 0;
      this.padAxes.y = 0;
      return;
    }
    const now = new Set();
    pad.buttons.forEach((b, i) => {
      if (PAD[i] && (b.pressed || b.value > 0.5)) now.add(PAD[i]);
    });
    for (const a of now) if (!this.padHeld.has(a)) this.padPresses[a] = (this.padPresses[a] || 0) + 1;
    const ax = axis(pad.axes[0] || 0);
    const ay = axis(pad.axes[1] || 0);
    // pushing the stick past halfway counts as a press of that direction (for the menus)
    const push = (v, was, neg, pos) => {
      if (v <= -0.5 && was > -0.5) this.padPresses[neg] = (this.padPresses[neg] || 0) + 1;
      if (v >= 0.5 && was < 0.5) this.padPresses[pos] = (this.padPresses[pos] || 0) + 1;
    };
    push(ax, this.padAxes.x, 'left', 'right');
    push(ay, this.padAxes.y, 'up', 'down');
    if (now.size || ax || ay) this.setSource('pad');
    this.padHeld = now;
    this.padAxes.x = ax;
    this.padAxes.y = ay;
  }

  // A new press of `action` since it was last consumed. `sources` limits where it may come from
  // (the pause button on screen is handled separately: a tap pauses, holding opens the panel).
  consume(action, sources = SOURCES) {
    let fresh = false;
    for (const src of sources) {
      const counts = src === 'key' ? this.keyPresses : src === 'pad' ? this.padPresses : this.controls?.presses;
      const total = (counts && counts[action]) || 0;
      const k = src + ':' + action;
      if (total > (this.consumed[k] || 0)) fresh = true;
      this.consumed[k] = total;
    }
    return fresh;
  }

  held(action) {
    return this.keys.has(action) || this.padHeld.has(action) || !!(this.controls && this.controls.held(action));
  }

  // Forget presses that happened while the game wasn't listening (paused, a menu).
  flush() {
    for (const a of ACTIONS) this.consume(a);
  }

  // The intent for one game step.
  read() {
    this.pollPad();
    const c = this.controls;
    let mx = 0;
    let my = 0;
    if (this.held('left')) mx -= 1;
    if (this.held('right')) mx += 1;
    if (this.held('up')) my -= 1;
    if (this.held('down')) my += 1;
    if (this.padAxes.x || this.padAxes.y) {
      if (Math.abs(this.padAxes.x) > Math.abs(mx)) mx = this.padAxes.x;
      if (Math.abs(this.padAxes.y) > Math.abs(my)) my = this.padAxes.y;
    }
    const s = c && c.stick();
    if (s) {
      mx = axis(s.x);
      my = axis(s.y);
    }
    const it = this.intent;
    it.mx = Math.max(-1, Math.min(1, mx));
    it.my = Math.max(-1, Math.min(1, my));
    // A tap that was already let go before this step still counts as pressed (a small jump).
    for (const a of ['jump', 'fire', 'dash', 'turbo']) {
      it[a + 'Pressed'] = this.consume(a);
      it[a] = this.held(a);
    }
    return it;
  }
}
