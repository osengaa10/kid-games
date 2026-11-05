// Builds www/ (what Capacitor bundles into the app) from the launcher and every game in games/
// (each folder there with an index.html). It leaves out what only matters while making a game:
// its tests, scripts, README and so on.
//
// Run with `npm run build` (or `npm run sync` to also copy into the iOS project).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(ROOT, 'www');
const GAMES_DIR = path.join(ROOT, 'games');
const GAMES = fs
  .readdirSync(GAMES_DIR)
  .filter((g) => fs.existsSync(path.join(GAMES_DIR, g, 'index.html')))
  .sort();

// Things a game has that the app doesn't need. The service worker is left out because
// everything is already on the device (and it only registers on https).
const SKIP = new Set([
  '.git', '.gitignore', '.nojekyll', '.DS_Store', 'node_modules',
  'test', 'scripts', 'README.md', 'package.json', 'package-lock.json', 'sw.js',
]);

fs.rmSync(WWW, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'launcher'), WWW, { recursive: true });

for (const game of GAMES) {
  fs.cpSync(path.join(GAMES_DIR, game), path.join(WWW, 'games', game), {
    recursive: true,
    filter: (file) => !SKIP.has(path.basename(file)),
  });
  console.log(`copied ${game}`);
}
console.log(`www/ is ready`);
