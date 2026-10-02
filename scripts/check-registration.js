import { readCatalogue } from './register-catalogue.js';
import { firebaseConfig } from '../config/firebase-config.js';
async function main() {
  const catalogue = await readCatalogue();
  for (const app of catalogue.apps) {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/appDirectory/${encodeURIComponent(app.appId)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (response.status === 404) throw new Error(`appDirectory/${app.appId} is missing. Run npm run setup:app before deploying this new app.`);
    if (!response.ok) throw new Error(`Could not verify app registration (HTTP ${response.status}).`);
    const document = await response.json();
    if (document.fields?.appId?.stringValue !== app.appId || document.fields?.repository?.stringValue !== app.repository || !document.fields?.ownerUid?.stringValue) throw new Error(`App ${app.appId} has conflicting or incomplete catalogue ownership. Setup must resolve this before deployment.`);
    console.log(`Verified appDirectory/${app.appId}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
