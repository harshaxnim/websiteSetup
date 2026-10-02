# Working on apps from this template

Use the existing checkout. Cloud tasks are already isolated; create a Git worktree only when explicitly requested. Preserve user changes. Never commit private credentials or disable signature, checksum, or TLS verification.

## Mobile is a first-class product surface

- Design the core flow for a 360–390 px viewport first, then enhance it for tablets and desktop. Every primary action must work on a small screen without horizontal scrolling or a desktop-only control.
- Use a deliberate visual hierarchy, restrained color palette, readable type, consistent spacing, and concise copy. Prefer useful content over decorative panels. Do not put implementation details into normal product flows.
- Use at least 16 px text in form inputs, readable body text, and tap targets at least 44 × 44 px. Give icons accessible names; never communicate status using color alone.
- Account for device safe areas, narrow screens, long app names, landscape, and software keyboards. Avoid fixed-height content and controls that obscure content. Modals must scroll and fit the viewport; close and submit controls must remain reachable.
- Provide accessible loading, empty, error, offline, and populated states. Keep focus visible, support keyboard operation, and announce asynchronous results. Use reduced-motion preferences when adding animation.
- Verify the real UI at 360 px and 390 px and a representative desktop width. Exercise the primary flow on mobile, check that the page has no horizontal overflow, and review a screenshot. Do not treat a desktop screenshot as mobile validation.
- When producing design alternatives, put them in a temporary standalone HTML artifact with realistic content and comparable mobile screens. Label each direction so the user can choose without reconstructing what differs.

## Shared platform

- Reuse the committed gatewaybsite public Firebase Web configuration. Future apps normally need no new Firebase project or per-app Firebase credentials.
- Keep Firebase auth/storage plumbing in `lib/`. Application code uses `lib/platform.js`; preserve UID + APP_ID private-data namespacing.
- `appDirectory/{appId}` contains only public app metadata. Every record has `ownerUid`; only that authenticated owner can edit or delete it. Never add personal application data to this collection or let a client transfer ownership.
- Keep `users/{userId}/apps/...` rules unchanged when working on directory features. Test Firestore rules for anonymous reads, unauthenticated writes, other-user writes, ownership changes, and nested private-data isolation.
- Repository identity and app manifests are derived automatically. Keep `template.json`, the shared modules, and Pages workflow when making a new app. Customize `config/app-config.js` for presentation or an explicit APP_ID only when necessary.
- Give each app its own icon and theme color, matching its actual interface. Set `APP_DETAILS.iconUrl` and `APP_DETAILS.themeColor`, and replace `public/icon.svg`; the manifest carries this branding into the directory's public metadata. Keep directory cards focused on app names and descriptions, without a promotional hero or counters.
- Verify availability by requesting the actual app page from the browser. An enabled Pages setting or a manifest alone is not a live check. Report blocked CORS/network checks as unverified, and never treat an opaque response as success or overwrite owner lifecycle choices with temporary observations.

## Verify and deploy

- Node 24 is pinned in `.nvmrc`. Install with `npm ci`. Run `npm test` and `npm run build` for code changes; run the emulator rules and browser suites for auth, registry, or persistence changes. See README for commands and cloud cache paths.
- GitHub template files do not copy Pages settings. Ensure each generated repository uses GitHub Actions as its Pages source; inspect the existing setting before updating it. Do not add a long-lived PAT to every app.
- Push to `main` when authorized, inspect the Pages workflow, and verify the deployed repository subpath. Report what is tested locally versus live. An emulator pass does not prove live Google sign-in or deployed rules.
