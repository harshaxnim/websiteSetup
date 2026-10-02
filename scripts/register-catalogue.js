import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { firebaseConfig, validateFirebaseConfig } from '../config/firebase-config.js';
import { parsePublishedCatalogue } from '../lib/catalogue.js';

function field(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  throw new Error('Unsupported public metadata value.');
}
export function validateCatalogue(payload, expectedOwner) {
  if (typeof payload?.repository !== 'string') throw new Error('Catalogue repository is required.');
  if (expectedOwner && payload.repository.split('/')[0].toLowerCase() !== expectedOwner.toLowerCase()) throw new Error('Only repositories belonging to this publisher can be registered.');
  return parsePublishedCatalogue(payload, payload.repository);
}
export function createCatalogueRegistrar({ config, fetcher = fetch, endpoints } = {}) {
  validateFirebaseConfig(config);
  const services = endpoints ?? {
    auth: 'https://identitytoolkit.googleapis.com/v1',
    token: 'https://securetoken.googleapis.com/v1',
    firestore: 'https://firestore.googleapis.com/v1',
  };
  async function request(url, options = {}, allowMissing = false) {
    let response;
    try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error('Registration could not reach Firebase. Check network access and retry.'); }
    if (allowMissing && response.status === 404) return null;
    // Never expose response bodies, request headers, or credentials in logs.
    if (!response.ok) {
      const error = new Error(`Firebase registration request failed (HTTP ${response.status}). Check the publishing credential and existing owner permissions.`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
  return {
    async register(payload, { refreshToken, idToken, expectedOwner } = {}) {
      const apps = validateCatalogue(payload, expectedOwner);
      if (!apps.length) return [];
      if (!idToken && !refreshToken) throw new Error('Firebase publishing authentication is missing. Connect once at setup/publisher/ and save FIREBASE_REFRESH_TOKEN securely.');
      if (!idToken) {
        const tokens = await request(`${services.token}/token?key=${encodeURIComponent(config.apiKey)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        });
        idToken = tokens.id_token;
      }
      const account = await request(`${services.auth}/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
      });
      const ownerUid = account.users?.[0]?.localId;
      if (typeof ownerUid !== 'string' || !ownerUid) throw new Error('The publishing credential did not identify a Firebase user.');
      const database = `${services.firestore}/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents`;
      const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
      const results = [];
      for (const app of apps) {
        const name = `projects/${config.projectId}/databases/(default)/documents/appDirectory/${app.appId}`;
        const url = `${database}/appDirectory/${encodeURIComponent(app.appId)}`;
        function preserve(existing) {
          if (existing.fields?.repository?.stringValue !== app.repository) throw new Error(`APP_ID ${app.appId} is already registered to another repository. Choose a unique APP_ID.`);
          if (existing.fields?.ownerUid?.stringValue !== ownerUid) throw new Error(`App ${app.appId} belongs to another Firebase account. No ownership or metadata was changed.`);
          results.push({ appId: app.appId, created: false });
        }
        const existing = await request(url, { headers }, true);
        if (existing) { preserve(existing); continue; }
        try {
          await request(`${database}:commit`, {
            method: 'POST', headers,
            body: JSON.stringify({ writes: [{
              update: { name, fields: Object.fromEntries(Object.entries({ ...app, ownerUid }).map(([key, value]) => [key, field(value)])) },
              currentDocument: { exists: false },
              updateTransforms: ['createdAt', 'updatedAt'].map(fieldPath => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
            }] }),
          });
          results.push({ appId: app.appId, created: true });
        } catch (error) {
          // A concurrent setup may win creation; don't reset owner edits.
          // REST backends map failed create preconditions to different HTTP
          // codes. Verify the actual document rather than guessing that code.
          const winner = await request(url, { headers }, true);
          if (!winner) throw error;
          preserve(winner);
        }
      }
      return results;
    },
  };
}
export async function readCatalogue() {
  const payload = process.env.APP_CATALOGUE_JSON
    ? JSON.parse(process.env.APP_CATALOGUE_JSON)
    : JSON.parse(await readFile(new URL('../dist/app-catalog.json', import.meta.url), 'utf8'));
  const apps = validateCatalogue(payload, process.env.EXPECTED_REPOSITORY_OWNER);
  return { schemaVersion: 1, repository: payload.repository, template: payload.template, apps };
}
async function main() {
  const payload = await readCatalogue();
  const results = await createCatalogueRegistrar({ config: firebaseConfig }).register(payload, {
    refreshToken: process.env.FIREBASE_REFRESH_TOKEN, idToken: process.env.FIREBASE_ID_TOKEN,
    expectedOwner: process.env.EXPECTED_REPOSITORY_OWNER,
  });
  for (const result of results) console.log(`${result.created ? 'Created' : 'Preserved'} appDirectory/${result.appId}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
