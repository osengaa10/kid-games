// Friendly spoken words for a player who can't read yet. Two kinds of voices: the narrator, who
// tells him what to do, and each patient in its own voice. Every line is a recorded clip in
// voice/ (made with ElevenLabs by `npm run voices -- critter-clinic`, see scripts/voices/ at the
// root of the repo), played with Web Audio. A line with no clip falls back to the browser's
// speechSynthesis (the old robotic voice, at the patient's pitch), so nothing is ever silent.
//
// One line at a time. force: say it now, cutting off whatever is being said. queue: say it after
// what's being said ("Ouch!" … "That wasn't so bad!"). Neither: skip it if something was said in
// the last 2.2 s (so taps don't pile up chatter), otherwise it waits its turn too.
import { CLIPS } from '../voice/clips.js';

export const NARRATOR = { voice: 'narrator', pitch: 1.1, rate: 0.95 };

const VOLUME = 1;
const KEEP = 40; // decoded clips kept ready (each is a second or two of audio)
const DEV = typeof location !== 'undefined' && /^(localhost|127\.|192\.168\.)/.test(location.hostname);

let enabled = true;
let last = 0;
let ctx = null;
let out = null;
let ttsVoice = null;
let ttsUnlocked = false;
let waiting = []; // lines waiting their turn
let current = null; // the line being said: { stop() }
let warm = null; // the patient whose clips were last got ready
let gen = 0; // goes up on every cut-off, so a clip that's still loading knows not to play
const buffers = new Map(); // clip file -> Promise<AudioBuffer | null>, most recently used last
const missed = new Set();

const keyOf = (voice, text) => `${voice}|${String(text).trim().replace(/\s+/g, ' ')}`;

function synth() {
  return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
}

// ------------------------------------------------------------------------------- unlocking

// iOS only allows sound after a touch: this runs on every pointerdown (main.js), and makes (or
// wakes up) the audio context and the fallback voice from inside that touch.
export function unlockSpeech() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        out = ctx.createGain();
        out.gain.value = VOLUME;
        out.connect(ctx.destination);
        // a moment of silence, played inside the touch, is what really unlocks older iOS
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(out);
        src.start(0);
      }
    }
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {
    /* no clips, the fallback voice still works */
  }
  const s = synth();
  if (s && !ttsUnlocked) {
    ttsUnlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      s.speak(u);
    } catch {
      /* ignore */
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hush();
      ctx?.suspend().catch(() => {});
    }
  });
}

// --------------------------------------------------------------------------------- talking

export function setSpeechEnabled(on) {
  enabled = on;
  if (!on) hush();
}

// Stop talking, and forget what was waiting to be said.
export function hush() {
  gen++;
  waiting = [];
  const c = current;
  current = null;
  c?.stop();
  synth()?.cancel();
}

export function say(text, { force = false, queue = false, voice = 'narrator', pitch = NARRATOR.pitch, rate = NARRATOR.rate } = {}) {
  if (!enabled || !text) return;
  const now = performance.now();
  if (!force && !queue && now - last < 2200) return;
  last = now;
  if (force) hush();
  waiting.push({ text, voice, pitch, rate });
  next();
  // a patient's first words: get the rest of its lines ready
  if (ctx && voice !== NARRATOR.voice && voice !== warm) {
    warm = voice;
    preloadVoice(voice);
  }
}

// Get this voice's clips ready ahead of time. say() does it for a patient the first time it speaks.
export function preloadVoice(voice) {
  if (!ctx) return;
  const prefix = `${voice}|`;
  for (const [key, file] of Object.entries(CLIPS)) if (key.startsWith(prefix)) load(file);
}

function next() {
  if (current || !waiting.length) return;
  const line = waiting.shift();
  const key = keyOf(line.voice, line.text);
  const file = CLIPS[key];
  if (!file && DEV && !missed.has(key)) {
    missed.add(key);
    console.warn('no voice clip for', key, '(npm run voices -- critter-clinic)');
  }
  const my = gen;
  let over = false;
  let src = null;
  let timer = 0;
  const finish = () => {
    if (over) return;
    over = true;
    clearTimeout(timer);
    if (current === me) current = null;
    next();
  };
  const me = {
    stop() {
      over = true;
      clearTimeout(timer);
      try {
        src?.stop();
      } catch {
        /* already over */
      }
    },
  };
  current = me;
  if (!file || !ctx) {
    speakFallback(line, me, finish);
    return;
  }
  load(file).then((buf) => {
    if (over || my !== gen) return;
    if (!buf) {
      speakFallback(line, me, finish);
      return;
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(out);
    src.onended = finish;
    src.start();
    // if iOS has the audio paused (back from the background, no touch yet), don't hold up the
    // lines behind this one: give up on it a little after it should have ended
    timer = setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* already over */
      }
      finish();
    }, buf.duration * 1000 + 1500);
  });
}

// ---------------------------------------------------------------------------------- clips

function load(file) {
  let p = buffers.get(file);
  if (p) {
    // most recently used goes to the end, so it's the last to be dropped
    buffers.delete(file);
    buffers.set(file, p);
    return p;
  }
  p = fetch(new URL(`../voice/${file}`, import.meta.url))
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(res.status))))
    .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
    .catch(() => {
      buffers.delete(file);
      return null;
    });
  buffers.set(file, p);
  while (buffers.size > KEEP) buffers.delete(buffers.keys().next().value);
  return p;
}

// ------------------------------------------------------------------------ the fallback voice

function chooseVoice() {
  const voices = synth()?.getVoices() || [];
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang));
  return (
    en.find((v) => /Samantha|Karen|Moira|Tessa|Google US English|Aria|Jenny/i.test(v.name)) ||
    en.find((v) => /en[-_]US/i.test(v.lang)) ||
    en[0] ||
    null
  );
}

if (synth()) synth().addEventListener?.('voiceschanged', () => (ttsVoice = chooseVoice()));

function speakFallback(line, me, done) {
  const s = synth();
  if (!s) {
    done();
    return;
  }
  // iOS doesn't always say when it's finished, so don't wait for it forever
  const timer = setTimeout(done, 1200 + 110 * line.text.length);
  const stop = me.stop;
  me.stop = () => {
    clearTimeout(timer);
    stop();
    s.cancel();
  };
  try {
    if (!ttsVoice) ttsVoice = chooseVoice();
    const u = new SpeechSynthesisUtterance(line.text);
    if (ttsVoice) u.voice = ttsVoice;
    u.pitch = line.pitch;
    u.rate = line.rate;
    u.volume = 1;
    u.onend = u.onerror = () => {
      clearTimeout(timer);
      done();
    };
    s.speak(u);
  } catch {
    clearTimeout(timer);
    done();
  }
}
