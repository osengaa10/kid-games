// Every number that decides how Turbo feels, for each mode. Distances are in tiles, times in
// seconds. The view is VIEW_TILES tiles high (about 68 pt per tile on an iPad 10th gen).
// ?tune (or holding the pause button for 2 s) opens sliders for these; "Copy values" there gives
// the numbers to paste back in here.

export const VIEW_TILES = 12;

export const TUNING = {
  kid: {
    runSpeed: 5, // top speed, tiles/s
    accelTime: 0.15, // standing → top speed
    decelTime: 0.08, // top speed → standing
    airControl: 1, // share of the ground acceleration in the air
    jumpHeight: 3.4, // jump held to the top
    minJumpHeight: 1.6, // jump tapped
    riseGravity: 34,
    fallGravity: 48,
    hangSpeed: 2, // near the top of a held jump (|vy| below this) gravity is multiplied by hangMul
    hangMul: 0.5,
    maxFall: 11,
    flutter: 1, // 1: holding jump while falling spins the tail and slows the fall
    flutterFall: 3, // fall speed while fluttering
    flutterTime: 1.2, // how long one flutter lasts per jump
    coyote: 0.15, // a jump still works this long after running off a ledge
    buffer: 0.2, // a jump pressed this long before landing still happens
    corner: 0.35, // a head that clips a ceiling corner by up to this slides round it
    ledgeAssist: 0.3, // feet up to this far below a ledge get lifted onto it
    bounceHeight: 6.5, // how high a bounce flower throws you
    pickupRadius: 2, // stars this close fly to you
    rescueTime: 1.1, // the bubble ride back from a pit
    invuln: 2, // safe time after a rescue or a hit
    lookAhead: 3, // how far the camera looks ahead of Turbo
    stompLow: 2.5, // bounce off a Grumbly's head (jump not held)
    stompHigh: 4, // ...with jump held
    balloonBounce: 4.5, // off a cheered Grumbly's balloon
    bubbleBounce: 5.5, // off a bubbled Grumbly
    hurtbox: 0.55, // how much of Turbo can be touched (smaller = more forgiving)
  },
  dad: {
    runSpeed: 7.5,
    accelTime: 0.09,
    decelTime: 0.06,
    airControl: 0.85,
    jumpHeight: 3.6,
    minJumpHeight: 1.2,
    riseGravity: 46,
    fallGravity: 80,
    hangSpeed: 1.5,
    hangMul: 0.6,
    maxFall: 17,
    flutter: 0,
    flutterFall: 3,
    flutterTime: 0,
    coyote: 0.09,
    buffer: 0.12,
    corner: 0.2,
    ledgeAssist: 0,
    bounceHeight: 7,
    pickupRadius: 0.8,
    rescueTime: 0.6,
    invuln: 1.2,
    lookAhead: 2.6,
    stompLow: 2.2,
    stompHigh: 4.2,
    balloonBounce: 4.5,
    bubbleBounce: 5.5,
    hurtbox: 0.75,
  },
};

// Slider ranges for the tuning panel: [min, max, step].
export const RANGES = {
  runSpeed: [2, 12, 0.1],
  accelTime: [0.02, 0.5, 0.01],
  decelTime: [0.02, 0.5, 0.01],
  airControl: [0.3, 1.2, 0.05],
  jumpHeight: [1.5, 6, 0.05],
  minJumpHeight: [0.5, 3, 0.05],
  riseGravity: [15, 100, 1],
  fallGravity: [15, 140, 1],
  hangSpeed: [0, 5, 0.1],
  hangMul: [0.2, 1, 0.05],
  maxFall: [5, 30, 0.5],
  flutter: [0, 1, 1],
  flutterFall: [1, 8, 0.1],
  flutterTime: [0, 3, 0.05],
  coyote: [0, 0.3, 0.01],
  buffer: [0, 0.4, 0.01],
  corner: [0, 0.5, 0.01],
  ledgeAssist: [0, 0.5, 0.01],
  bounceHeight: [3, 12, 0.1],
  pickupRadius: [0.3, 4, 0.1],
  rescueTime: [0.2, 2, 0.05],
  invuln: [0, 4, 0.1],
  lookAhead: [0, 6, 0.1],
  stompLow: [1, 5, 0.1],
  stompHigh: [2, 7, 0.1],
  balloonBounce: [2, 8, 0.1],
  bubbleBounce: [2, 9, 0.1],
  hurtbox: [0.3, 1, 0.05],
};

// The tuning for a mode with any saved overrides on top (unknown keys are ignored).
export function tuningFor(mode, overrides = null) {
  const base = TUNING[mode] || TUNING.kid;
  const t = { ...base };
  if (overrides) for (const k of Object.keys(base)) if (typeof overrides[k] === 'number' && isFinite(overrides[k])) t[k] = overrides[k];
  return t;
}

// Numbers worked out from the tuning that the controller uses every step.
export function derive(t) {
  const g = t.riseGravity;
  const hs = Math.min(t.hangSpeed, Math.sqrt(2 * g * t.jumpHeight) * 0.9);
  // Launch speed that peaks at exactly jumpHeight, counting the lighter gravity near the top.
  const v0 = Math.sqrt(Math.max(1, 2 * g * t.jumpHeight - (hs * hs) / t.hangMul + hs * hs));
  return {
    jumpVel: v0,
    cutVel: Math.sqrt(2 * g * Math.min(t.minJumpHeight, t.jumpHeight)),
    accel: t.runSpeed / Math.max(0.01, t.accelTime),
    decel: t.runSpeed / Math.max(0.01, t.decelTime),
    bounceVel: Math.sqrt(2 * g * t.bounceHeight),
    hangSpeed: hs,
  };
}

// How far a full jump at top speed goes on flat ground, and how long it stays up, with jump held
// on the way up and let go at the top (no flutter, no hang on the way down): the shortest full
// jump. The level checks use this so a required gap is never wider than a jump can manage.
export function jumpReach(t) {
  const d = derive(t);
  const g = t.riseGravity;
  const hs = d.hangSpeed;
  const rise = (d.jumpVel - hs) / g + hs / (g * t.hangMul);
  const gf = t.fallGravity;
  const h = t.jumpHeight;
  let fall;
  if (Math.sqrt(2 * gf * h) <= t.maxFall) fall = Math.sqrt((2 * h) / gf);
  else {
    // Speeds up to the fall-speed cap, then falls at the cap.
    const d1 = (t.maxFall * t.maxFall) / (2 * gf);
    fall = t.maxFall / gf + (h - d1) / t.maxFall;
  }
  const air = rise + fall;
  return { height: t.jumpHeight, air, distance: air * t.runSpeed };
}
