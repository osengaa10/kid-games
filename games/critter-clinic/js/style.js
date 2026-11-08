// The look: bold "sticker" outlines in a darker shade of each thing's own color (never black),
// flat fills with one soft highlight. Small drawing helpers shared by the art files, copied from
// Turbo Quest's art/style.js. They draw in whatever units the caller has scaled to.

export function ellipse(g, x, y, rx, ry, fill, stroke = null, lw = 0.08, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot, 0, Math.PI * 2);
  fillStroke(g, fill, stroke, lw);
}

export function rrect(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// A rounded stick from (x0, y0) to (x1, y1), r wide on each side (arms, legs, handles).
export function capsule(g, x0, y0, x1, y1, r) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.beginPath();
  g.arc(x0, y0, r, a + Math.PI / 2, a - Math.PI / 2);
  g.arc(x1, y1, r, a - Math.PI / 2, a + Math.PI / 2);
  g.closePath();
}

export function fillStroke(g, fill, stroke, lw = 0.08) {
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function starPath(g, cx, cy, ro, ri, points = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / points;
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
}

export function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.85);
  g.bezierCurveTo(cx - s * 1.25, cy + s * 0.05, cx - s * 0.75, cy - s * 0.95, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.75, cy - s * 0.95, cx + s * 1.25, cy + s * 0.05, cx, cy + s * 0.85);
  g.closePath();
}

// A soft round glow (the tool spots, the penlight, the monitor).
export function glow(g, x, y, r, color, alpha = 1) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, withAlpha(color, alpha));
  grd.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// '#rrggbb' + alpha → 'rgba(...)'.
export function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Lighter (k > 0) or darker (k < 0) version of a '#rrggbb' color.
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  const r = f((n >> 16) & 255);
  const gg = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}

export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
