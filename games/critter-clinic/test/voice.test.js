import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lines, spoken, SOURCES, TEMPLATES, NOT_SPOKEN } from '../scripts/voice-lines.mjs';
import { sayCalls, sentences, clipKey } from '../../../scripts/voices/scan.mjs';
import { CLIPS } from '../voice/clips.js';
import { ORDER, PATIENTS } from '../js/patients.js';

const cast = JSON.parse(fs.readFileSync(new URL('../../../scripts/voices/cast.json', import.meta.url), 'utf8'));
const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const all = lines();
const voiced = new Set(all.map((l) => l.text.trim().replace(/\s+/g, ' ')));

test('every line has a voice in the cast, and every patient is in it', () => {
  for (const l of all) assert.ok(cast[l.voice], `"${l.text}" is said by ${l.voice}, who isn't in scripts/voices/cast.json`);
  for (const id of ORDER) assert.ok(cast[id], `${PATIENTS[id].name} (${id}) needs a voice in scripts/voices/cast.json`);
  assert.ok(cast.narrator);
});

test('every sentence the game can say is in voice-lines.mjs', () => {
  for (const file of SOURCES) {
    for (const s of sentences(read(file))) {
      if (NOT_SPOKEN.includes(s)) continue;
      assert.ok(voiced.has(s.trim().replace(/\s+/g, ' ')), `${file}: "${s}" isn't voiced. Add it to scripts/voice-lines.mjs (or NOT_SPOKEN)`);
    }
  }
});

test('every line built from data in a say call is one voice-lines.mjs knows how to list', () => {
  for (const file of SOURCES) {
    for (const call of sayCalls(read(file))) {
      for (const t of call.templates) assert.ok(TEMPLATES.includes(t), `${file}: ${call.fn}(\`${t}\`) builds a line voice-lines.mjs doesn't list. Add its lines there, and the template to TEMPLATES`);
    }
  }
});

test('the patients speak in their own voices, the narrator in hers', () => {
  const who = new Map(spoken().map((s) => [s.text, s.voice]));
  assert.equal(who.get('Cough, cough!'), 'patient');
  assert.equal(who.get('Pick a tool!'), 'narrator');
  assert.equal(who.get("Who's next? Tap a patient!"), 'narrator');
  const biscuit = all.filter((l) => l.voice === 'puppy').map((l) => l.text);
  assert.ok(biscuit.includes(PATIENTS.puppy.hello) && biscuit.includes('I feel all better!'));
});

// Only once the clips have been made (an empty voice/clips.js means not yet: the game uses the
// fallback voice until then).
test('every line has a clip, and every clip is there', { skip: !Object.keys(CLIPS).length && 'no voice clips made yet' }, () => {
  const missing = all.filter((l) => !CLIPS[clipKey(l.voice, l.text)]);
  assert.deepEqual(
    missing.map((l) => `${l.voice}: ${l.text}`),
    [],
    'some lines have no clip yet. Run: npm run voices -- critter-clinic',
  );
  for (const file of new Set(Object.values(CLIPS))) assert.ok(fs.existsSync(new URL(`../voice/${file}`, import.meta.url)), `voice/${file} is missing`);
});
