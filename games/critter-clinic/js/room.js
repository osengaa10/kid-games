// The two rooms, drawn in code. The still parts are baked once per resize onto a canvas
// (bakeExam, bakeWaiting); the moving parts (the scale's needle, the height bar, the fish) are
// drawn every frame on top.
import { rrect, ellipse, starPath, heartPath, shade, withAlpha } from './style.js';

function canvas(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return { c, g };
}

function wall(g, w, h, floorY, top, bottom, dot) {
  const grd = g.createLinearGradient(0, 0, 0, floorY);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, floorY);
  // a soft pattern of little plus signs
  g.fillStyle = dot;
  const step = Math.max(36, Math.min(w, h) * 0.07);
  for (let y = step * 0.5, row = 0; y < floorY - step * 0.5; y += step, row++) {
    for (let x = (row % 2) * step * 0.5 + step * 0.25; x < w; x += step) {
      const s = step * 0.09;
      g.fillRect(x - s, y - s * 0.32, s * 2, s * 0.64);
      g.fillRect(x - s * 0.32, y - s, s * 0.64, s * 2);
    }
  }
}

function floor(g, w, h, y, a, b, tile) {
  g.fillStyle = a;
  g.fillRect(0, y, w, h - y);
  // checker tiles in perspective-free rows
  const s = tile;
  g.fillStyle = b;
  for (let yy = y, r = 0; yy < h; yy += s * 0.6, r++) for (let x = (r % 2) * s; x < w; x += s * 2) g.fillRect(x, yy, s, s * 0.6);
  // baseboard
  g.fillStyle = '#ffffff';
  g.fillRect(0, y - 6, w, 8);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  g.fillRect(0, y + 2, w, 4);
}

// ------------------------------------------------------------------------------- exam room

export function bakeExam(L, dpr) {
  const { w, h, u, floorY } = L;
  const { c, g } = canvas(w, h, dpr);
  wall(g, w, h, floorY, '#e6f8f2', '#cfeee5', 'rgba(255,255,255,0.55)');
  // lower wall panel
  const wy = floorY - 2.2 * u;
  g.fillStyle = '#b9e4d8';
  g.fillRect(0, wy, w, floorY - wy);
  g.fillStyle = '#ffffff';
  g.fillRect(0, wy - 5, w, 7);
  floor(g, w, h, floorY, '#f6efe4', '#ebe0cf', Math.max(30, u * 1.4));

  if (L.landscape) counter(g, L);
  else posters(g, L);
  heightChart(g, L);
  examTable(g, L);
  scalePlatform(g, L);
  monitorFrame(g, L);
  return c;
}

function heightChart(g, L) {
  const { u, chart } = L;
  const x = chart.x;
  const cw = chart.w;
  const top = chart.top;
  const bottom = chart.bottom;
  // the ruler: rainbow bands from the floor up
  const bands = ['#ff6b6b', '#ff9f43', '#ffd166', '#6bd68a', '#4cc9f0', '#7b8cff', '#c77dff'];
  const H = bottom - top;
  g.save();
  rrect(g, x, top, cw, H, cw * 0.3);
  g.clip();
  bands.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(x, bottom - (H * (i + 1)) / bands.length, cw, H / bands.length + 1);
  });
  // tick marks every half unit, long ones every unit
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  for (let k = 1; k * 0.5 * u < H; k++) {
    const y = bottom - k * 0.5 * u;
    g.lineWidth = k % 2 ? 1.5 : 3;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + cw * (k % 2 ? 0.28 : 0.5), y);
    g.stroke();
  }
  // a star every two units
  g.fillStyle = '#ffffff';
  for (let k = 2; k * u < H - u * 0.5; k += 2) {
    starPath(g, x + cw * 0.72, bottom - k * u, cw * 0.17, cw * 0.075);
    g.fill();
  }
  g.restore();
  rrect(g, x, top, cw, H, cw * 0.3);
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(40,90,90,0.25)';
  g.stroke();
  // a little giraffe-free topper: a smiling sun
  ellipse(g, x + cw / 2, top - cw * 0.05, cw * 0.42, cw * 0.42, '#ffd166', '#f4a72a', 3);
  g.fillStyle = '#7a4a10';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(x + cw / 2 + s * cw * 0.14, top - cw * 0.1, cw * 0.045, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(x + cw / 2, top - cw * 0.04, cw * 0.17, 0.2 * Math.PI, 0.8 * Math.PI);
  g.lineWidth = 2;
  g.strokeStyle = '#7a4a10';
  g.stroke();
}

function examTable(g, L) {
  const { u, table, floorY } = L;
  const x0 = table.x - table.w / 2;
  const top = table.y;
  // cabinet
  const inset = 0.45 * u;
  const cx = x0 + inset;
  const cwid = table.w - inset * 2;
  const cy = top + 0.42 * u;
  rrect(g, cx, cy, cwid, floorY - cy + 2, 0.25 * u);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#cfd9e0';
  g.stroke();
  // drawers
  const dh = (floorY - cy - 0.5 * u) / 2;
  for (let i = 0; i < 2; i++) {
    const dy = cy + 0.25 * u + i * (dh + 0.1 * u);
    rrect(g, cx + 0.25 * u, dy, cwid - 0.5 * u, dh - 0.1 * u, 0.15 * u);
    g.fillStyle = '#eef4f7';
    g.fill();
    g.strokeStyle = '#d5e0e6';
    g.lineWidth = 2;
    g.stroke();
    rrect(g, table.x - 0.6 * u, dy + dh * 0.32, 1.2 * u, 0.18 * u, 0.09 * u);
    g.fillStyle = '#a7b6c2';
    g.fill();
  }
  // the padded top and the paper sheet over it
  rrect(g, x0, top - 0.05 * u, table.w, 0.5 * u, 0.22 * u);
  g.fillStyle = '#2bb3a3';
  g.fill();
  g.fillStyle = shade('#2bb3a3', -0.18);
  g.fillRect(x0 + 0.2 * u, top + 0.32 * u, table.w - 0.4 * u, 0.1 * u);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillRect(x0 + 0.7 * u, top - 0.06 * u, table.w - 1.4 * u, 0.3 * u);
  // the paper roll at the end
  ellipse(g, x0 + table.w - 0.3 * u, top + 0.08 * u, 0.32 * u, 0.32 * u, '#ffffff', '#cfd9e0', 2);
  ellipse(g, x0 + table.w - 0.3 * u, top + 0.08 * u, 0.1 * u, 0.1 * u, '#dfe7ec');
}

function scalePlatform(g, L) {
  const { u, scale, floorY } = L;
  const w = scale.w;
  rrect(g, scale.x - w / 2, scale.y, w, floorY - scale.y + 0.12 * u, 0.18 * u);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#b8c7d1';
  g.stroke();
  rrect(g, scale.x - w / 2 + 0.2 * u, scale.y + 0.06 * u, w - 0.4 * u, 0.12 * u, 0.06 * u);
  g.fillStyle = '#d8e3ea';
  g.fill();
  // two footprints, so he knows where to stand
  g.fillStyle = 'rgba(43,179,163,0.35)';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(scale.x + s * 0.5 * u, scale.y + 0.12 * u, 0.28 * u, 0.06 * u, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function monitorFrame(g, L) {
  const m = L.monitor;
  const b = Math.max(8, m.w * 0.045);
  // the arm it hangs on
  g.fillStyle = '#9fb0bc';
  g.fillRect(m.x + m.w / 2 - b * 0.6, m.y + m.h - b, b * 1.2, b * 2.2);
  rrect(g, m.x, m.y, m.w, m.h, b * 1.4);
  g.fillStyle = '#34424f';
  g.fill();
  rrect(g, m.x + 2, m.y + 2, m.w - 4, m.h * 0.5, b * 1.3);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fill();
  // a little green power light
  ellipse(g, m.x + m.w - b * 1.3, m.y + m.h - b * 0.55, b * 0.22, b * 0.22, '#46e07a');
}

// The inside of the monitor's screen (what monitor.js draws into).
export function screenRect(L) {
  const m = L.monitor;
  const b = Math.max(8, m.w * 0.045);
  return { x: m.x + b, y: m.y + b, w: m.w - b * 2, h: m.h - b * 2.1, r: b * 0.8 };
}

// Under the monitor when held sideways: a counter with a sink and jars of clinic things.
function counter(g, L) {
  const { u, monitor: m, floorY } = L;
  const top = Math.max(m.y + m.h + L.gap * 4, floorY - 3.2 * u);
  const x = m.x - 0.2 * u;
  const w = Math.min(L.w - x - L.edge * 0.5, m.w + 0.4 * u);
  // jars on the counter
  const jars = [
    ['#ffffff', 'cotton'],
    ['#ffd166', 'sticks'],
    ['#ff6b9d', 'lollipops'],
  ];
  const jw = Math.min(1.1 * u, w / 4.2);
  jars.forEach(([col, kind], i) => {
    const jx = x + w * 0.18 + i * (w * 0.3);
    const jh = jw * 1.25;
    const jy = top - jh;
    if (kind === 'sticks') {
      g.fillStyle = '#e9c99a';
      for (let k = -2; k <= 2; k++) g.fillRect(jx + k * jw * 0.13 - jw * 0.05, jy - jh * 0.45 - Math.abs(k) * 2, jw * 0.1, jh * 0.6);
    }
    if (kind === 'lollipops') {
      for (let k = -1; k <= 1; k++) {
        g.fillStyle = '#ffffff';
        g.fillRect(jx + k * jw * 0.22 - 1.5, jy - jh * 0.5, 3, jh * 0.6);
        ellipse(g, jx + k * jw * 0.22, jy - jh * 0.52, jw * 0.17, jw * 0.17, ['#ff6b9d', '#ffd166', '#6bd68a'][k + 1], '#ffffff', 2);
      }
    }
    rrect(g, jx - jw / 2, jy, jw, jh, jw * 0.2);
    g.fillStyle = 'rgba(220,245,255,0.55)';
    g.fill();
    g.strokeStyle = 'rgba(120,170,190,0.6)';
    g.lineWidth = 2;
    g.stroke();
    if (kind === 'cotton') for (const [dx, dy] of [[-0.2, 0.55], [0.15, 0.6], [0, 0.35], [-0.15, 0.78], [0.2, 0.8]]) ellipse(g, jx + dx * jw, jy + dy * jh, jw * 0.17, jw * 0.15, col, '#e3e8ef', 1.5);
    rrect(g, jx - jw * 0.55, jy - jw * 0.12, jw * 1.1, jw * 0.18, jw * 0.08);
    g.fillStyle = col === '#ffffff' ? '#7fd1c7' : col;
    g.fill();
  });
  // the counter itself
  rrect(g, x, top, w, 0.32 * u, 0.12 * u);
  g.fillStyle = '#ffffff';
  g.fill();
  g.strokeStyle = '#cfd9e0';
  g.lineWidth = 2;
  g.stroke();
  rrect(g, x + 0.15 * u, top + 0.32 * u, w - 0.3 * u, floorY - top - 0.3 * u, 0.15 * u);
  g.fillStyle = '#7fd1c7';
  g.fill();
  const doors = 2;
  for (let i = 0; i < doors; i++) {
    const dx = x + 0.3 * u + i * ((w - 0.6 * u) / doors);
    rrect(g, dx + 0.08 * u, top + 0.5 * u, (w - 0.6 * u) / doors - 0.16 * u, floorY - top - 0.75 * u, 0.12 * u);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fill();
    ellipse(g, dx + ((w - 0.6 * u) / doors) * (i ? 0.2 : 0.8), top + 1.2 * u, 0.08 * u, 0.08 * u, '#ffffff');
  }
}

// Above the patient when held upright: a heart poster and an eye chart made of shapes.
function posters(g, L) {
  const { u, monitor: m } = L;
  const x0 = L.chart.x + L.chart.w + L.gap * 2;
  const x1 = m.x - L.gap * 2;
  const top = m.y + L.gap;
  const bottom = Math.min(m.y + m.h, L.chart.top + 1.5 * u);
  const ph = Math.min(bottom - top, 3.6 * u);
  const pw = Math.min(ph * 0.75, (x1 - x0) / 2 - L.gap);
  if (pw < 30) return;
  // heart poster
  let px = x0 + ((x1 - x0) / 2 - pw) / 2;
  rrect(g, px, top, pw, ph, 8);
  g.fillStyle = '#ffffff';
  g.fill();
  g.strokeStyle = '#ffb3c7';
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = '#ff5c8a';
  heartPath(g, px + pw / 2, top + ph * 0.42, pw * 0.3);
  g.fill();
  g.strokeStyle = '#ff5c8a';
  g.lineWidth = 3;
  g.beginPath();
  const ly = top + ph * 0.8;
  g.moveTo(px + pw * 0.12, ly);
  g.lineTo(px + pw * 0.38, ly);
  g.lineTo(px + pw * 0.45, ly - ph * 0.08);
  g.lineTo(px + pw * 0.53, ly + ph * 0.06);
  g.lineTo(px + pw * 0.6, ly);
  g.lineTo(px + pw * 0.88, ly);
  g.stroke();
  // eye chart, with shapes instead of letters
  px = x0 + (x1 - x0) / 2 + ((x1 - x0) / 2 - pw) / 2;
  rrect(g, px, top, pw, ph, 8);
  g.fillStyle = '#ffffff';
  g.fill();
  g.strokeStyle = '#a8d8ff';
  g.lineWidth = 4;
  g.stroke();
  const rows = [[1, 0.13], [2, 0.09], [3, 0.065], [4, 0.048], [5, 0.036]];
  const cols = ['#ff6b6b', '#4cc9f0', '#6bd68a', '#ffb703', '#9b5de5'];
  let y = top + ph * 0.16;
  rows.forEach(([n, s], ri) => {
    const r = pw * s;
    for (let i = 0; i < n; i++) {
      const cx = px + pw / 2 + (i - (n - 1) / 2) * r * 2.6;
      g.fillStyle = cols[(i + ri) % cols.length];
      const k = (i + ri) % 3;
      g.beginPath();
      if (k === 0) g.arc(cx, y, r, 0, Math.PI * 2);
      else if (k === 1) g.rect(cx - r, y - r, r * 2, r * 2);
      else starPath(g, cx, y, r * 1.15, r * 0.5);
      g.fill();
    }
    y += r * 2 + ph * 0.06;
  });
}

// The scale's little dial on the front of the platform (the monitor shows the big one).
export function drawScaleDial(g, L, turn) {
  const { u, scale } = L;
  const r = 0.2 * u;
  const cx = scale.x + scale.w * 0.32;
  const cy = scale.y + (L.floorY - scale.y) * 0.62;
  ellipse(g, cx, cy, r, r, '#ffffff', '#8aa1b1', 2);
  const a = -Math.PI / 2 + turn * Math.PI * 2;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
  g.lineWidth = 2;
  g.strokeStyle = '#ff4d4d';
  g.stroke();
}

// The height bar: a slider on the chart with a bar reaching out over the patient's head.
// y is the bottom edge of the bar on screen; glow makes it pulse ("drag me").
export function drawHeightBar(g, L, y, glow = 0, t = 0) {
  const { u, chart } = L;
  const x = chart.x - 0.12 * u;
  const len = 4.4 * u;
  const th = 0.3 * u;
  if (glow > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    g.save();
    g.shadowColor = withAlpha('#ffd60a', 0.9);
    g.shadowBlur = 18 + 14 * pulse;
    rrect(g, x, y - th, len, th, th / 2);
    g.fillStyle = withAlpha('#ffd60a', 0.6 * glow);
    g.fill();
    g.restore();
  }
  // slider block on the chart
  rrect(g, x, y - th * 1.9, chart.w + 0.24 * u, th * 2.4, 0.14 * u);
  g.fillStyle = '#ff6b6b';
  g.fill();
  g.strokeStyle = '#c94545';
  g.lineWidth = 2.5;
  g.stroke();
  // the bar
  rrect(g, x, y - th, len, th, th / 2);
  g.fillStyle = '#ff8787';
  g.fill();
  g.stroke();
  // the knob he grabs
  ellipse(g, x + len, y - th / 2, th * 0.95, th * 0.95, '#ffd166', '#e09b16', 2.5);
}

export function heightBarKnob(L, y) {
  const { u, chart } = L;
  return { x: chart.x - 0.12 * u + 4.4 * u, y: y - 0.15 * u };
}

// ----------------------------------------------------------------------------- waiting room

export function bakeWaiting(W, dpr) {
  const { w, h, u, floorY } = W;
  const { c, g } = canvas(w, h, dpr);
  wall(g, w, h, floorY, '#fff6dc', '#ffe8b5', 'rgba(255,255,255,0.6)');
  floor(g, w, h, floorY, '#cfe3ff', '#c0d8fb', Math.max(30, u * 1.4));
  bunting(g, W);
  windowView(g, W);
  // the door to the exam room, on the right
  const dw = Math.min(3.4 * u, w * 0.16);
  const dh = Math.min(7.6 * u, floorY - W.top - W.logoH * 0.4);
  const dx = w - W.edge - dw - 0.3 * u;
  if (dx > W.chairs[2].x + 2.6 * u) {
    rrect(g, dx, floorY - dh, dw, dh + 2, 0.3 * u);
    g.fillStyle = '#7fd1c7';
    g.fill();
    g.strokeStyle = '#4fa79c';
    g.lineWidth = 4;
    g.stroke();
    ellipse(g, dx + dw / 2, floorY - dh * 0.72, dw * 0.24, dw * 0.24, '#e6f8ff', '#4fa79c', 4);
    ellipse(g, dx + dw * 0.82, floorY - dh * 0.45, 0.13 * u, 0.13 * u, '#ffd166', '#c99a2e', 2);
    // a heart sign over the door
    g.fillStyle = '#ff5c8a';
    heartPath(g, dx + dw / 2, floorY - dh - 0.75 * u, 0.48 * u);
    g.fill();
  }
  // a fish tank on the left (the fish swim in drawWaitingLive)
  const tank = fishTank(W);
  if (tank) {
    rrect(g, tank.x - 0.2 * u, tank.y + tank.h, tank.w + 0.4 * u, floorY - tank.y - tank.h + 2, 0.15 * u);
    g.fillStyle = '#d9a46c';
    g.fill();
    rrect(g, tank.x, tank.y, tank.w, tank.h, 0.2 * u);
    const grd = g.createLinearGradient(0, tank.y, 0, tank.y + tank.h);
    grd.addColorStop(0, '#9be3ff');
    grd.addColorStop(1, '#3fa9e0');
    g.fillStyle = grd;
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = '#f2d39b';
    g.fillRect(tank.x + 3, tank.y + tank.h * 0.84, tank.w - 6, tank.h * 0.16 - 3);
    g.strokeStyle = '#3cb371';
    g.lineWidth = 3;
    for (const k of [0.2, 0.75]) {
      g.beginPath();
      g.moveTo(tank.x + tank.w * k, tank.y + tank.h * 0.86);
      g.quadraticCurveTo(tank.x + tank.w * (k + 0.06), tank.y + tank.h * 0.6, tank.x + tank.w * k, tank.y + tank.h * 0.38);
      g.stroke();
    }
  }
  // the chairs (the seats and backs; the patients sit on them)
  const cols = ['#ff8fab', '#7bd389', '#8fb8ff'];
  W.chairs.forEach((ch, i) => {
    const col = cols[i % cols.length];
    const cw = 3.6 * u;
    // back
    rrect(g, ch.x - cw / 2 + 0.2 * u, ch.y - 4.4 * u, cw - 0.4 * u, 4.5 * u, 0.6 * u);
    g.fillStyle = col;
    g.fill();
    g.strokeStyle = shade(col, -0.25);
    g.lineWidth = 3;
    g.stroke();
    // legs
    g.fillStyle = '#9aa7b3';
    for (const s of [-1, 1]) g.fillRect(ch.x + s * (cw / 2 - 0.4 * u) - 0.1 * u, ch.y + 0.3 * u, 0.2 * u, floorY - ch.y - 0.3 * u + 2);
    // seat
    rrect(g, ch.x - cw / 2, ch.y - 0.05 * u, cw, 0.45 * u, 0.2 * u);
    g.fillStyle = shade(col, -0.08);
    g.fill();
    g.stroke();
  });
  return c;
}

// A big window with a sunny sky, when the wall has room for one (held upright).
function windowView(g, W) {
  const { w, u } = W;
  const top = W.top + W.logoH + W.gap * 2 + Math.min(1.2 * u, 50) * 2 + 20;
  const bottom = Math.min(...W.chairs.map((c) => c.y)) - 9.4 * u;
  const hh = bottom - top;
  if (hh < 140) return;
  const ww = Math.min(w * 0.7, hh * 1.4);
  const x = (w - ww) / 2;
  const fr = Math.max(8, ww * 0.03);
  rrect(g, x - fr, top - fr, ww + fr * 2, hh + fr * 2, fr * 1.5);
  g.fillStyle = '#ffffff';
  g.fill();
  g.save();
  rrect(g, x, top, ww, hh, fr);
  g.clip();
  const sky = g.createLinearGradient(0, top, 0, top + hh);
  sky.addColorStop(0, '#7fd3ff');
  sky.addColorStop(1, '#d6f3ff');
  g.fillStyle = sky;
  g.fillRect(x, top, ww, hh);
  // sun
  const sr = hh * 0.12;
  const sx = x + ww * 0.78;
  const sy = top + hh * 0.26;
  g.strokeStyle = '#ffd166';
  g.lineWidth = sr * 0.18;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.beginPath();
    g.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3);
    g.lineTo(sx + Math.cos(a) * sr * 1.7, sy + Math.sin(a) * sr * 1.7);
    g.stroke();
  }
  ellipse(g, sx, sy, sr, sr, '#ffd60a');
  // clouds
  for (const [cx, cy, s] of [[0.25, 0.25, 1], [0.52, 0.42, 0.75]]) {
    const r = hh * 0.08 * s;
    for (const [dx, dy, k] of [[0, 0, 1], [1.1, 0.2, 0.8], [-1.1, 0.2, 0.8], [0.5, -0.5, 0.85]]) ellipse(g, x + ww * cx + dx * r, top + hh * cy + dy * r, r * k * 1.2, r * k, '#ffffff');
  }
  // hills and a little tree
  ellipse(g, x + ww * 0.25, top + hh * 1.05, ww * 0.45, hh * 0.32, '#7bd389');
  ellipse(g, x + ww * 0.8, top + hh * 1.1, ww * 0.45, hh * 0.3, '#5cc174');
  g.fillStyle = '#9c6b3d';
  g.fillRect(x + ww * 0.3 - hh * 0.02, top + hh * 0.6, hh * 0.04, hh * 0.18);
  ellipse(g, x + ww * 0.3, top + hh * 0.56, hh * 0.1, hh * 0.1, '#3cb371');
  g.restore();
  // window bars
  g.fillStyle = '#ffffff';
  g.fillRect(x + ww / 2 - fr / 2, top, fr, hh);
  g.fillRect(x, top + hh / 2 - fr / 2, ww, fr);
}

// Party flags strung across the wall under the logo, in two swags.
function bunting(g, W) {
  const { w, u } = W;
  const y0 = W.top + W.logoH + W.gap;
  const sag = Math.min(1.2 * u, 50);
  const flag = Math.max(14, Math.min(0.75 * u, 34));
  const cols = ['#ff5c8a', '#ffd166', '#2bb3a3', '#4cc9f0', '#9b5de5', '#ff9f43'];
  const swags = [[-flag, w / 2], [w / 2, w + flag]];
  let n = 0;
  for (const [a, b] of swags) {
    const cx = (a + b) / 2;
    const at = (k) => ({ x: a + (b - a) * k, y: y0 + Math.sin(Math.PI * k) * sag });
    g.beginPath();
    g.moveTo(a, y0);
    g.quadraticCurveTo(cx, y0 + sag * 2, b, y0);
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(120,90,60,0.5)';
    g.stroke();
    const count = Math.max(4, Math.round((b - a) / (flag * 1.6)));
    for (let i = 0; i < count; i++) {
      const p = at((i + 0.5) / count);
      g.beginPath();
      g.moveTo(p.x - flag * 0.5, p.y);
      g.lineTo(p.x + flag * 0.5, p.y);
      g.lineTo(p.x, p.y + flag * 1.1);
      g.closePath();
      g.fillStyle = cols[n++ % cols.length];
      g.fill();
    }
  }
}

export function fishTank(W) {
  const { u, floorY } = W;
  const w = Math.min(3.2 * u, W.chairs[0].x - 2.4 * u - W.edge * 2);
  if (w < 2 * u) return null;
  const x = W.edge + 0.3 * u;
  const h = w * 0.62;
  return { x, y: floorY - 2.8 * u - h, w, h };
}

// The fish in the tank, swimming back and forth.
export function drawFish(g, W, t) {
  const tank = fishTank(W);
  if (!tank) return;
  const fish = [['#ff8c42', 0.35, 0.3, 0.6], ['#ffd166', 0.6, 0.55, 0.45], ['#ff5c8a', 0.45, 0.72, 0.8]];
  for (const [col, y, ph, sp] of fish) {
    const k = (Math.sin(t * sp + ph * 7) + 1) / 2;
    const dir = Math.cos(t * sp + ph * 7) > 0 ? 1 : -1;
    const fx = tank.x + tank.w * (0.15 + 0.7 * k);
    const fy = tank.y + tank.h * y + Math.sin(t * 2 + ph * 9) * 3;
    const s = tank.w * 0.07;
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(fx, fy, s, s * 0.65, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(fx - dir * s * 0.8, fy);
    g.lineTo(fx - dir * s * 1.6, fy - s * 0.55);
    g.lineTo(fx - dir * s * 1.6, fy + s * 0.55);
    g.closePath();
    g.fill();
    g.fillStyle = '#1d2b36';
    g.beginPath();
    g.arc(fx + dir * s * 0.45, fy - s * 0.12, s * 0.13, 0, Math.PI * 2);
    g.fill();
  }
  // bubbles
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.35 + i * 0.27) % 1;
    g.beginPath();
    g.arc(tank.x + tank.w * (0.82 + Math.sin(t * 3 + i) * 0.02), tank.y + tank.h * (0.85 - k * 0.8), 2 + i * 0.7, 0, Math.PI * 2);
    g.fill();
  }
}
