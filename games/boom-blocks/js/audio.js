// A tiny synth: every sound is made from oscillators and filtered noise, so there's nothing to
// download. Master → compressor (so a hundred crunches at once don't clip) → speakers.
// Sound starts on the first touch (iOS rule) and pauses while the app is in the background.
import { setting, setSetting } from './settings.js';

const MAX_VOICES = 30;

let ctx = null;
let master = null;
let noiseBuf = null;
let voices = 0;
let muted = setting('muted', false) === true;

export function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // A silent blip makes iOS treat the context as started by this touch.
      const s = ctx.createBufferSource();
      s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      s.connect(ctx.destination);
      s.start();
    }
    if (ctx.state !== 'running') ctx.resume();
  } catch {
    // no sound, no problem
  }
}

export function suspend() {
  try {
    ctx?.suspend();
  } catch {
    // ignore
  }
}

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  setSetting('muted', m);
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.03);
}

export function ready() {
  return !!ctx && ctx.state === 'running' && !muted;
}
export const now = () => (ctx ? ctx.currentTime : 0);

// Allocates a voice slot; returns false when too many sounds are already playing.
function voice(endAt) {
  if (voices >= MAX_VOICES) return false;
  voices++;
  setTimeout(() => voices--, Math.max(0, (endAt - ctx.currentTime) * 1000) + 50);
  return true;
}

function out(node, pan) {
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p).connect(master);
  } else node.connect(master);
}

// An oscillator note with a quick attack and exponential decay. `to` glides the pitch.
export function tone(freq, start, dur, { type = 'sine', vol = 0.2, to = 0, attack = 0.006, pan = 0, vibrato = 0 } = {}) {
  if (!ready() || !voice(start + dur)) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = vibrato;
    lg.gain.value = freq * 0.04;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(start);
    lfo.stop(start + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  out(g, pan);
  o.start(start);
  o.stop(start + dur + 0.05);
}

// A burst of filtered noise. `to` sweeps the filter.
export function noise(start, dur, { freq = 1000, q = 1, type = 'bandpass', vol = 0.2, to = 0, attack = 0.004, pan = 0 } = {}) {
  if (!ready() || !voice(start + dur)) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, start);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g);
  out(g, pan);
  s.start(start, Math.random() * Math.max(0, 1.6 - dur), dur + 0.1);
}

// A held sound (the laser): returns { set(level, pitch), stop() }.
export function hold(build) {
  if (!ready()) return null;
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.connect(master);
  const parts = build(ctx, g, noiseBuf);
  return {
    parts,
    set(level, pitch = 1) {
      g.gain.setTargetAtTime(Math.max(0.0001, level), ctx.currentTime, 0.04);
      parts.pitch?.(pitch, ctx.currentTime);
    },
    stop() {
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      setTimeout(() => {
        parts.stop?.();
        g.disconnect();
      }, 400);
    },
  };
}

// Calls f at most once every `ms` milliseconds per name.
const lastAt = new Map();
export function throttle(name, ms) {
  const t = performance.now();
  if (t - (lastAt.get(name) || -1e9) < ms) return false;
  lastAt.set(name, t);
  return true;
}
