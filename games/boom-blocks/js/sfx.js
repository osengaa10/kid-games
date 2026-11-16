// The sound recipes. Big, cartoony and a bit exaggerated: deep thumps under every boom, lots of
// little clacks as blocks scatter, and sparkly sounds for the magic bits.
import { tone, noise, now, ready, throttle, hold } from './audio.js';

const r = (a, b) => a + Math.random() * (b - a);
// C major pentatonic, for anything musical (rebuild plinks, combo notes).
export const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

// The meteor whistling down for `dur` seconds.
export function meteorFall(dur, pan = 0) {
  if (!ready()) return;
  const t = now();
  tone(r(1500, 1800), t, dur, { type: 'sine', vol: 0.09, to: 260, vibrato: 9, pan });
  noise(t, dur, { freq: 600, to: 3200, q: 1.5, vol: 0.12, attack: dur * 0.8, pan });
}

// A big explosion. power 1 = meteor.
export function boom(power = 1, pan = 0) {
  if (!ready()) return;
  const t = now();
  const p = Math.min(2, power);
  tone(95, t, 0.6 * p, { vol: 0.75, to: 28, pan: pan * 0.5 });
  tone(180, t, 0.18, { type: 'triangle', vol: 0.3, to: 60, pan });
  noise(t, 0.9 * p, { type: 'lowpass', freq: 1400, to: 120, q: 0.7, vol: 0.55, pan });
  noise(t, 0.12, { type: 'highpass', freq: 2500, q: 0.5, vol: 0.25, pan });
  for (let i = 0; i < 9; i++) noise(t + 0.04 + Math.random() * 0.45 * p, r(0.03, 0.08), { freq: r(900, 4200), q: r(2, 5), vol: r(0.08, 0.18), pan: pan + r(-0.4, 0.4) });
}

// Blocks breaking: n blocks of a sound family at once. Density follows n so a giant collapse
// is a rumbling roar and a nick is a few clicks.
export function crunch(n, family = 'plastic', pan = 0) {
  if (!ready() || n <= 0 || !throttle(`crunch-${family}`, 45)) return;
  const t = now();
  const grains = Math.min(10, 2 + Math.round(Math.sqrt(n) * 1.2));
  const span = Math.min(0.5, 0.08 + n * 0.004);
  for (let i = 0; i < grains; i++) {
    const at = t + Math.random() * span;
    const pp = pan + r(-0.35, 0.35);
    if (family === 'glass') {
      tone(r(2400, 6200), at, r(0.08, 0.25), { vol: 0.05, pan: pp });
      if (i % 3 === 0) noise(at, 0.08, { type: 'highpass', freq: 5000, vol: 0.08, pan: pp });
    } else if (family === 'wood') {
      noise(at, r(0.03, 0.07), { freq: r(700, 1600), q: 4, vol: 0.2, pan: pp });
      tone(r(180, 320), at, 0.06, { type: 'triangle', vol: 0.12, pan: pp });
    } else if (family === 'stone' || family === 'metal') {
      noise(at, r(0.04, 0.1), { freq: r(350, 1300), q: 2.5, vol: 0.24, pan: pp });
    } else if (family === 'jelly') {
      tone(r(200, 320), at, 0.22, { type: 'sine', vol: 0.12, to: r(500, 700), pan: pp });
    } else if (family === 'snow') {
      // Soft, muffled crumps.
      noise(at, r(0.06, 0.14), { type: 'lowpass', freq: r(500, 1100), q: 0.7, vol: 0.26, pan: pp });
    } else {
      // Plastic toy blocks: bright clacks.
      tone(r(900, 1900), at, r(0.03, 0.06), { type: 'triangle', vol: 0.11, to: r(500, 900), pan: pp });
      noise(at, 0.03, { freq: r(2000, 4000), q: 3, vol: 0.12, pan: pp });
    }
  }
  if (n > 20) noise(t, 0.25 + span, { type: 'lowpass', freq: 700, to: 200, vol: Math.min(0.4, 0.1 + n * 0.003), pan });
}

// A piece hitting the ground: a thump for big ones, a clack for small ones.
export function land(blocks, family = 'plastic', pan = 0, hard = 1) {
  if (!ready()) return;
  const t = now();
  if (blocks >= 20) {
    if (!throttle('land-big', 70)) return;
    const k = Math.min(1, blocks / 300);
    tone(110 - k * 50, t, 0.35 + k * 0.4, { vol: 0.35 + k * 0.4, to: 32, pan });
    noise(t, 0.3 + k * 0.4, { type: 'lowpass', freq: 900, to: 150, vol: 0.25 + k * 0.25, pan });
    crunch(Math.min(40, blocks / 4), family, pan);
  } else {
    if (!throttle('clack', 28)) return;
    const f = 1400 / Math.sqrt(blocks);
    if (family === 'jelly') tone(r(220, 300), t, 0.2, { vol: 0.1 * hard, to: r(500, 650), pan });
    else if (family === 'snow') noise(t, 0.09, { type: 'lowpass', freq: 700, q: 0.7, vol: 0.18 * hard, pan });
    else if (family === 'glass') tone(r(3000, 5000), t, 0.12, { vol: 0.05 * hard, pan });
    else if (family === 'wood') noise(t, 0.05, { freq: f * 0.8, q: 4, vol: 0.14 * hard, pan });
    else {
      tone(f * r(0.85, 1.15), t, 0.05, { type: 'triangle', vol: 0.09 * hard, to: f * 0.6, pan });
      noise(t, 0.025, { freq: f * 2, q: 3, vol: 0.07 * hard, pan });
    }
  }
}

export function pop(pan = 0) {
  if (!ready() || !throttle('pop', 40)) return;
  tone(r(600, 900), now(), 0.08, { vol: 0.06, to: 1400, pan });
}

export function splash(pan = 0) {
  if (!ready() || !throttle('splash', 120)) return;
  const t = now();
  noise(t, 0.35, { type: 'highpass', freq: 1200, to: 4000, vol: 0.16, pan });
  for (let i = 0; i < 4; i++) tone(r(300, 700), t + i * 0.05, 0.08, { vol: 0.06, to: r(900, 1400), pan });
}

// One note of the rebuild: blocks plonking into place climb up the scale.
export function plink(i, pan = 0) {
  if (!ready()) return;
  const f = PENTA[Math.min(PENTA.length - 1, i)];
  tone(f * 2, now(), 0.12, { type: 'triangle', vol: 0.07, pan });
}

export function whoosh(pan = 0) {
  if (!ready()) return;
  noise(now(), 0.45, { freq: 300, to: 2400, q: 0.9, vol: 0.18, pan });
}

export function tap() {
  if (!ready()) return;
  tone(520, now(), 0.1, { vol: 0.15, to: 980 });
}

export function sparkle(pan = 0) {
  if (!ready() || !throttle('sparkle', 80)) return;
  const t = now();
  for (let i = 0; i < 6; i++) tone(r(1800, 3600), t + i * 0.045, 0.16, { vol: 0.045, pan });
}

// A combo tier reached: a bright rising arpeggio, higher for bigger tiers.
export function comboUp(tier) {
  if (!ready()) return;
  const t = now();
  for (let i = 0; i < 4; i++) tone(PENTA[Math.min(PENTA.length - 1, 4 + tier + i * 2)], t + i * 0.07, 0.22, { type: 'triangle', vol: 0.1 });
}

export function fanfare() {
  if (!ready()) return;
  const t = now();
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.12, 0.3, { type: 'triangle', vol: 0.14 }));
  [523.25, 659.25, 783.99].forEach((f) => tone(f, t + 0.5, 0.9, { type: 'triangle', vol: 0.09 }));
  noise(t + 0.5, 0.8, { type: 'highpass', freq: 6000, vol: 0.06 });
}

// The laser's hum: a buzzy sawtooth with a fast wobble, plus a sizzle while it's cutting.
// Returns a handle { set(level, pitch), parts.sizzle(level), stop() } or null.
export function laserHum() {
  return hold((ctx, out, noiseBuf) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 170;
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = 343;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 13;
    const lg = ctx.createGain();
    lg.gain.value = 22;
    lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1100;
    f.Q.value = 1.6;
    const tone = ctx.createGain();
    tone.gain.value = 0.22;
    o.connect(f);
    o2.connect(f);
    f.connect(tone).connect(out);
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 2600;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    n.connect(nf).connect(ng).connect(out);
    for (const s of [o, o2, lfo, n]) s.start(t);
    return {
      pitch(p, at) {
        o.frequency.setTargetAtTime(170 * p, at, 0.05);
        o2.frequency.setTargetAtTime(343 * p, at, 0.05);
        f.frequency.setTargetAtTime(900 + 700 * p, at, 0.05);
      },
      sizzle(level) {
        ng.gain.setTargetAtTime(level * 0.5, ctx.currentTime, 0.03);
      },
      stop() {
        for (const s of [o, o2, lfo, n]) s.stop();
      },
    };
  });
}

// A fuse fizzing for `dur` seconds before a bang.
export function fizz(dur, pan = 0) {
  if (!ready()) return;
  noise(now(), dur, { type: 'highpass', freq: 3500, to: 6000, q: 0.5, vol: 0.09, attack: 0.02, pan });
}

// The hammer: a big rubbery BONK with a squeak on top.
export function bonk(pan = 0) {
  if (!ready()) return;
  const t = now();
  tone(320, t, 0.3, { type: 'triangle', vol: 0.4, to: 100, pan });
  tone(80, t, 0.5, { vol: 0.6, to: 30, pan });
  noise(t, 0.4, { type: 'lowpass', freq: 900, to: 120, vol: 0.4, pan });
  tone(1300, t + 0.05, 0.08, { vol: 0.12, to: 2300, pan });
  tone(1500, t + 0.15, 0.1, { vol: 0.1, to: 2600, pan });
}

// Treasure: a bright ding, climbing the scale with each burst.
export function ding(i = 0, pan = 0) {
  if (!ready()) return;
  const f = PENTA[Math.min(PENTA.length - 1, 6 + i)];
  const t = now();
  tone(f * 2, t, 0.35, { type: 'sine', vol: 0.1, pan });
  tone(f * 3, t, 0.2, { type: 'sine', vol: 0.04, pan });
}

// A balloon popping.
export function balloonPop(pan = 0) {
  if (!ready() || !throttle('balloon', 50)) return;
  const t = now();
  noise(t, 0.06, { type: 'highpass', freq: 1500, vol: 0.3, pan });
  tone(r(500, 800), t, 0.05, { vol: 0.12, to: 200, pan });
}

// The cannon firing: a deep BOOM with a puff of air, and a whistle as the ball leaves.
export function cannon(pan = 0) {
  if (!ready()) return;
  const t = now();
  tone(75, t, 0.45, { vol: 0.7, to: 32, pan: pan * 0.5 });
  tone(220, t, 0.12, { type: 'triangle', vol: 0.25, to: 80, pan });
  noise(t, 0.35, { type: 'lowpass', freq: 2200, to: 180, q: 0.7, vol: 0.5, pan });
  tone(r(1300, 1600), t + 0.05, 0.35, { type: 'sine', vol: 0.05, to: r(700, 900), pan });
}

// The tornado's wind: a deep roar plus a whistling howl that swoops up and down, and a gritty
// rattle while it's chewing something. Returns { set(level, pitch), parts.crunch(level), stop() }.
export function windHold() {
  return hold((ctx, out, noiseBuf) => {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const roar = ctx.createBiquadFilter();
    roar.type = 'lowpass';
    roar.frequency.value = 380;
    const rg = ctx.createGain();
    rg.gain.value = 0.9;
    src.connect(roar).connect(rg).connect(out);
    const howl = ctx.createBiquadFilter();
    howl.type = 'bandpass';
    howl.frequency.value = 700;
    howl.Q.value = 6;
    const hg = ctx.createGain();
    hg.gain.value = 0.7;
    src.connect(howl).connect(hg).connect(out);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.7;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg).connect(howl.frequency);
    const grit = ctx.createBiquadFilter();
    grit.type = 'bandpass';
    grit.frequency.value = 1800;
    grit.Q.value = 1.2;
    const gg = ctx.createGain();
    gg.gain.value = 0;
    src.connect(grit).connect(gg).connect(out);
    src.start(t);
    lfo.start(t);
    return {
      pitch(p, at) {
        howl.frequency.setTargetAtTime(560 * p, at, 0.2);
        roar.frequency.setTargetAtTime(300 * p, at, 0.2);
      },
      crunch(level) {
        gg.gain.setTargetAtTime(level * 0.5, ctx.currentTime, 0.05);
      },
      stop() {
        src.stop();
        lfo.stop();
      },
    };
  });
}

// Dynamite stuck on: a sticky thwack.
export function stick(pan = 0) {
  if (!ready()) return;
  const t = now();
  noise(t, 0.07, { freq: 900, q: 2, vol: 0.3, pan });
  tone(320, t, 0.09, { type: 'triangle', vol: 0.18, to: 130, pan });
}

// The dynamite's countdown beep (higher when it's about to go).
export function beep(hurry = false, pan = 0) {
  if (!ready() || !throttle('beep', 90)) return;
  tone(hurry ? 1760 : 1320, now(), 0.07, { type: 'square', vol: 0.05, pan });
}

// The plunger pushed down: a ratchety ka-CHUNK.
export function plunger() {
  if (!ready()) return;
  const t = now();
  for (let i = 0; i < 4; i++) noise(t + i * 0.025, 0.02, { freq: 2400, q: 3, vol: 0.18 });
  tone(140, t + 0.11, 0.12, { type: 'triangle', vol: 0.35, to: 60 });
  noise(t + 0.11, 0.08, { type: 'lowpass', freq: 900, vol: 0.3 });
}

// One machine-gun shot: a short punchy crack with a thump under it.
export function gunShot(pan = 0) {
  if (!ready() || !throttle('gun', 55)) return;
  const t = now();
  noise(t, 0.06, { freq: r(1100, 1700), q: 0.8, vol: 0.3, pan });
  noise(t, 0.025, { type: 'highpass', freq: 4000, vol: 0.12, pan });
  tone(r(140, 170), t, 0.07, { type: 'triangle', vol: 0.28, to: 60, pan });
}

// The machine gun's barrels whirring (pitch follows how fast they spin). Returns a hold handle.
export function gunSpin() {
  return hold((ctx, out) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 90;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    o.connect(f).connect(out);
    o.start(t);
    return {
      pitch(p, at) {
        o.frequency.setTargetAtTime(60 + 140 * p, at, 0.05);
        f.frequency.setTargetAtTime(400 + 700 * p, at, 0.05);
      },
      stop() {
        o.stop();
      },
    };
  });
}

// The UFO's hum: two warbling sine tones, like a cartoon flying saucer. Returns a hold handle.
export function ufoHum() {
  return hold((ctx, out) => {
    const t = ctx.currentTime;
    const parts = [];
    for (const [f0, rate, depth, vol] of [
      [330, 6, 30, 0.5],
      [495, 3.7, 45, 0.3],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const lg = ctx.createGain();
      lg.gain.value = depth;
      lfo.connect(lg).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.value = vol;
      o.connect(g).connect(out);
      o.start(t);
      lfo.start(t);
      parts.push([o, lfo, f0]);
    }
    return {
      pitch(p, at) {
        for (const [o, , f0] of parts) o.frequency.setTargetAtTime(f0 * p, at, 0.1);
      },
      stop() {
        for (const [o, lfo] of parts) {
          o.stop();
          lfo.stop();
        }
      },
    };
  });
}

// The UFO arriving: a swooping wee-ooo.
export function ufoArrive(pan = 0) {
  if (!ready()) return;
  const t = now();
  tone(1400, t, 0.35, { type: 'sine', vol: 0.1, to: 500, vibrato: 7, pan });
  tone(500, t + 0.3, 0.4, { type: 'sine', vol: 0.09, to: 1100, vibrato: 7, pan });
}

// Something beamed aboard the UFO.
export function bloop(pan = 0) {
  if (!ready() || !throttle('bloop', 90)) return;
  tone(r(380, 460), now(), 0.12, { type: 'sine', vol: 0.12, to: r(900, 1200), pan });
}
