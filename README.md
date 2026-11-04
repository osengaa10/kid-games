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

## First-time setup for installing on an iPad

1. Xcode → Settings → Components: install the **iOS** platform (one time; a large download).
2. Xcode → Settings → Accounts: add your Apple ID. A free "Personal Team" is enough to install on your own iPad.
3. `npm run open`, select the **App** target, open **Signing & Capabilities**, and choose your team under **Team**.
4. Plug in the iPad and tap **Trust This Computer**. On the iPad, turn on Settings → Privacy & Security → **Developer Mode** (the iPad restarts).
5. In Xcode, pick the iPad as the run destination and press ▶.
6. The first time, on the iPad, go to Settings → General → VPN & Device Management and trust your developer profile.

With a free account, the install expires after 7 days. Pressing ▶ again re-installs it and keeps saved progress. A paid Apple Developer account ($99/yr) makes installs last a year, and you need it for TestFlight and the App Store.

## Placeholders to replace before the App Store

- `assets/icon-1024.png` (copied into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`): this is the Monster Truck icon for now.
- The launch screen is a plain sky gradient made by `node scripts/make-splash.mjs <out.png>`.
