// Everything Critter Clinic says out loud, and who says it, for the voice clips
// (`npm run voices -- critter-clinic`, see scripts/voices/ at the root of the repo).
//
// Most of it comes straight from the game: the patients' lines in patients.js and sickness.js,
// the narrator's in checklist.js, sickness.js, stickers.js and bandages.js, and every sentence written right in
// a say(), sayN() or sayP() call (sayP is a patient, so all six say it). What can't be found that
// way is listed here: sentences kept in a variable before they're said, and lines built from data
// (TEMPLATES). test/voice.test.js fails if a sentence in the game isn't covered by either.
import fs from 'node:fs';
import { PATIENTS, ORDER } from '../js/patients.js';
import { STEP_INFO, CHEERS } from '../js/checklist.js';
import { STICKER_SAY } from '../js/stickers.js';
import { BANDAGE_SAY } from '../js/bandages.js';
import { AILMENT_IDS, BETTER, helloLine, arrivalLine } from '../js/sickness.js';
import { sayCalls } from '../../../scripts/voices/scan.mjs';

// The files that speak.
export const SOURCES = ['js/exam.js', 'js/waiting.js', 'js/main.js'];

// The patient lines every patient has (test/rig.test.js checks they're all there).
const PATIENT_KEYS = ['hello', 'back', 'thanks', 'nervous', 'ouch', 'notBad', 'brave', 'giggle', 'cold', 'whoa', 'big', 'ahh', 'hi', 'bye'];

// The narrator's sentences that are put in a variable or returned before they're said.
const NARRATOR_EXTRA = ['Rub the arm clean!', 'Put the shot on the arm!'];

// Lines the game builds from data (as the source scan sees them), each one listed below.
export const TEMPLATES = [
  '${…} ${…}', // a step's name and what to do (or just the name, once it's done)
  '${…}!', // a sticker
];

// Sentences in SOURCES that aren't said out loud.
export const NOT_SPOKEN = [];

// How to say it, for Eleven v3: the audio tags in [brackets] are acted, not read. The game still
// finds the clip by the plain line.
const PERFORM = {
  'Hee hee! That tickles!': '[giggles] Hee hee! That tickles!',
  'Hee hee!': '[giggles] Hee hee!',
  "I'm a little nervous…": "[nervously] I'm a little nervous…",
  'Brrr!': '[shivering] Brrr!',
  'Ooh, my tummy…': '[groaning] Ooh, my tummy…',
  'Cough, cough!': '[coughing] Cough, cough!',
  'Ahhhhh… yawn!': 'Ahhhhh… [yawns]',
};
const SICK_TONE = { cold: '[sniffly]', fever: '[weakly]', tummy: '[groaning]' };

export function lines() {
  const out = [];
  const add = (voice, text, perform = PERFORM[text]) => text && out.push({ voice, text, perform });
  const narrator = (text) => add('narrator', text);
  const patients = (text) => ORDER.forEach((id) => add(id, text));

  // the patients
  for (const id of ORDER) {
    const sp = PATIENTS[id];
    for (const k of PATIENT_KEYS) add(id, sp[k]);
    for (const ail of AILMENT_IDS) {
      const line = helloLine(sp, ail);
      add(id, line, SICK_TONE[ail] ? `${SICK_TONE[ail]} ${line}` : undefined);
    }
  }
  Object.values(BETTER).forEach(patients);

  // the narrator
  for (const s of Object.values(STEP_INFO)) {
    narrator(s.name);
    narrator(s.prompt);
    narrator(s.cheer);
    narrator(s.hot);
    narrator(`${s.name} ${s.prompt}`);
  }
  CHEERS.forEach(narrator);
  Object.values(STICKER_SAY).forEach((s) => narrator(`${s}!`));
  Object.values(BANDAGE_SAY).forEach(narrator);
  narrator(arrivalLine(null, null));
  for (const id of ORDER) for (const ail of AILMENT_IDS) narrator(arrivalLine(PATIENTS[id], ail));
  NARRATOR_EXTRA.forEach(narrator);

  // every sentence written in a say call
  for (const call of spoken()) (call.voice === 'patient' ? patients : narrator)(call.text);
  return out;
}

// The sentences in say(), sayN() and sayP() calls in SOURCES, with who says them: sayP is the
// patient, and so is a plain say() that passes the patient's pitch or voice.
export function spoken() {
  const out = [];
  for (const file of SOURCES) {
    const src = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const call of sayCalls(src)) {
      const patient = call.fn === 'sayP' || (call.fn === 'say' && !/NARRATOR/.test(call.code) && /\bsp\b|voice:\s*sp/.test(call.code));
      for (const text of call.sentences) out.push({ file, text, voice: patient ? 'patient' : 'narrator' });
    }
  }
  return out;
}
