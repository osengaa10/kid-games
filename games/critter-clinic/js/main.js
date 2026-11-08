// Critter Clinic: he's the doctor, giving cute animal patients their check-up.
// Screens: the waiting room (pick a patient), the exam room (the check-up), the sticker book.
// Dev flags: ?debug, ?patient=bunny, ?done=measure,temp, ?ail=cold|fever|tummy, ?spots, ?noui, ?lineup, ?icon=512.
import { PATIENTS, ORDER, pickWaiting } from './patients.js';
import { STEPS } from './checklist.js';
import { Stage } from './stage.js';
import { Waiting } from './waiting.js';
import { Exam } from './exam.js';
import { Book } from './book.js';
import { load, store, withVisit, finishVisit, browserStorage } from './storage.js';
import { AILMENTS, pickAilment, sickLevel } from './sickness.js';
import { ICONS, HOME, ALL_GAMES, BOOK } from './icons.js';
import * as sound from './sound.js';
import { say, unlockSpeech, hush, NARRATOR } from './speech.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

if (params.has('lineup')) {
  import('./lineup.js').then((m) => m.lineup(params));
} else if (params.has('icon')) {
  import('./card.js').then((m) => m.icon(Number(params.get('icon')) || 512));
} else boot();

function boot() {
  // Stop iOS pinch-zoom, double-tap zoom and long-press menus. Only the sticker book scrolls.
  for (const type of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest?.('.scroll')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerdown', () => {
    sound.unlock();
    unlockSpeech();
  }, { capture: true });

  // the pictures on the buttons
  for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = { home: HOME, all: ALL_GAMES, book: BOOK }[el.dataset.icon] || ICONS[el.dataset.icon] || '';
  if (params.has('noui')) document.body.classList.add('noui');

  const storage = browserStorage();
  let data = load(storage);
  const persist = () => store(storage, data);

  const stage = new Stage($('stage'));
  let scene = 'waiting';
  const show = (name) => {
    scene = name;
    for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === name);
  };

  // What each patient in the waiting room is sick with, kept for this session until they've been seen.
  const ails = {};
  const ailOf = (pid) => (data.visit?.p === pid && AILMENTS[data.visit.ail] ? data.visit.ail : (ails[pid] ||= pickAilment()));
  const levelOf = (pid) => (data.visit?.p === pid ? sickLevel(data.visit.done.length) : 1);

  const waiting = new Waiting(stage, { onPick: (pid) => startVisit(pid) });
  const exam = new Exam(stage, {
    onHome: () => {
      if (!exam.finished) data = withVisit(data, exam.visit());
      persist();
      goWaiting();
    },
    onSave: (visit) => {
      data = withVisit(data, visit);
      persist();
    },
    onFinish: (pid, e) => {
      data = finishVisit(data, pid, e);
      delete ails[pid]; // next time, something new
      persist();
    },
    onLeft: () => goWaiting(),
  });
  const book = new Book({ onHome: () => goWaiting() });

  function goWaiting() {
    exam.close();
    show('waiting');
    const ids = pickWaiting(data.seen, data.visit?.p);
    waiting.show(ids, data.visit?.p || null, ids.map(ailOf), ids.map(levelOf));
  }

  function startVisit(pid, opts = {}) {
    waiting.hide();
    show('exam');
    const visit = data.visit?.p === pid ? data.visit : null;
    if (!visit) {
      data = withVisit(data, { p: pid, done: [], shot: null, ail: ailOf(pid) });
      persist();
    }
    exam.open(pid, visit || data.visit, opts);
  }

  $('go-book').addEventListener('click', () => {
    sound.pop();
    say('My sticker book!', { ...NARRATOR, force: true });
    waiting.hide();
    show('book');
    book.show(data.book, true);
  });

  // Inside the Kid Games app, the waiting room gets a button back to the list of games.
  if (window.Capacitor?.isNativePlatform?.()) document.body.classList.add('in-app');
  $('all-games').addEventListener('click', () => {
    sound.pop();
    location.href = '../../index.html';
  });

  // Saving when the app goes away; sound and voice stop until he's back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (scene === 'exam' && !exam.finished) data = withVisit(data, exam.visit());
      persist();
      sound.suspend();
      hush();
    }
  });
  window.addEventListener('pagehide', persist);
  try {
    navigator.storage?.persist?.();
  } catch {
    /* fine */
  }

  window.addEventListener('resize', () => {
    stage.resize();
    if (scene === 'exam') exam.resize();
    else waiting.resize();
  });

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const now = t / 1000;
    if (scene === 'exam') exam.frame(now, dt);
    else if (scene === 'waiting') waiting.frame(now, dt);
    requestAnimationFrame(loop);
  }

  // ?patient=bunny goes straight into the exam room; ?done=measure,temp starts partway through.
  const pid = params.get('patient');
  if (pid && PATIENTS[pid]) {
    const done = (params.get('done') || '').split(',').filter((s) => STEPS.includes(s));
    const ail = AILMENTS[params.get('ail')] ? params.get('ail') : pickAilment();
    data = withVisit(data, { p: pid, done, shot: done.includes('shot') ? { stage: 'done', bandage: 'stars' } : null, ail });
    startVisit(pid, { skipEnter: params.has('skip') });
  } else goWaiting();
  exam.debugSpots = params.has('spots');
  requestAnimationFrame(loop);
  if (params.has('debug')) window.__cc = { exam, waiting, book, data: () => data, startVisit, goWaiting, ORDER };
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
