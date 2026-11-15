# Boom Blocks

A toy-block playground where the only goal is to smash everything. Bright block towers, a candy castle, a little city, a domino garden, a lighthouse and pirate ship, snowmen and an ice castle, a rocket on its launch tower, and a fun fair, built from tens of thousands of little blocks, stand on a grassy island. Pick a tool and wreck them: they crack, topple, crash and shatter into hundreds of tumbling pieces, with dust, sparks and confetti. Then tap the big green button and it all builds itself again.

There are no words to read, no score to chase, no way to lose. It's made for a 4-year-old on an iPad, with enough real physics that grown-ups end up playing with it too.

## Playing

- **Tap** something to smash it with the tool that's picked (the big picture buttons along the bottom, each with its name underneath for grown-ups).
- **Hold** your finger still with the meteor for a meteor shower, or with the cannon for rapid fire.
- **Drag** with one finger to swing the camera round (or, with the laser, to sweep the beam, and with the tornado, to steer it). Two fingers swing and pinch-zoom with any tool.
- **The big green button** (top right) builds everything again. It wiggles when there's lots of mess.
- **The picture button** (top left) shows the playground you're in. Tap it for pictures of all eight playgrounds and tap one to go there (tapping the playground closes it again).
- **The speaker** turns sound on and off. **Hold it for 2 seconds** for the grown-up panel.

If nothing has happened for a while, a ghost hand shows where to tap.

### Tools

| | Tool | What it does |
| --- | --- | --- |
| ☄️ | Meteor | A glowing space rock with a rainbow tail whistles down where you tap and blasts a round crater. Hold for a shower. |
| 🔴 | Wrecking ball | A candy-striped ball on a chain (hanging from a cloud) swings in from your side, plows through, swings back for more, then floats away. Chunks fly the way it swings. |
| 🔦 | Laser | A little laser-bot fires a rainbow beam at your finger. It slices a groove, scorches the blocks orange (they cool down), and showers sparks. Slice through the bottom of a tower and it topples. It chews through fallen sections and rubble too. |
| 💣 | Bomb | A cartoon bomb drops, bounces and rolls, fizzing and swelling, then makes the biggest bang of all, throwing everything up in the air. |
| 🔨 | Hammer | A giant squeaky mallet winds up and BONKs straight down, squashing things flat, and the ground-slam makes every loose piece around it jump. |
| 🟢 | Cannon | A toy cannon riding a little cloud swings round and fires a cannonball at the spot. The ball punches a tunnel straight through walls and out the other side, slowing a little with every block, then bounces and puffs away. Shoot a tower low down and it topples away from you. Hold for rapid fire. |
| 🌪️ | Tornado | A lavender twister spins up where you touch and follows your finger. It chews through whatever stands at its feet (towers lose their footing and topple), sucks up loose pieces, whirls them round and flings them out of the top. Let go and it wanders off by itself for a few seconds. One at a time: a new tap calls it over. |
| 🧨 | Dynamite | Tap to stick bundles of dynamite on walls, towers, rubble or the ground; each one blinks and beeps. A big plunger pops up out of the dynamite button: press it and they go off one after another in the order they went on, so charges round a tower's feet drop it like a real demolition. Nobody presses it? They go off by themselves 4½ seconds after the last one. Dynamite in another blast, or whose wall gets knocked away, goes off early. |

### Playgrounds

- **Rainbow Tower Park:** a giant striped tower (fireworks hidden in the top room), a stack of giant toy blocks, a brick tower and a candy-cane tower.
- **Candy Castle:** walls, four round towers with jelly roofs, a tall keep with treasure at the top, and a row of TNT crates outside the wall: set one off and the bangs run down the line.
- **Block City:** skyscrapers with sparkly glass windows, a wooden sky-bridge, a water tower and little houses. A bunch of balloons is hidden on a high floor.
- **Domino Garden:** a big block dinosaur, a rainbow line of dominoes all the way round it with a TNT crate at the end, and a crate pyramid.
- **Lighthouse Bay:** a red-and-white lighthouse with a glass lamp room (fireworks in the lamp), a pirate ship with billowing sails and treasure in the captain's cabin, a stone sea fort with powder crates beside it, and palm trees.
- **Snowy Hill:** three snowmen (knock their heads off), an ice castle whose chunks skate across the grass, an igloo and snowy pine trees. Balloons are hidden at the top of the tallest ice spire.
- **Rocket Base:** a rocket standing on its fins beside a red lattice launch tower (fireworks in the nose), crates of rocket fuel (TNT) at the tower's foot, a radar dish, glass domes that shatter into sparkles, and a giant toy robot.
- **Fun Fair:** a rainbow Ferris wheel on two A-frames (knock out a leg and the whole wheel comes down), a helter-skelter with its slide spiralling round it, a big-top tent with balloons inside, a tall drop-tower ride, and a stall stacked with tin cans.

A toppling tower falls all the way down in one piece and crumbles where it lands, and the rubble stays where it fell (the island has a raised rainbow rim, so it stays on the board) until you build again. Smash nearly everything in a playground for a celebration: confetti cannons and fireworks.

## The grown-up panel

Hold the speaker button for 2 seconds:

- **Frame stats:** frame times, quality tier, how many blocks and pieces there are.
- **Calm mode:** less camera shaking and flashing.
- **Quality:** Auto (starts at High and steps down by itself if frames get slow, and remembers that), or a fixed High / Medium / Low. The tiers differ in pixels drawn (2x, 1.5x, 1.25x), shadow detail, reflections (the studio sheen on the plastic, the costliest thing per pixel: High only; the others go without, with brighter lights making up for it) and how much loose stuff and sparkle there may be. There's no edge smoothing (multisampling) on any tier: on an iPad it cost as much as everything else together (`?aa=1` turns it on to compare).
- **Stress test:** a minute of scripted chaos through the playgrounds and tools, then a summary. **All three** runs it on Low, Medium and High (each on a fresh start, about 4 minutes in all), then a speed check (the castle standing still, timed at each pixel ratio from 2x down to 1x, with and without reflections, once without the shadow pass, then as is again to show any drift) and shows it all; **This setting** runs it once on the current tier. "95% under 17.5 ms" means a steady 60 fps. It also says where each frame's time goes: physics, the smashing code, telling the graphics chip what to draw, other game code, and the rest of the frame (the graphics chip finishing its work, plus any wait for the next screen refresh), and the frame rate in each playground. **Copy results** puts it all on the clipboard (on a Mac signed in to the same Apple account, it can be pasted straight there).
- **Reading results off a plugged-in iPad:** every result is also one `BOOMSTRESS {json}` console line. A debug build passes console lines to the Mac, so after `npm run sync`, build and install (Xcode ▶, or `xcodebuild … -configuration Debug -allowProvisioningUpdates build` then `xcrun devicectl device install app`), launch with `xcrun devicectl device process launch --console --terminate-existing --device <id> io.github.osengaa10.kidgames > log` and the numbers land in `log`. If that link drops, the latest results are also saved in the app's localStorage (`boom-blocks:stress-last`), which `xcrun devicectl device copy from --domain-type appDataContainer --domain-identifier io.github.osengaa10.kidgames` can copy off the iPad (`Library/WebKit/WebsiteData/Default/<id>/<id>/LocalStorage/localstorage.sqlite3`, table `ItemTable`, values in UTF-16).

## Run it locally

```sh
npm start        # http://localhost:8892
npm test
```

Testing flags: `?stats` (frame overlay), `?q=high|medium|low`, `?scene=tower|castle|city|garden`, `?seed=<n>` (same cracks every time), `?fx=full` (effects never turned down, for screenshots), `?stress` (stress test on load), `?debug` (`window.__bb` for scripted testing: `fire(tool, x, y, z)`, `rebuild()`, `stats()`).

## How it works

Destruction is the whole game, so most of the code is about making it look expensive while staying cheap.

- **Standing blocks** live in one grid (`js/core/grid.js`, 160×104×160 little blocks of half a unit). Scenes are laid out in whole units and the builder (`js/core/builders.js`) fills each unit with 2×2×2 little blocks, keeps walls thin and scoops the inside out of anything solid, so a playground is 7,000–37,000 blocks. Only blocks with a visible side are drawn, as one instanced mesh of plain cubes; the toy look (bevelled, shiny edges), the build-up animation, the shockwave wobble and the laser's glowing scorch marks are all done in the shader (`js/render/blockMaterial.js`).
- **Physics** is [Rapier](https://rapier.rs) (vendored, `vendor/rapier.module.js`, Apache-2.0). The standing blocks are one voxel collider whose cells switch off as blocks break. Loose pieces are bodies made of a few merged boxes (`js/core/boxes.js`).
- **A hit** (`js/destruction.js`) carves a shape out of the grid: the middle turns to crumbs, the edge breaks into chunks (`js/core/chunker.js`) that fly off as real pieces.
- **The newer tools are built from that same hit.** The cannonball carves a capsule from where it was to where it is each frame and loses speed for every block it breaks. The tornado carves a column at its feet a dozen times a second and steers the nearest loose pieces' speed (round, in and up, then out at the top; big sections barely budge), at most 36 of them. Dynamite remembers the block it's stuck to, or the loose piece it rides on, and goes off early if that block breaks.
- **Slanted and curved parts** (masts, girders, the Ferris wheel's rim and spokes, the helter-skelter slide, palm fronds) are drawn with the builder's `beam`, `ring` and `dab`. A thin slanted beam's little blocks could meet only at their corners, which the collapse check reads as not joined, so the scene would fall apart the moment it's built; `beam` walks its middle line one axis at a time so every block shares a face with the next.
- **Collapse** (`js/core/connect.js`): after every hit, anything no longer connected to the ground falls, and anything left standing on a thin neck (much less support at a layer than that same layer had when it was built, judged in a window around the damage, where walls carrying on outside the window only count for a little; so a roof wider than its tower doesn't make the tower look too thin) comes loose and gets pushed to tip over toward the damage. Blocks left dangling by one side around a hole fall off too. A piece only breaks when it really hits something hard, and a big section only when it comes down on the ground (not while scraping past its stump). It breaks where it hit (`shatterPlan` in `js/core/budget.js`): small bits and a few crumbs at the impact, medium chunks a little further along, and big slabs at the far end that carry on falling and break when they land, so a tower crumbles along its length. No block is ever thrown away: with little room for new pieces they just come out bigger. Every tool also takes bites out of loose pieces it hits (`Destruction.bite`: little ones turn to crumbs, big ones lose the blocks near the hit), so rubble and fallen sections can be chewed up, not just shoved. Flying pieces that hit standing blocks smash them too, TNT sets off TNT, and bombs go off early in someone else's blast.
- **Particles** (`js/fx/gpuParticles.js`): thousands of crumbs, sparks, embers, confetti and dust puffs. Each is written once when it's born; the vertex shader works out where it is from closed-form motion (gravity, drag, up to three bounces), so live particles cost the processor nothing.
- **Sound** is all synthesized (`js/audio.js`, `js/sfx.js`), so nothing to download.
- **Speed:** physics time goes on *moving* pieces, so that's what's budgeted (`awake` in `js/quality.js`, trimmed further by the frame-time governor when frames run long). Rubble that has lain still for a moment is frozen into fixed scenery: it costs nothing, and a pile doesn't all wake up when something bumps it; a blast, a heavy hit or the blocks under it breaking turn it back into moving pieces. A hit makes at most about 70 new physics pieces a frame (the rest of the blast is crumbs); pieces that break off together collide as slightly-too-small boxes so they never start inside each other; only when the total number of pieces gets large does the oldest settled rubble go, in a puff.
- **Physics gotchas** (Rapier 0.21): never put a single piece to sleep by hand inside an awake pile (it loses its contacts but keeps falling, through the ground); the ground is a deep block, because a big slab slammed into a thin one gets pushed out of the bottom.
- **Start-up:** the loading screen (the game's picture, its name and six slots that fill with blocks) is part of `index.html` itself and is on screen before any game code loads; the game starts after it has been drawn, steps through loading three.js, the physics engine, the playground and the shaders, and fades it out as the playground builds itself. On the iPad the game list stays up until a new page draws something, so a start-up that drew nothing first looked frozen.

One Rapier quirk worth knowing: its ball-vs-voxels contact panics at some positions (and a panic kills the whole physics world), so round things (the bomb, the wrecking ball) use a convex hull of a geodesic sphere instead. A test checks no ball colliders sneak back in, and if the physics ever does fail, the game quietly starts a fresh physics world from the blocks still standing instead of freezing.

## Files

- `index.html`, `style.css`: the page, buttons and panels.
- `js/main.js`: start-up, the game loop, rebuild, surprises, celebration, lifecycle.
- `js/core/`: pure logic, tested in node: the grid, materials, carving, connectivity, chunking, box merging, budgets, combo, the scenes.
- `js/physics/`: the Rapier world and loose pieces.
- `js/render/`: renderer and lights, the island, block materials, instanced blocks.
- `js/fx/`: particles, rings and fireballs, camera shake and hit-stop, balloons, effect recipes.
- `js/tools/`: meteor, wrecking ball, laser, bomb, hammer, cannon, tornado, dynamite.
- `js/dev/`: the grown-up panel and the stress test.
- `sw.js`: offline cache for the web version (the app leaves it out).
