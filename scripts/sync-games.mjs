// Builds www/ (what Capacitor bundles into the app) from the launcher and the
// four game repos: lawn-mower, roller-coaster, monster-truck and gadget-glam. The
// game repos stay the one place the games are edited, and they keep working on
// GitHub Pages.
//
// The game repos are looked for in GAMES_DIR if set, otherwise in the folder
// next to this repo (../) and then one level up (../../).
//
// Run with `npm run build` (or `npm run sync` to also copy into the iOS project).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(ROOT, 'www');
const GAMES = ['lawn-mower', 'roller-coaster', 'monster-truck', 'gadget-glam'];

const candidates = process.env.GAMES_DIR
  ? [path.resolve(process.env.GAMES_DIR)]
  : [path.resolve(ROOT, '..'), path.resolve(ROOT, '../..')];
const GAMES_DIR = candidates.find((dir) => GAMES.every((g) => fs.existsSync(path.join(dir, g, 'index.html'))));
if (!GAMES_DIR) {
  console.error(`Can't find ${GAMES.join(', ')}. Looked in: ${candidates.join(', ')}`);
  console.error('Set GAMES_DIR to the folder that holds them, e.g. GAMES_DIR=~/code npm run build');
  process.exit(1);
}
console.log(`games from ${GAMES_DIR}`);

// Things a game repo has that the app doesn't need. The service worker is left
// out because everything is already on the device (and it only registers on https).
const SKIP = new Set([
  '.git', '.gitignore', '.nojekyll', '.DS_Store', 'node_modules',
  'test', 'scripts', 'README.md', 'package.json', 'package-lock.json', 'sw.js',
]);

fs.rmSync(WWW, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'launcher'), WWW, { recursive: true });

for (const game of GAMES) {
  const src = path.join(GAMES_DIR, game);
  fs.cpSync(src, path.join(WWW, 'games', game), {
    recursive: true,
    filter: (file) => !SKIP.has(path.basename(file)),
  });
  console.log(`copied ${game}`);
}
console.log(`www/ is ready`);
