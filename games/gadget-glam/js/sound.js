// Every sound is made with Web Audio, so there are no files to load. iOS only allows audio after a
// touch, so unlock() runs on the first pointerdown. Built like Coaster Doodle's sound.js.

let ctx = null;
let master = null;
let noiseBuffer = null;
let loop = null; // the one continuous sound playing: spray hiss, glue squish, marker squeak, shaker

export function unlock() {
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
  if (ctx.state !== 'running') ctx.resume();
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

function noise(start, dur, { freq = 2000, q = 1, vol = 0.3, type = 'bandpass', to = null } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, start);
  if (to) f.frequency.exponentialRampToValueAtTime(to, start + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
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

// Picking up a spray can: the ball inside rattles.
export function rattle() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    noise(t + i * 0.075, 0.05, { freq: 3200, q: 6, vol: 0.45 });
    tone(2400 + i * 90, t + i * 0.075, 0.04, { type: 'square', vol: 0.03 });
  }
}

export function squeeze() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.25, { type: 'lowpass', freq: 600, to: 200, vol: 0.4 });
  tone(180, t, 0.2, { type: 'triangle', vol: 0.15, to: 90 });
}

export function click() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.04, { freq: 2500, q: 3, vol: 0.5 });
  tone(1400, t, 0.05, { type: 'square', vol: 0.06 });
}

// A stamp pressed down.
export function thunk() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.12, { type: 'lowpass', freq: 400, vol: 0.7 });
  tone(140, t, 0.12, { vol: 0.35, to: 70 });
}

// A sticker peeled off the sheet...
export function peel() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, 0.22, { freq: 1200, to: 5000, q: 2, vol: 0.35 });
}

// ...and slapped onto the case.
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

// A gem clicked into place; n steps it up the scale, so a trail of gems plays a tune.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
export function tink(n = 0) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const f = 880 * Math.pow(2, SCALE[n % SCALE.length] / 12);
  tone(f, t, 0.35, { vol: 0.16 });
  tone(f * 2.01, t, 0.2, { vol: 0.06 });
}

export function boing() {
  if (!ready()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const wob = ctx.createOscillator();
  const depth = ctx.createGain();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(460, t + 0.1);
  o.frequency.exponentialRampToValueAtTime(300, t + 0.5);
  wob.frequency.value = 16;
  depth.gain.setValueAtTime(60, t);
  depth.gain.exponentialRampToValueAtTime(4, t + 0.5);
  wob.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(master);
  o.start(t);
  wob.start(t);
  o.stop(t + 0.6);
  wob.stop(t + 0.6);
}

// Pushing in a pop-it bubble (or popping it back out: a little higher).
export function bubble(back = false) {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(back ? 700 : 420, t, 0.08, { vol: 0.35, to: back ? 1100 : 160 });
  noise(t, 0.03, { freq: 3000, q: 2, vol: 0.25 });
}

export function sparkle() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 1800, t + i * 0.05, 0.18, { vol: 0.06 });
}

export function trash() {
  if (!ready()) return;
  noise(ctx.currentTime, 0.35, { freq: 800, q: 0.7, vol: 0.4 });
  tone(400, ctx.currentTime, 0.3, { type: 'triangle', vol: 0.2, to: 120 });
}

export function whoosh() {
  if (!ready()) return;
  noise(ctx.currentTime, 0.5, { freq: 300, to: 2500, q: 0.8, vol: 0.35 });
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

// ------------------------------------------------------------------------- continuous sounds

const LOOPS = {
  spray: { filter: 'highpass', freq: 2600, q: 0.7, vol: 0.22 },
  shaker: { filter: 'bandpass', freq: 5200, q: 1.5, vol: 0.3, tremolo: 16 },
  squish: { filter: 'lowpass', freq: 420, q: 4, vol: 0.32, tone: { type: 'triangle', freq: 110, wobble: 7, depth: 30, vol: 0.07 } },
  squeak: { filter: 'bandpass', freq: 3800, q: 3, vol: 0.05, tone: { type: 'triangle', freq: 1150, wobble: 11, depth: 90, vol: 0.05 } },
};

// Start a continuous sound; its loudness then follows loopLevel (0..1), e.g. how fast he moves.
export function loopStart(kind) {
  if (!ready()) return;
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
    trem.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = def.tremolo;
    lg.gain.value = 0.4;
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
  loop = { kind, out, stops, osc: def.tone ? stops[stops.length - 2] : null, base: def.tone?.freq };
  loopLevel(kind === 'spray' ? 0.7 : 0.3);
}

export function loopLevel(level, pitch = 1) {
  if (!loop) return;
  const t = ctx.currentTime;
  loop.out.gain.setTargetAtTime(Math.max(0.0001, Math.min(1, level)), t, 0.04);
  if (loop.osc) loop.osc.frequency.setTargetAtTime(loop.base * pitch, t, 0.05);
}

export function loopStop() {
  if (!loop) return;
  const t = ctx.currentTime;
  const { out, stops } = loop;
  out.gain.cancelScheduledValues(t);
  out.gain.setTargetAtTime(0.0001, t, 0.05);
  for (const s of stops) s.stop(t + 0.4);
  loop = null;
}
