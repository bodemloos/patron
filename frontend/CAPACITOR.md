# Patron — native iOS / Android via Capacitor

The Patron React app is also a Capacitor project. The same `dist/` build
that Vercel serves on the web is bundled into native iOS and Android
shells so the manager can install Patron on a phone, tap an app icon,
and skip the browser entirely.

This file documents the moving parts and the day-to-day workflow.

---

## What's in the repo

- `frontend/capacitor.config.json` — Capacitor app id, app name, web
  directory, and per-plugin settings (status bar, splash, keyboard).
- `frontend/src/lib/native.js` — startup hooks. Hides the splash screen,
  sets the status-bar style, hooks the Android hardware back button,
  and exposes `isNative()`, `platform()`, and `openExternal(url)`.
  Re-export of `Capacitor` is avoided in the web bundle so the bundle
  stays the same size for browser users.
- `frontend/src/api.js` — auto-detects the Capacitor shell and uses the
  absolute API URL configured at build time (or via the runtime
  `window.__patronApiBase` override).
- `frontend/index.html` — sets `viewport-fit=cover` so notched-device
  insets resolve correctly, plus the `apple-mobile-web-app-*` and
  `theme-color` meta tags the iOS / Android shells inspect.
- `frontend/src/index.css` — global `body { padding: env(safe-area-…) }`
  so the React tree clears the status bar and home indicator.
- `frontend/package.json` — Capacitor packages plus convenience
  scripts (`cap:add:ios`, `cap:sync`, `cap:open:android`, etc.)

After running `npx cap add ios` / `npx cap add android` for the first
time, two more directories appear in `frontend/`:
- `frontend/ios/` — Xcode project. Commit it.
- `frontend/android/` — Android Studio project. Commit it.

Both folders are checked in (Capacitor's recommended workflow). Generated
build artefacts inside them — `Pods/`, `build/`, `.gradle/` — should be
ignored via the `.gitignore` Capacitor adds when scaffolding.

---

## First-time setup

```bash
cd frontend

# 1. Install JS deps (this also pulls in Capacitor)
npm install

# 2. Build the web app — Capacitor copies dist/ into the native shell
npm run build

# 3. Add platforms — only needed once per repo, then commit
npm run cap:add:ios       # macOS only, Xcode required
npm run cap:add:android   # Android Studio required

# 4. Open the native projects to install pods / run gradle sync
npm run cap:open:ios
npm run cap:open:android
```

For iOS you'll need:
- macOS with Xcode 15+
- A configured signing team (Apple Developer account or your personal team)

For Android you'll need:
- Android Studio Hedgehog+
- A configured Android SDK (Capacitor will tell you if it's missing)

---

## Day-to-day workflow

After every code change in the React app, sync the native projects:

```bash
# Builds dist/, then `cap sync` copies the assets and refreshes plugin
# native code. Run before opening Xcode / Android Studio.
npm run cap:sync

# Or only one platform:
npm run cap:sync:ios
npm run cap:sync:android
```

To run on a connected device or simulator:

```bash
npm run cap:run:ios
npm run cap:run:android
```

The `cap:run:*` scripts internally do a build + sync first, so you don't
need to remember the order.

### Live-reload during development (optional)

Bundling on every change is slow. Instead, you can point the native shell
at your laptop's running Vite dev server. Add this block to
`capacitor.config.json` while you work:

```json
"server": {
  "url": "http://192.168.x.x:5173",
  "cleartext": true
}
```

…then `npm run dev` on your laptop, `npm run cap:sync`, and reopen the
app on the device. Remove the `server.url` line before shipping a build.

---

## Configuring the API base

The native shell loads `index.html` from inside the bundle, so requests
to `/api/...` go nowhere — there's no Vercel rewrite layer to forward
them. The frontend handles this by checking `window.Capacitor?.isNativePlatform()`
and falling back to a configured absolute URL.

Set the Render URL at build time, **before** `npm run cap:sync`:

```bash
# .env.production (committed to your secret manager, not the repo)
VITE_API_BASE=https://patron-sijx.onrender.com
```

…or one-shot:

```bash
VITE_API_BASE=https://patron-sijx.onrender.com npm run cap:sync
```

A wrong / unset URL surfaces a clear `console.warn` at startup so it's
easy to spot in Xcode's debugger / Android Studio's Logcat.

---

## App identity

Edit `capacitor.config.json` to change:

- `appId` — reverse-domain bundle identifier (`be.bodemloos.patron`).
  Once installed on devices, **don't change this** — iOS and Android
  treat a different `appId` as a different app entirely.
- `appName` — what shows under the icon on the home screen.
- `plugins.SplashScreen.backgroundColor` — solid colour shown while the
  web view loads. Keep it in sync with the dark-mode background.

Replace icons / launch screens by editing the platform-specific assets:
- iOS: `frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `frontend/android/app/src/main/res/mipmap-*/`

The Capacitor docs walk through the recommended sizes; the
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets)
CLI can generate every variant from a single 1024×1024 source PNG.

---

## Releasing

### iOS

1. Open Xcode (`npm run cap:open:ios`).
2. Set a signing team in *Signing & Capabilities* on the **App** target.
3. Increment the build / version numbers in *General*.
4. *Product → Archive*, then upload via *Distribute → App Store Connect*.

### Android

1. Open Android Studio (`npm run cap:open:android`).
2. *Build → Generate Signed Bundle / APK → Android App Bundle*.
3. Upload the `.aab` to Google Play Console.

For Play, you'll also need a generated upload keystore. Capacitor doesn't
manage this — store the keystore + password securely outside the repo.

---

## Native plugins available out of the box

Already installed and ready to import:

| Plugin                       | Used for                                                   |
| ---------------------------- | ---------------------------------------------------------- |
| `@capacitor/app`             | Hardware back button on Android, app-state events          |
| `@capacitor/browser`         | In-app browser tab for the unfurl "Open externally" CTA    |
| `@capacitor/keyboard`        | Layout shifting when the keyboard pops up                  |
| `@capacitor/network`         | Detect offline state for graceful degradation              |
| `@capacitor/preferences`     | Native key-value storage if `localStorage` isn't enough    |
| `@capacitor/splash-screen`   | Hide the launch splash once the React tree mounts          |
| `@capacitor/status-bar`      | Tint the status bar to match the app's brand colour        |

Add more plugins with `npm install @capacitor/<name>` then run
`npm run cap:sync`.

---

## What's NOT in the native bundle

The customer-facing pages — `welcome.html`, `order.html`, `patronize.html`
— ship as static files in `dist/` and Vite copies them into the bundle.
They're reachable inside the Capacitor app under their relative paths,
but they're not the main UX target there. Customers scan QR codes that
point to your **public web URL** (Vercel), not the native shell.

If you decide later to ship a separate "guest" native app for QR
ordering, fork the project structure and treat `order.html` as the
entry point of a second Capacitor config.

---

## Troubleshooting

- **Blank screen / white flash on launch** — your splash screen
  background and the body background don't match, or the splash hides
  before the React tree mounts. Tweak `plugins.SplashScreen.launchShowDuration`
  in `capacitor.config.json`.
- **`/api/...` requests fail with `net::ERR_CONNECTION_REFUSED`** — you
  forgot to set `VITE_API_BASE` for the native build. See the API base
  section above.
- **Status bar overlaps the header** — `viewport-fit=cover` isn't set
  in `index.html`, or the body padding got stripped by another
  stylesheet. Inspect `padding-top: env(safe-area-inset-top)` on `body`
  in the device's web inspector.
- **Android back button exits the app immediately** — the listener in
  `lib/native.js` falls through to `App.exitApp()` when there's no SPA
  history. Push a route before relying on back-to-pop.
