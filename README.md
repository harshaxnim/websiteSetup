# Personal app template

A reusable starting point for personal web apps: Google sign-in, private Firestore storage, and GitHub Pages deployment. Apps inherit the shared **gatewaybsite** Firebase project and public Web configuration. The same Google account has the same Firebase UID across apps; each app has its own data namespace.

**Use this template → create a repository → build your app → enable Pages → push to `main`.**

The shared platform is configured once by the template owner. Future apps normally need no Firebase setup. See [ONE_TIME_SETUP.md](ONE_TIME_SETUP.md) only when completing or rebuilding that platform.

## Start a new app

1. Select **Use this template → Create a new repository** (once the owner enables template status). Agents can also run `gh repo create OWNER/APP --template harshaxnim/websiteSetup --public --clone`.
2. Keep `config/firebase-config.js`, `lib/`, `firestore.rules`, and `.github/workflows/pages.yml`. Do not create a new Firebase project.
3. Customize `index.html`, `app.js`, and `styles.css`. The included notebook demonstrates private structured storage, realtime updates, and Google sign-in.
4. Ensure **Settings → Pages → Build and deployment → Source → GitHub Actions** is selected. Template files copy; repository settings do not. With a credential that has Pages and Administration write permission, inspect `gh api repos/OWNER/APP/pages` and create only if the response is 404: `gh api --method POST repos/OWNER/APP/pages -f build_type=workflow`. If it exists with a branch-based source, update it to workflow-based deployment. Do not add a PAT secret to each app.
5. Push to `main`. The official Pages Actions build and publish `dist/`. Check the Actions run and visit `https://OWNER.github.io/APP/`.

For agents creating a repo: verify inherited files, build application-specific code, check APP_ID, enable Pages if permitted, push, inspect the deployment, then verify Google sign-in, write/reload, and isolation. A successful push alone does not prove deployment or auth readiness.

## Local development

Use Node 24 (`.nvmrc`), then:

```bash
npm ci
npm run dev
```

Firebase's normal browser auth persistence restores your login. Google sign-in requires `localhost` in Firebase's authorized domains. Use the URL Vite prints; popups must be allowed. Production uses the same committed configuration, with no `.env` file needed.

```bash
npm test                  # APP_ID and configuration validation
npm run check:firebase    # Validate public configuration shape, not live readiness
npm run build            # Static production output in dist/
npm run preview          # Serve the production output locally
```

For emulator integration testing (Java 21+ required):

```bash
npm run test:rules        # Real Firestore emulator: storage operations and access rules
npx playwright install chromium  # Once, if Chromium is not already available
npm run test:browser      # Signed-out UI and mobile layout
npm run test:e2e          # Emulator Google credentials, save/reload, sign-out and user isolation
```

To develop with emulated auth and Firestore instead of the shared project:

```bash
npx firebase emulators:start --only auth,firestore --project demo-personal-apps
# In a second terminal:
VITE_USE_EMULATORS=true npm run dev
```

Emulator mode is development-only and uses a deliberately fictional `demo-personal-apps` project; it cannot be enabled in production output. It never writes to the shared live database. The browser integration test uses the Auth emulator's supported Google credential flow and verifies persistence, sign-out, and isolation through the UI. Production's interactive Google popup still needs separate live verification; its helper scripts require Internet access even for an emulated popup.

## Application identity

`lib/app-id.js` resolves APP_ID in this order:

1. `APP_ID` in `config/app-config.js`, if supplied.
2. The first path segment on a `*.github.io` host: `/videos/` → `videos`, `/research-tool/` → `research-tool`. Nested routes retain the repository identity. An account root site uses the host itself.
3. `local-app` for localhost and other hosts.

Set `export const APP_ID = 'stable-name';` for custom domains or a durable namespace after a repo rename. Use a unique override while developing multiple apps on localhost if their local data must stay separate. App IDs are 1–128 letters, digits, dots, underscores, or hyphens and start with a letter or digit. Changing APP_ID selects a different namespace; it does not migrate data.

## Shared platform API

Application code imports from `lib/platform.js`; Firebase setup stays in `lib/`.

```js
import {
  appId, signIn, signOut, getCurrentUser, onUserChanged,
  loadState, saveState, getStorage,
} from './lib/platform.js';

await signIn(); // Google popup; returns the Firebase User
getCurrentUser(); // null or User with uid, displayName, email, photoURL
const stopAuth = onUserChanged(async user => {
  if (!user) return;
  const state = await loadState({ count: 0 });
  await saveState({ ...state, count: state.count + 1 });
});
await signOut();
stopAuth();
```

Wait for `onUserChanged` before storage requests on startup so Firebase can restore the session. State is stored at `users/{uid}/apps/{appId}/data/state`. Saving replaces the state's value, which can be an object, array, or scalar. Missing state returns an independent clone of your default.

For richer apps, use relative document and collection paths:

```js
const store = getStorage();
await store.setDocument('projects/project-1', { title: 'Research' });
await store.setDocument('projects/project-1', { archived: false }, { merge: true });
const project = await store.getDocument('projects/project-1'); // data or null
const id = await store.addDocument('projects/project-1/notes', { text: 'An idea' });
const rows = await store.getCollection('projects/project-1/notes'); // [{ id, data }]
await store.deleteDocument(`projects/project-1/notes/${id}`);
const stop = store.subscribeCollection('projects', rows => render(rows), console.error);
stop();
```

`getCollection` and `subscribeCollection` accept `{ where: [['status', '==', 'open']], orderBy: [['createdAt', 'desc']], limit: 50 }`. Firestore may require composite indexes for compound queries; indexes are shared infrastructure and may be added as an app grows. `subscribeDocument` provides realtime document data or null. All subscriptions return an unsubscribe function: unsubscribe and clear user-visible data on sign-out/user change (as `app.js` does).

`store.transaction(async tx => { const old = await tx.get('data/counter'); tx.set('data/counter', { count: (old?.count ?? 0) + 1 }); })` supports atomic scoped updates. Read all transaction documents before writing. Firebase can retry callbacks, so avoid external side effects inside them.

The library scopes every operation to `users/{currentUid}/apps/{appId}` and rejects unauthenticated access, invalid path parity, and traversal. Document paths have an even number of segments; collection paths have an odd number. SDK errors propagate to callers; handle them in the application. The state API follows last-write-wins semantics; use transactions or document-based data when concurrent edits matter.

## Security and scope

The committed Firebase Web settings are public, not server credentials. Firestore rules enforce `request.auth.uid == userId` for each app root and all descendants, and deny paths outside that hierarchy. Arbitrary new app IDs and nested data need no new rules.

This is a shared personal platform: namespaces separate normal application operations, but apps signed in as the same UID are trusted to access that user's other app namespaces. APP_ID is not an independent security credential. Do not host untrusted applications on this shared platform. Different sharing models may need different rules later. Firebase quotas and billing also belong to the shared project.

## Verify deployment

After a successful Pages Actions run, check the exact repository URL, inspect the APP_ID shown in the footer, sign in with Google, save a note, reload, and confirm it returns. Sign out and ensure notes disappear; a second Google account must have an independent notebook. A different app path must use a different namespace. Google sign-in runs separately on each origin even though the shared project gives the same account the same UID.

The old Flask/nginx code is preserved on [`legacy/flask-nginx`](https://github.com/harshaxnim/websiteSetup/tree/legacy/flask-nginx).
