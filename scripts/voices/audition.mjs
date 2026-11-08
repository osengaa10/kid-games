// Finding a voice for each role in cast.json.
//
//   npm run voices:audition                  three new voices for every role that has no id yet
//   npm run voices:audition -- puppy bunny   three new voices for these roles (even if they have one)
//   npm run voices:audition -- pick puppy 2  keep puppy's preview 2: saved to the ElevenLabs account,
//                                            its id written into cast.json
//   npm run voices:audition -- use puppy <voice id>   use a voice that's already in the account
//                                            (one from the Voice Library, say)
//
// The previews go in .voices-audition/ (git ignores it): open .voices-audition/index.html to
// listen. A preview can only be kept for a day or so after it's made.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, design, save } from './eleven.mjs';

const CAST_FILE = path.join(ROOT, 'scripts/voices/cast.json');
const OUT = path.join(ROOT, '.voices-audition');
const STATE = path.join(OUT, 'previews.json');

const cast = JSON.parse(fs.readFileSync(CAST_FILE, 'utf8'));
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const writeCast = () => fs.writeFileSync(CAST_FILE, JSON.stringify(cast, null, 2) + '\n');
const role = (name) => {
  if (!cast[name]) {
    console.error(`No role "${name}" in cast.json. The roles are: ${Object.keys(cast).join(', ')}`);
    process.exit(1);
  }
  return cast[name];
};

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'pick') {
  const [name, n] = args;
  const r = role(name);
  const p = state[name]?.[Number(n) - 1];
  if (!p) {
    console.error(`No preview ${n} for ${name}. Run: npm run voices:audition -- ${name}`);
    process.exit(1);
  }
  try {
    r.id = await save(p.generated_voice_id, `Kid Games: ${name}`, r.description);
  } catch (e) {
    if (e.code !== 'voice_limit_reached') throw e;
    const used = Object.entries(cast).filter(([, c]) => c.id).map(([k]) => k);
    console.error(
      `Your ElevenLabs account has no room for another saved voice (the free plan keeps 3, Starter 10).\n` +
        `The preview only says the sample; to say the game's lines the voice has to be saved.\n` +
        `Roles with a voice already: ${used.join(', ') || 'none'}.\n` +
        `Either upgrade (one month is enough: the clips stay after cancelling), or give this role a voice from\n` +
        `the Voice Library, which doesn't take a slot:  npm run voices:audition -- use ${name} <voice id>`,
    );
    process.exit(1);
  }
  writeCast();
  console.log(`${name} is now voice ${r.id} (saved in cast.json). Next: npm run voices -- <game>`);
} else if (cmd === 'use') {
  const [name, id] = args;
  role(name).id = id;
  writeCast();
  console.log(`${name} is now voice ${id} (saved in cast.json).`);
} else {
  const names = cmd ? [cmd, ...args] : Object.keys(cast).filter((k) => !cast[k].id);
  if (!names.length) {
    console.log('Every role has a voice. To try new ones for a role: npm run voices:audition -- <role>');
    process.exit(0);
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of names) {
    const r = role(name);
    process.stdout.write(`${name}: designing… `);
    const previews = await design(r.description, r.sample);
    state[name] = previews.map((p, i) => {
      const file = `${name}-${i + 1}.mp3`;
      fs.writeFileSync(path.join(OUT, file), Buffer.from(p.audio_base_64, 'base64'));
      return { file, generated_voice_id: p.generated_voice_id };
    });
    fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
    console.log(`${previews.length} previews`);
  }
  writePage();
  console.log(`\nListen: open ${path.join(OUT, 'index.html')}\nThen keep one: npm run voices:audition -- pick <role> <1-3>`);
}

function writePage() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sections = Object.entries(state)
    .filter(([name]) => cast[name])
    .map(([name, previews]) => {
      const r = cast[name];
      const rows = previews
        .map(
          (p, i) => `<div class="take"><b>${i + 1}</b><audio controls preload="none" src="${esc(p.file)}"></audio>
          <code>npm run voices:audition -- pick ${esc(name)} ${i + 1}</code></div>`,
        )
        .join('\n');
      return `<section><h2>${esc(name)} <small>${esc(r.who || '')}</small></h2>
        <p class="desc">${esc(r.description)}</p>${r.id ? `<p class="kept">Has a voice now: ${esc(r.id)}</p>` : ''}
        ${rows}</section>`;
    })
    .join('\n');
  fs.writeFileSync(
    path.join(OUT, 'index.html'),
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voice auditions</title>
<style>
  body { font: 16px/1.45 -apple-system, system-ui, sans-serif; margin: 0 auto; max-width: 760px; padding: 24px 16px; background: #fffaf3; color: #2b2340; }
  h1 { margin: 0 0 4px; } h2 { margin: 28px 0 4px; } small { font-weight: 400; color: #7a6f8f; }
  .desc { color: #5b5170; margin: 0 0 10px; } .kept { color: #1d7a46; margin: 0 0 10px; }
  .take { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 8px 0; }
  .take b { width: 1.2em; } audio { height: 36px; }
  code { font-size: 13px; background: #f1e9ff; padding: 3px 6px; border-radius: 6px; user-select: all; }
</style>
<h1>Voice auditions</h1>
<p>Each preview says the same lines. Copy the command under the one you like into the terminal.</p>
${sections}
`,
  );
}
