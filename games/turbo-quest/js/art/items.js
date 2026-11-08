// Pickups, shots and effects. Every pickup sits in a bubble or sparkles, so it reads as "grab
// me"; everything Turbo shoots is warm and bright.
import { sprite } from '../engine/sprites.js';
import { ellipse, rrect, fillStroke, starPath, heartPath, glow } from './style.js';

export const starSprite = () =>
  sprite('i-star', 0.8, 0.8, (g) => {
    starPath(g, 0.4, 0.42, 0.34, 0.15);
    fillStroke(g, '#ffd23a', '#e88a00', 0.05);
    starPath(g, 0.36, 0.36, 0.13, 0.06);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fill();
  }, 0.4, 0.4);

// Rainbow Gem: faceted, with rainbow facets and a white sparkle.
export const gemSprite = () =>
  sprite('i-gem', 1.0, 1.0, (g) => {
    const cx = 0.5;
    const top = 0.18;
    const mid = 0.38;
    const bot = 0.9;
    const pts = [[cx - 0.36, mid], [cx - 0.2, top], [cx + 0.2, top], [cx + 0.36, mid], [cx, bot]];
    const grd = g.createLinearGradient(0.1, 0.2, 0.9, 0.85);
    ['#ff5a7a', '#ffb13d', '#ffe24d', '#5fdc6a', '#4cc4ff', '#9a7bff'].forEach((c, i) => grd.addColorStop(i / 5, c));
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    fillStroke(g, grd, '#5a2a9a', 0.045);
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 0.025;
    g.beginPath();
    g.moveTo(cx - 0.36, mid);
    g.lineTo(cx + 0.36, mid);
    g.moveTo(cx - 0.2, top);
    g.lineTo(cx - 0.1, mid);
    g.lineTo(cx, bot);
    g.lineTo(cx + 0.1, mid);
    g.lineTo(cx + 0.2, top);
    g.stroke();
    g.beginPath();
    g.moveTo(cx - 0.17, top + 0.04);
    g.lineTo(cx - 0.3, mid - 0.02);
    g.lineTo(cx - 0.12, mid - 0.02);
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.fill();
  }, 0.5, 0.52);

export const glowSprite = (color) =>
  sprite(`i-glow${color}`, 2, 2, (g) => glow(g, 1, 1, 1, color, 0.8), 1, 1);

export const heartSprite = () =>
  sprite('i-heart', 0.8, 0.8, (g) => {
    heartPath(g, 0.4, 0.42, 0.3);
    fillStroke(g, '#ff3d5e', '#ffffff', 0.06);
    heartPath(g, 0.4, 0.42, 0.3);
    g.lineWidth = 0.025;
    g.strokeStyle = '#b5122f';
    g.stroke();
    ellipse(g, 0.29, 0.32, 0.06, 0.04, 'rgba(255,255,255,0.7)', null, 0, -0.6);
  }, 0.4, 0.42);

// A glass capsule with what's inside drawn small: 'bubble', 'spread', 'shield'.
export const capsuleSprite = (kind) =>
  sprite(`i-cap-${kind}`, 1.0, 1.0, (g) => {
    const ring = { bubble: '#2d8fe0', spread: '#f0a300', shield: '#35c2c2', boing: '#e8455a', frost: '#3fb8f0', rockets: '#ff8a2a' }[kind] || '#888';
    ellipse(g, 0.5, 0.5, 0.42, 0.42, 'rgba(225,245,255,0.55)', ring, 0.06);
    if (kind === 'bubble') {
      for (const [x, y, r] of [[0.42, 0.56, 0.14], [0.62, 0.42, 0.1], [0.6, 0.64, 0.07]]) {
        ellipse(g, x, y, r, r, 'rgba(160,225,255,0.6)', '#2d8fe0', 0.025);
        ellipse(g, x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.2, '#ffffff');
      }
    } else if (kind === 'spread') {
      for (const [x, y, s] of [[0.32, 0.6, 0.11], [0.5, 0.38, 0.13], [0.68, 0.6, 0.11]]) {
        starPath(g, x, y, s, s * 0.45);
        fillStroke(g, '#ffd23a', '#d27a00', 0.02);
      }
    } else if (kind === 'boing') {
      for (const [x, y, r] of [[0.38, 0.6, 0.12], [0.62, 0.48, 0.14]]) {
        ellipse(g, x, y, r, r, '#ff4f6d', '#a0203a', 0.025);
        ellipse(g, x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.2, '#ffffff');
      }
      g.strokeStyle = 'rgba(160,32,58,0.5)';
      g.lineWidth = 0.02;
      g.beginPath();
      g.arc(0.5, 0.75, 0.2, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    } else if (kind === 'frost') {
      g.strokeStyle = '#3fb8f0';
      g.lineWidth = 0.04;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        g.beginPath();
        g.moveTo(0.5 + Math.cos(a) * 0.22, 0.5 + Math.sin(a) * 0.22);
        g.lineTo(0.5 - Math.cos(a) * 0.22, 0.5 - Math.sin(a) * 0.22);
        g.stroke();
      }
      ellipse(g, 0.5, 0.5, 0.06, 0.06, '#e6faff', '#3fb8f0', 0.02);
    } else if (kind === 'rockets') {
      for (const [x, y, a] of [[0.36, 0.55, -0.5], [0.6, 0.45, -0.2]]) {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        rrect(g, -0.05, -0.12, 0.1, 0.26, 0.03);
        fillStroke(g, '#ff8a2a', '#a04a00', 0.02);
        g.beginPath();
        g.moveTo(-0.05, -0.12);
        g.lineTo(0, -0.21);
        g.lineTo(0.05, -0.12);
        g.closePath();
        fillStroke(g, '#ffd23a', '#a04a00', 0.02);
        g.restore();
      }
    } else if (kind === 'shield') {
      ellipse(g, 0.5, 0.5, 0.24, 0.24, 'rgba(120,240,240,0.35)', '#35c2c2', 0.04);
      starPath(g, 0.5, 0.5, 0.13, 0.05, 4);
      g.fillStyle = '#ffffff';
      g.fill();
    }
    ellipse(g, 0.34, 0.28, 0.1, 0.06, 'rgba(255,255,255,0.85)', null, 0, -0.6);
  }, 0.5, 0.5);

// Zoom Boots: a pair of winged sneakers.
export const bootsSprite = () =>
  sprite('i-boots', 1.1, 0.8, (g) => {
    for (const [x, y] of [[0.3, 0.5], [0.68, 0.42]]) {
      g.beginPath();
      g.moveTo(x - 0.16, y - 0.16);
      g.lineTo(x + 0.02, y - 0.16);
      g.lineTo(x + 0.06, y);
      g.lineTo(x + 0.22, y + 0.06);
      g.lineTo(x + 0.22, y + 0.16);
      g.lineTo(x - 0.16, y + 0.16);
      g.closePath();
      fillStroke(g, '#ff4f6d', '#a0203a', 0.03);
      g.fillStyle = '#ffffff';
      g.fillRect(x - 0.16, y + 0.1, 0.38, 0.06);
      // wing
      g.beginPath();
      g.moveTo(x - 0.14, y - 0.06);
      g.quadraticCurveTo(x - 0.4, y - 0.26, x - 0.34, y - 0.02);
      g.quadraticCurveTo(x - 0.26, y + 0.02, x - 0.14, y);
      fillStroke(g, '#ffffff', '#7ab8e8', 0.02);
    }
  }, 0.55, 0.4);

// The Magnet Collar: a horseshoe magnet.
export const magnetSprite = () =>
  sprite('i-magnet', 0.9, 0.9, (g) => {
    g.beginPath();
    g.arc(0.45, 0.42, 0.26, Math.PI, 0);
    g.lineWidth = 0.16;
    g.strokeStyle = '#e8463d';
    g.stroke();
    g.fillStyle = '#e8463d';
    g.fillRect(0.11, 0.42, 0.16, 0.22);
    g.fillRect(0.63, 0.42, 0.16, 0.22);
    g.fillStyle = '#e6eaf2';
    g.fillRect(0.11, 0.6, 0.16, 0.12);
    g.fillRect(0.63, 0.6, 0.16, 0.12);
    g.beginPath();
    g.arc(0.45, 0.42, 0.34, Math.PI, 0);
    g.arc(0.45, 0.42, 0.18, 0, Math.PI, true);
    g.closePath();
    g.lineWidth = 0.03;
    g.strokeStyle = '#8a1f1a';
    g.stroke();
  }, 0.45, 0.45);

// The Mega Bone (Giant Pup).
export const boneSprite = () =>
  sprite('i-bone', 1.2, 0.7, (g) => {
    g.save();
    g.translate(0.6, 0.35);
    g.rotate(-0.2);
    const c = '#ffd23a';
    rrect(g, -0.32, -0.09, 0.64, 0.18, 0.08);
    fillStroke(g, c, '#b5860a', 0.035);
    for (const x of [-0.36, 0.36]) {
      ellipse(g, x, -0.1, 0.12, 0.12, c, '#b5860a', 0.035);
      ellipse(g, x, 0.1, 0.12, 0.12, c, '#b5860a', 0.035);
    }
    rrect(g, -0.32, -0.08, 0.64, 0.16, 0.08);
    g.fillStyle = c;
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillRect(-0.25, -0.05, 0.5, 0.04);
    g.restore();
  }, 0.6, 0.35);

// Checkpoint: a post with a flag, down until reached, then up with a paw print.
export const checkpointSprite = (up) =>
  sprite(up ? 'i-cp-up' : 'i-cp-down', 1.0, 2.0, (g) => {
    rrect(g, 0.2, 0.2, 0.1, 1.8, 0.04);
    fillStroke(g, '#a8662e', '#5e3412', 0.03);
    ellipse(g, 0.25, 0.18, 0.08, 0.08, '#ffd23a', '#b5860a', 0.025);
    g.beginPath();
    if (up) {
      g.moveTo(0.3, 0.28);
      g.quadraticCurveTo(0.65, 0.22, 0.95, 0.38);
      g.quadraticCurveTo(0.65, 0.52, 0.3, 0.72);
      g.closePath();
      fillStroke(g, '#ff8a2a', '#b34f00', 0.035);
      for (const [x, y, r] of [[0.52, 0.52, 0.07], [0.44, 0.4, 0.03], [0.52, 0.37, 0.03], [0.6, 0.4, 0.03]]) ellipse(g, x, y, r, r, '#ffffff');
    } else {
      // not reached yet: a limp grey pennant hanging from the top
      g.moveTo(0.3, 0.28);
      g.lineTo(0.5, 0.3);
      g.quadraticCurveTo(0.56, 0.6, 0.46, 0.92);
      g.lineTo(0.38, 0.8);
      g.lineTo(0.3, 0.9);
      g.closePath();
      fillStroke(g, '#d7dbe6', '#8f97ad', 0.03);
    }
  }, 0.25, 2.0);

// The Party Popper goal: a giant striped popper on a stand, then burst open.
export const popperSprite = (open) =>
  sprite(open ? 'i-pop-open' : 'i-pop', 2.2, 3.4, (g) => {
    rrect(g, 0.75, 2.85, 0.7, 0.55, 0.12);
    fillStroke(g, '#a8662e', '#5e3412', 0.04);
    g.save();
    g.translate(1.1, 2.9);
    g.rotate(open ? 0.15 : 0.08);
    g.beginPath();
    g.moveTo(-0.15, 0);
    g.lineTo(-0.62, -2.3);
    g.lineTo(0.62, -2.3);
    g.lineTo(0.15, 0);
    g.closePath();
    g.save();
    g.clip();
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? '#ffd23a' : '#ff4f8a';
      g.beginPath();
      g.moveTo(-1, -i * 0.38);
      g.lineTo(1, -i * 0.38 - 0.25);
      g.lineTo(1, -i * 0.38 - 0.25 - 0.19);
      g.lineTo(-1, -i * 0.38 - 0.19);
      g.fill();
    }
    g.restore();
    g.beginPath();
    g.moveTo(-0.15, 0);
    g.lineTo(-0.62, -2.3);
    g.lineTo(0.62, -2.3);
    g.lineTo(0.15, 0);
    g.closePath();
    g.lineWidth = 0.05;
    g.strokeStyle = '#8a2050';
    g.stroke();
    ellipse(g, 0, -2.3, 0.62, 0.14, open ? '#3a1840' : '#ffe6f0', '#8a2050', 0.04);
    if (!open) {
      // a pull string
      g.beginPath();
      g.moveTo(0.1, 0);
      g.quadraticCurveTo(0.5, 0.3, 0.45, 0.5);
      g.lineWidth = 0.03;
      g.strokeStyle = '#ffffff';
      g.stroke();
      ellipse(g, 0.45, 0.52, 0.06, 0.06, '#ff4f8a', '#8a2050', 0.02);
    }
    g.restore();
  }, 1.1, 3.4);

// ------------------------------------------------------------------------------------ shots
export const shotSprite = (kind, big = false) =>
  sprite(`i-shot-${kind}${big ? '-big' : ''}`, 1.2, 1.2, (g) => {
    if (kind === 'bubble') {
      ellipse(g, 0.6, 0.6, 0.45, 0.45, 'rgba(170,230,255,0.35)', 'rgba(255,255,255,0.9)', 0.05);
      ellipse(g, 0.6, 0.6, 0.45, 0.45, null, 'rgba(45,143,224,0.6)', 0.025);
      ellipse(g, 0.45, 0.42, 0.12, 0.08, 'rgba(255,255,255,0.9)', null, 0, -0.6);
      return;
    }
    if (kind === 'spread') {
      glow(g, 0.6, 0.6, 0.55, '#fff3a0', 0.6);
      starPath(g, 0.6, 0.6, 0.38, 0.17);
      fillStroke(g, '#ffd23a', '#e88a00', 0.05);
      return;
    }
    glow(g, 0.6, 0.6, 0.6, big ? '#ffb13d' : '#fff09a', big ? 0.9 : 0.75);
    ellipse(g, 0.6, 0.6, big ? 0.36 : 0.22, big ? 0.36 : 0.22, big ? '#ffcf4d' : '#ffe766', big ? '#ff8a00' : null, 0.05);
    ellipse(g, 0.6, 0.6, big ? 0.2 : 0.12, big ? 0.2 : 0.12, '#ffffff');
  }, 0.6, 0.6);

// More of Turbo's shots: a Boing Ball, a frosty streak, a firework rocket.
export const boingSprite = () =>
  sprite('i-boing', 0.7, 0.7, (g) => {
    ellipse(g, 0.35, 0.35, 0.3, 0.3, '#ff4f6d', '#a0203a', 0.04);
    g.beginPath();
    g.arc(0.35, 0.35, 0.3, -0.4, 1.2);
    g.lineWidth = 0.08;
    g.strokeStyle = '#ffffff';
    g.stroke();
    ellipse(g, 0.25, 0.24, 0.08, 0.06, 'rgba(255,255,255,0.8)');
  }, 0.35, 0.35);

export const frostSprite = () =>
  sprite('i-frost', 1.2, 0.6, (g) => {
    glow(g, 0.6, 0.3, 0.3, '#bff0ff', 0.9);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 0.05;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.beginPath();
      g.moveTo(0.6 + Math.cos(a) * 0.17, 0.3 + Math.sin(a) * 0.17);
      g.lineTo(0.6 - Math.cos(a) * 0.17, 0.3 - Math.sin(a) * 0.17);
      g.stroke();
    }
  }, 0.6, 0.3);

export const rocketSprite = () =>
  sprite('i-rocket', 0.8, 0.4, (g) => {
    rrect(g, 0.12, 0.1, 0.5, 0.2, 0.08);
    fillStroke(g, '#ff8a2a', '#a04a00', 0.03);
    g.beginPath();
    g.moveTo(0.62, 0.1);
    g.lineTo(0.78, 0.2);
    g.lineTo(0.62, 0.3);
    g.closePath();
    fillStroke(g, '#ffd23a', '#a04a00', 0.03);
    g.fillStyle = '#ffffff';
    g.fillRect(0.3, 0.16, 0.18, 0.08);
    glow(g, 0.1, 0.2, 0.1, '#fff09a', 1);
  }, 0.45, 0.2);

// The Grumblies' shots, all pink-purple with a dark outline ("don't touch"): a seed bubble, a
// coconut, and the shockwave that rolls along the floor.
export const seedSprite = () =>
  sprite('i-seed', 0.8, 0.8, (g) => {
    ellipse(g, 0.4, 0.4, 0.32, 0.32, '#ff7ac8', '#7a1f6a', 0.06);
    ellipse(g, 0.4, 0.4, 0.16, 0.16, '#ffc4e6');
    ellipse(g, 0.3, 0.28, 0.07, 0.05, '#ffffff');
  }, 0.4, 0.4);

export const coconutSprite = () =>
  sprite('i-coconut', 0.8, 0.8, (g) => {
    ellipse(g, 0.4, 0.4, 0.3, 0.3, '#8a5a2b', '#3e230c', 0.05);
    for (const [x, y] of [[0.32, 0.3], [0.48, 0.3], [0.4, 0.44]]) ellipse(g, x, y, 0.04, 0.04, '#3e230c');
    g.strokeStyle = '#ff7ac8';
    g.lineWidth = 0.05;
    g.beginPath();
    g.arc(0.4, 0.4, 0.36, 0, Math.PI * 2);
    g.stroke();
  }, 0.4, 0.4);

export const waveSprite = () =>
  sprite('i-wave', 1.0, 0.8, (g) => {
    g.beginPath();
    g.moveTo(0.05, 0.8);
    g.quadraticCurveTo(0.2, 0.1, 0.5, 0.05);
    g.quadraticCurveTo(0.8, 0.1, 0.95, 0.8);
    g.closePath();
    fillStroke(g, 'rgba(255,122,200,0.75)', '#7a1f6a', 0.05);
    g.beginPath();
    g.moveTo(0.25, 0.75);
    g.quadraticCurveTo(0.35, 0.3, 0.5, 0.28);
    g.lineWidth = 0.05;
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.stroke();
  }, 0.5, 0.8);

// A Grumbly caught in a bubble.
export const trapBubble = () =>
  sprite('i-trap', 1.8, 1.8, (g) => {
    ellipse(g, 0.9, 0.9, 0.84, 0.84, 'rgba(170,230,255,0.28)', 'rgba(255,255,255,0.85)', 0.05);
    ellipse(g, 0.9, 0.9, 0.84, 0.84, null, 'rgba(45,143,224,0.55)', 0.025);
    ellipse(g, 0.6, 0.5, 0.2, 0.12, 'rgba(255,255,255,0.85)', null, 0, -0.6);
  }, 0.9, 0.9);

// The rescue bubble and the shield are the same friendly bubble.
export const bubbleSprite = () =>
  sprite('i-bubble', 2, 2, (g) => {
    const grd = g.createRadialGradient(0.8, 0.7, 0.1, 1, 1, 0.95);
    grd.addColorStop(0, 'rgba(255,255,255,0.12)');
    grd.addColorStop(0.75, 'rgba(160,225,255,0.22)');
    grd.addColorStop(1, 'rgba(120,200,255,0.6)');
    g.beginPath();
    g.arc(1, 1, 0.94, 0, Math.PI * 2);
    g.fillStyle = grd;
    g.fill();
    g.lineWidth = 0.05;
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.stroke();
    ellipse(g, 0.62, 0.55, 0.2, 0.12, 'rgba(255,255,255,0.75)', null, 0, -0.5);
  }, 1, 1);

// ---------------------------------------------------------------------------------- effects
export const dustSprite = () =>
  sprite('i-dust', 0.6, 0.6, (g) => glow(g, 0.3, 0.3, 0.3, '#fffaeb', 0.95), 0.3, 0.3);

export const puffSprite = () =>
  sprite('i-puff', 0.8, 0.8, (g) => {
    for (const [x, y, r] of [[0.3, 0.45, 0.2], [0.5, 0.35, 0.24], [0.6, 0.52, 0.18]]) ellipse(g, x, y, r, r, '#ffffff', '#e2e6f5', 0.03);
  }, 0.4, 0.4);

export const sparkleSprite = (hue = 0) =>
  sprite(`i-sparkle${hue % 3}`, 0.5, 0.5, (g) => {
    g.beginPath();
    g.moveTo(0.25, 0);
    g.quadraticCurveTo(0.29, 0.21, 0.5, 0.25);
    g.quadraticCurveTo(0.29, 0.29, 0.25, 0.5);
    g.quadraticCurveTo(0.21, 0.29, 0, 0.25);
    g.quadraticCurveTo(0.21, 0.21, 0.25, 0);
    g.fillStyle = ['#fff7b0', '#ffffff', '#b8f0ff'][hue % 3];
    g.fill();
  }, 0.25, 0.25);

export const CONFETTI = ['#ff4f6d', '#ffd23a', '#4fc3ff', '#7be05a', '#b48cff', '#ff9a3c'];
export const confettiSprite = (i) =>
  sprite(`i-confetti${i % 6}`, 0.22, 0.12, (g) => {
    g.fillStyle = CONFETTI[i % CONFETTI.length];
    g.fillRect(0, 0, 0.22, 0.12);
  }, 0.11, 0.06);

export const leafSprite = (i) =>
  sprite(`i-leaf${i % 2}`, 0.4, 0.24, (g) => {
    ellipse(g, 0.2, 0.12, 0.18, 0.09, i % 2 ? '#4fbf4a' : '#66d156', '#1f6b2c', 0.02);
  }, 0.2, 0.12);

export const heartBit = () =>
  sprite('i-heartbit', 0.4, 0.4, (g) => {
    heartPath(g, 0.2, 0.2, 0.15);
    fillStroke(g, '#ff3d5e', '#ffffff', 0.03);
  }, 0.2, 0.2);

export const rainbowSprite = (i) =>
  sprite(`i-rainbow${i % 6}`, 0.5, 0.5, (g) => glow(g, 0.25, 0.25, 0.25, CONFETTI[i % 6], 0.9), 0.25, 0.25);

// The bouncing "jump!" arrow over a waiting Auto-Go Turbo, and the idle hint.
export const hintArrow = () =>
  sprite('i-hint', 0.9, 0.9, (g) => {
    g.beginPath();
    g.moveTo(0.45, 0.08);
    g.lineTo(0.82, 0.48);
    g.lineTo(0.6, 0.48);
    g.lineTo(0.6, 0.82);
    g.lineTo(0.3, 0.82);
    g.lineTo(0.3, 0.48);
    g.lineTo(0.08, 0.48);
    g.closePath();
    fillStroke(g, '#ffffff', '#2d6fe0', 0.07);
  }, 0.45, 0.45);

// "!" over a Grumbly that has spotted Turbo (Dad Mode).
export const alertMark = () =>
  sprite('i-alert', 0.4, 0.6, (g) => {
    rrect(g, 0.13, 0.02, 0.14, 0.36, 0.07);
    fillStroke(g, '#ffd23a', '#c25a00', 0.03);
    ellipse(g, 0.2, 0.5, 0.075, 0.075, '#ffd23a', '#c25a00', 0.03);
  }, 0.2, 0.3);
