// A design is plain data: which item, which style, and the strokes of each step. Pictures are
// painted from it, so undo is "drop the last stroke and repaint", saves are small, and a case
// from the shelf opens exactly as it was. No DOM or canvas here.
//
// Each decorating step keeps its own list of strokes ("ops") and its own undo history, so the
// blue undo button only ever takes back something from the step he's on.
//
// Like real life, whatever he does last goes on top, whichever step it came from: spray after
// puffy paint covers the puffy paint. Every stroke gets a number `n` from a counter that only
// goes up (`seq`), and the picture is painted in that order.
import { ITEMS, STYLES } from './items.js';

export const STEPS = ['style', 'spray', 'puffy', 'marker', 'sticker', 'gem'];
export const LAYERS = ['spray', 'puffy', 'marker', 'sticker', 'gem'];
const MAX_UNDO = 80;

export function newDesign(item) {
  return { v: 1, item, style: 'plain', seq: 0, layers: Object.fromEntries(LAYERS.map((k) => [k, []])) };
}

export function newHistory() {
  return Object.fromEntries(STEPS.map((k) => [k, []]));
}

const get = (design, step) => (step === 'style' ? design.style : design.layers[step]);
function set(design, step, value) {
  if (step === 'style') design.style = value;
  else design.layers[step] = value;
}

// Every change goes through here: remember how the step was, then change it.
function change(design, hist, step, value) {
  const h = hist[step];
  h.push(get(design, step));
  if (h.length > MAX_UNDO) h.shift();
  set(design, step, value);
}

// Give a stroke the next number, so it goes on top of everything made so far.
export function onTop(design, op) {
  design.seq = (design.seq || 0) + 1;
  op.n = design.seq;
  return op;
}

export function addOp(design, hist, step, op) {
  if (op.n == null) onTop(design, op);
  change(design, hist, step, [...design.layers[step], op]);
}

// Swap a stroke for a changed copy. A sticker that's moved or resized is peeled off and stuck
// back on, so it comes out on top ({ top: true }).
export function replaceOp(design, hist, step, index, op, { top = false } = {}) {
  if (top || op.n == null) onTop(design, op);
  const ops = [...design.layers[step]];
  ops[index] = op;
  change(design, hist, step, ops);
}

// Every stroke from every step, in the order they go on: the order to paint them.
export function orderedOps(design) {
  return LAYERS.flatMap((k) => design.layers[k]).sort((a, b) => a.n - b.n);
}

export function removeOp(design, hist, step, index) {
  change(design, hist, step, design.layers[step].filter((_, i) => i !== index));
}

export function setStyle(design, hist, style) {
  if (design.style === style || !STYLES.includes(style)) return false;
  change(design, hist, 'style', style);
  return true;
}

// The orange button: wipe this step (undo brings it back). False if there was nothing to wipe.
export function clearStep(design, hist, step) {
  if (!hasContent(design, step)) return false;
  change(design, hist, step, step === 'style' ? 'plain' : []);
  return true;
}

export function undo(design, hist, step) {
  const h = hist[step];
  if (!h.length) return false;
  set(design, step, h.pop());
  return true;
}

export const canUndo = (hist, step) => hist[step].length > 0;

export const hasContent = (design, step) => (step === 'style' ? design.style !== 'plain' : design.layers[step].length > 0);

export const isEmpty = (design) => STEPS.every((s) => !hasContent(design, s));

// Stickers come in three sizes; tapping one makes it the next size up (and back to small).
export const nextSize = (z) => (z + 1) % 3;

export function encode(design) {
  return JSON.stringify(design);
}

// Anything that doesn't look like a design comes back as null, and odd strokes are dropped,
// so a damaged save can't break the game.
export function decode(text) {
  try {
    const d = typeof text === 'string' ? JSON.parse(text) : text;
    if (!d || d.v !== 1 || !ITEMS[d.item]) return null;
    const out = newDesign(d.item);
    if (STYLES.includes(d.style)) out.style = d.style;
    for (const k of LAYERS) {
      const ops = d.layers?.[k];
      if (Array.isArray(ops)) out.layers[k] = ops.filter((op) => op && typeof op === 'object' && typeof op.k === 'string');
    }
    // Saves from before strokes were numbered: number them in the order the old version painted
    // them (spray, then puffy paint, markers, stickers, gems), so they look the same as before.
    const all = LAYERS.flatMap((k) => out.layers[k]);
    let top = all.reduce((m, op) => (Number.isFinite(op.n) ? Math.max(m, op.n) : m), 0);
    for (const op of all) if (!Number.isFinite(op.n)) op.n = ++top;
    out.seq = Math.max(top, Number.isFinite(d.seq) ? d.seq : 0);
    return out;
  } catch {
    return null;
  }
}

export const clone = (design) => decode(encode(design));
