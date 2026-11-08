// Where everything goes, for any screen. All in CSS px. Pure (no DOM), so the tests can check
// every size for overlaps.
//
// Exam room, held sideways:          Held upright:
//   [home]                [monitor]    [home]          [monitor]
//   [clip] chart  table              [clip]  chart  table
//   [clip] scale  patient            [clip]  scale  patient
//          [ ----- tool tray ----- ]        [ --- tool tray --- ]
//
// u is the size of one rig unit (rig.js) on screen: the patients, the table, the chart and the
// scale are all measured in it.

export const ROOM = {
  chartZone: 5.0, // the height chart and scale, left of the table (rig units)
  tableZone: 6.9, // the exam table with a patient on it (wide enough for a mega kick)
  sitTop: 8.8, // from the seat up to the tip of the tallest sitting ears (the bunny's)
  seatH: 3.6, // the table top above the floor
  chartH: 11.8, // the height chart, floor to top
  scaleH: 0.45, // the scale's top above the floor
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function sizes(w, h) {
  const vmin = Math.min(w, h);
  return {
    edge: clamp(vmin * 0.02, 8, 16),
    btn: clamp(vmin * 0.105, 52, 90),
    gap: clamp(vmin * 0.016, 6, 14),
  };
}

export function examLayout(w, h, inset = { t: 0, r: 0, b: 0, l: 0 }) {
  const { edge, btn, gap } = sizes(w, h);
  const left = inset.l + edge;
  const right = w - inset.r - edge;
  const top = inset.t + edge;
  const bottom = h - inset.b - edge;
  const landscape = w >= h * 1.05;

  // The tool tray: seven big buttons along the bottom.
  const tpad = clamp(Math.min(w, h) * 0.012, 6, 12);
  const sgap = clamp(Math.min(w, h) * 0.008, 4, 10);
  const slot = Math.floor(Math.min(100, h * 0.12, (right - left - 2 * tpad - 6 * sgap) / 7));
  const trayW = 7 * slot + 6 * sgap + 2 * tpad;
  const trayH = slot + 2 * tpad;
  const tray = { x: (w - trayW) / 2, y: bottom - trayH, w: trayW, h: trayH, slot, gap: sgap, pad: tpad };

  const home = { x: left, y: top, s: btn };

  // The clipboard: a column of 8 boxes (7 steps and the sticker star) under the home button.
  const cw = landscape ? clamp(w * 0.11, 60, 132) : clamp(w * 0.135, 56, 116);
  const clipY = top + btn + gap;
  const clip = { x: left, y: clipY, w: cw, h: Math.max(80, tray.y - gap - clipY) };
  const head = cw * 0.28; // the metal clip at the top
  const box = Math.floor(Math.max(16, Math.min(cw * 0.7, (clip.h - head - gap) / 8 - 4)));
  clip.box = box;
  clip.head = head;

  // The monitor on the wall, top right.
  const mw = landscape ? clamp(w * 0.25, 170, 340) : clamp(w * 0.46, 170, 420);
  const mh = Math.round(mw * (landscape ? 0.76 : 0.7));
  const monitor = { x: right - mw, y: top, w: mw, h: mh };

  const floorY = tray.y - gap * 0.4; // just above the tray, so feet on the scale show
  const zoneL = clip.x + clip.w + gap * 1.5;
  const zoneR = landscape ? monitor.x - gap : right;
  const sitLimit = landscape ? top : monitor.y + monitor.h + gap;
  const u = Math.max(
    6,
    Math.min(
      (zoneR - zoneL) / (ROOM.chartZone + ROOM.tableZone),
      (floorY - sitLimit) / (ROOM.seatH + ROOM.sitTop),
      (floorY - top) / ROOM.chartH,
      90,
    ),
  );
  const groupW = (ROOM.chartZone + ROOM.tableZone) * u;
  const gx = zoneL + Math.max(0, (zoneR - zoneL - groupW) / 2);
  const chart = { x: gx + 0.45 * u, top: floorY - ROOM.chartH * u, bottom: floorY, w: 0.9 * u };
  const scale = { x: gx + 2.85 * u, y: floorY - ROOM.scaleH * u, w: 3.4 * u };
  const table = { x: gx + ROOM.chartZone * u + (ROOM.tableZone * u) / 2, y: floorY - ROOM.seatH * u, w: 6.2 * u };
  // Where a tool waits after he taps it in the tray: beside the patient, at chest height.
  const ready = { x: table.x + 3.0 * u, y: table.y - 3.2 * u };

  return { w, h, landscape, edge, btn, gap, u, tray, home, clip, monitor, floorY, chart, scale, table, ready, top, bottom, left, right };
}

// The waiting room: three chairs in a row, the logo above, a door on the right.
export function waitingLayout(w, h, inset = { t: 0, r: 0, b: 0, l: 0 }) {
  const { edge, btn, gap } = sizes(w, h);
  const top = inset.t + edge;
  const bottom = h - inset.b - edge;
  const logoH = clamp(Math.min(w, h) * 0.13, 50, 120);
  const floorY = bottom - btn * (w < h ? 1.15 : 0.55); // upright: clear of the sticker book button
  const seatH = 2.5; // chair seat above the floor (rig units)
  const usable = floorY - (top + logoH + gap * 2);
  // three across with room for the elephant's ears (about 8 units wide) on each chair
  const u = Math.max(6, Math.min(usable / (seatH + 8.8), (w - 2 * edge) / (3 * 8.6), 70));
  const spread = Math.min((w - 2 * edge) / 3, 9.5 * u);
  const chairs = [-1, 0, 1].map((k) => ({ x: w / 2 + k * spread, y: floorY - seatH * u }));
  return { w, h, edge, btn, gap, u, floorY, chairs, logoH, top, bottom, seatH };
}
