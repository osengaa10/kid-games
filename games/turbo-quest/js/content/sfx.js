// Sound effects as data: each is a list of voices played together. Made with Web Audio when they
// play, so there are no sound files.
//   wave: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'
//   f: [start Hz, end Hz] (a glide), t: length in s, v: volume, at: delay in s
//   filter (noise and others): 'lowpass' | 'bandpass' | 'highpass', ff: its frequency, q

export const SFX = {
  jump: [
    { wave: 'square', f: [300, 620], t: 0.11, v: 0.07 },
    { wave: 'triangle', f: [600, 1100], t: 0.09, v: 0.08 },
  ],
  land: [{ wave: 'noise', t: 0.07, v: 0.18, filter: 'lowpass', ff: 700 }],
  bigland: [
    { wave: 'noise', t: 0.12, v: 0.28, filter: 'lowpass', ff: 500 },
    { wave: 'sine', f: [160, 70], t: 0.12, v: 0.25 },
  ],
  bounce: [
    { wave: 'sine', f: [220, 880], t: 0.28, v: 0.25 },
    { wave: 'triangle', f: [440, 1320], t: 0.22, v: 0.1, at: 0.03 },
  ],
  flutter: [{ wave: 'noise', t: 0.16, v: 0.06, filter: 'bandpass', ff: 1800, q: 3 }],
  star: [
    { wave: 'triangle', f: [1046, 1046], t: 0.16, v: 0.14 },
    { wave: 'sine', f: [2093, 2093], t: 0.1, v: 0.05, at: 0.02 },
  ],
  bonk: [{ wave: 'square', f: [220, 160], t: 0.08, v: 0.08 }],
  rescue: [
    { wave: 'sine', f: [300, 900], t: 0.35, v: 0.2 },
    { wave: 'sine', f: [500, 1200], t: 0.3, v: 0.12, at: 0.12 },
    { wave: 'noise', t: 0.3, v: 0.05, filter: 'bandpass', ff: 3000, q: 4, at: 0.05 },
  ],
  respawn: [
    { wave: 'triangle', f: [660, 660], t: 0.1, v: 0.12 },
    { wave: 'triangle', f: [880, 880], t: 0.14, v: 0.12, at: 0.08 },
  ],
  checkpoint: [
    { wave: 'triangle', f: [523, 523], t: 0.12, v: 0.12 },
    { wave: 'triangle', f: [784, 784], t: 0.12, v: 0.12, at: 0.09 },
    { wave: 'triangle', f: [1046, 1046], t: 0.22, v: 0.12, at: 0.18 },
  ],
  win: [
    { wave: 'square', f: [523, 523], t: 0.14, v: 0.08 },
    { wave: 'square', f: [659, 659], t: 0.14, v: 0.08, at: 0.12 },
    { wave: 'square', f: [784, 784], t: 0.14, v: 0.08, at: 0.24 },
    { wave: 'square', f: [1046, 1046], t: 0.5, v: 0.09, at: 0.36 },
    { wave: 'triangle', f: [261, 261], t: 0.8, v: 0.15, at: 0.36 },
    { wave: 'noise', t: 0.6, v: 0.08, filter: 'highpass', ff: 5000, at: 0.36 },
  ],
  tap: [{ wave: 'sine', f: [500, 1000], t: 0.1, v: 0.18 }],
  pause: [{ wave: 'triangle', f: [700, 400], t: 0.14, v: 0.14 }],

  // ------------------------------------------------------------------ bouncing off things
  boing: [
    { wave: 'sine', f: [180, 620], t: 0.22, v: 0.22 },
    { wave: 'triangle', f: [360, 900], t: 0.14, v: 0.06, at: 0.02 },
  ],

  // ---------------------------------------------------------------------------- weapons
  pew: [
    { wave: 'square', f: [1400, 700], t: 0.06, v: 0.035 },
    { wave: 'sine', f: [1800, 1200], t: 0.05, v: 0.05 },
  ],
  bigpop: [
    { wave: 'sawtooth', f: [400, 90], t: 0.28, v: 0.12, filter: 'lowpass', ff: 1400 },
    { wave: 'noise', t: 0.22, v: 0.16, filter: 'lowpass', ff: 1200 },
    { wave: 'sine', f: [900, 1600], t: 0.12, v: 0.08 },
  ],
  bloop: [
    { wave: 'sine', f: [300, 700], t: 0.16, v: 0.16 },
    { wave: 'sine', f: [600, 1100], t: 0.1, v: 0.05, at: 0.05 },
  ],
  ting: [
    { wave: 'triangle', f: [1568, 1568], t: 0.08, v: 0.06 },
    { wave: 'sine', f: [2093, 2093], t: 0.12, v: 0.05, at: 0.03 },
  ],
  charge: [{ wave: 'sine', f: [300, 900], t: 0.7, v: 0.07 }],
  ding: [
    { wave: 'triangle', f: [1318, 1318], t: 0.2, v: 0.1 },
    { wave: 'sine', f: [2637, 2637], t: 0.25, v: 0.04 },
  ],
  empty: [{ wave: 'square', f: [300, 200], t: 0.12, v: 0.05 }],

  // ------------------------------------------------------------------------- Grumblies
  // A cheer: a pop and a giggle (played higher and higher through a combo).
  cheer: [
    { wave: 'noise', t: 0.06, v: 0.14, filter: 'bandpass', ff: 2500, q: 1.5 },
    { wave: 'sine', f: [600, 900], t: 0.07, v: 0.12, at: 0.02 },
    { wave: 'sine', f: [700, 1050], t: 0.07, v: 0.11, at: 0.1 },
    { wave: 'sine', f: [800, 1200], t: 0.09, v: 0.1, at: 0.18 },
  ],
  pop: [{ wave: 'noise', t: 0.05, v: 0.12, filter: 'bandpass', ff: 3000, q: 2 }],
  alert: [
    { wave: 'square', f: [880, 880], t: 0.05, v: 0.04 },
    { wave: 'square', f: [1175, 1175], t: 0.06, v: 0.04, at: 0.06 },
  ],

  // --------------------------------------------------------------------- Turbo himself
  yip: [
    { wave: 'triangle', f: [900, 1300], t: 0.06, v: 0.12 },
    { wave: 'triangle', f: [1200, 700], t: 0.12, v: 0.1, at: 0.06 },
  ],
  bark: [
    { wave: 'sawtooth', f: [420, 300], t: 0.09, v: 0.07, filter: 'lowpass', ff: 1800 },
    { wave: 'sawtooth', f: [460, 320], t: 0.1, v: 0.07, at: 0.16, filter: 'lowpass', ff: 1800 },
  ],
  faint: [
    { wave: 'triangle', f: [700, 300], t: 0.4, v: 0.12 },
    { wave: 'sine', f: [400, 900], t: 0.5, v: 0.08, at: 0.35 },
  ],

  // --------------------------------------------------------------------------- pickups
  gem: [
    { wave: 'triangle', f: [1046, 1046], t: 0.12, v: 0.12 },
    { wave: 'triangle', f: [1318, 1318], t: 0.12, v: 0.12, at: 0.08 },
    { wave: 'triangle', f: [1568, 1568], t: 0.12, v: 0.12, at: 0.16 },
    { wave: 'triangle', f: [2093, 2093], t: 0.4, v: 0.12, at: 0.24 },
    { wave: 'sine', f: [4186, 4186], t: 0.3, v: 0.03, at: 0.24 },
  ],
  heart: [
    { wave: 'sine', f: [660, 660], t: 0.1, v: 0.12 },
    { wave: 'sine', f: [990, 990], t: 0.18, v: 0.12, at: 0.08 },
  ],
  powerup: [
    { wave: 'square', f: [392, 392], t: 0.08, v: 0.05 },
    { wave: 'square', f: [523, 523], t: 0.08, v: 0.05, at: 0.07 },
    { wave: 'square', f: [659, 659], t: 0.08, v: 0.05, at: 0.14 },
    { wave: 'square', f: [784, 784], t: 0.2, v: 0.06, at: 0.21 },
    { wave: 'sine', f: [1568, 1568], t: 0.25, v: 0.04, at: 0.21 },
  ],
  shieldpop: [
    { wave: 'noise', t: 0.15, v: 0.15, filter: 'highpass', ff: 3000 },
    { wave: 'sine', f: [1200, 400], t: 0.2, v: 0.1 },
  ],
  turbo: [
    { wave: 'sawtooth', f: [200, 1200], t: 0.5, v: 0.06, filter: 'lowpass', ff: 3000 },
    { wave: 'square', f: [523, 523], t: 0.1, v: 0.05, at: 0.4 },
    { wave: 'square', f: [784, 784], t: 0.1, v: 0.05, at: 0.48 },
    { wave: 'square', f: [1046, 1046], t: 0.25, v: 0.06, at: 0.56 },
  ],
  grow: [{ wave: 'square', f: [150, 600], t: 0.6, v: 0.06, filter: 'lowpass', ff: 1500 }],
  shrink: [{ wave: 'square', f: [600, 150], t: 0.4, v: 0.05, filter: 'lowpass', ff: 1500 }],
  rustle: [{ wave: 'noise', t: 0.3, v: 0.16, filter: 'bandpass', ff: 2200, q: 0.8 }],
  help: [
    { wave: 'triangle', f: [784, 784], t: 0.1, v: 0.1 },
    { wave: 'triangle', f: [988, 988], t: 0.1, v: 0.1, at: 0.08 },
    { wave: 'triangle', f: [1175, 1175], t: 0.2, v: 0.1, at: 0.16 },
  ],
  select: [
    { wave: 'triangle', f: [784, 784], t: 0.08, v: 0.12 },
    { wave: 'triangle', f: [1046, 1046], t: 0.14, v: 0.12, at: 0.06 },
  ],
  count: [{ wave: 'triangle', f: [1318, 1568], t: 0.06, v: 0.08 }],

  // --------------------------------------------------------------------------------- M2
  spit: [
    { wave: 'noise', t: 0.08, v: 0.12, filter: 'bandpass', ff: 1800, q: 2 },
    { wave: 'sine', f: [500, 260], t: 0.1, v: 0.1 },
  ],
  puff: [{ wave: 'sine', f: [200, 320], t: 0.25, v: 0.06 }],
  clang: [
    { wave: 'triangle', f: [1240, 1180], t: 0.18, v: 0.08 },
    { wave: 'square', f: [1870, 1800], t: 0.08, v: 0.03 },
    { wave: 'noise', t: 0.04, v: 0.08, filter: 'highpass', ff: 4000 },
  ],
  freeze: [
    { wave: 'noise', t: 0.25, v: 0.1, filter: 'highpass', ff: 5000 },
    { wave: 'sine', f: [1800, 2600], t: 0.2, v: 0.05 },
  ],
  thaw: [{ wave: 'noise', t: 0.2, v: 0.08, filter: 'bandpass', ff: 2500, q: 3 }],
  kick: [
    { wave: 'sine', f: [200, 90], t: 0.12, v: 0.2 },
    { wave: 'noise', t: 0.3, v: 0.06, filter: 'highpass', ff: 3000, at: 0.05 },
  ],
  blast: [
    { wave: 'noise', t: 0.35, v: 0.22, filter: 'lowpass', ff: 1800 },
    { wave: 'sine', f: [300, 60], t: 0.3, v: 0.2 },
    { wave: 'triangle', f: [1046, 1568], t: 0.15, v: 0.06, at: 0.08 },
  ],
  paw: [{ wave: 'noise', t: 0.12, v: 0.1, filter: 'lowpass', ff: 600 }],
  thump: [
    { wave: 'sine', f: [120, 40], t: 0.35, v: 0.35 },
    { wave: 'noise', t: 0.3, v: 0.18, filter: 'lowpass', ff: 400 },
  ],
  bossWake: [
    { wave: 'sawtooth', f: [90, 140], t: 0.6, v: 0.08, filter: 'lowpass', ff: 700 },
    { wave: 'sawtooth', f: [140, 90], t: 0.5, v: 0.08, at: 0.55, filter: 'lowpass', ff: 700 },
  ],
  bossHit: [
    { wave: 'square', f: [600, 300], t: 0.18, v: 0.08 },
    { wave: 'noise', t: 0.2, v: 0.2, filter: 'bandpass', ff: 1500 },
    { wave: 'triangle', f: [784, 1568], t: 0.25, v: 0.08, at: 0.12 },
  ],
  goal: [
    { wave: 'triangle', f: [523, 523], t: 0.1, v: 0.1 },
    { wave: 'triangle', f: [784, 784], t: 0.1, v: 0.1, at: 0.1 },
    { wave: 'triangle', f: [1046, 1046], t: 0.3, v: 0.1, at: 0.2 },
  ],
  raft: [{ wave: 'noise', t: 0.4, v: 0.08, filter: 'lowpass', ff: 900 }],
  splash: [
    { wave: 'noise', t: 0.35, v: 0.2, filter: 'bandpass', ff: 1400, q: 0.8 },
    { wave: 'sine', f: [600, 200], t: 0.2, v: 0.08 },
  ],
  locked: [
    { wave: 'square', f: [220, 220], t: 0.08, v: 0.05 },
    { wave: 'square', f: [196, 196], t: 0.12, v: 0.05, at: 0.1 },
  ],
};

// Stars collected in a row climb a cheerful (pentatonic) scale.
export const STAR_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
