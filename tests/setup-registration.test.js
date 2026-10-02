import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { resolveAppInfo } from '../lib/app-info.js';
import { createCatalogueRegistrar } from '../scripts/register-catalogue.js';

const config = { apiKey: 'demo-key', authDomain: 'demo-personal-apps.firebaseapp.com', projectId: 'demo-personal-apps', appId: 'demo-personal-apps-web' };
const endpoints = { auth: 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1', token: 'http://127.0.0.1:9099/securetoken.googleapis.com/v1', firestore: 'http://127.0.0.1:8080/v1' };
async function login(name) {
  const app = initializeApp(config, name); const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const credential = GoogleAuthProvider.credential(JSON.stringify({ sub: name, email: `${name}@example.test`, email_verified: true }));
  const { user } = await signInWithCredential(auth, credential);
  return { app, user };
}
const metadata = resolveAppInfo({ repository: 'harshaxnim/setup-learning', details: { description: 'A new app', themeColor: '#466a51' }, hostname: 'harshaxnim.github.io', pathname: '/setup-learning/' });
const catalogue = { schemaVersion: 1, repository: metadata.repository, template: metadata.template, apps: [metadata] };
const documentUrl = endpoints.firestore + '/projects/demo-personal-apps/databases/(default)/documents/appDirectory/setup-learning';
test('setup creates a real owner-scoped Firestore record before any app visit, retries preserve edits, and other owners cannot take it', async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'This test must run only against emulators.');
  const environment = await initializeTestEnvironment({ projectId: 'demo-personal-apps', firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  await environment.clearFirestore();
  const owner = await login('setup-publisher'), other = await login('setup-other');
  try {
    const registrar = createCatalogueRegistrar({ config, endpoints });
    await assert.rejects(() => registrar.register(catalogue), /authentication is missing/);
    await assert.rejects(() => registrar.register(catalogue, { refreshToken: owner.user.refreshToken, expectedOwner: 'someone-else' }), /belonging to this publisher/);
    const result = await registrar.register(catalogue, { refreshToken: owner.user.refreshToken, expectedOwner: 'harshaxnim' });
    assert.deepEqual(result, [{ appId: 'setup-learning', created: true }]);
    const publicResponse = await fetch(documentUrl); assert.equal(publicResponse.status, 200);
    const doc = await publicResponse.json();
    assert.equal(doc.fields.ownerUid.stringValue, owner.user.uid);
    assert.equal(doc.fields.appId.stringValue, 'setup-learning');
    assert.equal(doc.fields.status.stringValue, 'development');
    assert.equal(doc.fields.themeColor.stringValue, '#466a51');
    assert.ok(doc.fields.createdAt.timestampValue);
    const edit = await fetch(documentUrl+'?updateMask.fieldPaths=name&updateMask.fieldPaths=status&updateMask.fieldPaths=release', { method: 'PATCH', headers: { Authorization: `Bearer ${await owner.user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: 'Owner edited title' }, status: { stringValue: 'paused' }, release: { stringValue: '1.0' } } }) });
    assert.equal(edit.status, 200);
    assert.deepEqual(await registrar.register(catalogue, { refreshToken: owner.user.refreshToken }), [{ appId: 'setup-learning', created: false }]);
    const saved = await (await fetch(documentUrl)).json();
    assert.equal(saved.fields.name.stringValue, 'Owner edited title');
    assert.equal(saved.fields.status.stringValue, 'paused');
    assert.equal(saved.fields.release.stringValue, '1.0');
    await assert.rejects(() => registrar.register(catalogue, { refreshToken: other.user.refreshToken }), /another Firebase account/);
    const conflicting = structuredClone(catalogue); conflicting.repository = 'harshaxnim/another'; conflicting.apps[0].repository = conflicting.repository; conflicting.apps[0].repositoryUrl = `https://github.com/${conflicting.repository}`;
    await assert.rejects(() => registrar.register(conflicting, { refreshToken: owner.user.refreshToken }), /another repository/);
    // Both setups observe a missing record before racing to create it.
    const racingCatalogue = structuredClone(catalogue); racingCatalogue.apps[0].appId = 'setup-race';
    let waiting = 0, release; const barrier = new Promise(resolve => { release = resolve; });
    const racingRegistrar = createCatalogueRegistrar({ config, endpoints, fetcher: async (url, options) => {
      const response = await fetch(url, options);
      if (url.endsWith('/setup-race') && response.status === 404) { if (++waiting === 2) release(); await barrier; }
      return response;
    } });
    const concurrent = await Promise.all([racingRegistrar.register(racingCatalogue, { refreshToken: owner.user.refreshToken }), racingRegistrar.register(racingCatalogue, { refreshToken: owner.user.refreshToken })]);
    assert.equal(concurrent.flat().filter(result => result.created).length, 1);
    // Public metadata must never turn private app data into a public collection.
    const privateResponse = await fetch(endpoints.firestore + '/projects/demo-personal-apps/databases/(default)/documents/users/other/apps/setup-learning/data/state');
    assert.equal(privateResponse.status, 403);
  } finally { await deleteApp(owner.app); await deleteApp(other.app); await environment.cleanup(); }
});
