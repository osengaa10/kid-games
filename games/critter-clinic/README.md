# Critter Clinic

A pretend doctor's office, built for a 4-year-old on an iPad. He's the doctor. Cute animal patients wait their turn, and he gives each one a check-up with real doctor tools: the scale and height chart, a thermometer, a stethoscope, an ear camera, a light and tongue stick, a knee hammer, and a shot (with a bandage after). At the end the patient gets a sticker, and so does his sticker book.

He doesn't need to read. Every button is a picture, everything is spoken out loud, and nothing can go wrong. Steps can be done in any order. Letting go of a tool only pauses it. A hint hand shows what to do if he gets stuck.

## How it plays

**The waiting room.** Three sick patients wait on chairs. He taps one; it hops up, tells him what's wrong and walks slowly into the exam room. A patient whose check-up he left unfinished sits first, with a little clipboard by its chair.

**Sick, then better.** Every patient arrives with a **cold** (pale, red runny nose, sneezes), a **fever** (flushed and sweaty, heat lines over its head, shivers) or a **tummy ache** (green around the gills, holding its tummy, grumbles). They all droop, with heavy eyelids, a frown and floppy ears, and sneeze, shiver or grumble now and then. There's nothing to diagnose. Every step helps, in any order: each one ticked gets a chime, a puff of plus signs and hearts, and visibly less sick (the drip stops, the color comes back, the ears perk up). Along the way the patient says "I feel a little better!", then "much better!", and when the last box is ticked, "I feel all better!" A few tools notice the illness: a fever reads hot on the thermometer, and a cold means a cough after the deep breath and a red throat on the monitor.

**The exam room.** The patient sits on the exam table. The tools are along the bottom. The clipboard on the left has a picture box for each step, plus a star for the sticker. The monitor on the wall shows what the tool sees or hears.

He drags a tool onto the glowing spot on the patient, or taps it: it says its name and what to do, floats up beside the patient, and his next touch picks it up. Near its spot, a tool snaps on. The stethoscope, ear camera, light and needle stay put if he lets go.

| Step | What he does | What happens |
| --- | --- | --- |
| 📏 Height & weight | Taps the scale, then slides the red bar down | The patient hops on the scale; the dial spins (on the monitor too); the bar boops on the head and a star pops at the mark. Tall ears get squished. |
| 🌡️ Thermometer | Slides it across the forehead | Rising beeps, then beep-beep-beep; the monitor's bar fills to green with a smiley. |
| 🩺 Stethoscope | Holds it on the chest | Lub-dub at the animal's own heart rate (the bunny's races, the elephant's thumps slowly), a beating heart and a pulse line on the monitor, little hearts floating up, a deep breath. On the tummy: gurgles and giggles. The kitty purrs. |
| 📷 Ear camera | Holds it at one ear, then the other | The inside of the ear on the monitor, moving as he moves. Floppy ears lift out of the way. Sometimes a ladybug waves from inside: peek-a-boo! |
| 🔦 Say ahh | Brings the light and tongue stick to the mouth | "Ahhhh!" The throat on the monitor, with a wiggly uvula (and sometimes a wiggly tooth). The elephant lifts its trunk. |
| 🔨 Knee hammer | Taps each knee | The leg kicks with a boing. Now and then a mega kick: "Whoa!" |
| 💉 Shot | Rubs the arm with the cotton ball, puts the needle on the arm, holds his finger down to push, then picks a bandage | "I'm a little nervous…" / "Take a big breath. You can do it!" / a quick "Ouch!" / "That wasn't so bad!" / "I was brave!" The needle is short and friendly; there's no blood and no tears. Letting go only pauses the plunger. |

When every box is ticked, the star glows and a sheet of four stickers slides up. He drags one onto the patient (or taps it), confetti flies, the patient cheers, waves bye-bye and goes home, and the sticker is added to his sticker book.

| Button | Does |
| --- | --- |
| 🏠 (purple, exam room) | Back to the waiting room. The check-up is kept for next time. |
| 📕 (waiting room) | The sticker book: every sticker he's given out, with the face of the patient who got it. |
| 🟥🟨🟦🟩 (waiting room, in the app only) | Back to the Kid Games list of games. |

**If he gets stuck:** after 8 seconds of nothing, the next tool on the tray bounces and a 👆 hand shows what to do; a second later the narrator says it. A tap on the patient with no tool gets a giggle (tummy), a hee-hee (head) or a honk (nose).

**The patients:** Biscuit the puppy, Clover the bunny, Bramble the bear cub, Mochi the kitty, Pip the baby dino and Peanut the elephant. All six are one puppet rig with different ears, faces, tails and colors.

## Run locally

```sh
npm start   # http://localhost:8891
npm test    # node --test, no dependencies
```

Dev flags (add to the URL):

| Flag | Does |
| --- | --- |
| `?patient=bunny` | Straight into the exam room with that patient (`puppy`, `bunny`, `bear`, `kitty`, `dino`, `elephant`). Add `&skip` to skip the walk-in. |
| `?done=measure,temp` | Start partway through (with `?patient`). Steps: `measure`, `temp`, `heart`, `ears`, `ahh`, `reflex`, `shot`. |
| `?ail=cold` | What the patient is sick with (with `?patient`): `cold`, `fever` or `tummy`. |
| `?spots` | Draw the tool spots and how far away a tool snaps on. |
| `?noui` | Hide the buttons, for screenshots. |
| `?debug` | Put the game on `window.__cc` (the exam room's `debugInfo()` says where everything is). |
| `?lineup` | Every patient in a few poses and moods side by side, for checking the art, including sick (row 6) and half better (row 7). `&only=puppy,bunny`, `&row=2`, `&spots`, `&still`. |
| `?icon=512` | Draw the app icon. |

The Kid Games home-screen picture is an in-game screenshot, not `?icon`: the stethoscope on Biscuit's chest with the heart beating on the monitor, taken at 1180×820 (3×) with `?noui&patient=puppy&skip&done=measure,temp,heart,ears` and the stethoscope held on the chest. See the root README.

## How it works

Plain static files and ES modules with no build step and no dependencies. Everything is drawn in code on one Canvas 2D (there are no image files apart from the app icons), every sound is made with Web Audio, and every spoken line is a recorded voice clip in `voice/` (see Voices below).

- `js/main.js`: screens, saving, the in-app All games button, the frame loop, the dev flags.
- `js/waiting.js`: the waiting room. `js/exam.js`: the exam room, which picks tools up, snaps them to spots, feeds the steps, reacts with sounds, faces and voice, and runs the hints, the bandage and sticker sheets and the goodbye. `js/book.js`: the sticker book.
- `js/checklist.js`: the seven steps and what the narrator says. `js/steps.js`: one small state machine per step (the done rules: three heartbeats, both ears, two seconds of "ahh"…), with no canvas, so the tests play whole steps frame by frame.
- `js/sickness.js`: the three illnesses, how sick a patient is (one seventh better per step), the "I feel better" milestones, the sick posture and the now-and-then symptoms. Pure, and tested.
- `js/patients.js`: the six patients as data. `js/rig.js`: the shared puppet rig. Every joint, the hit tests and the tool spots come from the same shapes the art draws, so a spot is always where the picture shows it. `js/patient-art.js`: draws a patient from the rig, with faces for each mood.
- `js/layout.js`: where everything goes on any screen, held either way (tested for overlaps). `js/room.js`: the two rooms, baked once per resize, plus the scale dial and the height bar. `js/monitor.js`: what the monitor shows. `js/tool-art.js`: the tools, the hint hand and the spot rings. `js/icons.js`: the tray and clipboard pictures (SVG).
- `js/sound.js` (Web Audio synth: heartbeat, gurgles, purr, beeps, boing…), `js/speech.js` (plays the voice clips one at a time, falling back to `speechSynthesis` for a line with no clip), `js/effects.js` (sparkles, confetti, floating hearts), `js/stickers.js`, `js/bandages.js`, `js/style.js`, `js/rng.js`.
- `js/storage.js`: one versioned record in `localStorage` (`critter-clinic:v1`): the sticker book (up to 300), how often each patient has been seen (the waiting room shows the ones seen least), and a check-up left unfinished (with what that patient is sick with). It's checked and repaired on the way in, so a damaged save can't break the game.
- `js/lineup.js` and `js/card.js`: the `?lineup` and `?icon` pages.

## Voices

The narrator and each of the six patients have their own voice, made with [ElevenLabs](https://elevenlabs.io). Every line is made once, ahead of time, and saved as an mp3 in `voice/` (about 240 of them), so the game needs no internet. `voice/clips.js` says which file is which line. The voices themselves (descriptions and ElevenLabs ids) are in `scripts/voices/cast.json` at the root of the repo, shared by every game.

- `scripts/voice-lines.mjs` lists everything the game says and who says it. Most of it is read from the game itself: the patients' lines in `js/patients.js` and `js/sickness.js`, the narrator's in `js/checklist.js`, `js/stickers.js` and `js/bandages.js`, and every sentence written in a `say()`, `sayN()` or `sayP()` call. `test/voice.test.js` fails when a sentence in the game isn't covered.
- After adding or changing a line, from the root of the repo: `npm run voices -- critter-clinic`. It only makes the clips that are new or changed, and deletes the ones nothing uses. Commit `voice/`.
- A take that sounds off: `npm run voices -- critter-clinic --redo "Ouch!" --voice puppy` makes a new one.
- How a line is acted: `PERFORM` in `scripts/voice-lines.mjs` adds Eleven v3 audio tags such as `[giggles]`. The game still finds the clip by the plain line.
- Until a line has a clip, the game says it with the browser's `speechSynthesis`, and on `localhost` the console says which line is missing.

See the root README for the API key and for picking voices.

## Play on an iPad or iPhone

It's part of the Kid Games app (see the root README). On its own: serve this folder over https, open it in Safari, then **Share → Add to Home Screen**. It works offline after the first visit.
