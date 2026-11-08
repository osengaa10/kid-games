# Turbo Quest

A side-scrolling platformer for a 4-year-old and his grown-up. Turbo is a corgi pup with goggles and a rocket backpack, the Pop-Pack. The Grumblies are grumpy purple blobs with little rain clouds over their heads. Turbo's shots don't hurt them, they **cheer them up**: a cheered Grumbly turns into a smiling balloon and floats away, and you can bounce on the balloon.

No reading needed, and no lives or game over. A pit floats Turbo back in a bubble, and running out of hearts floats him back to the last checkpoint with full hearts.

This is the **first playable (M1)**: one full level, W1-1 "Banana Bounce", in both modes, plus a practice field.

## Who's playing

The title screen has two big pups: **his** (plain Turbo) and **yours** (Turbo in sunglasses). Each player keeps their own mode, controls, stars, stickers and best results. The last player glows, so it's one tap for him.

| | Kid Mode (ages 4–6) | Dad Mode |
| --- | --- | --- |
| Controls | ◀ ▶ and a big jump button, or **Auto-Go** (Turbo walks by himself and stops at every gap; tap anywhere to jump) | A stick wherever your left thumb lands; JUMP, FIRE, and TURBO (when the meter is full). A thumb on the line between FIRE and JUMP presses both. |
| Shooting | The Pop-Pack fires by itself, only at Grumblies ahead, and aims for him | FIRE: forward, up-forward, up, or down in the air. Hold FIRE while standing still for a charged **Big Pop** that goes through Grumblies. Light aim assist. |
| Jumping | Floaty, forgiving timing, ledge assist. Keep holding jump while falling and his tail spins like a propeller. A jump from standing still at a gap carries him across. | Snappier and faster. Down + jump drops through bamboo. |
| Getting hurt | 3 hearts that refill. Brushing a Grumbly's edge doesn't count. Pits cost nothing. | 3 hearts. A hit also costs a weapon level (never the weapon). A pit costs a heart. Brambles hurt. |
| Help | Falling into the same gap twice lays a rope bridge across it. After 3 hits in a section, Grumblies there slow down. After 8 s without getting further, Turbo barks and points the way, and the button to press glows. Leafy walls give way when he pushes them. | None unless you ask for it. |
| The level | Rope bridges over the widest gap; brambles are daisies | Brambles, and extra Grumblies |
| After the goal | A celebration: stars counting up, gems, and a sticker for each new kind of Grumbly. No score, ever. | Score, time against par, gems, best chain, a no-hit bonus, a medal (bronze, silver or gold) |

## What's in W1-1 "Banana Bounce"

Six sections, each starting at a checkpoint flag:

1. **Wake-up Meadow:** walking, jumping and the first Grumbly.
2. **Bounce Garden:** a bounce flower up to gem 1, the Bubble Cannon, a Hopper.
3. **Treetop Hop:** bamboo up to Star Spread, Flappers, the Shield Bubble.
4. **Cheer Party:** a Mega Bone (Giant Pup), then a crowd to fill the TURBO meter.
5. **Canopy Secret:** gem 3 behind a leafy wall you've just walked past. Gem 2 is up on the canopy, reached by bouncing off a bubbled Grumbly or a balloon.
6. **Party Finish:** the Party Popper goal.

The Grumblies:
- **Waddler:** patrols. In Dad Mode it spots you ("!") and hurries.
- **Hopper:** crouches, then hops. In Dad Mode it hops at you, small and big.
- **Flapper:** flies. In Dad Mode it wiggles its wings, then swoops.

Stomp a Grumbly to cheer it and bounce; hold jump to bounce higher. Cheers in a row build a chain and fill the **TURBO meter**: a rainbow, invincible, rapid-fire burst with faster music. It starts by itself in Kid Mode; in Dad Mode, press TURBO.

**Weapons:**
- **Pop Blaster:** always there.
- **Bubble Cannon:** traps a Grumbly in a bubble. Touch the bubble to pop it, or land on it for a big bounce.
- **Star Spread:** a fan of stars.

Picking up the same weapon again levels it up (to 3). A different one swaps, and the old one floats nearby for 6 s to grab back. The nozzle on the Pop-Pack shows which weapon he has.

**Power-ups:**
- **Shield Bubble:** takes 3 hits in Kid Mode, 1 in Dad Mode.
- **Mega Bone:** Giant Pup for 7 s. He walks right through Grumblies and smashes leafy walls.
- **Hearts.**

## Buttons

| Button | Does |
| --- | --- |
| ⏸ (top left) | Pause: ▶ keep playing, ↻ back to the last checkpoint, house to the level cards, four tiles back to all the games (in the app) |
| ⏸ **held for 2 s**, or the ⚙ **held for 2 s** on any menu | Grown-up settings (a yellow ring fills while you hold) |

**Settings:**
- **Who's playing:** his pup or yours.
- **Mode:** Kid, Kid Auto-Go or Dad. Switching mid-level restarts from the last checkpoint.
- **Controls:** auto-fire and aim assist (Dad), left-handed, bigger buttons.
- **Volumes:** music, sounds and voice.
- **Comfort:** reduced motion, fewer flashes.
- **Grown-up tools:**
  - Show FPS, and the quality tier.
  - **Feel tuning:** sliders for every jump and speed number, live, with **Copy values** to paste into `js/game/tuning.js`.
  - The practice field.
  - The stress test.
  - Reset this player.

Keyboard: arrows/WASD, Space/Z jump, X/J fire, V TURBO, Esc pause, ` settings. A game controller works too: stick or d-pad, A jump, X/B fire, Y/LB TURBO, Menu pause. On-screen buttons hide while a keyboard or controller is in use.

Saving is automatic and stays on the iPad. It saves at every checkpoint (closing the app mid-level comes back there, with what was collected), at every finish (with a backup), and whenever the app goes to the background.

## On the iPad: what to try

1. Run `npm run sync` in the repo root, then ▶ in Xcode.
2. **Your son:** his pup, Kid Mode (or Auto-Go if moving and jumping together is too much). Hands off for 10 minutes. Afterwards, `?stats` (in a browser) or the log below shows where he spent time, got hit or fell.
3. **You:** your pup, Dad Mode. Go for all 3 gems and gold. If the jump feels off, change it in **Feel tuning** and send the **Copy values** text.
4. **Speed:** in settings, Show FPS. The level should hold about 16.7 ms.

## Run locally

No build step: it's plain static files and ES modules.

```sh
npm start   # python3 -m http.server 8890
npm test    # node --test
```

Open http://localhost:8890. URL flags:
- `?level=w1-1` (or `greybox`) skips the menus. Add `&mode=kid|dad` to pick the player and `&auto=1` for Auto-Go.
- `?debug` shows the FPS overlay. It and `?test` both put the app on `window.__tq`.
- `?tune` opens settings.
- `?lab` shows every piece of art on one sheet.
- `?stress` is the performance scene.
- `?stats` is the playtest log: per level and per section, time, hits, rescues and helps, newest first.
- `?q=high|medium|low` fixes the quality tier.
- `?card=1024` draws the Kid Games home screen picture, and `?icon=512` the icon.

## How it works

The rules never touch the screen. `js/game/`, `js/content/` and most of `js/engine/` have no DOM, so `node --test` runs them. The world talks to drawing, sound and effects through events (`cheer`, `jump`, `gem`, ...).

- **`js/content/`: data.**
  - `levels/` (ASCII sections; the glyphs are in `legend.js`; `kid`/`dad` overlays are explained in `game/level.js`).
  - `enemies.js` (each Grumbly with a Kid block and a Dad block: Dad Mode adds behaviors, never health).
  - `weapons.js`, `powerups.js`, `sfx.js` (sounds as data), `songs.js` (the music, original).
- **`js/game/`: the rules.**
  - `player.js`: running, jumping, coyote time, jump buffering, flutter, bounces, ledge and corner assists, Auto-Go, smart jump, rescue.
  - `world.js`: Grumblies, stomps, cheers and balloons, pickups, power-ups, TURBO, hearts, pits, Kid help, checkpoints, results, resume.
  - `enemies.js` (walk, hop, fly), `weapons.js` (firing, aim, the Big Pop, shots, swaps), `combo.js` (chain, score, TURBO meter, medals).
  - `tuning.js`: every feel number for both modes.
  - `lint.js`: where each mode's jump can reach, for the level tests.
- **`js/engine/`:**
  - The fixed 60 Hz loop.
  - Collision.
  - The camera: looks ahead, snaps to platforms.
  - Touch controls, input (touch, keyboard, controllers).
  - Audio and the music sequencer, and the speaking voice (Mighty Mower's).
  - `save.js` (versioned, with a backup and recovery from a corrupt save).
  - The sprite cache.
- **`js/art/`: all art drawn in code.**
  - `turbo.js`: Turbo as a puppet of baked parts (head, ears on springs, eyes, mouth, legs, tail, Pop-Pack, a nozzle per weapon).
  - `grumblies.js`, `jungle.js` (auto-tiled ground, platforms, props, parallax), `items.js`, `style.js`.
- **`js/render/`:**
  - The game view (`renderer.js`) and the HUD and buttons (`ui.js`, on a second canvas at full sharpness, repainted only when something changes).
  - `player-view.js` (squash and stretch, faces), pooled particles.
  - Quality tiers that step down by themselves on a slow device.
- **`js/scenes/`:** title, level cards, play, pause, results, stress, lab.
- **`js/dev/`:** the settings panel and the playtest log.

**The tests:**
- Jump heights and distances, coyote time and buffering.
- Every Grumbly behavior, weapon and power-up, and the Kid help.
- Saving, migration and corrupt-save recovery.
- Touch layouts.
- Two bots that must finish every level:
  - The "4-year-old with one button": Auto-Go plus a jump whenever Turbo waits, never running out of hearts.
  - A grown-up holding right and FIRE.
- A reachability search that every level's goal and gems must pass, in both modes.

## Play on an iPad or iPhone without the app

On the web, open the GitHub Pages URL in Safari and tap **Share → Add to Home Screen**. Hold it sideways.
