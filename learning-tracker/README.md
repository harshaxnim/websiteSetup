# Learning Tracker

A mobile-first static app, published beside the catalogue at `learning-tracker/`.

- Add, edit, delete, and complete entries with a title, 1–10 related URLs, and optional notes.
- Drag the grip to reorder on touch screens, or focus it and use Up/Down. Search and filters preserve the positions of hidden entries when reordering.
- Search titles, URLs, and notes; filter All / To learn / Done.
- Export a versioned JSON backup. Import previews the list and offers Add or Replace; validation completes before any changes are applied. Simple arrays with `title`, `url`, optional `notes` and `done` are also accepted.
- The starter is one entry containing both supplied video links.
- On iPhone, open the deployed page in Safari → Share → Add to Home Screen. The app shell is cached after the first online visit, so the device list can be edited and exported offline.

Guest lists are saved in localStorage on the current browser/device. Google sign-in copies that guest list into a new account; an existing account loads its own list. Account caches use separate keys, and signing out restores the guest list. Private sync uses `users/{uid}/apps/learning-tracker/data/state` through the shared platform. Only public branding metadata is registered in `appDirectory/learning-tracker` on the first signed-in production visit. No UID is hardcoded and the Firestore rules are unchanged.

Offline changes stay in the account's device cache and retry on reconnect. Sync saves the complete ordered list: the last device to save wins, so avoid simultaneous edits on multiple devices. This is a personal tracker, without concurrent collaborative editing. Device/browser storage may be cleared by the OS; use JSON backups or sign in for a cloud copy. The service worker caches only public static files, never auth or Firestore responses.

The repository remains the template/catalogue. GitHub's current integration cannot create a separate repository, so this app uses a stable explicit `learning-tracker` APP_ID and its own Pages path, icon, theme, manifest, and scoped service worker. It can later be moved into a generated repository without changing its private namespace.

From the repository root: `npm ci`, `npm run dev`, `npm test`, `npm run build`. Browser verification: `npm run test:browser`, `npm run test:e2e`, and, after building, `npm run test:offline`. Cloud uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`, Java 21, and the writable cache settings in the root README. Emulators use the fictional `demo-personal-apps` project and never write to production.
