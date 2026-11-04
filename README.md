# Kid Games

Mighty Mower, Coaster Doodle and Monster Truck in one iPad app. It has no ads, no sign-up, and needs no internet.

The games are made with [Capacitor](https://capacitorjs.com). The code for each game lives in its own repo (`lawn-mower`, `roller-coaster`, `monster-truck`), and those repos still work on GitHub Pages. The sync script looks for them next to this repo, then one folder further up. It looks in `GAMES_DIR` instead when that's set. This repo holds:

- `launcher/`: the app's home screen, three big picture buttons.
- `scripts/sync-games.mjs`: copies the launcher and the three games into `www/`, which Capacitor bundles into the app.
- `ios/`: the Xcode project.

Inside the app, each game's title screen shows an extra round button with four colored tiles. It goes back to the game list. The button only shows up in the app, not on the web.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run sync` | Rebuild `www/` from the game repos and copy it into the Xcode project. Run this after changing any game. |
| `npm run open` | Open the project in Xcode. |
| `npm run ios` | Sync, then build and run on a connected iPad or a simulator. |
| `npm run serve` | Try the launcher and games in a desktop browser at http://localhost:8080. |

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
npm run sync     # copies the three games into the app
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

The home screen (`launcher/index.html`) follows the mockup in `assets/cards/launcher-mockup.jpg`. Each game has a card with a picture and its name. The original art is in `assets/cards/`. The pictures the app uses are 768 px JPEGs in `launcher/images/`, trimmed to avoid flaws at the edges of the art:

```sh
swift scripts/crop-image.swift assets/cards/lawn-mower.png     0  0 1024 768 launcher/images/lawn-mower.jpg
swift scripts/crop-image.swift assets/cards/roller-coaster.png 85 80 830 768 launcher/images/roller-coaster.jpg  # white corner top-left, black notch right
swift scripts/crop-image.swift assets/cards/monster-truck.png  30  0 880 768 launcher/images/monster-truck.jpg   # white corner bottom-right
```

The numbers are `x y size` of the square to keep, in source pixels from the top-left corner.
