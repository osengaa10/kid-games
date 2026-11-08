// World 1, Jungle Jamboree: tiles, platforms, props and the parallax backdrop.
// Ground tiles are auto-tiled: grass on top, rounded grass ends where a side is open, dirt that
// gets darker with depth, and a shadow band on open sides.
import { sprite } from '../engine/sprites.js';
import { ellipse, rrect, fillStroke, starPath, shade, glow } from './style.js';
import { hash } from '../engine/rng.js';

export const J = {
  grass: '#62cf45',
  grassLight: '#9ae66d',
  grassDark: '#2e9440',
  dirt: ['#c4844a', '#b0723c', '#9a6232'],
  pebble: '#8d5a2c',
  root: '#7a4a22',
  bamboo: '#b8d65a',
  bambooDark: '#6f8f22',
  wood: '#c98a4b',
  woodDark: '#7b4a1f',
  rope: '#e6cf98',
};

// ------------------------------------------------------------------------------ ground tiles
// top: grass on it; l, r: that side is open; depth: rows below the surface (0 = top).
export const groundTile = (top, l, r, depth, v) =>
  sprite(`j-g${top ? 1 : 0}${l ? 1 : 0}${r ? 1 : 0}${Math.min(depth, 2)}${v}`, 1, 1, (g) => {
    const d = Math.min(depth, 2);
    g.fillStyle = J.dirt[d];
    g.fillRect(0, 0, 1, 1);
    // pebbles and roots
    for (let i = 0; i < 4; i++) {
      const x = 0.12 + hash(v * 11 + i * 3 + d) * 0.76;
      const y = (top ? 0.48 : 0.12) + hash(v * 5 + i * 7 + d) * (top ? 0.42 : 0.76);
      ellipse(g, x, y, 0.055, 0.038, shade(J.dirt[d], -0.18));
    }
    if (v === 1 && !top) {
      g.beginPath();
      g.moveTo(0.2, 0.0);
      g.quadraticCurveTo(0.35, 0.4, 0.25, 0.75);
      g.lineWidth = 0.04;
      g.strokeStyle = shade(J.root, d * -0.1);
      g.stroke();
    }
    if (l) {
      g.fillStyle = 'rgba(70,30,10,0.22)';
      g.fillRect(0, 0, 0.09, 1);
    }
    if (r) {
      g.fillStyle = 'rgba(70,30,10,0.22)';
      g.fillRect(0.91, 0, 0.09, 1);
    }
    if (!top) return;
    // grass, with leafy scallops hanging over the dirt and rounded open ends
    g.save();
    g.beginPath();
    const x0 = l ? 0.04 : 0;
    const x1 = r ? 0.96 : 1;
    g.moveTo(x0, 0.12);
    g.quadraticCurveTo(x0, 0, l ? 0.14 : 0, 0);
    g.lineTo(r ? 0.86 : 1, 0);
    g.quadraticCurveTo(x1, 0, x1, 0.12);
    g.lineTo(x1, 0.3);
    const n = 4;
    for (let i = n; i > 0; i--) {
      const xa = x0 + ((x1 - x0) * i) / n;
      const xb = x0 + ((x1 - x0) * (i - 1)) / n;
      g.quadraticCurveTo((xa + xb) / 2, 0.47 + hash(v + i) * 0.05, xb, 0.3);
    }
    g.closePath();
    g.fillStyle = J.grass;
    g.fill();
    g.lineWidth = 0.035;
    g.strokeStyle = J.grassDark;
    g.stroke();
    g.restore();
    g.fillStyle = J.grassLight;
    rrect(g, l ? 0.12 : 0, 0.035, (r ? 0.88 : 1) - (l ? 0.12 : 0), 0.06, 0.03);
    g.fill();
    // a few blades
    g.strokeStyle = J.grassDark;
    g.lineWidth = 0.025;
    for (let i = 0; i < 3; i++) {
      const x = 0.2 + hash(v * 3 + i) * 0.6;
      g.beginPath();
      g.moveTo(x, 0.22);
      g.lineTo(x + 0.03, 0.14);
      g.stroke();
    }
  });

// Bamboo platform (one-way): two poles lashed together.
export const bambooTile = (l, r) =>
  sprite(`j-bamboo${l ? 1 : 0}${r ? 1 : 0}`, 1, 1, (g) => {
    for (const y of [0.05, 0.19]) {
      rrect(g, l ? 0.02 : -0.02, y, (r ? 0.96 : 1.04) - (l ? 0.02 : -0.02), 0.13, 0.065);
      fillStroke(g, J.bamboo, J.bambooDark, 0.03);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(0.05, y + 0.025, 0.9, 0.025);
      g.strokeStyle = J.bambooDark;
      g.lineWidth = 0.025;
      g.beginPath();
      g.moveTo(0.5, y);
      g.lineTo(0.5, y + 0.13);
      g.stroke();
    }
    g.strokeStyle = J.rope;
    g.lineWidth = 0.035;
    for (const x of [0.22, 0.78]) {
      g.beginPath();
      g.moveTo(x - 0.04, 0.03);
      g.lineTo(x + 0.04, 0.33);
      g.moveTo(x + 0.04, 0.03);
      g.lineTo(x - 0.04, 0.33);
      g.stroke();
    }
  });

// Rope-bridge plank (Kid Mode's helping bridges).
export const bridgeTile = () =>
  sprite('j-bridge', 1, 1, (g) => {
    rrect(g, 0.03, 0.04, 0.94, 0.24, 0.05);
    fillStroke(g, J.wood, J.woodDark, 0.035);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(0.08, 0.08, 0.84, 0.04);
    g.strokeStyle = J.rope;
    g.lineWidth = 0.04;
    g.beginPath();
    g.moveTo(0, 0.14);
    g.lineTo(1, 0.14);
    g.stroke();
  });

// Leafy wall: a bush block with a hint of sparkle (something's behind it).
export const leafyTile = (v) =>
  sprite(`j-leafy${v}`, 1, 1, (g) => {
    g.fillStyle = '#2e8a3c';
    g.fillRect(0, 0, 1, 1);
    for (let i = 0; i < 9; i++) {
      const x = 0.12 + (i % 3) * 0.38 + (hash(v + i) - 0.5) * 0.1;
      const y = 0.15 + Math.floor(i / 3) * 0.35;
      g.save();
      g.translate(x, y);
      g.rotate(hash(i * 3 + v) * 3);
      g.beginPath();
      g.ellipse(0, 0, 0.2, 0.11, 0, 0, Math.PI * 2);
      fillStroke(g, i % 2 ? '#4fbf4a' : '#66d156', '#1f6b2c', 0.025);
      g.restore();
    }
    if (v === 0) {
      starPath(g, 0.7, 0.3, 0.08, 0.025, 4);
      g.fillStyle = '#fff6b0';
      g.fill();
    }
  });

// Brambles (Dad Mode, hurt) or soft daisies (Kid Mode, harmless), in the bottom of the tile.
export const thornTile = (kid) =>
  sprite(kid ? 'j-daisies' : 'j-thorns', 1, 1, (g) => {
    if (kid) {
      for (const [x, y, c] of [[0.2, 0.72, '#ffffff'], [0.5, 0.62, '#ffb3d9'], [0.8, 0.74, '#ffffff']]) {
        g.strokeStyle = J.grassDark;
        g.lineWidth = 0.03;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, 1);
        g.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ellipse(g, x + Math.cos(a) * 0.07, y + Math.sin(a) * 0.07, 0.05, 0.05, c, '#d27aa8', 0.015);
        }
        ellipse(g, x, y, 0.045, 0.045, '#ffd23a');
      }
      return;
    }
    g.strokeStyle = '#2f6b2a';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(0, 0.95);
    g.bezierCurveTo(0.2, 0.4, 0.4, 0.95, 0.55, 0.5);
    g.bezierCurveTo(0.7, 0.2, 0.85, 0.85, 1, 0.55);
    g.stroke();
    g.fillStyle = '#d83a8f';
    for (const [x, y, a] of [[0.15, 0.62, -0.6], [0.4, 0.75, 0.4], [0.55, 0.42, -0.2], [0.75, 0.48, 0.6], [0.92, 0.6, -0.4]]) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-0.05, 0.03);
      g.lineTo(0, -0.12);
      g.lineTo(0.05, 0.03);
      g.closePath();
      g.fill();
      g.restore();
    }
  });

// Bounce flower: a big springy hibiscus cup.
export const flowerTile = () =>
  sprite('j-flower', 1, 1, (g) => {
    g.fillStyle = J.grassDark;
    g.fillRect(0.45, 0.35, 0.1, 0.65);
    for (const [x, y, rot] of [[0.28, 0.78, -0.4], [0.72, 0.7, 0.4]]) ellipse(g, x, y, 0.17, 0.08, J.grass, J.grassDark, 0.03, rot);
    g.beginPath();
    g.moveTo(0.02, 0.1);
    g.quadraticCurveTo(0.5, 0.66, 0.98, 0.1);
    g.closePath();
    fillStroke(g, '#ff5aa5', '#b8236e', 0.045);
    g.beginPath();
    g.moveTo(0.2, 0.12);
    g.quadraticCurveTo(0.5, 0.45, 0.8, 0.12);
    g.lineWidth = 0.03;
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.stroke();
    ellipse(g, 0.5, 0.11, 0.44, 0.08, '#ffa6cf', '#b8236e', 0.035);
    for (const x of [0.3, 0.5, 0.7]) ellipse(g, x, 0.1, 0.035, 0.025, '#fff36b');
  });

export const logSprite = (w) =>
  sprite(`j-log${w}`, w, 0.6, (g) => {
    rrect(g, 0.04, 0.04, w - 0.08, 0.48, 0.22);
    fillStroke(g, '#a8662e', '#5e3412', 0.05);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fillRect(0.25, 0.1, w - 0.5, 0.06);
    g.strokeStyle = 'rgba(94,52,18,0.5)';
    g.lineWidth = 0.025;
    for (let x = 0.7; x < w - 0.5; x += 0.8) {
      g.beginPath();
      g.moveTo(x, 0.22);
      g.lineTo(x + 0.3, 0.26);
      g.stroke();
    }
    for (const x of [0.28, w - 0.28]) {
      ellipse(g, x, 0.28, 0.15, 0.17, '#e2b27a', '#5e3412', 0.035);
      ellipse(g, x, 0.28, 0.07, 0.08, '#c48a4f');
    }
  });

// ------------------------------------------------------------------------------------ props
export const palmTrunk = (h) =>
  sprite(`j-palm${h}`, 1.2, h, (g) => {
    for (let i = 0; i < h * 3; i++) {
      const t = i / (h * 3);
      const y = h - (i + 0.5) / 3;
      const x = 0.6 + Math.sin(t * 2.2) * 0.22 * t;
      ellipse(g, x, y, 0.17 - t * 0.04, 0.2, i % 2 ? '#a9743f' : '#946235', '#5e3a17', 0.025);
    }
  }, 0.6, h);

export const palmCrown = () =>
  sprite('j-crown', 3.2, 2.0, (g) => {
    const leaf = (ang, len, c) => {
      g.save();
      g.translate(1.6, 0.8);
      g.rotate(ang);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(len * 0.5, -0.32, len, 0.25);
      g.quadraticCurveTo(len * 0.5, 0.05, 0, 0);
      fillStroke(g, c, '#1f6b2c', 0.03);
      g.strokeStyle = 'rgba(31,107,44,0.6)';
      g.lineWidth = 0.02;
      g.beginPath();
      g.moveTo(0.05, 0);
      g.quadraticCurveTo(len * 0.5, -0.15, len * 0.95, 0.22);
      g.stroke();
      g.restore();
    };
    leaf(-2.7, 1.4, '#3fae4f');
    leaf(-0.45, 1.4, '#3fae4f');
    leaf(-3.4, 1.3, '#52c25a');
    leaf(0.25, 1.3, '#52c25a');
    leaf(-1.9, 1.1, '#66d16a');
    leaf(-1.2, 1.15, '#66d16a');
    for (const [x, y] of [[1.5, 0.92], [1.7, 0.95], [1.6, 1.06]]) ellipse(g, x, y, 0.1, 0.1, '#7a4a22', '#3e230c', 0.02);
  }, 1.6, 0.85);

export const fernSprite = () =>
  sprite('j-fern', 1.8, 1.1, (g) => {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + 0.35 + (i / 6) * (Math.PI - 0.7);
      g.save();
      g.translate(0.9, 1.08);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(0.45, -0.14, 0.85, 0);
      g.quadraticCurveTo(0.45, 0.14, 0, 0);
      fillStroke(g, i % 2 ? '#3f9e4c' : '#4db55a', '#226b2f', 0.025);
      g.restore();
    }
  }, 0.9, 1.08);

export const tikiSprite = () =>
  sprite('j-tiki', 0.9, 1.5, (g) => {
    rrect(g, 0.12, 0.1, 0.66, 1.38, 0.18);
    fillStroke(g, '#c47a3c', '#6b3a14', 0.04);
    for (const y of [0.55, 1.05]) {
      g.fillStyle = 'rgba(107,58,20,0.35)';
      g.fillRect(0.14, y, 0.62, 0.06);
    }
    ellipse(g, 0.32, 0.38, 0.08, 0.1, '#fff3dc', '#6b3a14', 0.025);
    ellipse(g, 0.58, 0.38, 0.08, 0.1, '#fff3dc', '#6b3a14', 0.025);
    ellipse(g, 0.33, 0.4, 0.035, 0.05, '#3a1d06');
    ellipse(g, 0.59, 0.4, 0.035, 0.05, '#3a1d06');
    g.beginPath();
    g.moveTo(0.28, 0.72);
    g.quadraticCurveTo(0.45, 0.9, 0.62, 0.72);
    g.closePath();
    fillStroke(g, '#7a1f2b', '#6b3a14', 0.025);
    for (const x of [0.2, 0.45, 0.7]) ellipse(g, x, 0.1, 0.09, 0.07, '#5fcf4a', '#2e9440', 0.02);
  }, 0.45, 1.48);

export const flowersSprite = () =>
  sprite('j-flowers', 1.2, 0.6, (g) => {
    for (const [x, y, c] of [[0.25, 0.32, '#ff6fae'], [0.6, 0.22, '#ffd23a'], [0.92, 0.34, '#b48cff']]) {
      g.strokeStyle = '#2e9440';
      g.lineWidth = 0.03;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, 0.6);
      g.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ellipse(g, x + Math.cos(a) * 0.07, y + Math.sin(a) * 0.07, 0.055, 0.055, c);
      }
      ellipse(g, x, y, 0.04, 0.04, '#fff6b0');
    }
  }, 0.6, 0.6);

export const cloudSprite = (kind) =>
  sprite(`j-cloud${kind}`, 3.4, 1.5, (g) => {
    const puffs = [
      [[0.7, 0.95, 0.42], [1.35, 0.7, 0.55], [2.05, 0.82, 0.48], [2.65, 1.0, 0.34]],
      [[0.6, 1.0, 0.36], [1.2, 0.8, 0.46], [1.85, 0.62, 0.5], [2.5, 0.9, 0.4]],
    ][kind % 2];
    for (const [x, y, r] of puffs) ellipse(g, x, y + 0.08, r, r, '#d6ecff');
    for (const [x, y, r] of puffs) ellipse(g, x, y, r * 0.94, r * 0.94, '#ffffff');
  }, 0, 0);

// ----------------------------------------------------------------------------- the backdrop
// Strips painted in pixels that repeat sideways (whole periods across the width, so no seam).
export const SKY = ['#4cb8ff', '#a7e3ff', '#fff2c8'];

export const LAYERS = [
  { name: 'far', factor: 0.1, vfactor: 0.08, height: 0.62 },
  { name: 'mid', factor: 0.25, vfactor: 0.2, height: 0.5 },
  { name: 'near', factor: 0.45, vfactor: 0.36, height: 0.42 },
  { name: 'front', factor: 0.7, vfactor: 0.55, height: 0.22 },
];

function ridge(W, H, base, bumps) {
  return (x) => {
    const t = (x / W) * Math.PI * 2;
    let y = base;
    for (const [p, a, ph] of bumps) y -= a * (0.5 + 0.5 * Math.sin(t * p + ph));
    return y * H;
  };
}

function fillRidge(g, W, H, f, color, rim) {
  g.beginPath();
  g.moveTo(0, H);
  const step = Math.max(4, W / 180);
  for (let x = 0; x <= W + step; x += step) g.lineTo(x, f(x));
  g.lineTo(W, H);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  if (rim) {
    g.beginPath();
    for (let x = 0; x <= W + step; x += step) g.lineTo(x, f(x));
    g.lineWidth = Math.max(2, H * 0.018);
    g.strokeStyle = rim;
    g.stroke();
  }
}

export function paintLayer(g, W, H, L) {
  if (L.name === 'far') {
    // misty mountains, a sleepy volcano and a waterfall
    const f = ridge(W, H, 0.62, [[2, 0.28, 1.1], [5, 0.08, 0.3]]);
    fillRidge(g, W, H, f, '#a6d8e4', '#c6ecf3');
    const vx = W * 0.62;
    g.beginPath();
    g.moveTo(vx - H * 0.55, H);
    g.lineTo(vx - H * 0.12, H * 0.16);
    g.lineTo(vx + H * 0.12, H * 0.16);
    g.lineTo(vx + H * 0.55, H);
    g.closePath();
    g.fillStyle = '#93c8d6';
    g.fill();
    // the crater, and a lazy puff of smoke
    ellipse(g, vx, H * 0.165, H * 0.12, H * 0.025, '#7fb6c6');
    for (let i = 0; i < 3; i++) ellipse(g, vx + i * H * 0.05, H * (0.11 - i * 0.035), H * (0.04 + i * 0.012), H * (0.032 + i * 0.01), 'rgba(255,255,255,0.75)');
    const wx = W * 0.22;
    const wy = f(wx);
    g.fillStyle = 'rgba(235,250,255,0.85)';
    g.fillRect(wx - H * 0.02, wy, H * 0.04, H - wy);
    return;
  }
  if (L.name === 'mid') {
    // jungle canopy: rows of round tree tops
    const f = ridge(W, H, 0.55, [[3, 0.2, 0.4], [7, 0.06, 1.7]]);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * W;
      const r = H * (0.13 + hash(i + 2) * 0.07);
      ellipse(g, x, f(x) - r * 0.2, r, r * 0.85, '#8fd3a0');
    }
    fillRidge(g, W, H, f, '#7cc98f', '#a6e0b2');
    return;
  }
  if (L.name === 'near') {
    // palms and bushes
    const f = ridge(W, H, 0.66, [[5, 0.14, 0.9], [11, 0.06, 0.2]]);
    for (let i = 0; i < 6; i++) {
      const x = ((i + 0.3) / 6) * W;
      const base = f(x);
      const top = Math.max(H * 0.32, base - H * (0.45 + hash(i + 9) * 0.2)); // fronds (up to 0.29 H long) stay inside the strip
      g.strokeStyle = '#4b8f5a';
      g.lineWidth = H * 0.035;
      g.beginPath();
      g.moveTo(x, base);
      g.quadraticCurveTo(x + H * 0.06, (base + top) / 2, x + H * 0.03, top);
      g.stroke();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI + (k / 5) * Math.PI;
        g.save();
        g.translate(x + H * 0.03, top);
        g.rotate(a);
        g.beginPath();
        g.ellipse(H * 0.14, 0, H * 0.15, H * 0.04, 0.3, 0, Math.PI * 2);
        g.fillStyle = '#5aae6a';
        g.fill();
        g.restore();
      }
    }
    fillRidge(g, W, H, f, '#5aa96a', '#78c486');
    return;
  }
  // front: dark bushy fringe
  const f = ridge(W, H, 0.55, [[9, 0.25, 0.3], [17, 0.12, 1.2]]);
  fillRidge(g, W, H, f, '#3f9156', '#55a96a');
}

// The sun, drawn in screen space (top right).
export const sunSprite = () =>
  sprite('j-sun', 4, 4, (g) => {
    glow(g, 2, 2, 2, '#fff6c4', 0.85);
    ellipse(g, 2, 2, 0.7, 0.7, '#fff7cf');
  }, 2, 2);
