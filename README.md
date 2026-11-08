# Kid Games

Mighty Mower, Coaster Doodle, Monster Truck, Gadget Glam, Turbo Quest and Critter Clinic in one iPad app. It has no ads, no sign-up, and needs no internet.

The app is made with [Capacitor](https://capacitorjs.com). Everything is in this repo:

- `games/`: one folder per game: `lawn-mower` (Mighty Mower), `roller-coaster` (Coaster Doodle), `monster-truck`, `gadget-glam`, `turbo-quest` (a platformer, in progress) and `critter-clinic` (a doctor's check-up). Each is a complete web game on its own, with its own README, tests and `npm start`. **This is where you change a game.**
- `launcher/`: the app's home screen, six big picture buttons.
- `scripts/sync-games.mjs`: copies the launcher and every game in `games/` into `www/`, leaving out tests and other files the app doesn't need. Capacitor bundles `www/` into the app.
- `ios/`: the Xcode project.

`www/` is made by the build and isn't saved in git, so don't edit anything in it: the next build replaces it.

The first three games used to be separate repos (github.com/osengaa10/lawn-mower and so on). Their history came along when they moved here, so `git log -- games/lawn-mower` still shows every change.

Inside the app, each game's title screen (Gadget Glam's home screen, Turbo Quest's map and pause menu, Critter Clinic's waiting room) shows an extra round button with four colored tiles. It goes back to the game list. The button only shows up in the app, not on the web.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run sync` | Rebuild `www/` from `games/` and the launcher, and copy it into the Xcode project. Run this after changing any game. |
| `npm run open` | Open the project in Xcode. |
| `npm run ios` | Sync, then build and run on a connected iPad or a simulator. |
| `npm run serve` | Try the launcher and games in a desktop browser at http://localhost:8080. |
| `npm test` | Run every game's tests. |

To work on one game by itself, run `npm start` (and `npm test`) inside its folder, e.g. `cd games/gadget-glam && npm start`.

**Adding a game:** put it in a new folder in `games/` (it needs an `index.html`), add a card for it in `launcher/index.html`, and run `npm run sync`.

## Voices

Critter Clinic's narrator and patients speak with recorded voices made with [ElevenLabs](https://elevenlabs.io), not the iPad's robotic built-in voice. (The other games still use the built-in one for now.) Each line is made once, saved as an mp3 in the game's `voice/` folder, and committed, so building the app needs no API key and no internet. The tools are in `scripts/voices/`:

- `cast.json`: every voice in every game: who it is, a description of how it sounds, and its ElevenLabs voice id.
- `audition.mjs`: makes three voices from a role's description, so you can pick one.
- `generate.mjs`: makes a game's clips from its `scripts/voice-lines.mjs`.

**Setting up (once):** make an API key at elevenlabs.io (Profile → API keys) and put it in a file called `.env` at the root of this repo:

```sh
ELEVENLABS_API_KEY=sk_...
```

Git ignores `.env`, so the key never gets committed.

**Picking the voices:**

```sh
npm run voices:audition                  # 3 new voices for each role that has none yet
open .voices-audition/index.html         # listen
npm run voices:audition -- pick puppy 2  # keep one: saved to your ElevenLabs account and to cast.json
npm run voices:audition -- bunny         # 3 more tries for one role
npm run voices:audition -- use puppy <voice id>   # or use a voice from the ElevenLabs Voice Library
```

A preview only says its role's sample line. To make the game's lines, ElevenLabs needs the voice saved in your account, and that's what `pick` does. Each saved voice takes a slot: 3 on the free plan, 10 on Starter. Voices from the Voice Library and ElevenLabs' default voices don't take a slot.

**Making the clips** (after picking, and again after changing any line):

```sh
npm run voices -- critter-clinic --dry   # how many clips and characters it would use
npm run voices -- critter-clinic         # make the clips that are new or changed
npm run voices -- critter-clinic --redo "Ouch!" --voice puppy   # a new take of one line
```

Then commit the game's `voice/` folder and `npm run sync`. Changing a voice in `cast.json` remakes all of that voice's lines the next time. ElevenLabs counts characters: all of Critter Clinic is about 5,500.

## Putting the app on an iPad

This installs the app straight from Xcode with a free Apple account. You don't need the App Store or a paid developer account for this. Plan on about 30 minutes the first time, most of it waiting for downloads. Steps 1 and 2 only happen once per Mac, and steps 4 and 5 only once per iPad.

**You need:**
- The iPad, unlocked, with its passcode handy.
- A USB cable that carries data. Some charge-only cables don't, so if the iPad never shows up in Xcode, try another cable.
- The iPad on **iPadOS 16.4 or later**. Mighty Mower and Coaster Doodle use a browser feature (import maps) that older versions don't have. Check under Settings → General → About → iPadOS Version.
- The iPad's iPadOS version no newer than your Xcode supports. If the iPad was updated more recently than Xcode, update Xcode from the Mac App Store first.

### 1. Install the iOS platform in Xcode (once per Mac)

Xcode doesn't come with the files it needs to build for iPhone and iPad.

1. Open Xcode, then **Xcode → Settings… → Components**.
2. Next to **iOS 26.x**, click **Get**. It's several GB, so let it finish.

Or run `xcodebuild -downloadPlatform iOS` in Terminal instead.

### 2. Add your Apple ID to Xcode (once per Mac)

1. **Xcode → Settings… → Accounts**.
2. Click **+** at the bottom left, choose **Apple Account**, and sign in.
3. You'll get a team called **"Your Name (Personal Team)"**. That's the free one, and it's all this needs.

### 3. Build the web part and open the project

In Terminal, in this repo:

```sh
npm install      # first time after cloning only
npm run sync     # copies the games into the app
npm run open     # opens the project in Xcode
```

### 4. Turn on signing

1. In Xcode's left sidebar, click the blue **App** project icon at the very top.
2. In the middle pane, under **TARGETS**, select **App**, then open the **Signing & Capabilities** tab.
3. Make sure **Automatically manage signing** is checked.
4. Set **Team** to your **(Personal Team)**.
5. **Bundle Identifier** should say `io.github.osengaa10.kidgames`. If Xcode shows a red error such as *"Failed to register bundle identifier"*, that ID is taken. Change it to something unique, for example add `.dev` at the end, and put the same ID in `appId` in `capacitor.config.json` so the two match.

**Before the iPad is connected, two yellow warnings here are normal:** *"Communication with Apple failed: Your team has no devices…"* and *"No profiles for '…' were found"*. A free team can only make a signing profile for a specific device. Once you've done step 5 and picked the iPad as the run destination (step 6), click **Try Again** here and both warnings should clear. Change the bundle ID only if you get *"Failed to register bundle identifier"*. That's the error that means the ID is taken.

### 5. Connect the iPad and turn on Developer Mode (once per iPad)

1. Plug the iPad into the Mac and unlock it.
2. On the iPad, tap **Trust** when it asks **"Trust This Computer?"**, then enter the iPad passcode.
3. Turn on Developer Mode:
   1. On the iPad, open **Settings → Privacy & Security** and scroll to the bottom.
   2. Tap **Developer Mode** and switch it on. It asks to restart; tap **Restart**.
   3. After the restart, tap **Turn On** in the prompt that appears and enter the passcode.
   - If **Developer Mode** isn't in the list yet, leave the iPad plugged in, pick it as the run destination in Xcode (step 6), and press ▶ once. The failed run makes the setting appear.
4. In Xcode, open **Window → Devices and Simulators**. The iPad should be listed. If it says Xcode is *preparing* or *copying shared cache symbols*, wait until that finishes. The first time can take several minutes.

### 6. Run it

1. At the top of the Xcode window, click the run-destination menu (it shows a device name next to **App**) and choose the iPad under **iOS Device**.
2. Press **▶** (or **⌘R**).
3. If the Mac asks for your **login password** so *codesign* can use a key, enter it and click **Always Allow**. It may ask more than once.

### 7. Trust your developer profile on the iPad (once per iPad)

The first launch fails with a message about an **"Untrusted Developer"**, or Xcode reports that it couldn't launch the app. That's expected.

1. On the iPad, open **Settings → General → VPN & Device Management**.
2. Under **Developer App**, tap your Apple ID email, then tap **Trust "Apple Development: …"** and confirm.
3. Press **▶** in Xcode again, or tap the **Kid Games** icon on the iPad.

The app is installed. You can press **■** in Xcode and unplug the iPad, and the app stays.

### Before handing it over: Guided Access (optional)

To keep a little one in the app, turn on **Settings → Accessibility → Guided Access**. Then, with Kid Games open, triple-click the top (or Home) button and tap **Start**. Triple-click again and enter the passcode to leave.

## Keeping it installed

- **The free-account install expires after 7 days.** After that, the app won't open. To renew it, plug the iPad in, open the project (`npm run open`), and press ▶. Saved progress stays as long as you don't delete the app.
- **After changing a game**, run `npm run sync` and press ▶ in Xcode again.
- **Wireless:** once the iPad has been set up over USB, Xcode can usually install over Wi-Fi when the Mac and iPad are on the same network. The iPad appears in the run-destination menu without the cable. If it doesn't, open **Window → Devices and Simulators**, select the iPad, and check **Connect via network**.
- **Free-account limits:** a free team can have only 3 of its own apps installed on a device at once, and it can create only a few new bundle IDs per week. Neither matters for this one app.
- A paid Apple Developer account ($99/yr) makes installs last a year, and you need it for TestFlight and the App Store.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| *"iOS 26.x is not installed"* | Do step 1 (Settings → Components). |
| The iPad isn't in the run-destination menu | Unlock it, tap Trust, try another cable, and look in **Window → Devices and Simulators**. |
| *"Developer Mode disabled"* | Do step 5. |
| *"Failed to register bundle identifier"* / *"No profiles for…"* | Pick your Personal Team in step 4, or change the bundle ID to something unique. |
| *"The iPad is running a newer iPadOS than this Xcode supports"* | Update Xcode from the Mac App Store. |
| *"Untrusted Developer"* or the app won't launch | Do step 7. |
| The app opens but a game shows a blank screen | Check the iPad is on iPadOS 16.4 or later. |
| *"Kid Games is no longer available"* | The 7-day free install ran out. Plug in and press ▶. |
| No sound | Sound starts after the first tap. Also check the iPad's volume and that it isn't in silent mode. |

## App icon and launch screen

- **The icon:**
  - `assets/icon-source.png` is the original art.
  - `assets/icon-1024.png` is the icon made from it. The art has rounded black corners, and iOS rounds icon corners itself, so the script trims 100 px off each side to leave a full square with no transparency. That file is copied to `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`.
  - To make the icon from new art, run the script and copy the result into the Xcode project:
    ```sh
    swift scripts/make-icon.swift assets/icon-source.png 100 assets/icon-1024.png
    cp assets/icon-1024.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
    ```
    Use `0` instead of `100` if the new art already has square corners.
- **The launch screen** is a plain sky gradient made by `node scripts/make-splash.mjs <out.png>`.

## Game pictures on the home screen

The home screen (`launcher/index.html`) follows the mockup in `assets/cards/launcher-mockup.jpg`. Each game has a card with a picture and its name. Each picture is an action screenshot from the game itself, so he sees exactly what he's about to play:

| Card | The moment |
| --- | --- |
| Mighty Mower | The mower cutting through tall grass on the first lawn, clippings flying, the puppy running alongside and the dinosaur picture showing through |
| Coaster Doodle | A rainbow coaster, seen from outside, heading into a loop over the splash pond, with corkscrews behind |
| Monster Truck | The truck leaping over a row of cars in the crush zone, the crowd behind |
| Gadget Glam | The glue gun squeezing puffy hearts onto a rainbow kitty phone case with a unicorn sticker |
| Turbo Quest | Turbo leaping over the first gap of Banana Bounce, a trail of stars ahead and sparkles from the ones he just grabbed |
| Critter Clinic | The stethoscope on Biscuit the puppy's chest, the heart beating on the monitor and little hearts floating up |

They were taken in a desktop browser at iPad size (1180×820 points, 2× pixels; 3× for Turbo Quest, whose pup is small on screen, and for Critter Clinic, cropped close), with the game's buttons hidden or cropped out. A few used a closer camera than the game normally has: Mighty Mower zoomed in on the mower, and Monster Truck watching from in front and to the side. The square crops, 1024 px, are in `assets/cards/`. The app uses 768 px JPEGs of them in `launcher/images/`:

```sh
for g in lawn-mower roller-coaster monster-truck gadget-glam turbo-quest critter-clinic; do
  swift scripts/crop-image.swift assets/cards/$g.png 0 0 1024 768 launcher/images/$g.jpg
done
```

`crop-image.swift` takes `x y size` of the square to keep, in source pixels from the top-left corner, so it can also cut the square straight out of a new full-screen screenshot.

When a game changes a lot, take a new screenshot, crop it into `assets/cards/`, run the loop above, and then `npm run sync`.
