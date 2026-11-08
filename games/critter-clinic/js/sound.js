// Every sound is made with Web Audio, so there are no files to load. iOS only allows audio after a
// touch, so unlock() runs on the first pointerdown. The building blocks (tone, noise, the looping
// sounds) are Gadget Glam's; the clinic sounds are new: a heartbeat, tummy gurgles, a purr,
// thermometer beeps, the reflex boing and the rest.

let ctx = null;
let master = null;
let noiseBuffer = null;
let loop = null; // the one continuous sound playing: the cotton-ball squeak, the purr

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {
    /* no sound, no problem */
  }
}

export function suspend() {
  if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
}

const ready = () => ctx && ctx.state === 'running';

function tone(freq, start, dur, { type = 'sine', vol = 0.3, to = null } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(start, dur, { freq = 2000, q = 1, vol = 0.3, type = 'bandpass', to = null, attack = 0 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, start);
  if (to) f.frequency.exponentialRampToValueAtTime(to, start + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  if (attack) {
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + attack);
  } else g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master);
  src.start(start, Math.random());
  src.stop(start + dur + 0.05);
}

// ------------------------------------------------------------------------------- short sounds

export function pop() {
  if (!ready()) return;
  tone(520, ctx.currentTime, 0.12, { vol: 0.25, to: 950 });
}

export function click() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.04, { freq: 2500, q: 3, vol: 0.5 });
  tone(1400, t, 0.05, { type: 'square', vol: 0.06 });
}

// A sticker or bandage peeled off its sheet...
export function peel() {
  if (!ready()) return;
  noise(ctx.currentTime, 0.22, { freq: 1200, to: 5000, q: 2, vol: 0.35 });
}

// ...and slapped on.
export function slap() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.08, { type: 'lowpass', freq: 1400, vol: 0.6 });
  tone(300, t, 0.1, { type: 'triangle', vol: 0.2, to: 1200 });
  tone(1500, t + 0.06, 0.12, { vol: 0.1 });
}

export function poof() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.3, { freq: 1200, q: 0.6, vol: 0.3 });
  tone(700, t, 0.2, { type: 'triangle', vol: 0.12, to: 300 });
}

export function boing(big = false) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const len = big ? 0.9 : 0.5;
  const o = ctx.createOscillator();
  const wob = ctx.createOscillator();
  const depth = ctx.createGain();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(big ? 120 : 160, t);
  o.frequency.exponentialRampToValueAtTime(big ? 900 : 460, t + (big ? 0.22 : 0.1));
  o.frequency.exponentialRampToValueAtTime(big ? 380 : 300, t + len);
  wob.frequency.value = big ? 12 : 16;
  depth.gain.setValueAtTime(big ? 120 : 60, t);
  depth.gain.exponentialRampToValueAtTime(4, t + len);
  wob.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(big ? 0.3 : 0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
  o.connect(g).connect(master);
  o.start(t);
  wob.start(t);
  o.stop(t + len + 0.1);
  wob.stop(t + len + 0.1);
}

export function sparkle() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 1800, t + i * 0.05, 0.18, { vol: 0.06 });
}

export function whoosh() {
  if (!ready()) return;
  noise(ctx.currentTime, 0.4, { freq: 300, to: 2500, q: 0.8, vol: 0.25 });
}

// Ta-da!
export function fanfare() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    tone(f, t + i * 0.11, 0.3, { type: 'triangle', vol: 0.22 });
    tone(f * 2, t + i * 0.11, 0.2, { vol: 0.05 });
  });
  tone(1047, t + 0.48, 0.9, { type: 'triangle', vol: 0.22 });
  tone(1319, t + 0.48, 0.9, { type: 'triangle', vol: 0.14 });
  tone(1568, t + 0.48, 0.9, { type: 'triangle', vol: 0.12 });
  noise(t + 0.45, 1.2, { freq: 2500, q: 0.4, vol: 0.12 });
}

// ------------------------------------------------------------------------------ clinic sounds

// A box ticked on the clipboard: a bright two-note bell.
export function ding() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(1319, t, 0.5, { vol: 0.16 });
  tone(1976, t + 0.09, 0.6, { vol: 0.13 });
  tone(3952, t + 0.09, 0.3, { vol: 0.025 });
}

// Lub-dub: two soft low thumps. vol drops a little for very fast hearts so it isn't a drum roll.
export function heartbeat(vol = 1) {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(72, t, 0.16, { vol: 0.7 * vol, to: 42 });
  noise(t, 0.09, { type: 'lowpass', freq: 220, vol: 0.5 * vol });
  tone(64, t + 0.2, 0.13, { vol: 0.45 * vol, to: 40 });
  noise(t + 0.2, 0.07, { type: 'lowpass', freq: 200, vol: 0.32 * vol });
}

// Tummy noises: a few wobbly bubbles.
export function gurgle() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const f = 140 + Math.random() * 220;
    tone(f, t + i * 0.09 + Math.random() * 0.04, 0.12, { type: 'sine', vol: 0.3, to: f * (1.6 + Math.random()) });
  }
  noise(t, 0.35, { type: 'lowpass', freq: 300, vol: 0.18 });
}

// A big breath in, then out.
export function breath() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.9, { freq: 700, q: 0.7, vol: 0.12, to: 1400, attack: 0.5 });
  noise(t + 1.0, 1.0, { freq: 1100, q: 0.7, vol: 0.1, to: 500, attack: 0.15 });
}

// The ear camera switching on.
export function whirr() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(240, t, 0.3, { type: 'square', vol: 0.03, to: 520 });
  noise(t, 0.25, { freq: 2600, q: 4, vol: 0.12 });
  tone(1800, t + 0.28, 0.08, { vol: 0.08 });
}

// The thermometer sweeping: each beep a little higher.
export function beep(n = 0) {
  if (!ready()) return;
  tone(880 * Math.pow(2, Math.min(n, 14) / 14), ctx.currentTime, 0.07, { type: 'square', vol: 0.05 });
}

// ...and done: beep beep beep.
export function tripleBeep() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) tone(1760, t + i * 0.16, 0.1, { type: 'square', vol: 0.07 });
}

// The rubber hammer on a knee.
export function tok() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(260, t, 0.08, { type: 'triangle', vol: 0.35, to: 140 });
  noise(t, 0.04, { type: 'lowpass', freq: 900, vol: 0.4 });
}

// The scale: a springy wobble as the dial settles.
export function spring() {
  if (!ready()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const wob = ctx.createOscillator();
  const depth = ctx.createGain();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 220;
  wob.frequency.value = 9;
  depth.gain.setValueAtTime(80, t);
  depth.gain.exponentialRampToValueAtTime(2, t + 1.1);
  wob.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(g).connect(master);
  o.start(t);
  wob.start(t);
  o.stop(t + 1.25);
  wob.stop(t + 1.25);
}

// The height bar touching the top of his head.
export function boop() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(660, t, 0.12, { vol: 0.22, to: 330 });
  tone(990, t + 0.1, 0.25, { type: 'triangle', vol: 0.12 });
}

// A nose boop: honk!
export function honk() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(420, t, 0.16, { type: 'square', vol: 0.08, to: 300 });
  tone(423, t, 0.16, { type: 'sawtooth', vol: 0.05, to: 302 });
}

// A happy little trill (giggles, "tickles!").
export function trill() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [988, 1175, 1319, 1175, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.09, { vol: 0.07 }));
}

// The needle going in: a tiny soft pinch.
export function pinch() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(1600, t, 0.06, { vol: 0.06, to: 2400 });
  noise(t, 0.05, { freq: 5000, q: 2, vol: 0.08 });
}

// The plunger sliding home: a soft rising hiss.
export function hiss() {
  if (!ready()) return;
  noise(ctx.currentTime, 0.5, { type: 'highpass', freq: 3000, vol: 0.06, attack: 0.1 });
}

// Patient hopping.
export function hop() {
  if (!ready()) return;
  tone(300, ctx.currentTime, 0.15, { type: 'sine', vol: 0.18, to: 700 });
}

// ------------------------------------------------------------------------------ feeling sick

// "Ah… ah… CHOO!" (the choo lands at 0.55 s, with the head snapping forward).
export function sneeze() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(260, t, 0.5, { type: 'triangle', vol: 0.06, to: 480 });
  noise(t, 0.5, { freq: 900, q: 1.5, vol: 0.06, to: 1700, attack: 0.35 });
  noise(t + 0.55, 0.3, { freq: 2600, q: 0.6, vol: 0.5, to: 700 });
  tone(620, t + 0.55, 0.14, { type: 'triangle', vol: 0.12, to: 260 });
}

export function cough() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 2; i++) {
    noise(t + i * 0.3, 0.17, { type: 'lowpass', freq: 1100, vol: 0.5, to: 380 });
    tone(190, t + i * 0.3, 0.13, { type: 'triangle', vol: 0.12, to: 120 });
  }
}

// Teeth chattering: a fever shiver.
export function shiver() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 9; i++) noise(t + i * 0.065, 0.03, { freq: 3200, q: 5, vol: 0.22 });
}

// Feeling better: a sparkly rising chime.
export function heal() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [784, 988, 1175, 1568, 1976].forEach((f, i) => {
    tone(f, t + i * 0.07, 0.4, { vol: 0.09 });
    tone(f * 2, t + i * 0.07, 0.15, { vol: 0.02 });
  });
  noise(t + 0.1, 0.6, { type: 'highpass', freq: 6000, vol: 0.05, attack: 0.2 });
}

// ------------------------------------------------------------------------- continuous sounds

const LOOPS = {
  squeak: { filter: 'bandpass', freq: 3800, q: 3, vol: 0.05, tone: { type: 'triangle', freq: 1150, wobble: 11, depth: 90, vol: 0.05 } },
  purr: { filter: 'lowpass', freq: 300, q: 1, vol: 0.5, tremolo: 24 },
};

// Start a continuous sound; its loudness then follows loopLevel (0..1), e.g. how fast he rubs.
export function loopStart(kind) {
  if (!ready()) return;
  if (loop?.kind === kind) return;
  loopStop();
  const def = LOOPS[kind];
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.connect(master);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = def.filter;
  f.frequency.value = def.freq;
  f.Q.value = def.q;
  const ng = ctx.createGain();
  ng.gain.value = def.vol;
  src.connect(f).connect(ng);
  const stops = [src];
  if (def.tremolo) {
    const trem = ctx.createGain();
    trem.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = def.tremolo;
    lg.gain.value = 0.5;
    lfo.connect(lg).connect(trem.gain);
    ng.connect(trem).connect(out);
    lfo.start(t);
    stops.push(lfo);
  } else ng.connect(out);
  if (def.tone) {
    const o = ctx.createOscillator();
    o.type = def.tone.type;
    o.frequency.value = def.tone.freq;
    const wob = ctx.createOscillator();
    const depth = ctx.createGain();
    wob.frequency.value = def.tone.wobble;
    depth.gain.value = def.tone.depth;
    wob.connect(depth).connect(o.frequency);
    const og = ctx.createGain();
    og.gain.value = def.tone.vol;
    o.connect(og).connect(out);
    o.start(t);
    wob.start(t);
    stops.push(o, wob);
  }
  src.start(t, Math.random());
  loop = { kind, out, stops };
  loopLevel(0.3);
}

export function loopLevel(level) {
  if (!loop) return;
  loop.out.gain.setTargetAtTime(Math.max(0.0001, Math.min(1, level)), ctx.currentTime, 0.04);
}

export function loopStop(kind = null) {
  if (!loop || (kind && loop.kind !== kind)) return;
  const t = ctx.currentTime;
  const { out, stops } = loop;
  out.gain.cancelScheduledValues(t);
  out.gain.setTargetAtTime(0.0001, t, 0.05);
  for (const s of stops) s.stop(t + 0.4);
  loop = null;
}
