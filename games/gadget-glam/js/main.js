// Gadget Glam: decorate a phone, a tablet, an earbud case or a game controller.
// Screens: home (pick a thing), the editor (decorate it), the shelf (everything he's made).
import { ITEMS, ITEM_IDS } from './items.js';
import { newDesign, isEmpty, clone } from './design.js';
import { CaseArt } from './art.js';
import { Editor } from './editor.js';
import { Shelf } from './shelf.js';
import { demoDesign } from './demo.js';
import { drawTable } from './table.js';
import { loadCurrent, saveCurrent, clearCurrent, putCase, newId, listCases } from './storage.js';
import { drawCabinet } from './icons.js';
import * as sound from './sound.js';
import { say, unlockSpeech } from './speech.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// Stop iOS pinch-zoom, double-tap zoom and long-press menus. Only the shelf scrolls.
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

let screen = 'home';
function show(name) {
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === name);
}

// ---------------------------------------------------------------------------- saving

let current = loadCurrent(); // { id, design, finished } — the case being worked on
let saveTimer = 0;
// Saving waits a moment after each change; if the app goes away first, save right then.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && current) {
    clearTimeout(saveTimer);
    saveCurrent(current);
  }
});
function autosave(design, id) {
  current = { id, design, finished: false };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCurrent(current), 300);
}

function thumbOf(design) {
  const art = new CaseArt(design, { px: 700 });
  const url = art.snapshot(360).toDataURL('image/png');
  art.dispose();
  return url;
}

// Ta-da: onto the shelf it goes (or its spot there is updated).
async function finish(design, id, thumb) {
  id ||= newId();
  await putCase({ id, design, thumb });
  current = { id, design, finished: true };
  saveCurrent(current);
  drawCabinets();
  return id;
}

// The display cabinet that stands for his collection (on the home screen and at ta-da), with
// little pictures of his newest six cases on its shelves.
async function drawCabinets() {
  const cases = await listCases();
  const thumbs = await Promise.all(
    cases.slice(0, 6).map(
      (c) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = c.thumb || '';
        }),
    ),
  );
  for (const c of document.querySelectorAll('canvas.cabinet')) {
    const S = Math.round(Math.max(c.clientWidth, 120) * Math.min(2, window.devicePixelRatio || 1));
    c.width = c.height = S;
    drawCabinet(c, thumbs, cases.length);
  }
}

// Starting something new: an unfinished case goes onto the shelf first, so nothing he made is lost.
async function shelveUnfinished() {
  if (!current || current.finished || isEmpty(current.design)) return;
  const id = current.id || newId();
  await putCase({ id, design: current.design, thumb: thumbOf(current.design) });
}

// ------------------------------------------------------------------------------- home

function renderCard(canvas, design, bg) {
  const art = new CaseArt(design, { px: 520 });
  const snap = art.snapshot(440, 0.3);
  art.dispose();
  const S = 480;
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  const s = Math.min((S * 0.94) / snap.width, (S * 0.94) / snap.height);
  g.drawImage(snap, (S - snap.width * s) / 2, (S - snap.height * s) / 2 + S * 0.02, snap.width * s, snap.height * s);
}

const CARD_BG = { phone: '#ffd9ec', tablet: '#d9ecff', earbuds: '#fff1c9', controller: '#dcf8d9' };
let cardsDrawn = false;

function goHome() {
  clearTimeout(saveTimer);
  if (current) {
    if (isEmpty(current.design)) {
      clearCurrent();
      current = null;
    } else saveCurrent(current);
  }
  editor.close();
  show('home');
  const resume = $('resume');
  const unfinished = current && !current.finished && !isEmpty(current.design);
  resume.hidden = !unfinished;
  if (unfinished) requestAnimationFrame(() => renderCard(resume.querySelector('canvas'), current.design, '#ffffff'));
  drawCabinets();
  if (!cardsDrawn) {
    cardsDrawn = true;
    // Draw the pictures one at a time so the screen shows up right away.
    ITEM_IDS.forEach((id, i) => setTimeout(() => renderCard(document.querySelector(`.card[data-item="${id}"] canvas`), demoDesign(id), CARD_BG[id]), 30 + i * 40));
  }
}

async function startItem(item) {
  await shelveUnfinished();
  current = { id: null, design: newDesign(item), finished: false };
  clearCurrent();
  show('editor');
  editor.open(current.design, { id: null });
}

for (const b of document.querySelectorAll('.card[data-item]')) {
  b.addEventListener('click', () => {
    sound.pop();
    say(`${ITEMS[b.dataset.item].say}!`, { force: true });
    b.classList.add('on');
    setTimeout(() => {
      b.classList.remove('on');
      startItem(b.dataset.item);
    }, 250);
  });
}
$('resume').addEventListener('click', () => {
  if (!current) return;
  sound.pop();
  say('Keep going!', { force: true });
  show('editor');
  editor.open(current.design, { id: current.id });
});
$('go-shelf').addEventListener('click', () => {
  sound.pop();
  say('My collection!', { force: true });
  openShelf();
});

// Inside the Kid Games app, the home screen gets a button back to the list of games.
if (window.Capacitor?.isNativePlatform?.()) document.body.classList.add('in-app');
$('all-games').addEventListener('click', () => {
  sound.pop();
  location.href = '../../index.html';
});

// ----------------------------------------------------------------------- editor + shelf

const editor = new Editor({
  onHome: goHome,
  onShelf: (id) => {
    editor.close();
    openShelf(id);
  },
  onFinish: finish,
  onChange: autosave,
});

const shelf = new Shelf({
  onHome: goHome,
  onEdit: (entry) => {
    current = { id: entry.id, design: clone(entry.design), finished: false };
    show('editor');
    editor.open(current.design, { id: entry.id, step: 'spray' });
  },
  // A case deleted from the shelf is gone for good: if it was also the one he was last working
  // on, forget that too, or it would come back as "keep going" (and onto the shelf again).
  onDelete: (id) => {
    if (current?.id !== id) return;
    clearTimeout(saveTimer);
    current = null;
    clearCurrent();
  },
});

function openShelf(id = null) {
  show('shelf');
  shelf.show(id);
}

// ------------------------------------------------------------------------------- the loop

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  const now = t / 1000;
  if (screen === 'editor') editor.frame(now, dt);
  else if (screen === 'shelf') shelf.frame(now, dt);
  requestAnimationFrame(loop);
}

// ?card draws the picture for the Kid Games home screen instead of the game.
if (params.has('card')) {
  const S = Number(params.get('card')) || 1024;
  document.body.innerHTML = '';
  const c = document.createElement('canvas');
  c.width = c.height = S;
  c.style.cssText = `width:${S}px;height:${S}px;display:block`;
  document.body.append(c);
  const g = c.getContext('2d');
  g.drawImage(drawTable(S, S, 1), 0, 0);
  // A phone on the left, and an earbud case in front of it on the right.
  const phone = new CaseArt(demoDesign('phone'), { px: 1100 }).snapshot(S * 0.88, 0.3);
  const buds = new CaseArt(demoDesign('earbuds'), { px: 800 }).snapshot(S * 0.36, 0.3);
  g.drawImage(phone, S * 0.07, (S - phone.height) / 2);
  g.drawImage(buds, S * 0.97 - buds.width, S * 0.93 - buds.height);
  document.body.dataset.ready = '1';
} else {
  goHome();
  requestAnimationFrame(loop);
  if (params.has('debug')) window.__gg = { editor, shelf, startItem, openShelf };
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
