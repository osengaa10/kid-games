# Gadget Glam

A decorating game for little kids (built for a 4-year-old on an iPad): pick a phone, a tablet, an earbud case or a game controller, then make its case your own with spray paint, puffy paint, markers, stickers and gems. Finished cases hang on a shelf to show off.

No reading needed. Every button is a picture, a friendly voice says what each one is, and nothing can go wrong: the green ▶ is never locked, undo can even bring back a step that was thrown away, and closing the app never loses a case.

## How it plays

The home screen shows the four things to decorate (each one already decorated, to show what's possible). A glowing card with a pencil opens the case he was last working on. The pegboard button in the corner opens his shelf.

Decorating goes in steps. The icons along the top show them, and tapping one jumps straight there:

| Step | What he does |
| --- | --- |
| Shape | Pick a style: plain, kitty ears, bunny ears, teddy bear ears, a unicorn horn, butterfly wings, dinosaur spikes, shark fins, cactus arms with flowers, a robot with a blinking light, a rocket ship or a crown with jewels. The arrows show more. |
| Spray | Pick a can (8 colors, rainbow, or glitter) and drag to spray. Paint builds up where he holds still, and spray that misses flies past the edge. When most of the case is covered, it cheers. |
| Puffy paint | Drag to squeeze out raised, shiny lines. Or tap a pattern (waffle grid, hearts, polka dots, zig zag, pop-it) and the glue gun draws it by itself. |
| Markers | Draw with markers (8 colors, rainbow, glitter pen), or pick a stamp (heart, star, paw) and tap or drag to stamp in the marker's color. |
| Stickers | Drag a sticker onto the case, or just tap it in the tray and it hops on. Drag a sticker to move it, tap it to make it bigger (three sizes), or drag it off the case to get rid of it. The arrows show more stickers. |
| Gems | Tap to place a gem or drag to lay a sparkly trail (each gem plays the next note up). The rainbow gems mix every kind. The shaker sprinkles glitter. |
| ⭐ | Ta-da! The gadget slides in, the case clicks on, and there's confetti. It goes on the shelf. |

| Button | Does |
| --- | --- |
| 🏠 (purple) | Back to the home screen (the case is saved) |
| ↩ (blue) | Undo the last thing in this step |
| 🗑 (orange) | Clear this step (undo brings it back) |
| ▶ (green, wiggles once he's done a bit) | Next step |
| After ta-da: shelf / ✏️ / + | See the shelf / keep decorating / make another |

**The shelf:** tap a case to see it big. Push its pop-it bubbles in (and back out), tap gems to make them ring, or tap ✏️ to decorate it some more. To delete a case, **hold** the orange trash button for two seconds; a red ring fills up while it's held, so a quick tap does nothing.

If he goes about 8 seconds without touching anything, a hand shows what to do and the voice repeats the step's prompt.

Inside the Kid Games app, the home screen has an extra round button with four colored tiles that goes back to the list of games. It only shows up in the app.

## Run locally

No build step, it's plain static files and ES modules.

```sh
npm start   # python3 -m http.server 8888
npm test    # node --test: shapes, patterns, designs, undo
```

Open http://localhost:8888. `?debug` exposes the screens as `window.__gg` for poking at in the console. `?card=1024` draws the picture used for the Kid Games home screen card (a decorated phone and earbud case on the craft mat) instead of the game.

## How it works

- `js/items.js`: the four items as plain shapes (rounded rectangles, ellipses, polygons) in their own units, the holes paint can't go in (cameras, controller buttons), and the twelve styles' ears, horns, fins, wings and so on, with their colored bits and trims. There's no canvas in it, so the tests can check what's on the case and what isn't (and that no style makes every case smaller by reaching further out than the rest).
- `js/trims.js`: draws a style's plastic and colored bits (inside the ears, a gold horn, red fins) and the trims that never get painted (cactus flowers, crown jewels, the robot's blinking light, the rocket's window).
- `js/design.js`: a design is plain data, `{ item, style, layers: { spray, puffy, marker, sticker, gem } }`, each layer a list of strokes. Each step keeps its own undo history.
- `js/paint.js`: draws each kind of stroke. Random things (spray droplets, glitter) come from a seeded random number generator (`js/rng.js`), so a stroke looks exactly the same whenever it's drawn again: undo, loading, the shelf.
- `js/art.js`: one case's picture. Spray, puffy paint and markers each get a canvas (about 1300 px on the long side, whatever the screen), clipped to the case. Stickers and gems are drawn fresh every frame so they can move and sparkle. On top go a soft bevel, a gloss streak and the parts that never get painted.
- `js/patterns.js`: the patterns the glue gun draws, and where pop-it bubbles fit (clear of the edges and cameras).
- `js/editor.js`: the decorating screen. `js/shelf.js`: the shelf. `js/main.js`: the home screen and switching between screens.
- `js/sound.js`: all sounds are made with Web Audio (no sound files), in the same style as Coaster Doodle. `js/speech.js` is Mighty Mower's speaking voice.
- Saving: the case being worked on goes to `localStorage` after every change. The shelf lives in IndexedDB, since a growing shelf of pictures would outgrow `localStorage`. Starting a new case while one is unfinished puts the unfinished one on the shelf first, so nothing he made is lost.

## Play on an iPad or iPhone

On its own (outside Kid Games), open the GitHub Pages URL in Safari, then **Share → Add to Home Screen**. It works in both orientations and offline.
