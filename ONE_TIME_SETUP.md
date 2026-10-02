# One-time shared platform setup

This is for the template owner. Complete it once; future apps inherit the public Firebase configuration and generic rules. Do not repeat Firebase project registration for each app.

The owner supplied the real public Web configuration for **gatewaybsite**, already committed in `config/firebase-config.js`. Analytics is not initialized: it is not required for authentication or storage. If rebuilding the platform, create/choose one Firebase project, register one Web App, and replace that module with its Console-provided config.

## Finish Firebase setup

1. Open [gatewaybsite in Firebase Console](https://console.firebase.google.com/project/gatewaybsite/overview).
2. **Authentication → Get started** if needed, then **Sign-in method → Google → Enable**. Choose a support email and save.
3. **Authentication → Settings → Authorized domains**: keep the existing project domains and add `harshaxnim.github.io`. Add `localhost` if missing. Add each genuinely new host only once; repository paths under the same GitHub Pages host need no changes. Custom domains or another GitHub account host need their own domain entry.
4. **Firestore Database → Create database**: choose the default database, select a suitable region, and use production mode. Creating Firestore enables the API. A Web SDK config alone does not create the database.
5. Deploy the complete `firestore.rules` file. In the Console's **Firestore → Rules** tab, paste its contents and **Publish**, or authenticate the Firebase CLI as the project owner and run:

   ```bash
   npm ci
   npx firebase login
   npm run deploy:rules
   ```

   The deploy command explicitly targets the project in the committed config and deploys only Firestore rules. Review any existing rules before replacing them in an existing shared project. No Firebase Admin SDK or service-account private key belongs in this client template.
6. Run `npm run dev` and verify Google sign-in on localhost. Allow the login popup. If Google reports a disabled provider or unauthorized domain, correct the relevant setting above.
7. Sign in, save a note, reload, and confirm it returns. Sign out: notes must disappear. Sign in with another Google account: it must have an empty separate notebook. Create a second app namespace and verify the first app's notes do not appear there.
8. Run `npm run test:rules` to verify direct reads/writes/queries by another UID and unauthenticated clients are rejected at multiple nesting depths. These tests use an emulator; Console publication and live behavior must also be checked.

The generic rules allow each authenticated user to read/write their own app document and nested data at `users/{uid}/apps/{appId}/...`. Everything else is denied. New app IDs and collections require no normal rules changes. All apps using this project share Firebase user identity and project quotas. Add indexes for compound queries as needed; intentional sharing needs a separately reviewed rules extension.

## Configure this GitHub repository once

1. Under **Settings → General**, enable **Template repository** for `harshaxnim/websiteSetup`.
2. Make `main` the default branch using the repository's default branch setting. The original code remains on `legacy/flask-nginx` and `master`.
3. Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
4. Under **Actions**, run **Deploy to GitHub Pages** on `main`, or push a new commit there. The workflow installs locked dependencies, runs unit tests, validates the public config, builds, and deploys `dist/` using official Pages Actions.
5. Verify `https://harshaxnim.github.io/websiteSetup/`, APP_ID `websiteSetup`, and live Google sign-in and save/reload behavior. Test the same Google account across a second app to confirm its Firebase UID matches.

With suitable administration permission, an agent can mark the repository as a template and set the default branch through `gh api --method PATCH repos/harshaxnim/websiteSetup -F is_template=true -f default_branch=main`. Inspect Pages first: `gh api repos/harshaxnim/websiteSetup/pages`. Only if absent (404), create it with `gh api --method POST repos/harshaxnim/websiteSetup/pages -f build_type=workflow`; verify afterward. An existing branch-based Pages configuration can be updated to `workflow` through the Pages update API. A permission-denied response is not evidence that Pages is absent.

## Current setup observations

During implementation, live read-only requests confirmed the public configuration belongs to `gatewaybsite`. The Auth project configuration listed `localhost` and the project's Firebase domains; it did **not** yet list `harshaxnim.github.io`. Google provider discovery reported the provider was not configured. Firestore reported its API had not been enabled/used. These observations can change after the owner completes the steps above.

The available GitHub integration allowed Git pushes, but Pages reads and repository-settings writes returned 403. Firebase CLI project access did not authenticate with the credentials available in the cloud environment. Consequently the agent could not deploy live rules, enable Google auth, or configure repository settings. Public Web configuration is committed; live platform readiness still requires those settings and live verification.

Once this shared setup is verified, the normal README workflow applies: **create from template → build → enable Pages if needed → push → live**. Google/Firebase setup is inherited. GitHub's per-repository Pages setting is the remaining repository setup step unless the creating agent has permission to automate it.
