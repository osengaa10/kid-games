// Patients arrive sick and get better as the check-up goes on. Any step helps (there's nothing to
// diagnose): each one ticked takes away a seventh of the sickness, and the patient says so at a
// few points along the way. Three illnesses a 4-year-old knows, each with its own look and its
// own little symptom now and then:
//   cold:  pale, red runny nose, sneezes
//   fever: flushed and sweaty, wavy heat lines, shivers
//   tummy: green around the gills, holds its tummy, grumbles
// Pure (no canvas), so the tests can use it.
import { STEPS } from './checklist.js';

export const AILMENTS = {
  cold: { hello: 'Achoo! I have a cold.', narr: 'has a cold', symptom: 'sneeze' },
  fever: { hello: 'I feel hot and wobbly.', narr: 'has a fever', symptom: 'shiver' },
  tummy: { hello: 'My tummy hurts.', narr: 'has a tummy ache', symptom: 'tummy' },
};
export const AILMENT_IDS = Object.keys(AILMENTS);

export const pickAilment = (rand = Math.random) => AILMENT_IDS[Math.floor(rand() * AILMENT_IDS.length) % AILMENT_IDS.length];

// How sick, 1 (just arrived) to 0 (all better), from how many steps are done.
export const sickLevel = (doneCount) => Math.max(0, Math.min(1, 1 - doneCount / STEPS.length));

// What the patient says on the way to feeling better, by how many steps are done.
export const BETTER = { 2: 'I feel a little better!', 5: 'I feel much better!', 7: 'I feel all better!' };

// The line to say when going from `before` to `after` steps done (the biggest milestone passed).
export function betterLine(before, after) {
  let line = null;
  for (const [k, text] of Object.entries(BETTER)) if (before < +k && after >= +k) line = text;
  return line;
}

// What the narrator says when a sick patient sits down on the table.
export function arrivalLine(sp, ail) {
  const a = AILMENTS[ail];
  return a ? `Oh no, ${sp.name} ${a.narr}! Let's help with a check-up!` : "Let's start the check-up! Pick a tool!";
}

// What a patient says when he taps it in the waiting room.
export function helloLine(sp, ail) {
  const a = AILMENTS[ail];
  return a ? `Hi Doctor… I'm ${sp.name}. ${a.hello}` : sp.hello;
}

// The sick posture: the head hangs a bit (rig.js droop).
export function sickPose(pose, level) {
  pose.droop = level;
  return pose;
}

// Where his left arm rests: across the tummy with a tummy ache, by the side otherwise.
export const restArm = (level, ail) => (ail === 'tummy' && level > 0 ? -0.95 * level : 0);

// Symptoms now and then: a sneeze, a shiver, a tummy grumble. More often the sicker the patient,
// and none once it's mostly better. update() returns the symptom when one starts; anim() gives
// the movement and face for the one playing.
export const SYMPTOM_MIN = 0.25; // below this sickness, no more symptoms
export const SNEEZE_AT = 0.55; // the "choo" of "ah-choo", seconds in

export class Symptoms {
  constructor(ail, rand = Math.random) {
    this.ail = ail;
    this.rand = rand;
    this.nextAt = null;
    this.cur = null;
  }

  gap(level) {
    return (6 + this.rand() * 5) / Math.max(0.45, level);
  }

  update(now, level) {
    if (this.nextAt == null) this.nextAt = now + 1.5 + this.rand() * 3;
    if (this.cur && now - this.cur.t0 > 1.2) this.cur = null;
    if (!AILMENTS[this.ail] || level < SYMPTOM_MIN) return null;
    if (now < this.nextAt || this.cur) return null;
    this.nextAt = now + this.gap(level);
    this.cur = { kind: AILMENTS[this.ail].symptom, t0: now };
    return this.cur.kind;
  }

  // { dx, headDy, mood } for the symptom playing now (all zero when none).
  anim(now) {
    const c = this.cur;
    const out = { dx: 0, headDy: 0, mood: null };
    if (!c) return out;
    const k = now - c.t0;
    if (c.kind === 'sneeze') {
      if (k < SNEEZE_AT) {
        out.headDy = -0.25 * (k / SNEEZE_AT); // "ah… ah…": head goes back
        out.mood = 'achoo';
      } else if (k < SNEEZE_AT + 0.35) {
        out.headDy = 0.3 * Math.sin(((k - SNEEZE_AT) / 0.35) * Math.PI); // "CHOO!": head snaps forward
        out.mood = 'sneeze';
      }
    } else if (c.kind === 'shiver') {
      if (k < 0.9) {
        out.dx = Math.sin(k * 55) * 0.05 * (1 - k / 0.9);
        out.mood = 'nervous';
      }
    } else if (c.kind === 'tummy' && k < 1.1) {
      out.dx = Math.sin(k * 9) * 0.07 * (1 - k / 1.1);
      out.headDy = 0.08 * Math.sin((k / 1.1) * Math.PI);
      out.mood = 'ouch';
    }
    return out;
  }
}
