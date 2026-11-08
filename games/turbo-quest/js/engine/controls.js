// On-screen touch controls: where each one goes for each scheme, and which fingers are pressing
// what. No DOM (it's handed finger positions), so the layouts are unit tested.
//
// Schemes:
//   kid     ◀ ▶ on the left, a big JUMP on the right. Auto-fire.
//   kidAuto Auto-Go: Turbo walks by himself, and a tap anywhere is a jump.
//   dad     a floating stick on the left; JUMP, FIRE (and later DASH, TURBO) on the right.
//
// Sizes are in points designed at 1180×820 (an iPad 10th gen held sideways) and scaled to the
// screen. Each control's touch zone is bigger than what's drawn, and a finger sliding across
// zones switches control (a thumb drifting from ◀ to ▶ changes direction).

export const SCHEMES = ['kid', 'kidAuto', 'dad'];

const EDGE = 24; // keep clear of the iPadOS edge swipes

export function layoutControls(scheme, w, h, { leftHanded = false, big = false, inset = null, abilities = {} } = {}) {
  const u = (Math.min(w, h) / 820) * (big ? 1.2 : 1);
  const ins = inset || { l: 0, r: 0, t: 0, b: 0 };
  const L = EDGE * u + ins.l;
  const R = EDGE * u + ins.r;
  const B = EDGE * u + ins.b;
  const Tp = EDGE * u + ins.t;
  const items = [];
  const pauseR = (scheme === 'dad' ? 28 : 32) * u;
  items.push({ id: 'pause', kind: 'button', cx: L + pauseR, cy: Tp + pauseR, r: pauseR, hitR: pauseR + 14 * u, downOnly: true, icon: 'pause' });

  if (scheme === 'kid') {
    const rl = 60 * u;
    const rr = 75 * u;
    const gap = 30 * u;
    const cy = h - B - rr - 4 * u;
    const lx = L + 16 * u + rl;
    const rx = lx + rl + gap + rr;
    items.push({ id: 'left', kind: 'arrow', cx: lx, cy, r: rl, icon: 'left' });
    items.push({ id: 'right', kind: 'arrow', cx: rx, cy, r: rr, icon: 'right' });
    const jr = 90 * u;
    items.push({
      id: 'jump', kind: 'button', cx: w - R - jr - 10 * u, cy: h - B - jr - 10 * u, r: jr, hitR: jr + 20 * u, icon: 'jump',
      zone: { x: w * 0.62, y: h * 0.35, w: w * 0.38, h: h * 0.65 },
    });
    // The arrows share one zone, split down the middle of the gap between them.
    items.moveZone = { x: 0, y: h * 0.5, w: w * 0.4, h: h * 0.5, split: (lx + rl + rx - rr) / 2 };
  } else if (scheme === 'kidAuto') {
    const jr = 70 * u;
    items.push({ id: 'jump', kind: 'button', cx: w - R - jr - 10 * u, cy: h - B - jr - 10 * u, r: jr, hitR: jr, icon: 'jump', faint: true, zone: { x: 0, y: 0, w, h } });
  } else {
    const jr = 65 * u;
    const jx = w - R - jr - 8 * u;
    const jy = h - B - jr - 8 * u;
    items.push({ id: 'jump', kind: 'button', cx: jx, cy: jy, r: jr, hitR: jr + 22 * u, icon: 'jump' });
    const fr = 55 * u;
    items.push({ id: 'fire', kind: 'button', cx: jx - 125 * u, cy: jy - 40 * u, r: fr, hitR: fr + 22 * u, icon: 'fire' });
    const dr = 45 * u;
    items.push({ id: 'dash', kind: 'button', cx: jx - 10 * u, cy: jy - 150 * u, r: dr, hitR: dr + 16 * u, icon: 'dash', hidden: !abilities.dash });
    items.push({ id: 'turbo', kind: 'button', cx: w - R - dr, cy: jy - 270 * u, r: dr, hitR: dr + 16 * u, icon: 'turbo', hidden: !abilities.turbo });
    items.stick = { x: 0, y: h * 0.3, w: w * 0.45, h: h * 0.7, radius: 70 * u, homeX: L + 110 * u, homeY: h - B - 110 * u };
  }

  const layout = { scheme, w, h, u, items, moveZone: items.moveZone || null, stick: items.stick || null, leftHanded };
  return leftHanded ? mirror(layout) : layout;
}

// Left-handed: the whole layout flipped side to side (◀ stays to the left of ▶).
function mirror(layout) {
  const { w } = layout;
  const fx = (x) => w - x;
  for (const it of layout.items) {
    if (it.id === 'pause') continue;
    it.cx = fx(it.cx);
    if (it.zone) it.zone = { ...it.zone, x: w - it.zone.x - it.zone.w };
  }
  const left = layout.items.find((i) => i.id === 'left');
  const right = layout.items.find((i) => i.id === 'right');
  if (left && right) {
    // Swap places so ◀ is still on the left; the bigger ▶ keeps its size.
    const lx = left.cx;
    left.cx = right.cx - right.r + left.r;
    right.cx = lx + left.r - right.r;
    if (left.cx > right.cx) [left.cx, right.cx] = [right.cx, left.cx];
  }
  if (layout.moveZone) {
    const z = layout.moveZone;
    layout.moveZone = { ...z, x: w - z.x - z.w, split: left && right ? (left.cx + left.r + right.cx - right.r) / 2 : w - z.split };
  }
  if (layout.stick) {
    const s = layout.stick;
    layout.stick = { ...s, x: w - s.x - s.w, homeX: fx(s.homeX) };
  }
  return layout;
}

const inRect = (z, x, y) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;

// The controls under a finger at (x, y). `held` (the ids this finger already presses) makes
// them a little stickier, so a thumb wobbling at an edge doesn't flicker on and off.
export function hitControls(layout, x, y, { isDown = false, held = null } = {}) {
  const hits = [];
  for (const it of layout.items) {
    if (it.hidden || it.kind !== 'button') continue;
    if (it.downOnly && !isDown && !(held && held.has(it.id))) continue;
    const r = (it.hitR || it.r) * (held && held.has(it.id) ? 1.25 : 1);
    const inCircle = (x - it.cx) ** 2 + (y - it.cy) ** 2 <= r * r;
    if (inCircle || (it.zone && inRect(it.zone, x, y))) {
      if (it.id === 'pause') return ['pause'];
      hits.push(it.id);
    }
  }
  const mz = layout.moveZone;
  if (mz && inRect(mz, x, y)) hits.push(x < mz.split ? 'left' : 'right');
  return hits;
}

// Which fingers press which controls. Feed it down/move/up with finger ids and CSS-pixel
// positions; read held(id), presses[id] (a count that goes up on every new press) and stick.
export class TouchControls {
  constructor() {
    this.layout = null;
    this.fingers = new Map(); // id -> { x, y, ids: Set, stick: null | { ox, oy, dx, dy } }
    this.presses = {};
    this.changed = true;
  }

  setLayout(layout) {
    this.layout = layout;
    for (const f of this.fingers.values()) this.assign(f, false);
    this.changed = true;
  }

  down(id, x, y) {
    if (!this.layout) return;
    // iOS can reuse a finger id; a new touch with an id we still have replaces the old finger.
    if (this.fingers.has(id)) this.up(id);
    const f = { x, y, ids: new Set(), stick: null };
    this.fingers.set(id, f);
    this.assign(f, true);
  }

  move(id, x, y) {
    const f = this.fingers.get(id);
    if (!f) return;
    f.x = x;
    f.y = y;
    this.assign(f, false);
  }

  up(id) {
    const f = this.fingers.get(id);
    if (!f) return;
    this.fingers.delete(id);
    this.changed = true;
  }

  releaseAll() {
    for (const id of [...this.fingers.keys()]) this.up(id);
  }

  assign(f, isDown) {
    const L = this.layout;
    if (f.stick) {
      const s = f.stick;
      const R = L.stick.radius;
      let dx = f.x - s.ox;
      let dy = f.y - s.oy;
      const d = Math.hypot(dx, dy);
      // A thumb that drifts far drags the stick's middle along with it.
      if (d > R * 1.3) {
        const k = (d - R * 1.3) / d;
        s.ox += dx * k;
        s.oy += dy * k;
        dx = f.x - s.ox;
        dy = f.y - s.oy;
      }
      const m = Math.min(1, Math.hypot(dx, dy) / R);
      const a = Math.atan2(dy, dx);
      s.dx = Math.cos(a) * m;
      s.dy = Math.sin(a) * m;
      this.changed = true;
      return;
    }
    const hits = hitControls(L, f.x, f.y, { isDown, held: f.ids });
    if (isDown && hits.length === 0 && L.stick && inRect(L.stick, f.x, f.y)) {
      f.stick = { ox: f.x, oy: f.y, dx: 0, dy: 0 };
      this.changed = true;
      return;
    }
    const next = new Set(hits);
    for (const c of next) {
      if (!f.ids.has(c)) this.presses[c] = (this.presses[c] || 0) + 1;
    }
    if (next.size !== f.ids.size || [...next].some((c) => !f.ids.has(c))) this.changed = true;
    f.ids = next;
  }

  // Held means a finger that is down right now is on it (worked out fresh each time, so a
  // missed release can never leave a button stuck).
  held(c) {
    for (const f of this.fingers.values()) if (f.ids.has(c)) return true;
    return false;
  }

  // The stick's push as { x, y } in -1..1 (null when no thumb is on it), plus where it is drawn.
  stick() {
    for (const f of this.fingers.values()) if (f.stick) return { x: f.stick.dx, y: f.stick.dy, ox: f.stick.ox, oy: f.stick.oy };
    return null;
  }
}
