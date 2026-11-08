// One small state machine per check-up step. The exam room feeds each one what the tool is doing
// every frame (which spot it's on, how far along the forehead, how much rubbing, whether a finger
// is pressing) and gets back events (beat, tap, ouch, done…) to turn into sounds, faces and voice.
// Nothing here can fail: letting go only pauses, and progress is never taken back. Pure, so the
// tests can play whole steps frame by frame.

export const TEMP_BINS = 10;
export const TEMP_NEED = 0.75; // share of the forehead to sweep
export const EAR_TIME = 1.2; // seconds in each ear
export const AHH_TIME = 2.0;
export const HEART_BEATS = 3;
export const HEART_MIN = 2.5; // seconds on the chest, so a racing bunny heart still takes a moment
export const RUB = 3.2; // rig units of rubbing with the cotton ball
export const PUSH_TIME = 2.0; // seconds of holding to push the plunger all the way
export const OUCH_AT = 0.3;
export const RETAP = 1.1; // the hammer taps again if he holds it on a knee this long
export const MEGA_ODDS = 0.25;
export const SURPRISE_ODDS = 0.3;

// Which spots each tool can go on. The shot uses three tools in turn.
export const TOOL_SPOTS = {
  temp: ['forehead'],
  heart: ['chest', 'tummy'],
  ears: ['earL', 'earR'],
  ahh: ['mouth'],
  reflex: ['kneeL', 'kneeR'],
  cotton: ['arm'],
  syringe: ['arm'],
  bandage: ['arm'],
};

// Tools that stay where he leaves them on a spot and keep working.
export const STICKY = new Set(['heart', 'ears', 'ahh', 'syringe']);

export function newStep(id, sp, rand = Math.random) {
  switch (id) {
    case 'measure':
      return { id, stage: 'idle', done: false };
    case 'temp':
      return { id, bins: new Array(TEMP_BINS).fill(false), covered: 0, last: -1, done: false };
    case 'heart':
      return { id, period: 60 / sp.bpm, t: 0, next: 0.25, beats: 0, on: false, tummyNext: 0, giggled: false, breathed: false, done: false, doneIn: null };
    case 'ears':
      return { id, time: [0, 0], seen: [false, false], surprise: rand() < SURPRISE_ODDS ? (rand() < 0.5 ? 0 : 1) : -1, surprised: false, current: -1, done: false };
    case 'ahh':
      return { id, t: 0, open: false, tooth: rand() < SURPRISE_ODDS, done: false };
    case 'reflex':
      return { id, tapped: [false, false], on: -1, hover: 0, cool: 0, pending: false, rand, done: false, doneIn: null };
    case 'shot':
      return { id, stage: 'wipe', rub: 0, cold: false, push: 0, ouched: false, bandage: null, done: false };
    default:
      throw new Error(`no step ${id}`);
  }
}

// The tool the step needs right now.
export function toolOf(st) {
  if (st.id !== 'shot') return st.id;
  return { wipe: 'cotton', needle: 'syringe', push: 'syringe', bandage: 'bandage' }[st.stage] || 'syringe';
}

// How far along the step is, 0..1 (the monitor and the tests use it).
export function progress(st) {
  switch (st.id) {
    case 'temp':
      return Math.min(1, st.covered / (TEMP_BINS * TEMP_NEED));
    case 'heart':
      return st.done ? 1 : Math.min(st.beats / HEART_BEATS, st.t / HEART_MIN, 1);
    case 'ears':
      return (Math.min(st.time[0], EAR_TIME) + Math.min(st.time[1], EAR_TIME)) / (EAR_TIME * 2);
    case 'ahh':
      return Math.min(1, st.t / AHH_TIME);
    case 'reflex':
      return (st.tapped[0] + st.tapped[1]) / 2;
    case 'shot':
      return st.done ? 1 : { wipe: 0.33 * Math.min(1, st.rub / RUB), needle: 0.33, push: 0.33 + 0.33 * st.push, bandage: 0.9 }[st.stage];
    default:
      return st.done ? 1 : 0;
  }
}

// input: { spot, along (0..1 across the forehead), rub (rig units rubbed this frame),
//          pressing, placed (a bandage id), touch (the height bar reached the head) }
export function updateStep(st, input, dt) {
  const ev = [];
  if (st.done) return ev;
  const spot = input.spot || null;
  switch (st.id) {
    case 'measure':
      if (st.stage === 'bar' && input.touch) {
        st.stage = 'done';
        st.done = true;
        ev.push({ type: 'touch' }, { type: 'done' });
      }
      break;

    case 'temp': {
      if (spot !== 'forehead') {
        st.last = -1;
        break;
      }
      const b = Math.max(0, Math.min(TEMP_BINS - 1, Math.floor((input.along ?? 0.5) * TEMP_BINS)));
      // a fast swipe skips bins: fill in everything between this frame and the last
      const from = st.last < 0 ? b : st.last;
      for (let k = Math.min(from, b); k <= Math.max(from, b); k++) {
        if (!st.bins[k]) {
          st.bins[k] = true;
          st.covered++;
          ev.push({ type: 'beep', n: st.covered });
        }
      }
      st.last = b;
      if (st.covered >= TEMP_BINS * TEMP_NEED) {
        st.done = true;
        ev.push({ type: 'done' });
      }
      break;
    }

    case 'heart':
      if (spot === 'chest') {
        if (!st.on) {
          st.on = true;
          st.next = Math.min(st.next, 0.25);
          ev.push({ type: 'listen' });
        }
        st.t += dt;
        st.next -= dt;
        if (st.next <= 0) {
          st.beats++;
          st.next += st.period;
          ev.push({ type: 'beat', n: st.beats });
          if (!st.breathed) {
            st.breathed = true;
            ev.push({ type: 'breath' });
          }
        }
        if (st.beats >= HEART_BEATS && st.t >= HEART_MIN && st.doneIn == null) st.doneIn = 0.45;
      } else {
        if (st.on) ev.push({ type: 'unlisten' });
        st.on = false;
        st.next = 0.25;
      }
      if (spot === 'tummy') {
        st.tummyNext -= dt;
        if (st.tummyNext <= 0) {
          st.tummyNext = 1.1;
          ev.push({ type: 'gurgle' });
          if (!st.giggled) {
            st.giggled = true;
            ev.push({ type: 'giggle' });
          }
        }
      } else st.tummyNext = 0;
      if (st.doneIn != null) {
        st.doneIn -= dt;
        if (st.doneIn <= 0) {
          st.done = true;
          ev.push({ type: 'done' });
        }
      }
      break;

    case 'ears': {
      const side = spot === 'earL' ? 0 : spot === 'earR' ? 1 : -1;
      if (side !== st.current) {
        st.current = side;
        if (side >= 0) ev.push({ type: 'look', side });
      }
      if (side >= 0) {
        st.time[side] += dt;
        if (st.surprise === side && !st.surprised && st.time[side] >= 0.5) {
          st.surprised = true;
          ev.push({ type: 'surprise', side });
        }
        if (!st.seen[side] && st.time[side] >= EAR_TIME) {
          st.seen[side] = true;
          const both = st.seen[0] && st.seen[1];
          ev.push({ type: 'ear', side, other: both ? -1 : 1 - side });
          if (both) {
            st.done = true;
            ev.push({ type: 'done' });
          }
        }
      }
      break;
    }

    case 'ahh':
      if (spot === 'mouth') {
        if (!st.open) {
          st.open = true;
          ev.push({ type: 'open' });
        }
        st.t += dt;
        if (st.t >= AHH_TIME) {
          st.done = true;
          ev.push({ type: 'done' });
        }
      } else if (st.open) {
        st.open = false;
        ev.push({ type: 'close' });
      }
      break;

    case 'reflex': {
      st.cool = Math.max(0, st.cool - dt);
      const side = spot === 'kneeL' ? 0 : spot === 'kneeR' ? 1 : -1;
      const tap = (s) => {
        const mega = st.rand() < MEGA_ODDS;
        st.cool = 0.5;
        st.hover = 0;
        st.pending = false;
        st.tapped[s] = true;
        ev.push({ type: 'tap', side: s, mega });
        if (st.tapped[0] && st.tapped[1] && st.doneIn == null) st.doneIn = 0.8;
      };
      if (side !== st.on) {
        st.on = side;
        st.hover = 0;
        st.pending = side >= 0;
      } else if (side >= 0) {
        st.hover += dt;
        if (st.hover >= RETAP) st.pending = true;
      }
      if (st.pending && side >= 0 && st.cool <= 0) tap(side);
      if (st.doneIn != null) {
        st.doneIn -= dt;
        if (st.doneIn <= 0) {
          st.done = true;
          ev.push({ type: 'done' });
        }
      }
      break;
    }

    case 'shot':
      if (st.stage === 'wipe') {
        if (spot === 'arm') {
          if (!st.cold) {
            st.cold = true;
            ev.push({ type: 'cold' });
          }
          st.rub += input.rub || 0;
          if (st.rub >= RUB) {
            st.stage = 'needle';
            ev.push({ type: 'clean' });
          }
        }
      } else if (st.stage === 'needle') {
        if (spot === 'arm') {
          st.stage = 'push';
          ev.push({ type: 'poke' });
        }
      } else if (st.stage === 'push') {
        if (spot === 'arm' && input.pressing) {
          st.push = Math.min(1, st.push + dt / PUSH_TIME);
          if (st.push >= OUCH_AT && !st.ouched) {
            st.ouched = true;
            ev.push({ type: 'ouch' });
          }
          if (st.push >= 1) {
            st.stage = 'bandage';
            ev.push({ type: 'pushed' });
          }
        }
      } else if (st.stage === 'bandage' && input.placed) {
        st.bandage = input.placed;
        st.stage = 'done';
        st.done = true;
        ev.push({ type: 'bandaged', id: input.placed }, { type: 'done' });
      }
      break;
    default:
      break;
  }
  return ev;
}
