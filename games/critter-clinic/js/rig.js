// The puppet rig every patient is built on: a big head, a pear body, two arms and two legs that can
// sit on the exam table (legs dangling) or stand on the scale. Everything is in rig units with the
// hip at (0, 0) and y going down, already scaled by the species' size. The art (patient-art.js)
// draws exactly these shapes, and the hit tests and tool spots use them too, so a spot is always
// where the picture shows it. No canvas here, so the tests run it in node.

export const NECK = { x: 0, y: -2.85 };
export const HEAD = { cx: 0, cy: -4.6, rx: 2.15, ry: 1.9 };
export const BODY = { cx: 0, cy: -1.5, rx: 1.45, ry: 1.6 };
export const HEAD_TOP = HEAD.cy - HEAD.ry; // top of the head (not the ears), base units
export const FEET_Y = 1.96; // bottom of the feet below the hip, base units
export const ARM_R = 0.36;
export const LEG_R = 0.36;
const SIDES = [-1, 1]; // index 0 is his left on screen, 1 his right

export function defaultPose() {
  return {
    stand: 0, // 0 sitting on the table, 1 standing on the scale
    tilt: 0, // head tilt (radians, + leans to the right of the screen)
    headDy: 0, // head bob
    breathe: 0, // -1..1, the slow idle breath
    puff: 0, // 0..1, a deep breath in
    kick: [0, 0], // lower-leg swing out from the knee (radians)
    arm: [0, 0], // arm swing out and up from the shoulder (radians)
    earLift: [0, 0], // floppy ears lifted out of the way of the ear camera
    squish: 0, // ears pressed down by the height bar
    trunk: 0, // the elephant's trunk lifted (for "ahh")
    dx: 0, // whole-body shake / dance offset
    droop: 0, // 0..1 how sick: the head hangs, bunny ears flop, kitty ears go flat
  };
}

// The head's turn and drop, including the sick droop. The art turns the canvas by exactly this.
export function headAngles(pose) {
  const d = pose.droop || 0;
  return { tilt: pose.tilt + 0.07 * d, dy: pose.headDy + 0.2 * d };
}

const rot = (x, y, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
};
const lerp = (a, b, t) => a + (b - a) * t;

// A point on the head (base units) → rig units: bob, tilt about the neck, size.
function headPt(pose, s, x, y) {
  const { tilt, dy } = headAngles(pose);
  const p = rot(x - NECK.x, y + dy - NECK.y, tilt);
  return { x: (p.x + NECK.x + pose.dx) * s, y: (p.y + NECK.y) * s };
}

// The ear shapes, per kind, in head base units (before the tilt). Each is an ellipse or a polygon.
function earShapes(sp, pose) {
  const out = [];
  const sq = 1 - 0.5 * pose.squish;
  const squash = (y, base = -6.25) => base + (y - base) * sq;
  SIDES.forEach((side, i) => {
    const lift = pose.earLift[i] || 0;
    switch (sp.ear) {
      case 'floppy': {
        // A flap hanging from the top of the head down over the side; it lifts up and out.
        const ax = side * 1.5;
        const ay = -5.95;
        const v = rot(side * 0.55, 1.05, -side * 1.5 * lift);
        out.push({ k: 'el', cx: ax + v.x, cy: ay + v.y, rx: 0.62, ry: 1.22, rot: side * 0.28 - side * 1.5 * lift, side, front: true });
        break;
      }
      case 'tall': {
        // sick bunnies' ears flop out to the sides
        const len = 1.5 * (1 - 0.6 * pose.squish);
        const r = side * (0.14 + 0.8 * (pose.droop || 0));
        out.push({ k: 'el', cx: side * 0.82 + len * Math.sin(r), cy: -6.1 - len * Math.cos(r), rx: 0.56, ry: len + 0.12, rot: r, side, inner: 0.55 });
        break;
      }
      case 'round':
        out.push({ k: 'el', cx: side * 1.6, cy: squash(-6.02), rx: 0.64, ry: 0.64 * sq + 0.05, rot: 0, side, inner: 0.55 });
        break;
      case 'pointy': {
        // sick kitties' ears go flat, out to the sides
        const a = side * 0.6 * (pose.droop || 0);
        const pts = [[side * 0.7, -6.25], [side * 2.02, -5.55], [side * 1.85, squash(-7.45)]].map(([x, y]) => {
          const p = rot(x - side * 1.35, y + 5.9, a);
          return [p.x + side * 1.35, p.y - 5.9];
        });
        out.push({ k: 'poly', pts, side, inner: 0.55 });
        break;
      }
      case 'huge':
        out.push({ k: 'el', cx: side * 2.5, cy: -4.55, rx: 1.15, ry: 1.6, rot: side * 0.12, side, inner: 0.72, behind: true });
        break;
      default:
        break; // 'hole': just little openings on the sides of the head (drawn on the face)
    }
  });
  return out;
}

// Where each tool goes, in head base units (head-attached) or body units.
const EAR_SPOTS = {
  floppy: { x: 1.92, y: -4.95 },
  tall: { x: 0.85, y: -6.28 },
  round: { x: 1.6, y: -5.97 },
  pointy: { x: 1.5, y: -6.25 },
  hole: { x: 1.9, y: -5.0 },
  huge: { x: 2.08, y: -5.15 },
};

// Every joint and shape of the patient in this pose, in rig units.
export function rig(sp, pose = defaultPose()) {
  const s = sp.size;
  const P = (x, y) => ({ x: (x + pose.dx) * s, y: y * s });
  const H = (x, y) => headPt(pose, s, x, y);
  const puff = pose.puff || 0;
  const br = pose.breathe || 0;

  const ha = headAngles(pose);
  const head = { ...H(HEAD.cx, HEAD.cy), rx: HEAD.rx * s, ry: HEAD.ry * s, rot: ha.tilt };
  const bodyC = P(BODY.cx, BODY.cy - puff * 0.06);
  const body = { x: bodyC.x, y: bodyC.y, rx: BODY.rx * (1 + 0.05 * puff + 0.008 * br) * s, ry: BODY.ry * (1 + 0.04 * puff + 0.014 * br) * s };

  const arms = SIDES.map((side, i) => {
    const sh = P(side * 1.1, -2.55 - puff * 0.12 - br * 0.02);
    const v = rot(side * 0.6, 1.6, -side * (pose.arm[i] || 0));
    const hand = { x: sh.x + v.x * s, y: sh.y + v.y * s };
    return { side, shoulder: sh, hand, r: ARM_R * s };
  });

  const legs = SIDES.map((side, i) => {
    const hip = P(side * 0.66, -0.2);
    const knee = P(side * lerp(0.8, 0.72, pose.stand), lerp(0.3, 0.85, pose.stand));
    const ankle0 = P(side * 0.82, 1.6);
    const a = -side * (pose.kick[i] || 0);
    const v = rot(ankle0.x - knee.x, ankle0.y - knee.y, a);
    const ankle = { x: knee.x + v.x, y: knee.y + v.y };
    const fv = rot(side * 0.08 * s, 0.07 * s, a);
    const foot = { x: ankle.x + fv.x, y: ankle.y + fv.y, rx: 0.5 * s, ry: 0.28 * s, rot: a };
    return { side, hip, knee, ankle, foot, r: LEG_R * s, angle: a };
  });

  const ears = earShapes(sp, pose).map((e) => {
    if (e.k === 'el') {
      const c = H(e.cx, e.cy);
      return { ...e, cx: c.x, cy: c.y, rx: e.rx * s, ry: e.ry * s, rot: e.rot + ha.tilt };
    }
    return { ...e, pts: e.pts.map(([x, y]) => {
      const p = H(x, y);
      return [p.x, p.y];
    }) };
  });

  return { s, pose, head, body, arms, legs, ears, H, P };
}

// The shapes that make up the patient's outline, for hit tests.
export function shapes(r) {
  const out = [
    { k: 'el', cx: r.head.x, cy: r.head.y, rx: r.head.rx, ry: r.head.ry, rot: r.head.rot },
    { k: 'el', cx: r.body.x, cy: r.body.y, rx: r.body.rx, ry: r.body.ry, rot: 0 },
  ];
  for (const a of r.arms) out.push({ k: 'cap', x0: a.shoulder.x, y0: a.shoulder.y, x1: a.hand.x, y1: a.hand.y, r: a.r * 1.15 });
  for (const l of r.legs) {
    out.push({ k: 'cap', x0: l.hip.x, y0: l.hip.y, x1: l.knee.x, y1: l.knee.y, r: l.r * 1.1 });
    out.push({ k: 'cap', x0: l.knee.x, y0: l.knee.y, x1: l.ankle.x, y1: l.ankle.y, r: l.r });
    out.push({ k: 'el', cx: l.foot.x, cy: l.foot.y, rx: l.foot.rx, ry: l.foot.ry, rot: l.foot.rot });
  }
  for (const e of r.ears) out.push(e);
  return out;
}

function inShape(sh, x, y) {
  if (sh.k === 'el') {
    const p = rot(x - sh.cx, y - sh.cy, -(sh.rot || 0));
    return (p.x / sh.rx) ** 2 + (p.y / sh.ry) ** 2 <= 1;
  }
  if (sh.k === 'cap') {
    const dx = sh.x1 - sh.x0;
    const dy = sh.y1 - sh.y0;
    const L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - sh.x0) * dx + (y - sh.y0) * dy) / L));
    return Math.hypot(x - (sh.x0 + dx * t), y - (sh.y0 + dy * t)) <= sh.r;
  }
  let inside = false;
  const p = sh.pts;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (p[i][1] > y !== p[j][1] > y && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
  }
  return inside;
}

export function inside(r, x, y) {
  return shapes(r).some((sh) => inShape(sh, x, y));
}

// Which part a tap landed on, for the no-tool reactions: 'nose', 'head', 'tummy' or 'body'.
export function partAt(r, x, y) {
  const nose = r.H(0, -4.1);
  if (Math.hypot(x - nose.x, y - nose.y) < 0.55 * r.s) return 'nose';
  if (inShape({ k: 'el', cx: r.head.x, cy: r.head.y, rx: r.head.rx, ry: r.head.ry, rot: r.head.rot }, x, y)) return 'head';
  for (const e of r.ears) if (inShape(e, x, y)) return 'head';
  if (inShape({ k: 'el', cx: r.body.x, cy: r.body.y, rx: r.body.rx, ry: r.body.ry, rot: 0 }, x, y)) return 'tummy';
  return inside(r, x, y) ? 'body' : null;
}

// The spots the tools go to. Each is { x, y, r } in rig units; the forehead is a band the
// thermometer sweeps along: { x0, x1, y, r }.
export function hotspots(sp, r) {
  const s = r.s;
  const e = EAR_SPOTS[sp.ear] || EAR_SPOTS.hole;
  const spot = (p, rad) => ({ x: p.x, y: p.y, r: rad * s });
  const f0 = r.H(-1.15, -5.62);
  const f1 = r.H(1.15, -5.62);
  const arm = r.arms[1];
  return {
    forehead: { x0: f0.x, x1: f1.x, y: (f0.y + f1.y) / 2, x: (f0.x + f1.x) / 2, r: 0.62 * s },
    mouth: spot(r.H(0, -3.62), 0.6),
    chest: spot(r.P(0.5, -2.2 - (r.pose.puff || 0) * 0.06), 0.62),
    tummy: spot(r.P(0, -0.9), 0.6),
    earL: spot(r.H(-e.x, e.y), 0.62),
    earR: spot(r.H(e.x, e.y), 0.62),
    arm: spot({ x: lerp(arm.shoulder.x, arm.hand.x, 0.32), y: lerp(arm.shoulder.y, arm.hand.y, 0.32) }, 0.5),
    kneeL: spot({ x: lerp(r.legs[0].knee.x, r.legs[0].ankle.x, 0.16), y: lerp(r.legs[0].knee.y, r.legs[0].ankle.y, 0.16) }, 0.55),
    kneeR: spot({ x: lerp(r.legs[1].knee.x, r.legs[1].ankle.x, 0.16), y: lerp(r.legs[1].knee.y, r.legs[1].ankle.y, 0.16) }, 0.55),
    headTop: r.H(0, HEAD_TOP),
  };
}

// Top of the head above the feet when standing on the scale, in rig units (what the height bar
// stops at), and the tallest point including ears (what the height chart has to fit).
export function standingHeight(sp) {
  return (FEET_Y - HEAD_TOP) * sp.size;
}

export function standingTop(sp) {
  const r = rig(sp, { ...defaultPose(), stand: 1 });
  let top = r.head.y - r.head.ry;
  for (const e of r.ears) {
    if (e.k === 'el') top = Math.min(top, e.cy - Math.max(e.rx, e.ry));
    else for (const [, y] of e.pts) top = Math.min(top, y);
  }
  return FEET_Y * sp.size - top;
}
