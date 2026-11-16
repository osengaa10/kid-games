// The grown-up panel: hold the sound button for 2 seconds. Words are fine here; it's for parents.
// Frame stats, quality tier, calm mode (less shaking and flashing), and the stress test, which
// is how to check speed on the iPad itself (there's no address bar for ?flags in the app).
//
// "All three" runs the test once per tier, each on a fresh page load (so the particle fields,
// pixel ratio and shadows really are that tier's), then the speed check on High (runProbe: the
// castle standing still at each pixel ratio, with and without reflections), and comes back here
// with all of it. Each result also
// goes to the console as one `BOOMSTRESS {json}` (or `BOOMPROBE {json}`) line, and
// `BOOMSTRESS-DONE` at the end: a debug build of the app passes console lines to Xcode, or to
// `xcrun devicectl device process launch --console`, so the numbers can be read off a plugged-in
// iPad without typing them out. The results so far are also kept in localStorage (LAST), which a
// development build lets the Mac copy off the iPad over USB, for when the console link drops.
import { runStress, runProbe } from './stress.js';
import { setting, setSetting } from '../settings.js';
import { forcedTier } from '../quality.js';

// The steps still to run ({ q: tier, probe: speed check after }) and the results so far, while
// an all-three run is going. Session storage, so a run that's cut short (app
// closed) never starts again by itself next time.
const QUEUE = 'boom-blocks:stress-queue';
const readQueue = () => {
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE) || 'null');
  } catch {
    return null;
  }
};
const saveQueue = (q) => {
  try {
    if (q) sessionStorage.setItem(QUEUE, JSON.stringify(q));
    else sessionStorage.removeItem(QUEUE);
    return true;
  } catch {
    return false;
  }
};

const LAST = 'boom-blocks:stress-last';
const remember = (results) => {
  try {
    localStorage.setItem(LAST, JSON.stringify({ at: new Date().toISOString(), results }));
  } catch {
    // not fatal: the console line and the panel still have it
  }
};

const f1 = (v) => v.toFixed(1);
const f0 = (v) => v.toFixed(0);

const STEPS = [{ q: 'low' }, { q: 'medium' }, { q: 'high', probe: true }];
const urlOf = (step) => `${location.pathname}?q=${step.q}`;
const isHere = (step) => !!step && forcedTier() === step.q;

// What a result says, for people: four lines (a few for a speed check).
export function describe(r) {
  if (r.tests) {
    const items = Object.entries(r.tests).map(([k, v]) => `${k} ${f0(v.ms)}`);
    const lines = [];
    for (let i = 0; i < items.length; i += 6) lines.push(`  ${items.slice(i, i + 6).join(' · ')}`);
    return [`${r.tier.toUpperCase()} speed check${r.edgeSmoothing ? ', edge smoothing on' : ''} (castle standing still), ms per frame (17 = 60 fps):`, ...lines];
  }
  const b = r.breakdown;
  const verdict = r.p95 <= 17.5 ? 'smooth' : r.fps >= 30 ? 'ok' : 'too slow';
  return [
    `${r.tier.toUpperCase()}: ${f0(r.fps)} fps (${verdict}) · 95% under ${f0(r.p95)} ms · worst ${f0(r.worst)} · ${f0(r.good * 100)}% at 60 fps`,
    `  our work ${f1(b.cpu)} ms (95% ${f0(b.cpuP95)}) · graphics chip ${f1(b.graphics)} ms`,
    `  physics ${f1(b.physics)} (95% ${f0(b.physicsP95)}) · smashing ${f1(b.destruction)} · single blocks ${f1(b.spray ?? 0)} · drawing ${f1(b.draw)} · other ${f1(b.other)}`,
    `  up to ${r.maxAwake} moving / ${r.maxPieces} pieces / ${r.maxSpray ?? 0} single blocks · ${Object.entries(r.perScene)
      .map(([k, v]) => `${k} ${f0(v)}`)
      .join(' · ')} fps`,
  ];
}

// The whole thing as text to paste somewhere: the readable lines, then the raw numbers.
const tagged = (r) => `${r.tests ? 'BOOMPROBE' : 'BOOMSTRESS'} ${JSON.stringify(r)}`;
const asText = (results) => [...results.flatMap(describe), '', ...results.map(tagged)].join('\n');

const report = (r) => console.log(tagged(r));

export class GrownUpPanel {
  constructor(game) {
    this.g = game;
    this.results = [];
    const el = document.createElement('div');
    el.id = 'grownups';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="card">
        <h2>Grown-ups</h2>
        <label class="row"><span>Frame stats</span><button data-k="stats"></button></label>
        <label class="row"><span>Calm mode <small>(less shaking and flashing)</small></span><button data-k="calm"></button></label>
        <div class="row"><span>Quality</span><span class="seg" data-k="quality">
          <button data-v="auto">Auto</button><button data-v="high">High</button><button data-v="medium">Medium</button><button data-v="low">Low</button>
        </span></div>
        <div class="row"><span>Stress test</span><span class="seg">
          <button data-k="stress-all">All three <small>4 min</small></button><button data-k="stress">This setting <small>1 min</small></button>
        </span></div>
        <pre class="result"></pre>
        <div class="row"><button class="wide copy hidden" data-k="copy">Copy results</button><button class="wide done" data-k="done">Done</button></div>
      </div>`;
    document.body.append(el);
    this.el = el;
    this.result = el.querySelector('.result');
    this.copyBtn = el.querySelector('[data-k="copy"]');
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => this.click(e));
    this.refresh();
  }

  open() {
    this.el.classList.remove('hidden');
    this.refresh();
  }
  close() {
    this.el.classList.add('hidden');
  }

  refresh() {
    const q = this.el;
    q.querySelector('[data-k="stats"]').textContent = this.g.statsOn ? 'On' : 'Off';
    q.querySelector('[data-k="calm"]').textContent = setting('calm', false) ? 'On' : 'Off';
    const tier = setting('quality', 'auto');
    for (const b of q.querySelectorAll('[data-k="quality"] button')) b.classList.toggle('on', b.dataset.v === tier);
  }

  show(results) {
    this.results = results;
    this.result.textContent = results.flatMap(describe).join('\n');
    this.copyBtn.textContent = 'Copy results';
    this.copyBtn.classList.toggle('hidden', !results.length);
  }

  async runOne(seconds) {
    const r = await runStress(this.g, seconds);
    report(r);
    this.g.stressResult = r;
    return r;
  }

  // Called once the game is running: carries on an all-three run after its page reloads.
  async resume() {
    const q = readQueue();
    if (!q) return;
    const step = q.todo?.[0];
    if (isHere(step)) {
      q.done.push(await this.runOne(q.seconds));
      remember(q.done);
      if (step.probe) {
        const p = await runProbe(this.g);
        report(p);
        this.g.probeResult = p;
        q.done.push(p);
        remember(q.done);
      }
      q.todo.shift();
      saveQueue(q);
      const next = q.todo[0];
      location.replace(next ? urlOf(next) : location.pathname);
      return;
    }
    // Back on the plain page with everything run (or something went odd): show what there is.
    saveQueue(null);
    if (q.done?.length) {
      console.log('BOOMSTRESS-DONE');
      this.show(q.done);
      this.open();
    }
  }

  async copy() {
    const text = asText(this.results);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Older web views: copy from a selected text box instead.
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.append(t);
      t.select();
      t.setSelectionRange(0, text.length);
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      t.remove();
    }
    this.copyBtn.textContent = ok ? 'Copied' : 'Copy failed';
  }

  async click(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.k || b.parentElement.dataset.k;
    const g = this.g;
    if (k === 'done') this.close();
    else if (k === 'stats') {
      g.setStats(!g.statsOn);
      setSetting('stats', g.statsOn);
    } else if (k === 'calm') {
      setSetting('calm', !setting('calm', false));
      g.setCalm(setting('calm', false));
    } else if (k === 'quality') {
      setSetting('quality', b.dataset.v);
      g.setQuality(b.dataset.v);
    } else if (k === 'copy') this.copy();
    else if (k === 'stress-all') {
      if (saveQueue({ todo: STEPS, done: [] })) location.replace(urlOf(STEPS[0]));
    } else if (k === 'stress') {
      this.close();
      const r = await this.runOne();
      remember([r]);
      this.show([r]);
      this.open();
    }
    this.refresh();
  }
}
