// A tiny sequencer: plays a song from content/songs.js on the music bus, scheduling notes a
// little ahead of time (the same approach as Mighty Mower's music). TURBO plays it faster and up
// a step. Nothing plays until the audio is unlocked by a touch.
import { audioContext, audioBus, noiseBuffer } from './audio.js';
import { SONGS } from '../content/songs.js';

const LOOKAHEAD = 0.2;
const C3 = 130.81;
const C5 = 523.25;
const hz = (semis, base) => base * Math.pow(2, semis / 12);

// Drum patterns: 16 steps; k kick, s snare/clap, h shaker, c high conga, l low conga.
const DRUMS = {
  calypso: { k: [0, 8], s: [4, 12], h: [1, 3, 5, 7, 9, 11, 13, 15], c: [3, 7], l: [11, 14] },
  soft: { h: [2, 6, 10, 14], c: [7], l: [15] },
  fill: { k: [0, 8], s: [4, 10, 12, 13, 14, 15], h: [1, 3, 5, 7], c: [3, 9], l: [6, 11] },
};

class Music {
  constructor() {
    this.song = null;
    this.name = null;
    this.timer = null;
    this.turbo = false;
    this.bar = 0;
    this.step = 0;
    this.next = 0;
  }

  play(name) {
    if (typeof window === 'undefined') return; // no music in node tests
    if (this.name === name && this.timer) return;
    this.stop();
    this.name = name;
    this.song = SONGS[name];
    if (!this.song) return;
    this.bar = 0;
    this.step = 0;
    this.next = 0;
    this.timer = setInterval(() => this.tick(), 40);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.name = null;
  }

  setTurbo(on) {
    this.turbo = on;
  }

  bars() {
    const s = this.song;
    return s.order.flatMap((k) => s.sections[k]);
  }

  tick() {
    const ctx = audioContext();
    if (!ctx || ctx.state !== 'running' || !this.song) return;
    const s = this.song;
    const bars = this.bars();
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + LOOKAHEAD) {
      const bpm = s.bpm * (this.turbo ? 1.25 : 1);
      const stepLen = 60 / bpm / 4;
      const key = this.turbo ? 2 : 0;
      const bar = bars[this.bar % bars.length];
      const t = this.next;
      const n = bar.lead[this.step];
      if (n !== null && n !== undefined) this.marimba(hz(n + key, C5), t, (s.leadVol ?? 1) * 0.11);
      const [root, minor] = bar.chord;
      // Calypso bass: root, root, fifth...
      const bassStep = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 0, 14: 7 }[this.step];
      if (bassStep !== undefined && s.drums !== 'soft') this.bass(hz(root + bassStep + key, C3), t, stepLen * 2.2);
      if (s.drums === 'soft' && this.step === 0) this.bass(hz(root + key, C3), t, stepLen * 8);
      // Off-beat chord stabs.
      if (this.step % 4 === 2) for (const iv of [0, minor ? 3 : 4, 7]) this.stab(hz(root + iv + 12 + key, C3), t);
      const d = DRUMS[bar.drums || s.drums];
      if (d) {
        if (d.k?.includes(this.step)) this.kick(t);
        if (d.s?.includes(this.step)) this.clap(t);
        if (d.h?.includes(this.step) || (this.turbo && this.step % 2 === 0)) this.shaker(t);
        if (d.c?.includes(this.step)) this.conga(t, 330);
        if (d.l?.includes(this.step)) this.conga(t, 220);
      }
      this.next += stepLen;
      if (++this.step >= 16) {
        this.step = 0;
        this.bar++;
      }
    }
  }

  // ---------------------------------------------------------------------------- instruments
  voice(type, f, t, dur, vol, { to = null, filter = null, attack = 0.005 } = {}) {
    const ctx = audioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const bq = ctx.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.value = filter;
      o.connect(bq);
      node = bq;
    }
    node.connect(g).connect(audioBus('music'));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  marimba(f, t, vol) {
    this.voice('sine', f, t, 0.42, vol);
    this.voice('sine', f * 4, t, 0.08, vol * 0.35);
    this.voice('triangle', f * 2, t, 0.18, vol * 0.25);
  }

  bass(f, t, dur) {
    this.voice('triangle', f, t, Math.min(0.5, dur), 0.16, { filter: 700, attack: 0.01 });
  }

  stab(f, t) {
    this.voice('square', f, t, 0.09, 0.018, { filter: 1600 });
  }

  kick(t) {
    this.voice('sine', 140, t, 0.16, 0.32, { to: 45 });
  }

  noiseHit(t, dur, vol, type, freq) {
    const ctx = audioContext();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(audioBus('music'));
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  clap(t) {
    this.noiseHit(t, 0.12, 0.16, 'bandpass', 1500);
    this.noiseHit(t + 0.012, 0.1, 0.1, 'bandpass', 1800);
  }

  shaker(t) {
    this.noiseHit(t, 0.04, 0.035, 'highpass', 6500);
  }

  conga(t, f) {
    this.voice('sine', f, t, 0.15, 0.14, { to: f * 0.72 });
  }
}

export const music = new Music();
