import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { createAppRegistry } from '../lib/registry.js';
import { resolveAppInfo } from '../lib/app-info.js';

let environment;
before(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-personal-apps', firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8') } }); });
after(async () => { await environment?.cleanup(); });
beforeEach(async () => { await environment.clearFirestore(); });
const info = () => resolveAppInfo({ repository: 'harshaxnim/videos' });
function registry(uid) { return createAppRegistry({ db: uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore(), getUser: () => uid ? { uid } : null }); }
function db(uid) { return uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore(); }

test('directory is publicly readable and records have the authenticated creator as owner', async () => {
  await registry('alice').registerApp(info());
  const rows = await registry(null).listApps();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'videos');
  assert.equal(rows[0].ownerUid, 'alice');
  await assertSucceeds(getDoc(doc(db(null), 'appDirectory/videos')));
  // Apps generated before the repository rename can still register and edit.
  const legacy = { ...resolveAppInfo({ repository: 'harshaxnim/legacy-notes' }), template: 'harshaxnim/websiteSetup' };
  await assertSucceeds(registry('alice').registerApp(legacy));
  await assertSucceeds(registry('alice').setStatus('legacy-notes', 'paused'));
});
test('registration is idempotent and preserves owner-edited name and status', async () => {
  const r = registry('alice');
  assert.equal((await r.registerApp(info())).created, true);
  await updateDoc(doc(db('alice'), 'appDirectory/videos'), { tags: ['video'], release: { version: '1.0' } });
  await r.saveApp({ ...info(), name: 'My videos', status: 'paused', iconUrl: 'https://example.com/video.svg', themeColor: '#123456' });
  assert.equal((await r.registerApp({ ...info(), status: 'live' })).created, false);
  const row = (await r.listApps())[0];
  assert.equal(row.status, 'paused'); assert.equal(row.name, 'My videos');
  assert.equal(row.iconUrl, 'https://example.com/video.svg'); assert.equal(row.themeColor, '#123456');
  assert.deepEqual(row.tags, ['video']); assert.deepEqual(row.release, { version: '1.0' });
  assert.equal((await registry('bob').registerApp(info())).created, false);
  assert.equal((await registry(null).listApps())[0].ownerUid, 'alice');
});
test('only document owners can edit status, delete records, or replace records', async () => {
  await registry('alice').registerApp(info());
  await assertSucceeds(registry('alice').setStatus('videos', 'live'));
  await assertFails(registry('bob').setStatus('videos', 'archived'));
  await assert.rejects(registry('bob').saveApp({ ...info(), status: 'archived' }), /owner/);
  await assertFails(deleteDoc(doc(db('bob'), 'appDirectory/videos')));
  await assertFails(deleteDoc(doc(db(null), 'appDirectory/videos')));
  await assertSucceeds(deleteDoc(doc(db('alice'), 'appDirectory/videos')));
});
test('rules prevent ownership transfer and reject anonymous and forged-owner creates', async () => {
  await registry('alice').registerApp(info());
  await assertFails(updateDoc(doc(db('alice'), 'appDirectory/videos'), { ownerUid: 'bob', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('bob'), 'appDirectory/videos'), { ownerUid: 'bob', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('alice'), 'appDirectory/videos'), { ownerUid: deleteField() }));
  await assertFails(updateDoc(doc(db('alice'), 'appDirectory/videos'), { appId: deleteField() }));
  const record = { ...info(), ownerUid: 'alice', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertFails(setDoc(doc(db(null), 'appDirectory/new-app'), { ...record, appId: 'new-app' }));
  await assertFails(setDoc(doc(db('bob'), 'appDirectory/new-app'), { ...record, appId: 'new-app' }));
});
test('rules protect document identity and allow evolving metadata for owners', async () => {
  const record = { ...info(), ownerUid: 'alice', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertFails(setDoc(doc(db('alice'), 'appDirectory/wrong-id'), record));
  await assertSucceeds(setDoc(doc(db('alice'), 'appDirectory/future-app'), { appId: 'future-app', ownerUid: 'alice', tags: ['future'], release: { version: '2.0' } }));
  await assertSucceeds(registry('alice').saveApp(resolveAppInfo({ repository: 'harshaxnim/future-app' })));
  const migrated = (await registry(null).listApps()).find(app => app.appId === 'future-app');
  assert.ok(migrated.createdAt.toDate() instanceof Date);
  assert.deepEqual(migrated.tags, ['future']);
  await assertSucceeds(registry('alice').saveApp(resolveAppInfo({ repository: 'harshaxnim/renamed-future-app', override: 'future-app' })));
  assert.equal((await registry(null).listApps()).find(app => app.appId === 'future-app').repository, 'harshaxnim/renamed-future-app');
  await registry('alice').registerApp(info());
  await assertFails(updateDoc(doc(db('alice'), 'appDirectory/videos'), { appId: 'another-app', updatedAt: serverTimestamp() }));
  // Metadata constraints belong to the application, even for direct SDK writes.
  await assertSucceeds(updateDoc(doc(db('alice'), 'appDirectory/videos'), { status: 'future-status', themeColor: 'invalid', iconUrl: 'javascript:alert(1)' }));
  for (const change of [{ url: 'javascript:alert(1)' }, { status: 'fake' }, { themeColor: 'red;position:fixed' }, { iconUrl: 'javascript:alert(1)' }, { tags: [42] }]) {
    await assert.rejects(registry('alice').saveApp({ ...info(), ...change }));
    await assert.rejects(registry('alice').registerApp({ ...resolveAppInfo({ repository: 'harshaxnim/new-app' }), ...change }));
  }
  const saved = (await registry(null).listApps()).find(app => app.appId === 'videos');
  assert.equal(saved.status, 'future-status'); // Rejected app writes did not alter it.
});
test('APP_ID conflicts with a different repo require an explicit override', async () => {
  await registry('alice').registerApp(info());
  await assert.rejects(registry('bob').registerApp(resolveAppInfo({ repository: 'bob/videos' })), /APP_ID/);
  await assertSucceeds(registry('bob').registerApp(resolveAppInfo({ repository: 'bob/videos', override: 'bob-videos' })));
});
test('public directory does not expose nested private application data', async () => {
  await setDoc(doc(db('alice'), 'users/alice/apps/videos/projects/p1/tasks/t1'), { private: true });
  await assertFails(getDoc(doc(db(null), 'users/alice/apps/videos/projects/p1/tasks/t1')));
  await assertFails(getDoc(doc(db('bob'), 'users/alice/apps/videos/projects/p1/tasks/t1')));
  await assertFails(getDocs(collection(db(null), 'users/alice/apps/videos/projects')));
  await assertFails(setDoc(doc(db('alice'), 'platform/settings'), { ownerUid: 'alice' }));
});
