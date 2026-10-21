# Mobile & PWA

## Responsive layout

Every screen works on a phone. The left menu moves behind the ☰ button, filters stack vertically, and tables turn into cards with the same actions — no sideways scrolling.

<div class="screenshot-row">
  <img class="screenshot mobile" src="/screenshots/mobile-home.png" alt="Home on a phone" />
  <img class="screenshot mobile" src="/screenshots/mobile-flats.png" alt="Flat owners on a phone" />
  <img class="screenshot mobile" src="/screenshots/mobile-attendance.png" alt="Attendance on a phone" />
</div>

## Install as an app (PWA)

The web app can be installed on a phone or desktop and then opens full-screen from the home screen, like a native app.

| Device | How |
|--------|-----|
| Android (Chrome) | Use the **Install** banner in the app, or menu ⋮ → **Install app** |
| iPhone / iPad (Safari) | Share → **Add to Home Screen** (the app shows a tip) |
| Desktop (Chrome / Edge) | Install icon in the address bar |

Installation requires the site to be served over **HTTPS** (or `localhost`). See [Reverse Proxy](/installation/reverse-proxy).

The installed app caches its own files so it opens quickly, but API data is always fetched live — it needs a network connection to work.

## Native mobile app (Expo)

The repository also contains an Expo app (`apps/mobile`) for storeroom staff with Item Lookup, Stock In, Stock Out, and Alerts screens. Start it with `npm run dev:mobile`; see [Run from Source](/installation/from-source#mobile-app-expo).
