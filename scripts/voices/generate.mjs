// Makes a game's voice clips: every line in games/<game>/scripts/voice-lines.mjs, said by its voice
// in cast.json, saved as games/<game>/voice/<voice>-<hash>.mp3, with voice/clips.js saying which
// file is which line. Only new or changed lines go to ElevenLabs; clips nothing uses any more are
// deleted. The clips are committed, so building the app needs no key and no internet.
//
//   npm run voices -- critter-clinic                 make what's missing
//   npm run voices -- critter-clinic --dry           just count: lines, clips to make, characters
//   npm run voices -- critter-clinic --redo "Ouch!"  a new take of every line containing "Ouch!"
//   npm run voices -- critter-clinic --redo "Ouch!" --voice puppy   ...only puppy's
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ROOT, tts } from './eleven.mjs';
import { clipKey, tidy } from './scan.mjs';

const argv = process.argv.slice(2);
const game = argv[0]?.startsWith('--') ? null : argv[0];
const flag = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? null : argv[i + 1] ?? '';
};
const dry = argv.includes('--dry');
const redo = flag('--redo');
const redoVoice = flag('--voice');

if (!game || !fs.existsSync(path.join(ROOT, 'games', game, 'scripts/voice-lines.mjs'))) {
  const have = fs.readdirSync(path.join(ROOT, 'games')).filter((g) => fs.existsSync(path.join(ROOT, 'games', g, 'scripts/voice-lines.mjs')));
  console.error(`Usage: npm run voices -- <game> [--dry] [--redo "text" [--voice name]]\nGames with voice lines: ${have.join(', ')}`);
  process.exit(1);
}

const cast = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/voices/cast.json'), 'utf8'));
const { lines } = await import(pathToFileURL(path.join(ROOT, 'games', game, 'scripts/voice-lines.mjs')).href);
const OUT = path.join(ROOT, 'games', game, 'voice');

// What we want: one clip per voice and line.
const want = new Map();
for (const l of lines()) {
  const key = clipKey(l.voice, l.text);
  if (want.has(key)) continue;
  const r = cast[l.voice];
  if (!r) throw new Error(`voice-lines.mjs uses voice "${l.voice}", which isn't in scripts/voices/cast.json`);
  const send = tidy(l.perform || l.text);
  const hash = crypto.createHash('sha1').update(JSON.stringify([r.id, r.model, r.settings, send])).digest('hex').slice(0, 10);
  want.set(key, { voice: l.voice, text: tidy(l.text), send, file: `${l.voice}-${hash}.mp3` });
}

const exists = (f) => fs.existsSync(path.join(OUT, f));
const isRedo = (c) => redo != null && c.text.includes(redo) && (!redoVoice || c.voice === redoVoice);
const todo = [...want.values()].filter((c) => !exists(c.file) || isRedo(c));
const chars = todo.reduce((n, c) => n + c.send.length, 0);
const byVoice = {};
for (const c of want.values()) byVoice[c.voice] = (byVoice[c.voice] || 0) + 1;
console.log(`${game}: ${want.size} lines (${Object.entries(byVoice).map(([v, n]) => `${v} ${n}`).join(', ')})`);
console.log(`${todo.length} clips to make, ${chars} characters`);

const noVoice = [...new Set(todo.map((c) => c.voice))].filter((v) => !cast[v].id);
if (dry) {
  if (noVoice.length) console.log(`No voice picked yet for: ${noVoice.join(', ')}`);
  process.exit(0);
}
if (noVoice.length) {
  console.error(`No voice picked yet for: ${noVoice.join(', ')}. Run: npm run voices:audition`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
let made = 0;
let failed = 0;
const queue = [...todo];
async function worker() {
  for (let c; (c = queue.shift()); ) {
    const r = cast[c.voice];
    try {
      const mp3 = await tts(r.id, c.send, { model: r.model, settings: r.settings, seed: isRedo(c) ? crypto.randomInt(1, 2 ** 31) : undefined });
      fs.writeFileSync(path.join(OUT, c.file), mp3);
      made++;
      console.log(`  ${c.voice}: ${c.text}`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${c.voice}: ${c.text}\n    ${e.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker()]);

// Clips for lines that are gone (or said in a voice that changed).
const keep = new Set([...want.values()].map((c) => c.file));
let removed = 0;
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith('.mp3') && !keep.has(f)) {
    fs.rmSync(path.join(OUT, f));
    removed++;
  }
}

// The index the game looks clips up in. Only lines whose clip is really there.
const entries = [...want.entries()].filter(([, c]) => exists(c.file)).sort(([a], [b]) => a.localeCompare(b));
fs.writeFileSync(
  path.join(OUT, 'clips.js'),
  `// Made by \`npm run voices -- ${game}\` (scripts/voices/generate.mjs). Don't edit: run it again.\n` +
    `// "voice|line" -> the clip in this folder that says it.\n` +
    `export const CLIPS = {\n${entries.map(([k, c]) => `  ${JSON.stringify(k)}: ${JSON.stringify(c.file)},`).join('\n')}\n};\n`,
);
const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`made ${made}, removed ${removed}${failed ? `, FAILED ${failed}` : ''}. voice/ is ${(bytes / 1e6).toFixed(1)} MB`);
if (failed) process.exit(1);
