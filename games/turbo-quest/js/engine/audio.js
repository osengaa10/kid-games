// Web Audio: one context, a master gain and buses for music, sound effects and voice.
// iOS only allows sound after a touch, so unlockAudio() runs on the first touch (and again after
// coming back from the background, inside the tap on ▶).
import { SFX } from '../content/sfx.js';

let ctx = null;
let master = null;
const bus = {};
let noise = null;
const playing = new Map(); // sound name -> end times of the copies still playing
const MAX_COPIES = 3;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      for (const name of ['music', 'sfx', 'voice']) {
        bus[name] = ctx.createGain();
        bus[name].connect(master);
      }
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {
    /* no sound, no problem */
  }
}

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
}

export function setVolume(name, v) {
  if (bus[name]) bus[name].gain.value = v;
}

export const audioReady = () => !!ctx && ctx.state === 'running';
export const audioContext = () => ctx;
export const audioBus = (name) => bus[name];
export const noiseBuffer = () => noise;

// Plays a sound from content/sfx.js. pitch multiplies every frequency; a little random detune
// keeps repeated sounds from feeling mechanical.
export function play(name, { pitch = 1, vol = 1 } = {}) {
  if (!audioReady()) return;
  const recipe = SFX[name];
  if (!recipe) return;
  const now = ctx.currentTime;
  const ends = (playing.get(name) || []).filter((t) => t > now);
  if (ends.length >= MAX_COPIES) return;
  const p = pitch * (1 + (Math.random() - 0.5) * 0.06);
  let end = now;
  for (const voice of recipe) end = Math.max(end, playVoice(voice, now, p, vol));
  ends.push(end);
  playing.set(name, ends);
}

function playVoice(v, now, pitch, vol) {
  const t0 = now + (v.at || 0);
  const t1 = t0 + v.t;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v.v * vol), t0 + Math.min(0.012, v.t / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  let src;
  if (v.wave === 'noise') {
    src = ctx.createBufferSource();
    src.buffer = noise;
    src.start(t0, Math.random() * 0.5);
  } else {
    src = ctx.createOscillator();
    src.type = v.wave;
    src.frequency.setValueAtTime(v.f[0] * pitch, t0);
    if (v.f[1] !== v.f[0]) src.frequency.exponentialRampToValueAtTime(v.f[1] * pitch, t1);
    src.start(t0);
  }
  src.stop(t1 + 0.05);
  let node = src;
  if (v.filter) {
    const f = ctx.createBiquadFilter();
    f.type = v.filter;
    f.frequency.value = v.ff * pitch;
    if (v.q) f.Q.value = v.q;
    node.connect(f);
    node = f;
  }
  node.connect(g).connect(bus.sfx);
  return t1;
}
