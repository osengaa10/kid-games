import { WEAPONS } from '../content/weapons.js';
import { FURS, PACKS } from '../content/cosmetics.js';
import { hatSprite } from '../art/turbo.js';
import { withTileSize } from '../engine/sprites.js';

// The #ui canvas, at full device sharpness above the game view: touch controls, the star count,
// the pause menu, the win screen and the ?debug readout. Drawn in CSS pixels. It is only
// repainted when something on it changes.

export class Ui {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.sig = '';
  }

  resize(w, h, dpr) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.sig = '';
  }

  // Repaints only when `sig` (a summary of everything shown) changed. Returns true if it did.
  // Starts a redraw of the UI canvas, unless nothing in `sig` (plus `extra`, the menu focus)
  // changed since the last one. `fresh` says whether this frame redrew.
  begin(sig) {
    sig += '#' + (this.extra || '');
    this.fresh = sig !== this.sig;
    if (!this.fresh) return false;
    this.sig = sig;
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    return true;
  }

  controls(layout, controls, { visible = true, holdPause = 0, pulse = null } = {}) {
    const g = this.g;
    for (const it of layout.items) {
      if (it.hidden) continue;
      if (!visible && it.id !== 'pause') continue;
      const on = controls.held(it.id);
      const dad = layout.scheme === 'dad';
      const k = on ? 0.92 : 1;
      const r = it.r * k;
      g.save();
      g.translate(it.cx, it.cy);
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      const base = it.faint ? 0.12 : dad ? 0.2 : 0.28;
      g.fillStyle = `rgba(255,255,255,${on ? base + 0.25 : base})`;
      g.fill();
      g.lineWidth = Math.max(2, r * 0.06);
      g.strokeStyle = `rgba(255,255,255,${it.faint ? 0.35 : 0.75})`;
      g.stroke();
      icon(g, it.icon, r * 0.55, it.faint ? 0.6 : 1);
      g.restore();
      if (pulse === it.id && visible) {
        // the idle hint: a glowing ring round the button to press
        g.beginPath();
        g.arc(it.cx, it.cy, it.r + 10, 0, Math.PI * 2);
        g.lineWidth = 8;
        g.strokeStyle = 'rgba(255,210,58,0.9)';
        g.stroke();
      }
      if (it.id === 'pause' && holdPause > 0) {
        g.beginPath();
        g.arc(it.cx, it.cy, it.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, holdPause));
        g.lineWidth = 5;
        g.strokeStyle = '#ffd23a';
        g.stroke();
      }
    }
    // The floating stick: where the thumb landed, and the knob.
    if (layout.stick && visible) {
      const s = controls.stick();
      const R = layout.stick.radius;
      const ox = s ? s.ox : layout.stick.homeX;
      const oy = s ? s.oy : layout.stick.homeY;
      g.beginPath();
      g.arc(ox, oy, R, 0, Math.PI * 2);
      g.fillStyle = s ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = s ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
      g.stroke();
      g.beginPath();
      g.arc(ox + (s ? s.x * R : 0), oy + (s ? s.y * R : 0), R * 0.45, 0, Math.PI * 2);
      g.fillStyle = s ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)';
      g.fill();
    }
  }

  // The star count, top middle: a big star and digits (no words anywhere).
  stars(n, total) {
    const y = Math.max(44, this.h * 0.07);
    const s = Math.max(22, this.h * 0.032);
    this.starCount(n, this.w / 2 + s * 0.6, y, s);
    void total;
  }

  // A star and a number at (x, y).
  starCount(n, x, y, size) {
    const g = this.g;
    g.save();
    g.translate(x - size * 1.2, y);
    starPath(g, 0, 0, size, size * 0.45);
    g.fillStyle = '#ffd23a';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#e88a00';
    g.stroke();
    g.restore();
    this.text(String(n), x + size * 0.4, y + 2, size * 1.4);
  }

  bigStar(x, y, s, t) {
    const g = this.g;
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 2) * 0.08);
    starPath(g, 0, 0, s, s * 0.46);
    g.fillStyle = '#ffd23a';
    g.fill();
    g.lineWidth = Math.max(3, s * 0.08);
    g.strokeStyle = '#e88a00';
    g.stroke();
    starPath(g, -s * 0.15, -s * 0.15, s * 0.35, s * 0.16);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fill();
    g.restore();
  }

  gem(x, y, s, got, onLight = false) {
    gemIcon(this.g, x, y, s, got, onLight);
  }

  // A medal: 1 bronze, 2 silver, 3 gold.
  medal(x, y, s, level) {
    const g = this.g;
    const c = ['#cd7f32', '#c9d3dd', '#ffd23a'][level - 1];
    g.beginPath();
    g.moveTo(x - s * 0.5, y - s * 1.4);
    g.lineTo(x, y - s * 0.3);
    g.lineTo(x + s * 0.5, y - s * 1.4);
    g.lineWidth = s * 0.35;
    g.strokeStyle = '#4fc3ff';
    g.stroke();
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fillStyle = c;
    g.fill();
    g.lineWidth = Math.max(2, s * 0.15);
    g.strokeStyle = '#ffffff';
    g.stroke();
    starPath(g, x, y, s * 0.55, s * 0.25);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fill();
  }

  // The "you left off here" flag on a level card.
  flagBadge(x, y, s) {
    const g = this.g;
    g.beginPath();
    g.arc(x, y, s * 1.2, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#ff8a2a';
    g.stroke();
    g.fillStyle = '#7a4a22';
    g.fillRect(x - s * 0.45, y - s * 0.7, s * 0.14, s * 1.4);
    g.beginPath();
    g.moveTo(x - s * 0.3, y - s * 0.7);
    g.lineTo(x + s * 0.65, y - s * 0.38);
    g.lineTo(x - s * 0.3, y - s * 0.05);
    g.closePath();
    g.fillStyle = '#ff8a2a';
    g.fill();
  }

  // Which player is playing: his pup or yours.
  profileBadge(x, y, r, id) {
    const g = this.g;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = '#f2952c';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.font = `${Math.round(r * 1.2)}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(id === 'dad' ? '😎' : '🐶', x, y + 2);
    g.textAlign = 'left';
  }

  // A stop on the map: a round picture button (grey with a padlock while locked).
  mapStop(x, y, r, pic, open, pulse, boss) {
    const g = this.g;
    if (pulse && open) {
      g.beginPath();
      g.arc(x, y, r + 12, 0, Math.PI * 2);
      g.lineWidth = 8;
      g.strokeStyle = 'rgba(255,210,58,0.9)';
      g.stroke();
    }
    g.beginPath();
    g.arc(x, y + r * 0.1, r, 0, Math.PI * 2);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fill();
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = open ? (boss ? '#ffe6c9' : '#ffffff') : '#c9cfdc';
    g.fill();
    g.lineWidth = r * 0.12;
    g.strokeStyle = open ? (boss ? '#c47a3c' : '#35c25a') : '#8a93a8';
    g.stroke();
    g.save();
    g.translate(x, y);
    if (!open) g.globalAlpha = 0.35;
    mapPicture(g, pic, r * 0.6);
    g.restore();
    if (!open) padlock(g, x, y, r * 0.42);
  }

  checkBadge(x, y, s) {
    const g = this.g;
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fillStyle = '#35c25a';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.beginPath();
    g.moveTo(x - s * 0.45, y);
    g.lineTo(x - s * 0.1, y + s * 0.35);
    g.lineTo(x + s * 0.5, y - s * 0.35);
    g.lineWidth = s * 0.28;
    g.lineCap = 'round';
    g.stroke();
  }

  // A tile in the Pup Closet.
  closetTile(x, y, r, tab, item, open, on) {
    const g = this.g;
    g.beginPath();
    g.roundRect ? g.roundRect(x - r, y - r, r * 2, r * 2, r * 0.3) : g.rect(x - r, y - r, r * 2, r * 2);
    g.fillStyle = on ? '#fff3c4' : '#f2f5fb';
    g.fill();
    g.lineWidth = on ? 6 : 3;
    g.strokeStyle = on ? '#35c25a' : '#d3d8e6';
    g.stroke();
    g.save();
    if (!open) g.globalAlpha = 0.3;
    if (tab === 'fur') {
      const f = FURS.find((i) => i.id === item.id);
      g.beginPath();
      g.arc(x, y, r * 0.58, 0, Math.PI * 2);
      g.fillStyle = f.fur;
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = f.dark;
      g.stroke();
      g.beginPath();
      g.ellipse(x + r * 0.1, y + r * 0.22, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
      g.fillStyle = f.cream;
      g.fill();
    } else if (tab === 'pack') {
      const p = PACKS.find((i) => i.id === item.id);
      g.beginPath();
      g.roundRect ? g.roundRect(x - r * 0.42, y - r * 0.55, r * 0.84, r * 1.1, r * 0.2) : g.rect(x - r * 0.42, y - r * 0.55, r * 0.84, r * 1.1);
      g.fillStyle = p.color;
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = p.dark;
      g.stroke();
      g.beginPath();
      g.arc(x + r * 0.15, y + r * 0.15, r * 0.14, 0, Math.PI * 2);
      g.fillStyle = '#ffe28a';
      g.fill();
    } else if (item.id === 'none') {
      g.beginPath();
      g.arc(x, y, r * 0.5, 0, Math.PI * 2);
      g.setLineDash([8, 8]);
      g.lineWidth = 4;
      g.strokeStyle = '#b9bfd6';
      g.stroke();
      g.setLineDash([]);
    } else {
      // each hat's middle and size in its sprite box, so it fills the tile
      const [my, size] = HAT_FIT[item.id] || [0.7, 0.8];
      const ppt = (r * 1.25) / size;
      withTileSize(ppt, () => {
        const s = hatSprite(item.id);
        g.drawImage(s.canvas, x - 0.65 * ppt, y - (open ? 0 : r * 0.12) - my * ppt, s.w * ppt, s.h * ppt);
      });
    }
    g.restore();
    if (!open) {
      padlock(g, x, y - r * 0.12, r * 0.3);
      g.save();
      g.translate(x - r * 0.3, y + r * 0.62);
      starPath(g, 0, 0, r * 0.17, r * 0.08);
      g.fillStyle = '#ffd23a';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = '#e88a00';
      g.stroke();
      g.restore();
      this.text(String(item.stars), x - r * 0.1, y + r * 0.64, r * 0.24, '#ffffff', 'left');
    }
  }

  // A bar filling toward the next unlock: stars so far / stars needed.
  starBar(x, y, w, h, have, need) {
    const g = this.g;
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h);
    g.fillStyle = '#e3e8f2';
    g.fill();
    const k = need > 0 ? Math.min(1, have / need) : 1;
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, Math.max(h, w * k), h, h / 2) : g.rect(x, y, w * k, h);
    g.fillStyle = '#ffd23a';
    g.fill();
    g.save();
    g.translate(x - 6, y + h / 2);
    starPath(g, 0, 0, h * 0.8, h * 0.36);
    g.fillStyle = '#ffd23a';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#e88a00';
    g.stroke();
    g.restore();
    this.text(have >= need ? `${have}` : `${have} / ${need}`, x + w / 2, y + h / 2 + 1, h * 0.85, '#ffffff');
  }

  // A summary of what the HUD shows, so it's only repainted when something changes.
  hudState(w) {
    const p = w.player;
    const gun = p.gun;
    const dad = w.mode === 'dad';
    return [
      w.starsGot, p.hearts, p.maxHearts, p.shield, w.gems.join(''), gun.id, gun.level, dad ? Math.ceil(gun.ammo / 3) : 0,
      w.combo.meter, p.turbo > 0 ? Math.ceil(p.turbo * 4) : 0, dad ? w.combo.score : 0, dad ? w.combo.chain : 0,
      dad && w.combo.timer > 0 ? Math.ceil(w.combo.timer * 8) : 0, dad ? Math.floor(w.time) : 0,
    ].join(',');
  }

  // The in-game HUD: pictures and digits only.
  hud(w, app) {
    const g = this.g;
    const p = w.player;
    const dad = w.mode === 'dad';
    const s = Math.max(24, Math.min(44, this.h * 0.048));
    const top = Math.max(16, this.h * 0.03);
    const right = this.w - Math.max(18, this.w * 0.02);
    this.stars(w.starsGot, w.starsTotal);
    // gem slots under the star count
    if (w.gemCount) {
      const gy = top + s * 2.05;
      for (let i = 0; i < 3; i++) gemIcon(g, this.w / 2 + (i - 1) * s * 0.95, gy, s * 0.36, w.gems[i]);
    }
    // hearts, top right
    for (let i = 0; i < p.maxHearts; i++) heartIcon(g, right - s * 0.6 - (p.maxHearts - 1 - i) * s * 1.15, top + s * 0.6, s * 0.5, i < p.hearts);
    if (p.shield > 0) {
      g.beginPath();
      const cx = right - s * 0.6 - ((p.maxHearts - 1) * s * 1.15) / 2;
      g.ellipse(cx, top + s * 0.6, (p.maxHearts * s * 1.15) / 2 + 6, s * 0.75, 0, 0, Math.PI * 2);
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(120,230,255,0.9)';
      g.stroke();
    }
    // weapon badge and TURBO meter, under the hearts
    const by = top + s * 2.1;
    const br = s * 0.85;
    const bx = right - br;
    weaponBadge(g, bx, by, br, p.gun, dad);
    const mw = s * 3.4;
    const mx = bx - br - 12 - mw;
    turboMeter(g, mx, by - s * 0.32, mw, s * 0.64, w.combo.meter / w.combo.meterMax, p.turbo > 0 ? p.turbo / 6 : 0);
    if (!dad) return;
    // Dad Mode: score, combo and the clock, top left after the pause button.
    const L = Math.max(16, this.w * 0.02) + 70;
    g.textBaseline = 'middle';
    g.font = `800 ${Math.round(s * 0.95)}px system-ui, -apple-system, sans-serif`;
    outlined(g, w.combo.score.toLocaleString('en-US'), L, top + s * 0.55, '#ffffff');
    g.font = `700 ${Math.round(s * 0.6)}px system-ui, -apple-system, sans-serif`;
    const t = Math.floor(w.time);
    outlined(g, `⏱ ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, L, top + s * 1.45, '#e6f6ff');
    if (w.combo.chain > 1) {
      g.font = `900 ${Math.round(s * 0.9)}px system-ui, -apple-system, sans-serif`;
      outlined(g, `×${Math.min(10, w.combo.chain)}`, L, top + s * 2.35, '#ffd23a');
      g.fillStyle = 'rgba(255,210,58,0.85)';
      g.fillRect(L, top + s * 2.9, (s * 2.2 * w.combo.timer) / 2, 5);
    }
  }

  // Big round picture buttons, for the pause menu and the win screen.
  button(b, pressed) {
    const g = this.g;
    const r = b.r * (pressed ? 0.93 : 1);
    g.save();
    g.translate(b.x, b.y);
    g.beginPath();
    g.arc(0, r * 0.08, r, 0, Math.PI * 2);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fill();
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fillStyle = b.color;
    g.fill();
    g.lineWidth = r * 0.08;
    g.strokeStyle = '#ffffff';
    g.stroke();
    icon(g, b.icon, r * 0.5, 1, b.iconColor);
    g.restore();
  }

  // A picture icon at a spot, with an optional outline color drawn under it.
  iconAt(name, x, y, s, color = '#ffffff', under = null) {
    const g = this.g;
    g.save();
    g.translate(x, y);
    if (under) {
      g.save();
      g.translate(0, 3);
      icon(g, name, s, 1, under);
      g.restore();
    }
    icon(g, name, s, 1, color);
    g.restore();
  }

  // A round Dad Mode badge: lit when earned, with a gold ring if it's new this time.
  badge(x, y, r, pic, got, isNew) {
    const g = this.g;
    if (isNew) {
      g.beginPath();
      g.arc(x, y, r * 1.35, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,210,58,0.55)';
      g.fill();
    }
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = got ? '#2b6fd6' : '#e3e8f2';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = got ? '#ffd23a' : '#c9cfdc';
    g.stroke();
    if (pic === 'heart') heartIcon(g, x, y - r * 0.05, r * 0.5, got);
    else if (pic === 'gem') gemIcon(g, x, y - r * 0.05, r * 0.5, got, !got);
    else {
      g.save();
      g.translate(x, y);
      icon(g, pic, r * 0.55, 1, got ? '#ffffff' : '#b9bfd6');
      g.restore();
    }
  }

  // The keyboard / controller focus: a bright ring around a button.
  focusRing(b) {
    const g = this.g;
    const r = b.r + 10;
    g.beginPath();
    g.arc(b.x, b.y, r, 0, Math.PI * 2);
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(20,40,90,0.45)';
    g.stroke();
    g.lineWidth = 6;
    g.strokeStyle = '#ffe14d';
    g.stroke();
  }

  // A ring that fills while a hold-to-confirm button is held.
  holdRing(b, k) {
    const g = this.g;
    g.beginPath();
    g.arc(b.x, b.y, b.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k));
    g.lineWidth = 6;
    g.strokeStyle = '#ffd23a';
    g.stroke();
  }

  text(t, x, y, size, color = '#ffffff', align = 'center', weight = 800) {
    const g = this.g;
    g.font = `${weight} ${Math.round(size)}px system-ui, -apple-system, sans-serif`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size * 0.14);
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(20,60,110,0.6)';
    g.strokeText(t, x, y);
    g.fillStyle = color;
    g.fillText(t, x, y);
    g.textAlign = 'left';
  }

  panel(x, y, w, h, r = 28) {
    const g = this.g;
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#ffffff';
    g.stroke();
  }

  dim(alpha = 0.5) {
    const g = this.g;
    g.fillStyle = `rgba(16,40,80,${alpha})`;
    g.fillRect(0, 0, this.w, this.h);
  }

  debug(lines) {
    const g = this.g;
    const fs = 13;
    g.font = `600 ${fs}px ui-monospace, Menlo, monospace`;
    const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 16;
    const h = lines.length * (fs + 4) + 10;
    const x = this.w - w - 12;
    const y = 12;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#d9ffd9';
    g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, x + 8, y + 6 + i * (fs + 4)));
  }
}

function outlined(g, text, x, y, color) {
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(20,60,110,0.6)';
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

export function heartIcon(g, x, y, s, full) {
  g.beginPath();
  g.moveTo(x, y + s * 0.85);
  g.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 0.75, y - s * 0.95, x, y - s * 0.35);
  g.bezierCurveTo(x + s * 0.75, y - s * 0.95, x + s * 1.25, y + s * 0.05, x, y + s * 0.85);
  g.closePath();
  g.fillStyle = full ? '#ff3d5e' : 'rgba(255,255,255,0.25)';
  g.fill();
  g.lineWidth = Math.max(2, s * 0.14);
  g.strokeStyle = full ? '#ffffff' : 'rgba(255,255,255,0.7)';
  g.stroke();
  if (full) {
    g.beginPath();
    g.ellipse(x - s * 0.35, y - s * 0.2, s * 0.15, s * 0.1, -0.6, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fill();
  }
}

export function gemIcon(g, x, y, s, got, onLight = false) {
  g.beginPath();
  g.moveTo(x - s * 0.8, y - s * 0.25);
  g.lineTo(x - s * 0.45, y - s * 0.75);
  g.lineTo(x + s * 0.45, y - s * 0.75);
  g.lineTo(x + s * 0.8, y - s * 0.25);
  g.lineTo(x, y + s * 0.9);
  g.closePath();
  if (got) {
    const grd = g.createLinearGradient(x - s, y - s, x + s, y + s);
    ['#ff5a7a', '#ffe24d', '#5fdc6a', '#4cc4ff', '#9a7bff'].forEach((c, i) => grd.addColorStop(i / 4, c));
    g.fillStyle = grd;
  } else g.fillStyle = onLight ? '#e9ecf5' : 'rgba(255,255,255,0.22)';
  g.fill();
  g.lineWidth = Math.max(2, s * 0.15);
  g.strokeStyle = got ? (onLight ? '#5a2a9a' : '#ffffff') : onLight ? '#b9bfd6' : 'rgba(255,255,255,0.65)';
  g.stroke();
}

// The weapon badge: the nozzle's picture, pips for its level, and (Dad Mode) an ammo ring.
function weaponBadge(g, x, y, r, gun, dad) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = 'rgba(20,50,100,0.45)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.stroke();
  if (dad && gun.id !== 'pop') {
    const max = WEAPONS[gun.id].ammo || 1;
    g.beginPath();
    g.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, gun.ammo / max));
    g.lineWidth = 6;
    g.strokeStyle = '#7fe0ff';
    g.stroke();
  }
  weaponIcon(g, gun.id, x, y - r * 0.08, r * 0.6);
  if (gun.id !== 'pop') {
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(x + (i - 1) * r * 0.36, y + r * 0.62, r * 0.11, 0, Math.PI * 2);
      g.fillStyle = i < gun.level ? '#ffd23a' : 'rgba(255,255,255,0.3)';
      g.fill();
    }
  }
}

export function weaponIcon(g, id, x, y, s) {
  g.save();
  if (id === 'boing') {
    g.beginPath();
    g.arc(x, y, s * 0.55, 0, Math.PI * 2);
    g.fillStyle = '#ff4f6d';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.beginPath();
    g.arc(x, y, s * 0.55, -0.4, 1.2);
    g.lineWidth = s * 0.15;
    g.stroke();
  } else if (id === 'frost') {
    g.strokeStyle = '#bff0ff';
    g.lineWidth = s * 0.16;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7);
      g.lineTo(x - Math.cos(a) * s * 0.7, y - Math.sin(a) * s * 0.7);
      g.stroke();
    }
  } else if (id === 'rockets') {
    for (const dx of [-0.4, 0, 0.4]) {
      g.fillStyle = '#ff8a2a';
      g.fillRect(x + dx * s - s * 0.12, y - s * 0.3, s * 0.24, s * 0.7);
      g.fillStyle = '#ffd23a';
      g.beginPath();
      g.moveTo(x + dx * s - s * 0.12, y - s * 0.3);
      g.lineTo(x + dx * s, y - s * 0.62);
      g.lineTo(x + dx * s + s * 0.12, y - s * 0.3);
      g.fill();
    }
  } else if (id === 'bubble') {
    for (const [dx, dy, r] of [[-0.3, 0.2, 0.42], [0.35, -0.15, 0.32], [0.3, 0.5, 0.2]]) {
      g.beginPath();
      g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      g.fillStyle = 'rgba(150,225,255,0.55)';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = '#ffffff';
      g.stroke();
    }
  } else if (id === 'spread') {
    for (const [dx, dy, r] of [[-0.55, 0.25, 0.38], [0, -0.3, 0.45], [0.55, 0.25, 0.38]]) {
      starPath(g, x + dx * s, y + dy * s, r * s, r * s * 0.45);
      g.fillStyle = '#ffd23a';
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = '#c27a00';
      g.stroke();
    }
  } else {
    // the Pop Blaster: the Pop-Pack's little cannon firing a spark
    g.translate(x, y);
    g.rotate(-0.6);
    g.fillStyle = '#a7b2c4';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect ? g.roundRect(-s * 0.75, -s * 0.28, s * 1.0, s * 0.56, s * 0.15) : g.rect(-s * 0.75, -s * 0.28, s * 1.0, s * 0.56);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffd23a';
    g.fillRect(s * 0.1, -s * 0.36, s * 0.22, s * 0.72);
    g.beginPath();
    g.arc(s * 0.72, 0, s * 0.26, 0, Math.PI * 2);
    g.fillStyle = '#fff3a0';
    g.fill();
  }
  g.restore();
}

// The TURBO meter: a bolt and a bar that fills with cheers (rainbow while TURBO is on).
function turboMeter(g, x, y, w, h, fill, active) {
  g.beginPath();
  g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h);
  g.fillStyle = 'rgba(20,50,100,0.45)';
  g.fill();
  const k = active > 0 ? active : fill;
  if (k > 0) {
    g.save();
    g.beginPath();
    g.roundRect ? g.roundRect(x + 3, y + 3, (w - 6) * k, h - 6, (h - 6) / 2) : g.rect(x + 3, y + 3, (w - 6) * k, h - 6);
    if (active > 0) {
      const grd = g.createLinearGradient(x, 0, x + w, 0);
      ['#ff4f6d', '#ffd23a', '#7be05a', '#4fc3ff', '#b48cff'].forEach((c, i) => grd.addColorStop(i / 4, c));
      g.fillStyle = grd;
    } else g.fillStyle = fill >= 1 ? '#ffd23a' : '#ffb13d';
    g.fill();
    g.restore();
  }
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h);
  g.stroke();
  g.save();
  g.translate(x - h * 0.15, y + h / 2);
  icon(g, 'turbo', h * 0.62, 1, fill >= 1 || active > 0 ? '#ffd23a' : '#ffffff');
  g.restore();
}

// Each hat's vertical middle and its biggest side, in its sprite box (art/turbo.js).
const HAT_FIT = { party: [0.54, 0.64], flower: [0.81, 0.77], crown: [0.72, 0.5], pirate: [0.7, 0.76], astro: [0.71, 1.2] };

function padlock(g, x, y, s) {
  g.beginPath();
  g.arc(x, y - s * 0.3, s * 0.45, Math.PI, 0);
  g.lineWidth = s * 0.22;
  g.strokeStyle = '#5a6478';
  g.stroke();
  g.beginPath();
  g.roundRect ? g.roundRect(x - s * 0.7, y - s * 0.3, s * 1.4, s * 1.1, s * 0.2) : g.rect(x - s * 0.7, y - s * 0.3, s * 1.4, s * 1.1);
  g.fillStyle = '#ffd23a';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#b5860a';
  g.stroke();
}

// The picture on a map stop.
function mapPicture(g, pic, s) {
  if (pic === 'flower') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45, s * 0.38, 0, Math.PI * 2);
      g.fillStyle = '#ff5aa5';
      g.fill();
    }
    g.beginPath();
    g.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    g.fillStyle = '#ffe14d';
    g.fill();
  } else if (pic === 'shield') {
    g.beginPath();
    g.ellipse(0, 0, s * 0.55, s * 0.85, 0, 0, Math.PI * 2);
    g.fillStyle = '#b7c2d4';
    g.fill();
    g.lineWidth = s * 0.12;
    g.strokeStyle = '#56606f';
    g.stroke();
    g.beginPath();
    g.arc(0, 0, s * 0.15, 0, Math.PI * 2);
    g.fillStyle = '#56606f';
    g.fill();
  } else if (pic === 'raft') {
    g.fillStyle = '#4cc0e8';
    g.fillRect(-s, s * 0.35, s * 2, s * 0.5);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i % 2 ? '#a8662e' : '#b97a40';
      g.fillRect(-s * 0.85, s * (0.05 + i * 0.16), s * 1.7, s * 0.16);
    }
    g.fillStyle = '#7a4a22';
    g.fillRect(-s * 0.05, -s * 0.9, s * 0.1, s * 0.95);
    g.beginPath();
    g.moveTo(s * 0.05, -s * 0.85);
    g.lineTo(s * 0.65, -s * 0.65);
    g.lineTo(s * 0.05, -s * 0.45);
    g.fillStyle = '#ff8a2a';
    g.fill();
  } else if (pic === 'tiki') {
    g.beginPath();
    g.roundRect ? g.roundRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4, s * 0.25) : g.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
    g.fillStyle = '#c47a3c';
    g.fill();
    g.lineWidth = s * 0.1;
    g.strokeStyle = '#6b3a14';
    g.stroke();
    for (const x of [-0.3, 0.3]) {
      g.beginPath();
      g.moveTo(x * s - s * 0.18, -s * 0.2);
      g.lineTo(x * s + s * 0.18, -s * 0.1);
      g.lineWidth = s * 0.14;
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-s * 0.3, s * 0.38);
    g.quadraticCurveTo(0, s * 0.18, s * 0.3, s * 0.38);
    g.stroke();
  }
}

function starPath(g, cx, cy, ro, ri) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
}

// Picture icons drawn at the origin with radius s.
export function icon(g, name, s, alpha = 1, color = '#ffffff') {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowColor = 'rgba(0,0,0,0)';
  const tri = (dir) => {
    g.beginPath();
    g.moveTo(dir * s * 0.75, 0);
    g.lineTo(-dir * s * 0.5, -s * 0.8);
    g.lineTo(-dir * s * 0.5, s * 0.8);
    g.closePath();
    g.lineWidth = s * 0.18;
    g.fill();
    g.stroke();
  };
  switch (name) {
    case 'left':
      tri(-1);
      break;
    case 'right':
    case 'play':
      tri(1);
      break;
    case 'jump':
      g.beginPath();
      g.moveTo(0, -s * 0.85);
      g.lineTo(s * 0.8, s * 0.05);
      g.lineTo(s * 0.32, s * 0.05);
      g.lineTo(s * 0.32, s * 0.8);
      g.lineTo(-s * 0.32, s * 0.8);
      g.lineTo(-s * 0.32, s * 0.05);
      g.lineTo(-s * 0.8, s * 0.05);
      g.closePath();
      g.lineWidth = s * 0.14;
      g.fill();
      g.stroke();
      break;
    case 'fire':
      starPath(g, 0, 0, s * 0.9, s * 0.42);
      g.fill();
      break;
    case 'dash':
      for (const o of [-0.35, 0.35]) {
        g.beginPath();
        g.moveTo((o - 0.3) * s, -s * 0.6);
        g.lineTo((o + 0.3) * s, 0);
        g.lineTo((o - 0.3) * s, s * 0.6);
        g.lineWidth = s * 0.22;
        g.stroke();
      }
      break;
    case 'turbo':
      g.beginPath();
      g.moveTo(s * 0.15, -s * 0.95);
      g.lineTo(-s * 0.55, s * 0.12);
      g.lineTo(-s * 0.02, s * 0.12);
      g.lineTo(-s * 0.2, s * 0.95);
      g.lineTo(s * 0.55, -s * 0.15);
      g.lineTo(s * 0.02, -s * 0.15);
      g.closePath();
      g.fill();
      break;
    case 'pause':
      g.fillRect(-s * 0.55, -s * 0.7, s * 0.38, s * 1.4);
      g.fillRect(s * 0.17, -s * 0.7, s * 0.38, s * 1.4);
      break;
    case 'again':
      g.beginPath();
      g.arc(0, 0, s * 0.7, -Math.PI * 0.2, Math.PI * 1.45);
      g.lineWidth = s * 0.26;
      g.stroke();
      g.beginPath();
      g.moveTo(s * 0.95, -s * 0.75);
      g.lineTo(s * 0.98, s * 0.05);
      g.lineTo(s * 0.2, -s * 0.2);
      g.closePath();
      g.fill();
      break;
    case 'home':
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.05);
      g.lineTo(0, -s * 0.85);
      g.lineTo(s * 0.85, -s * 0.05);
      g.lineWidth = s * 0.2;
      g.stroke();
      g.fillRect(-s * 0.55, -s * 0.15, s * 1.1, s * 0.85);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(-s * 0.15, s * 0.2, s * 0.3, s * 0.5);
      break;
    case 'clock':
      g.beginPath();
      g.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      g.lineWidth = s * 0.2;
      g.stroke();
      g.beginPath();
      g.moveTo(0, -s * 0.45);
      g.lineTo(0, 0);
      g.lineTo(s * 0.35, s * 0.2);
      g.lineWidth = s * 0.18;
      g.stroke();
      break;
    case 'hat':
      g.beginPath();
      g.moveTo(-s * 0.6, s * 0.45);
      g.lineTo(0, -s * 0.8);
      g.lineTo(s * 0.6, s * 0.45);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(0, -s * 0.8, s * 0.16, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-s * 0.8, s * 0.4, s * 1.6, s * 0.22);
      break;
    case 'book':
      g.fillRect(-s * 0.8, -s * 0.6, s * 0.74, s * 1.2);
      g.fillRect(s * 0.06, -s * 0.6, s * 0.74, s * 1.2);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (const y of [-0.3, 0, 0.3]) {
        g.fillRect(-s * 0.65, y * s, s * 0.45, s * 0.08);
        g.fillRect(s * 0.2, y * s, s * 0.45, s * 0.08);
      }
      break;
    case 'paw':
      g.beginPath();
      g.ellipse(0, s * 0.25, s * 0.42, s * 0.36, 0, 0, Math.PI * 2);
      g.fill();
      for (const [x, y] of [[-0.55, -0.25], [-0.2, -0.6], [0.2, -0.6], [0.55, -0.25]]) {
        g.beginPath();
        g.arc(x * s, y * s, s * 0.17, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'map':
      g.beginPath();
      g.moveTo(-s * 0.8, -s * 0.5);
      g.lineTo(-s * 0.25, -s * 0.7);
      g.lineTo(s * 0.25, -s * 0.5);
      g.lineTo(s * 0.8, -s * 0.7);
      g.lineTo(s * 0.8, s * 0.6);
      g.lineTo(s * 0.25, s * 0.8);
      g.lineTo(-s * 0.25, s * 0.6);
      g.lineTo(-s * 0.8, s * 0.8);
      g.closePath();
      g.fill();
      g.fillStyle = '#ff4f6d';
      g.beginPath();
      g.arc(s * 0.2, -s * 0.05, s * 0.18, 0, Math.PI * 2);
      g.fill();
      break;
    case 'tab-hat':
      icon(g, 'hat', s, alpha, '#2b2a6b');
      break;
    case 'tab-fur':
      g.fillStyle = '#f2952c';
      g.beginPath();
      g.arc(0, 0, s * 0.75, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff3dc';
      g.beginPath();
      g.ellipse(s * 0.1, s * 0.3, s * 0.4, s * 0.28, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'tab-pack':
      g.fillStyle = '#e8463d';
      g.fillRect(-s * 0.5, -s * 0.7, s, s * 1.4);
      g.fillStyle = '#ffe28a';
      g.beginPath();
      g.arc(s * 0.15, s * 0.15, s * 0.18, 0, Math.PI * 2);
      g.fill();
      break;
    case 'jump2':
      for (const dy of [-0.35, 0.35]) {
        g.beginPath();
        g.moveTo(-s * 0.55, dy * s + s * 0.25);
        g.lineTo(0, dy * s - s * 0.3);
        g.lineTo(s * 0.55, dy * s + s * 0.25);
        g.lineWidth = s * 0.24;
        g.stroke();
      }
      break;
    case 'gear': {
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? s * 0.62 : s * 0.85;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fill();
      break;
    }
    case 'games': {
      const t = s * 0.62;
      const cols = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae'];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, y], i) => {
        g.fillStyle = cols[i];
        const px = x < 0 ? -t - s * 0.06 : s * 0.06;
        const py = y < 0 ? -t - s * 0.06 : s * 0.06;
        g.beginPath();
        g.roundRect ? g.roundRect(px, py, t, t, t * 0.22) : g.rect(px, py, t, t);
        g.fill();
      });
      break;
    }
    default:
      break;
  }
  g.restore();
}
