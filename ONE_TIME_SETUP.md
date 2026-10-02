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

The generic rules allow each authenticated user to read/write their own app document and nested data at `users/{uid}/apps/{appId}/...`. The separate `appDirectory/{appId}` namespace allows public directory reads and writes only by the document’s `ownerUid`. Ownership cannot be transferred from a client. No hardcoded UID or extra platform settings document is required. Other paths are denied. New app IDs and collections require no normal rules changes. All apps using this project share Firebase user identity and project quotas. Add indexes for compound queries as needed; intentional sharing needs a separately reviewed rules extension.

## Configure this GitHub repository once

Rename `websiteSetup` to `OneAppToRuleThemAll` in **Settings → General → Repository name**. The cloud integration can push code but its repository rename request returned HTTP 403. The current URL remains `https://harshaxnim.github.io/websiteSetup/` until the owner completes that rename and the Pages workflow republishes. The code recognizes both template identities to preserve existing generated apps.

1. Under **Settings → General**, enable **Template repository** for `harshaxnim/OneAppToRuleThemAll`.
2. Make `main` the default branch using the repository's default branch setting. The original code remains on `legacy/flask-nginx` and `master`.
3. Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
4. Under **Actions**, run **Deploy to GitHub Pages** on `main`, or push a new commit there. The workflow installs locked dependencies, runs unit tests, validates the public config, builds, and deploys `dist/` using official Pages Actions.
5. After the rename, verify `https://harshaxnim.github.io/OneAppToRuleThemAll/`, APP_ID `OneAppToRuleThemAll`, and live Google sign-in and save/reload behavior. Test the same Google account across a second app to confirm its Firebase UID matches.

With suitable administration permission, an agent can mark the repository as a template and set the default branch through `gh api --method PATCH repos/harshaxnim/OneAppToRuleThemAll -F is_template=true -f default_branch=main`. Inspect Pages first: `gh api repos/harshaxnim/OneAppToRuleThemAll/pages`. Only if absent (404), create it with `gh api --method POST repos/harshaxnim/OneAppToRuleThemAll/pages -f build_type=workflow`; verify afterward. An existing branch-based Pages configuration can be updated to `workflow` through the Pages update API. A permission-denied response is not evidence that Pages is absent.

## Verification and directory rollout

Live read-only checks subsequently confirmed Google Sign-In is enabled, `harshaxnim.github.io` is authorized, and Firestore responds and rejects unauthenticated reads of private application data. The owner reports publishing the initial private-data rules. GitHub now reports `main` as the default branch and template status enabled.

The app directory is publicly readable in live read-only checks, while private-data reads remain denied. Publish the current `firestore.rules` to enable the full metadata schema, including optional `iconUrl` and `themeColor`. Documents are owned individually through `ownerUid`; no UID is hardcoded and no per-app rules changes are needed. Deploy via `npm run deploy:rules` with your existing Firebase CLI login, or paste the complete file into **Firestore → Rules → Publish**. Then sign in to the directory and add the first real app, or use Sync from GitHub. Firestore creates `appDirectory` when the first record is written.

The available cloud credentials did not authenticate for Firebase administration, so the exact deployed rules and authenticated production writes remain unverified. The Pages workflow successfully built and deployed the directory (run 37004358361). Repository administration changes returned 403; future repositories should select GitHub Actions as their Pages source as described above. Interactive live Google sign-in and authenticated persistence still require browser verification on the published site. Emulator tests cover ownership, branding validation, private-data isolation, and client page checks.

Once this shared setup is verified, the normal README workflow applies: **create from template → build → enable Pages if needed → push → live**. Google/Firebase setup is inherited. GitHub's per-repository Pages setting is the remaining repository setup step unless the creating agent has permission to automate it.
