// The gadgets themselves, drawn in item units:
//   drawFixed:       what shows through the case and never gets painted (cameras, buttons, the
//                    earbud case's insert)
//   drawBuds:        the earbuds sitting in their case
//   drawBehind:      bits that stick out from behind the case (the controller's triggers)
//   drawEdge:        ports and speaker holes on the case's bottom edge
//   drawDeviceBack:  the gadget on its own, sliding in under the case at ta-da
//   drawDeviceFront: the gadget's screen side, seen when the case is turned around in 3D
// No brand logos or names anywhere: they're just a phone, a tablet, earbuds and a controller.
import { partPath, unionPath } from './shapes.js';

const TAU = Math.PI * 2;

function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
}

function rrPath(x, y, w, h, r) {
  return partPath({ rr: [x, y, w, h, r] });
}

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

function rad(g, x0, y0, r0, x1, y1, r1, stops) {
  const gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

// ------------------------------------------------------------------------------------ cameras

// The raised glass plate the cameras sit on, with the case's lip round it.
function cameraBump(g, [x, y, w, h, r], u) {
  // The case's lip round the opening, and its shadow on the glass.
  g.fillStyle = 'rgba(20,10,40,0.28)';
  g.fill(rrPath(x - 9 * u, y - 7 * u, w + 18 * u, h + 20 * u, r + 9 * u));
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fill(rrPath(x - 7 * u, y - 8 * u, w + 14 * u, h + 10 * u, r + 7 * u));
  // Frosted glass.
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, '#5c6274'], [0.5, '#3f4352'], [1, '#272a34']]);
  g.fill(rrPath(x - 2 * u, y - 2 * u, w + 4 * u, h + 4 * u, r));
  g.save();
  g.clip(rrPath(x - 2 * u, y - 2 * u, w + 4 * u, h + 4 * u, r));
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.beginPath();
  g.moveTo(x - 10, y - 10);
  g.lineTo(x + w * 0.75, y - 10);
  g.lineTo(x - 10, y + h * 0.75);
  g.fill();
  g.restore();
  // A bright bevel along the top-left edge, a dark one bottom-right.
  g.lineWidth = 3 * u;
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.stroke(rrPath(x + 1 * u, y + 1 * u, w - 2 * u, h - 2 * u, r - 2 * u));
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.stroke(rrPath(x + 3 * u, y + 4 * u, w - 6 * u, h - 6 * u, r - 4 * u));
}

// A camera lens: a raised metal ring, the black barrel, coated glass with colored reflections,
// and the aperture rings deep inside.
function lens(g, x, y, r) {
  g.fillStyle = 'rgba(0,0,0,0.45)';
  circle(g, x + r * 0.06, y + r * 0.12, r * 1.04);
  g.fill();
  g.fillStyle = lin(g, x - r, y - r, x + r, y + r, [[0, '#f2f4f8'], [0.35, '#a8adba'], [0.65, '#6b7080'], [1, '#c9cdd6']]);
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = '#0d0e14';
  circle(g, x, y, r * 0.84);
  g.fill();
  g.fillStyle = rad(g, x - r * 0.2, y - r * 0.25, r * 0.05, x, y, r * 0.74, [[0, '#3a3f8f'], [0.45, '#1b1d4a'], [1, '#07081a']]);
  circle(g, x, y, r * 0.74);
  g.fill();
  // Lens coating: a purple sheen top-left, a green one bottom-right.
  g.lineWidth = r * 0.09;
  g.strokeStyle = 'rgba(170,120,255,0.55)';
  g.beginPath();
  g.arc(x, y, r * 0.6, Math.PI * 1.05, Math.PI * 1.6);
  g.stroke();
  g.strokeStyle = 'rgba(90,230,170,0.4)';
  g.beginPath();
  g.arc(x, y, r * 0.55, Math.PI * 0.1, Math.PI * 0.5);
  g.stroke();
  // Aperture rings.
  for (const [k, a] of [[0.44, 0.25], [0.3, 0.35]]) {
    g.strokeStyle = `rgba(140,150,255,${a})`;
    g.lineWidth = r * 0.04;
    circle(g, x, y, r * k);
    g.stroke();
  }
  g.fillStyle = '#020208';
  circle(g, x, y, r * 0.18);
  g.fill();
  // Glints.
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.ellipse(x - r * 0.3, y - r * 0.34, r * 0.17, r * 0.09, -0.75, 0, TAU);
  g.fill();
  circle(g, x + r * 0.28, y + r * 0.26, r * 0.05);
  g.fill();
}

function flash(g, x, y, r) {
  g.fillStyle = lin(g, x - r, y - r, x + r, y + r, [[0, '#f4f4f6'], [1, '#9da1ab']]);
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = rad(g, x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r * 0.78, [[0, '#fffbe6'], [0.6, '#fff0a8'], [1, '#e8c86a']]);
  circle(g, x, y, r * 0.78);
  g.fill();
  g.strokeStyle = 'rgba(200,160,60,0.5)';
  g.lineWidth = r * 0.06;
  for (const k of [0.32, 0.55]) {
    circle(g, x, y, r * k);
    g.stroke();
  }
}

function lidar(g, x, y, r) {
  g.fillStyle = '#08080c';
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = rad(g, x - r * 0.3, y - r * 0.3, 0, x, y, r, [[0, 'rgba(160,60,90,0.6)'], [1, 'rgba(40,10,30,0)']]);
  circle(g, x, y, r);
  g.fill();
}

function pinhole(g, x, y, r) {
  g.fillStyle = '#121218';
  circle(g, x, y, r);
  g.fill();
}

// ------------------------------------------------------------------------------ the controller

function dpad(g, poly, u) {
  const cross = partPath({ poly });
  g.save();
  g.translate(0, 6 * u);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fill(cross);
  g.restore();
  // The well round it, then the raised cross.
  g.lineWidth = 10 * u;
  g.lineJoin = 'round';
  g.strokeStyle = '#1d1f27';
  g.stroke(cross);
  g.fillStyle = lin(g, 192, 132, 308, 248, [[0, '#6a6f82'], [0.5, '#474b5a'], [1, '#2e3039']]);
  g.fill(cross);
  g.lineWidth = 2.5 * u;
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.stroke(cross);
  // A dimple in the middle and arrows on each arm.
  g.fillStyle = rad(g, 250, 190, 2, 250, 190, 18, [[0, '#2a2c35'], [1, '#4a4e5e']]);
  circle(g, 250, 190, 15);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)';
  for (const [x, y, a] of [[250, 147, 0], [250, 233, Math.PI], [207, 190, -Math.PI / 2], [293, 190, Math.PI / 2]]) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, -8);
    g.lineTo(8, 5);
    g.lineTo(-8, 5);
    g.fill();
    g.restore();
  }
}

function faceButton(g, x, y, r, color) {
  g.fillStyle = '#16171d';
  circle(g, x, y, r * 1.14);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.45)';
  circle(g, x + r * 0.05, y + r * 0.16, r);
  g.fill();
  g.fillStyle = rad(g, x - r * 0.3, y - r * 0.38, r * 0.05, x, y, r * 1.05, [[0, '#ffffff'], [0.3, color], [0.85, color], [1, 'rgba(0,0,0,0.5)']]);
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(x - r * 0.32, y - r * 0.4, r * 0.3, r * 0.15, -0.5, 0, TAU);
  g.fill();
}

function thumbstick(g, x, y, r) {
  g.fillStyle = '#101117';
  circle(g, x, y, r);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.5)';
  circle(g, x + r * 0.04, y + r * 0.1, r * 0.82);
  g.fill();
  // The rubber cap: a raised rim and a dished middle, lit from the top left.
  g.fillStyle = lin(g, x - r, y - r, x + r, y + r, [[0, '#8a8f9f'], [1, '#2c2e38']]);
  circle(g, x, y - 2, r * 0.8);
  g.fill();
  g.fillStyle = lin(g, x - r, y - r, x + r, y + r, [[0, '#2a2c35'], [1, '#6c7182']]);
  circle(g, x, y - 2, r * 0.6);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    circle(g, x + Math.cos(a) * r * 0.7, y - 2 + Math.sin(a) * r * 0.7, r * 0.035);
    g.fill();
  }
}

function pill(g, x, y, w, h) {
  g.fillStyle = '#1b1c23';
  g.fill(rrPath(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2));
  g.fillStyle = lin(g, x, y, x, y + h, [[0, '#6a6f80'], [1, '#353845']]);
  g.fill(rrPath(x, y, w, h, h / 2));
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.fill(rrPath(x + h * 0.4, y + h * 0.18, w - h * 0.8, h * 0.22, h * 0.11));
}

function homeButton(g, x, y, r) {
  g.fillStyle = rad(g, x, y, r, x, y, r * 2, [[0, 'rgba(120,200,255,0.55)'], [1, 'rgba(120,200,255,0)']]);
  circle(g, x, y, r * 2);
  g.fill();
  g.fillStyle = '#16171d';
  circle(g, x, y, r * 1.12);
  g.fill();
  g.fillStyle = rad(g, x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r, [[0, '#ffffff'], [0.4, '#dfe6f2'], [1, '#8f98ab']]);
  circle(g, x, y, r);
  g.fill();
  // A little star on it.
  g.fillStyle = '#5d6ad6';
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = (k % 2 ? 0.22 : 0.5) * r;
    g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}

// ------------------------------------------------------------------------------- the earbuds

// The white insert at the top of the open earbud case, with a well for each earbud.
function earbudInsert(g, shape, u) {
  const caseBody = shape.body[1];
  g.save();
  g.clip(partPath(caseBody));
  g.fillStyle = lin(g, 0, 160, 0, 270, [[0, '#ffffff'], [0.6, '#eceef3'], [1, '#d6d9e1']]);
  g.fill(rrPath(40, 152, 480, 118, 50));
  // The rim of the case's opening.
  g.lineWidth = 6 * u;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.stroke(rrPath(42, 158, 476, 110, 48));
  g.lineWidth = 3 * u;
  g.strokeStyle = 'rgba(30,20,60,0.18)';
  g.stroke(rrPath(46, 164, 468, 102, 44));
  // The wells.
  for (const x of [190, 370]) {
    g.fillStyle = rad(g, x, 205, 4, x, 205, 48, [[0, '#9aa0ad'], [1, '#e6e8ee']]);
    g.beginPath();
    g.ellipse(x, 205, 54, 30, 0, 0, TAU);
    g.fill();
  }
  g.restore();
  // The lid's inside rim, just under its edge.
  g.fillStyle = lin(g, 0, 112, 0, 134, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(225,228,236,0.95)']]);
  g.fill(rrPath(34, 108, 492, 24, 12));
}

// Two glossy earbuds sitting in the case. dy lifts them (they drop in at ta-da).
export function drawBuds(g, shape, dy = 0) {
  if (shape.item !== 'earbuds') return;
  for (const [x, dir] of [[190, -1], [370, 1]]) {
    g.save();
    g.translate(x, 150 + dy);
    g.scale(dir, 1);
    // The stem going down into the case.
    g.fillStyle = lin(g, -16, 0, 16, 0, [[0, '#d9dce4'], [0.5, '#ffffff'], [1, '#c9cdd8']]);
    g.fill(rrPath(-17, 10, 34, 92, 17));
    // The head, tipped outward.
    g.rotate(-0.25);
    g.fillStyle = 'rgba(30,20,60,0.18)';
    g.beginPath();
    g.ellipse(4, 6, 60, 52, 0, 0, TAU);
    g.fill();
    g.fillStyle = rad(g, -18, -20, 4, 0, 0, 64, [[0, '#ffffff'], [0.6, '#f1f3f7'], [1, '#c7ccd6']]);
    g.beginPath();
    g.ellipse(0, 0, 58, 50, 0, 0, TAU);
    g.fill();
    // The speaker mesh and the little sensor.
    g.fillStyle = '#2d2f38';
    g.beginPath();
    g.ellipse(-24, -16, 20, 14, -0.5, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let k = 0; k < 6; k++) {
      circle(g, -32 + (k % 3) * 8, -20 + Math.floor(k / 3) * 8, 1.8);
      g.fill();
    }
    g.fillStyle = '#3a3c46';
    circle(g, 26, 14, 5);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.ellipse(-8, -30, 18, 7, -0.3, 0, TAU);
    g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------------- on top of the case

export function drawFixed(g, shape) {
  const { item, u } = shape;
  if (item === 'phone') {
    cameraBump(g, [30, 30, 200, 200, 50], u);
    lens(g, 88, 88, 42);
    lens(g, 88, 172, 42);
    lens(g, 172, 130, 42);
    flash(g, 176, 62, 15);
    lidar(g, 176, 198, 12);
    pinhole(g, 132, 52, 3.5);
  } else if (item === 'tablet') {
    cameraBump(g, [28, 28, 124, 124, 36], u);
    lens(g, 72, 72, 31);
    flash(g, 122, 116, 10);
    pinhole(g, 122, 60, 4);
    // Connector dots.
    for (const x of [456, 480, 504]) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      circle(g, x, 670, 9);
      g.fill();
      g.fillStyle = rad(g, x - 2, 666, 1, x, 668, 7, [[0, '#ffffff'], [1, '#9097a6']]);
      circle(g, x, 668, 7);
      g.fill();
    }
  } else if (item === 'earbuds') {
    earbudInsert(g, shape, u);
    // Status light on the front.
    g.fillStyle = rad(g, 280, 400, 0, 280, 400, 24, [[0, 'rgba(110,255,160,0.9)'], [1, 'rgba(110,255,160,0)']]);
    circle(g, 280, 400, 24);
    g.fill();
    g.fillStyle = '#7dffb0';
    circle(g, 280, 400, 7);
    g.fill();
  } else if (item === 'controller') {
    for (const h of shape.holes) if (h.poly) dpad(g, h.poly, u);
    for (const [x, y, c] of [[750, 132, '#ff4d5e'], [806, 190, '#ffcf33'], [750, 248, '#3db4ff'], [694, 190, '#4cd964']]) faceButton(g, x, y, 27, c);
    thumbstick(g, 392, 292, 52);
    thumbstick(g, 608, 292, 52);
    pill(g, 440, 150, 48, 24);
    pill(g, 512, 150, 48, 24);
    homeButton(g, 500, 228, 21);
    // Speaker holes between the thumbsticks.
    g.fillStyle = 'rgba(20,20,30,0.55)';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      circle(g, 476 + c * 12 + (r % 2) * 6, 284 + r * 12, 2.6);
      g.fill();
    }
  }
}

// --------------------------------------------------------------------------- behind the case

export function drawBehind(g, shape) {
  if (shape.item !== 'controller') return;
  const [tl, tr, bl, br] = shape.behind;
  for (const p of [tl, tr]) {
    const [x, y, w, h] = p.rr;
    g.fillStyle = lin(g, x, y, x, y + h, [[0, '#5a5e6e'], [0.3, '#34363f'], [1, '#22232a']]);
    g.fill(partPath(p));
  }
  for (const p of [bl, br]) {
    const [x, y, w, h] = p.rr;
    g.fillStyle = lin(g, x, y, x, y + h, [[0, '#7a7f90'], [0.25, '#4a4d5a'], [1, '#2b2d36']]);
    g.fill(partPath(p));
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fill(rrPath(x + 24, y + 5, w - 48, 6, 3));
  }
  // The charging port between them.
  g.fillStyle = '#23252e';
  g.fill(rrPath(470, 24, 60, 14, 7));
  g.fillStyle = '#0c0c10';
  g.fill(rrPath(480, 28, 40, 6, 3));
}

// ----------------------------------------------------------------------- on the bottom edge

// Ports and speaker holes on the bottom edge of the case, which shows as a thin strip below it.
// th is how thick that strip is.
export function drawEdge(g, shape, th) {
  const { item } = shape;
  const y = { phone: 980, tablet: 700, earbuds: 540, controller: 350 }[item] + th * 0.5;
  const dots = (x0, n, gap) => {
    for (let i = 0; i < n; i++) {
      circle(g, x0 + i * gap, y, th * 0.18);
      g.fill();
    }
  };
  g.fillStyle = 'rgba(10,10,20,0.75)';
  if (item === 'phone') {
    g.fill(rrPath(212, y - th * 0.25, 56, th * 0.5, th * 0.25));
    dots(150, 5, 11);
    dots(286, 5, 11);
  } else if (item === 'tablet') {
    dots(60, 6, 14);
    dots(830, 6, 14);
  } else if (item === 'earbuds') {
    g.fill(rrPath(254, y - th * 0.25, 52, th * 0.5, th * 0.25));
  } else if (item === 'controller') {
    circle(g, 500, y, th * 0.3);
    g.fill();
  }
}

// ----------------------------------------------------------------------- the gadget on its own

// Sliding in under the case at ta-da: its back, cameras and all.
export function drawDeviceBack(g, shape) {
  const { item, u } = shape;
  if (item === 'earbuds') return;
  const main = shape.body.filter((p) => p.el || (p.rr && p.rr[2] > 100 && p.rr[3] > 100));
  const body = unionPath(main);
  const glassy = item === 'phone';
  g.fillStyle = item === 'controller' ? '#2a2c35' : glassy ? '#3b3f4d' : '#c5c9d2';
  g.fill(body);
  g.save();
  g.clip(body);
  const { box } = shape;
  g.fillStyle = lin(g, box.x, box.y, box.x + box.w, box.y + box.h, [[0, 'rgba(255,255,255,0.22)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.2)']]);
  g.fillRect(box.x, box.y, box.w, box.h);
  g.restore();
  g.lineWidth = 4 * u;
  g.strokeStyle = item === 'tablet' ? '#9ba0ab' : '#16171c';
  g.stroke(body);
  drawFixed(g, shape);
}

// The far side, seen when the case is turned around. Drawn as if looking at the gadget's front
// (the caller mirrors it, since it's seen from behind the case).
export function drawDeviceFront(g, shape) {
  const { item, u } = shape;
  if (item === 'phone' || item === 'tablet') {
    const [x, y, w, h, r] = shape.body[0].rr;
    const bez = item === 'phone' ? 14 : 22;
    g.fillStyle = '#111217';
    g.fill(rrPath(x + 10, y + 10, w - 20, h - 20, r - 8));
    const sx = x + 10 + bez;
    const sy = y + 10 + bez;
    const sw = w - 20 - bez * 2;
    const sh = h - 20 - bez * 2;
    const screen = rrPath(sx, sy, sw, sh, r - 8 - bez * 0.6);
    g.save();
    g.clip(screen);
    g.fillStyle = lin(g, sx, sy, sx + sw, sy + sh, [[0, '#7b4dff'], [0.5, '#c45cff'], [1, '#ff8fc4']]);
    g.fillRect(sx, sy, sw, sh);
    g.fillStyle = 'rgba(255,255,255,0.14)';
    for (const [cx, cy, cr] of [[0.2, 0.8, 0.5], [0.85, 0.25, 0.35]]) {
      circle(g, sx + sw * cx, sy + sh * cy, Math.min(sw, sh) * cr);
      g.fill();
    }
    // Rows of colorful app squares, and a dock along the bottom.
    const colors = ['#ff5c6c', '#ffb02e', '#ffd84a', '#3dd17a', '#2ec5ff', '#4f7bff', '#a15cff', '#ff6fb5'];
    const cols = item === 'phone' ? 4 : 6;
    const rows = item === 'phone' ? 5 : 3;
    const icon = item === 'phone' ? 70 : 82;
    const gx = (sw - cols * icon) / (cols + 1);
    const top = item === 'phone' ? 120 : 70;
    let k = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++, k++) {
        const ix = sx + gx + col * (icon + gx);
        const iy = sy + top + row * (icon + gx * 1.1);
        g.fillStyle = colors[k % colors.length];
        g.fill(rrPath(ix, iy, icon, icon, icon * 0.24));
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fill(rrPath(ix + icon * 0.22, iy + icon * 0.22, icon * 0.56, icon * 0.56, icon * 0.14));
      }
    }
    const dockH = icon + 30;
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fill(rrPath(sx + 16, sy + sh - dockH - 16, sw - 32, dockH, 36));
    for (let i = 0; i < 4; i++) {
      g.fillStyle = colors[(i * 3 + 1) % colors.length];
      const ix = sx + 16 + ((sw - 32) / 4) * (i + 0.5) - icon / 2;
      g.fill(rrPath(ix, sy + sh - dockH - 1, icon, icon, icon * 0.24));
    }
    // Glass shine.
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + sw * 0.6, sy);
    g.lineTo(sx, sy + sh * 0.45);
    g.fill();
    g.restore();
    // Front camera.
    g.fillStyle = '#050507';
    if (item === 'phone') g.fill(rrPath(x + w / 2 - 60, sy + 14, 120, 34, 17));
    else {
      circle(g, x + w / 2, y + 10 + bez / 2, 5);
      g.fill();
    }
  } else if (item === 'controller') {
    // The underside: dark plastic, the triggers' outlines, and a battery cover.
    const body = unionPath(shape.body);
    g.fillStyle = '#2b2d36';
    g.fill(body);
    g.save();
    g.clip(body);
    g.fillStyle = lin(g, 0, 30, 0, 520, [[0, 'rgba(255,255,255,0.12)'], [1, 'rgba(0,0,0,0.2)']]);
    g.fillRect(0, 0, 1000, 600);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 4 * u;
    g.stroke(rrPath(330, 120, 340, 170, 40));
    g.fillStyle = '#1e2027';
    g.fill(rrPath(470, 300, 60, 20, 10));
    for (const x of [235, 765]) {
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(x - 60, 330 + i * 22);
        g.lineTo(x + 60, 330 + i * 22);
        g.stroke();
      }
    }
  } else if (item === 'earbuds') {
    // The back of the case: a hinge between lid and case, and a little pairing button.
    g.fillStyle = lin(g, 220, 128, 220, 166, [[0, '#d7dbe3'], [0.5, '#ffffff'], [1, '#a9aeba']]);
    g.fill(rrPath(200, 126, 160, 40, 12));
    g.fillStyle = 'rgba(0,0,0,0.15)';
    circle(g, 280, 470, 16);
    g.fill();
    g.fillStyle = '#f2f3f7';
    circle(g, 280, 468, 13);
    g.fill();
  }
}
