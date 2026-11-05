// The tool he's holding, drawn in screen pixels. Each one is drawn with its working end (nozzle,
// tip) at (x, y), where the paint lands, and its body reaching down and right toward his finger,
// so his finger never covers what he's making. `s` is the tool's size in px.
import { css, shade } from './palette.js';

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function shadow(g, s) {
  g.shadowColor = 'rgba(0,0,0,0.28)';
  g.shadowBlur = s * 0.12;
  g.shadowOffsetX = s * 0.05;
  g.shadowOffsetY = s * 0.1;
}

// A spray can, nozzle at (x, y), its top tipped up and left toward where the paint lands.
// shake wobbles it (just picked up, rattling).
export function drawCan(g, x, y, s, rgb, { glitter = false, rainbow = false, shake = 0, t = 0 } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.6 + Math.sin(t * 40) * shake * 0.12);
  g.translate(0, s * 0.07);
  const w = s * 0.5;
  const h = s * 1.0;
  shadow(g, s);
  // Body.
  const body = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  if (rainbow) {
    ['#ff3347', '#ff8a1c', '#ffd60a', '#2fc75a', '#29c4ff', '#9a45ff'].forEach((c, i) => body.addColorStop(i / 5, c));
  } else {
    const c = glitter ? [214, 196, 255] : rgb;
    body.addColorStop(0, css(shade(c, -0.3)));
    body.addColorStop(0.35, css(shade(c, 0.35)));
    body.addColorStop(0.6, css(c));
    body.addColorStop(1, css(shade(c, -0.4)));
  }
  g.fillStyle = body;
  roundRect(g, -w / 2, s * 0.3, w, h * 0.78, w * 0.16);
  g.fill();
  g.shadowColor = 'transparent';
  // Shoulders, cap and nozzle.
  const metal = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  metal.addColorStop(0, '#9aa0ac');
  metal.addColorStop(0.4, '#f4f6fa');
  metal.addColorStop(1, '#7d8391');
  g.fillStyle = metal;
  g.beginPath();
  g.moveTo(-w / 2, s * 0.34);
  g.quadraticCurveTo(-w / 2, s * 0.12, -w * 0.18, s * 0.1);
  g.lineTo(w * 0.18, s * 0.1);
  g.quadraticCurveTo(w / 2, s * 0.12, w / 2, s * 0.34);
  g.closePath();
  g.fill();
  roundRect(g, -w * 0.18, -s * 0.02, w * 0.36, s * 0.14, s * 0.03);
  g.fill();
  g.fillStyle = '#5b606c';
  g.fillRect(-w * 0.06, -s * 0.07, w * 0.12, s * 0.07);
  // Stripes and glitter on the label.
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(-w / 2 + w * 0.08, s * 0.36, w * 0.1, h * 0.7);
  if (glitter) {
    for (let i = 0; i < 18; i++) {
      g.fillStyle = ['#fff', '#ffd34d', '#ff7ad9', '#6fe7ff'][i % 4];
      g.fillRect(-w / 2 + ((i * 37) % 100) / 100 * w, s * 0.38 + ((i * 53) % 100) / 100 * h * 0.68, 3, 3);
    }
  }
  g.restore();
}

// A squeeze bottle of puffy paint, nozzle tip at (x, y), tipped toward where the paint goes.
// squeeze (0..1) dents the bottle in where his fingers press; a blob of paint sits on the tip.
export function drawBottle(g, x, y, s, rgb, { rainbow = false, squeeze = 0 } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.6);
  shadow(g, s);
  const w = s * 0.46;
  const top = s * 0.3; // where the cap meets the bottle
  const h = s * 0.82;
  // The bottle, a little pinched in the middle while he squeezes.
  const pinch = w * 0.5 - squeeze * w * 0.09;
  const body = new Path2D();
  body.moveTo(-w * 0.5, top + w * 0.22);
  body.quadraticCurveTo(-w * 0.5, top, -w * 0.28, top);
  body.lineTo(w * 0.28, top);
  body.quadraticCurveTo(w * 0.5, top, w * 0.5, top + w * 0.22);
  body.quadraticCurveTo(pinch, top + h * 0.55, w * 0.5, top + h - w * 0.2);
  body.quadraticCurveTo(w * 0.5, top + h, w * 0.3, top + h);
  body.lineTo(-w * 0.3, top + h);
  body.quadraticCurveTo(-w * 0.5, top + h, -w * 0.5, top + h - w * 0.2);
  body.quadraticCurveTo(-pinch, top + h * 0.55, -w * 0.5, top + w * 0.22);
  const fill = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  if (rainbow) ['#ff3347', '#ff8a1c', '#ffd60a', '#2fc75a', '#29c4ff', '#9a45ff'].forEach((c, i) => fill.addColorStop(i / 5, c));
  else {
    fill.addColorStop(0, css(shade(rgb, -0.25)));
    fill.addColorStop(0.35, css(shade(rgb, 0.3)));
    fill.addColorStop(0.65, css(rgb));
    fill.addColorStop(1, css(shade(rgb, -0.35)));
  }
  g.fillStyle = fill;
  g.fill(body);
  g.shadowColor = 'transparent';
  g.lineWidth = Math.max(1, s * 0.015);
  g.strokeStyle = 'rgba(0,0,0,0.2)';
  g.stroke(body);
  // A white label with a puffy swirl on it.
  g.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(g, -w * 0.36, top + h * 0.36, w * 0.72, h * 0.3, w * 0.12);
  g.fill();
  g.strokeStyle = rainbow ? '#9a45ff' : css(shade(rgb, -0.1));
  g.lineWidth = s * 0.035;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-w * 0.24, top + h * 0.56);
  g.quadraticCurveTo(-w * 0.12, top + h * 0.4, 0, top + h * 0.52);
  g.quadraticCurveTo(w * 0.12, top + h * 0.62, w * 0.24, top + h * 0.46);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)';
  roundRect(g, -w * 0.4, top + w * 0.25, w * 0.1, h * 0.7, w * 0.05);
  g.fill();
  // The cap and its long pointed nozzle.
  g.fillStyle = '#f4f4f8';
  roundRect(g, -w * 0.3, top - s * 0.08, w * 0.6, s * 0.1, s * 0.03);
  g.fill();
  g.fillStyle = '#e4e5ec';
  g.beginPath();
  g.moveTo(-w * 0.16, top - s * 0.07);
  g.lineTo(-s * 0.025, s * 0.03);
  g.lineTo(s * 0.025, s * 0.03);
  g.lineTo(w * 0.16, top - s * 0.07);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 1;
  g.stroke();
  // A shiny blob of paint on the tip.
  const blob = rainbow ? [154, 69, 255] : rgb;
  g.fillStyle = css(blob);
  g.beginPath();
  g.arc(0, 0, s * 0.055, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.arc(-s * 0.018, -s * 0.02, s * 0.018, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// A fat marker, tip at (x, y).
export function drawMarker(g, x, y, s, rgb, { rainbow = false } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.75);
  shadow(g, s);
  g.fillStyle = '#f1f1f6';
  roundRect(g, s * 0.16, -s * 0.12, s * 0.92, s * 0.24, s * 0.08);
  g.fill();
  g.shadowColor = 'transparent';
  // Cone and tip.
  g.fillStyle = '#d8d9e2';
  g.beginPath();
  g.moveTo(s * 0.17, -s * 0.12);
  g.lineTo(s * 0.06, -s * 0.05);
  g.lineTo(s * 0.06, s * 0.05);
  g.lineTo(s * 0.17, s * 0.12);
  g.fill();
  const tip = rainbow ? '#ff3347' : css(rgb);
  g.fillStyle = tip;
  roundRect(g, -s * 0.02, -s * 0.05, s * 0.1, s * 0.1, s * 0.04);
  g.fill();
  // Colored bands so he can see which color he has.
  if (rainbow) {
    ['#ff3347', '#ffd60a', '#2fc75a', '#29c4ff', '#9a45ff'].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(s * (0.7 + i * 0.075), -s * 0.12, s * 0.075, s * 0.24);
    });
  } else {
    g.fillStyle = css(rgb);
    g.fillRect(s * 0.78, -s * 0.12, s * 0.07, s * 0.24);
    g.fillRect(s * 0.92, -s * 0.12, s * 0.07, s * 0.24);
  }
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(s * 0.2, -s * 0.09, s * 0.5, s * 0.04);
  g.restore();
}

// A rubber stamp on a wooden knob, its stamp face at (x, y), lifted by `lift` (0..1).
export function drawStamper(g, x, y, s, rgb, lift = 0) {
  g.save();
  g.translate(x, y - s * 0.12 - lift * s * 0.25);
  shadow(g, s);
  g.fillStyle = css(rgb);
  roundRect(g, -s * 0.3, -s * 0.08, s * 0.6, s * 0.12, s * 0.04);
  g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = '#c98a4b';
  roundRect(g, -s * 0.33, -s * 0.22, s * 0.66, s * 0.15, s * 0.05);
  g.fill();
  g.fillStyle = '#a86a32';
  g.fillRect(-s * 0.07, -s * 0.5, s * 0.14, s * 0.3);
  const knob = g.createRadialGradient(-s * 0.06, -s * 0.62, s * 0.02, 0, -s * 0.56, s * 0.18);
  knob.addColorStop(0, '#f2c48e');
  knob.addColorStop(1, '#b77537');
  g.fillStyle = knob;
  g.beginPath();
  g.arc(0, -s * 0.56, s * 0.17, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// Tweezers for placing gems, tips at (x, y).
export function drawTweezers(g, x, y, s, open = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.7);
  shadow(g, s);
  g.lineCap = 'round';
  g.strokeStyle = '#d4d8e2';
  g.lineWidth = s * 0.07;
  const spread = s * (0.03 + open * 0.05);
  g.beginPath();
  g.moveTo(s * 0.04, -spread);
  g.lineTo(s * 1.0, -s * 0.07);
  g.moveTo(s * 0.04, spread);
  g.lineTo(s * 1.0, s * 0.07);
  g.stroke();
  g.shadowColor = 'transparent';
  g.strokeStyle = '#ff5cb6';
  g.lineWidth = s * 0.09;
  g.beginPath();
  g.moveTo(s * 0.55, -s * 0.05);
  g.lineTo(s * 0.85, -s * 0.065);
  g.moveTo(s * 0.55, s * 0.05);
  g.lineTo(s * 0.85, s * 0.065);
  g.stroke();
  g.restore();
}

// A glitter shaker, holes at (x, y), wobbling while he shakes.
export function drawShaker(g, x, y, s, t = 0, shaking = false) {
  g.save();
  g.translate(x, y);
  g.rotate(2.5 + (shaking ? Math.sin(t * 30) * 0.2 : 0));
  shadow(g, s);
  const jar = g.createLinearGradient(-s * 0.22, 0, s * 0.22, 0);
  jar.addColorStop(0, 'rgba(200,220,255,0.9)');
  jar.addColorStop(0.5, 'rgba(255,255,255,0.95)');
  jar.addColorStop(1, 'rgba(180,200,240,0.9)');
  g.fillStyle = jar;
  roundRect(g, -s * 0.22, -s * 0.85, s * 0.44, s * 0.7, s * 0.1);
  g.fill();
  g.shadowColor = 'transparent';
  for (let i = 0; i < 40; i++) {
    g.fillStyle = ['#ffd34d', '#ff7ad9', '#6fe7ff', '#b98cff'][i % 4];
    g.fillRect(-s * 0.18 + ((i * 41) % 100) / 100 * s * 0.36, -s * 0.5 + ((i * 67) % 100) / 100 * s * 0.32, 3, 3);
  }
  g.fillStyle = '#ff5cb6';
  roundRect(g, -s * 0.25, -s * 0.18, s * 0.5, s * 0.16, s * 0.05);
  g.fill();
  g.fillStyle = '#c23c86';
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.arc(i * s * 0.1, -s * 0.06, s * 0.025, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// A pointing hand for the "try this" hint.
export function drawHand(g, x, y, s, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText('👆', x, y);
  g.restore();
}
