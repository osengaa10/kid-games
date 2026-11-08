// A tiny ElevenLabs client (plain fetch, no packages). The API key comes from ELEVENLABS_API_KEY,
// or from a line `ELEVENLABS_API_KEY=...` in the .env file at the root of this repo (git ignores it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://api.elevenlabs.io';

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const m = env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s]+)/m);
    if (m) return m[1];
  } catch {
    /* no .env */
  }
  console.error(
    'No ElevenLabs API key. Make one at https://elevenlabs.io/app/settings/api-keys and put it in\n' +
      `${path.join(ROOT, '.env')} as a line:  ELEVENLABS_API_KEY=sk_...`,
  );
  process.exit(1);
}

async function call(route, body, { query = '', binary = false, tries = 4 } = {}) {
  const key = apiKey();
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${route}${query}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: binary ? 'audio/mpeg' : 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : res.json();
    const text = await res.text();
    // too many at once, or a hiccup on their end: wait and try again
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    const err = new Error(`ElevenLabs ${route} said ${res.status}: ${text.slice(0, 500)}`);
    try {
      err.code = JSON.parse(text).detail?.status; // e.g. "voice_limit_reached"
    } catch {
      /* not JSON */
    }
    throw err;
  }
}

// Speech for one line, as mp3 bytes.
export function tts(voiceId, text, { model = 'eleven_v3', settings = {}, seed } = {}) {
  const body = { text, model_id: model, voice_settings: settings };
  if (seed != null) body.seed = seed;
  return call(`/v1/text-to-speech/${voiceId}`, body, { query: '?output_format=mp3_44100_96', binary: true });
}

// Three new voices made from a description, each saying `text` (100 to 1000 characters).
// Returns [{ generated_voice_id, audio_base_64, media_type, duration_secs }].
export async function design(description, text, { model = 'eleven_ttv_v3' } = {}) {
  const body = { voice_description: description, model_id: model };
  if (text && text.length >= 100) body.text = text.slice(0, 1000);
  else body.auto_generate_text = true;
  const res = await call('/v1/text-to-voice/design', body, { query: '?output_format=mp3_44100_96' });
  return res.previews || [];
}

// Keeps a designed voice in the account, so it can be used for speech. Returns its voice id.
export async function save(generatedId, name, description) {
  const res = await call('/v1/text-to-voice', {
    voice_name: name,
    voice_description: description,
    generated_voice_id: generatedId,
  });
  return res.voice_id;
}
