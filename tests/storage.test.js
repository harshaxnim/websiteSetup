import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { createStorage } from '../lib/storage.js';

let environment;
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-personal-apps',
    firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8') },
  });
});
after(async () => { await environment?.cleanup(); });
beforeEach(async () => { await environment.clearFirestore(); });
function store(uid = 'alice', appId = 'videos') {
  return createStorage({ db: environment.authenticatedContext(uid).firestore(), getUser: () => ({ uid }), appId });
}

test('simple state survives a fresh storage instance and does not mutate defaults', async () => {
  const defaults = { count: 0, tags: [] };
  const loaded = await store().loadState(defaults);
  loaded.tags.push('local');
  assert.deepEqual(defaults, { count: 0, tags: [] });
  await store().saveState({ count: 3, tags: ['saved'] });
  assert.deepEqual(await store().loadState(defaults), { count: 3, tags: ['saved'] });
});
test('structured nested documents support replacement, merge, and deletion', async () => {
  const s = store();
  assert.equal(await s.getDocument('projects/p1/settings/ui'), null);
  await s.setDocument('projects/p1/settings/ui', { theme: 'dark', size: 2 });
  await s.setDocument('projects/p1/settings/ui', { theme: 'light' }, { merge: true });
  assert.deepEqual(await s.getDocument('projects/p1/settings/ui'), { theme: 'light', size: 2 });
  await s.setDocument('projects/p1/settings/ui', { theme: 'dark' });
  assert.deepEqual(await s.getDocument('projects/p1/settings/ui'), { theme: 'dark' });
  await s.deleteDocument('projects/p1/settings/ui');
  assert.equal(await s.getDocument('projects/p1/settings/ui'), null);
});
test('collections return IDs and data with query ordering and limits', async () => {
  const s = store();
  const id = await s.addDocument('projects/p1/notes', { text: 'first', rank: 1 });
  await s.addDocument('projects/p1/notes', { text: 'second', rank: 2 });
  assert.deepEqual(await s.getDocument(`projects/p1/notes/${id}`), { text: 'first', rank: 1 });
  const rows = await s.getCollection('projects/p1/notes', { orderBy: [['rank', 'desc']], limit: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data.text, 'second');
  assert.equal((await s.getCollection('projects/p1/notes', { where: [['rank', '==', 1]] }))[0].id, id);
});
test('same UID keeps app data isolated', async () => {
  await store('alice', 'videos').saveState({ value: 'videos' });
  await store('alice', 'research-tool').saveState({ value: 'research' });
  assert.deepEqual(await store('alice', 'videos').loadState(), { value: 'videos' });
  assert.deepEqual(await store('alice', 'research-tool').loadState(), { value: 'research' });
});
test('same app keeps user data isolated', async () => {
  await store('alice').saveState({ value: 'alice' });
  await store('bob').saveState({ value: 'bob' });
  assert.deepEqual(await store('alice').loadState(), { value: 'alice' });
  assert.deepEqual(await store('bob').loadState(), { value: 'bob' });
});
test('rules deny another user direct reads, writes, and queries at arbitrary depth', async () => {
  const alice = environment.authenticatedContext('alice').firestore();
  const bob = environment.authenticatedContext('bob').firestore();
  for (const path of ['users/alice/apps/videos', 'users/alice/apps/videos/data/state', 'users/alice/apps/new-app/projects/p1/tasks/t1']) {
    await assertSucceeds(setDoc(doc(alice, path), { private: true }));
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(setDoc(doc(bob, path), { private: false }));
  }
  await assertFails(getDocs(collection(bob, 'users/alice/apps/videos/data')));
});
test('rules deny unauthenticated users and unrelated namespaces', async () => {
  const anonymous = environment.unauthenticatedContext().firestore();
  const alice = environment.authenticatedContext('alice').firestore();
  await assertFails(getDoc(doc(anonymous, 'users/alice/apps/videos/data/state')));
  await assertFails(setDoc(doc(anonymous, 'users/alice/apps/videos/data/state'), { value: 1 }));
  await assertFails(setDoc(doc(alice, 'public/doc'), { value: 1 }));
  await assertFails(setDoc(doc(alice, 'users/alice'), { value: 1 }));
});
test('storage refuses signed-out access, invalid path parity, and path traversal', async () => {
  const signedOut = createStorage({ db: environment.unauthenticatedContext().firestore(), getUser: () => null, appId: 'videos' });
  await assert.rejects(signedOut.loadState(), /Sign in/);
  const s = store();
  for (const path of ['', '/notes/a', 'notes//a', 'notes/../a', 'notes/a/', 'notes']) {
    await assert.rejects(s.getDocument(path));
  }
  await assert.rejects(s.getCollection('notes/a'));
  await assert.rejects(s.getCollection('notes', { limit: 0 }));
});
test('storage rechecks the current UID for each request', async () => {
  let user = { uid: 'alice' };
  const s = createStorage({ db: environment.authenticatedContext('alice').firestore(), getUser: () => user, appId: 'videos' });
  await s.saveState({ private: true });
  user = null;
  await assert.rejects(s.saveState({ private: false }), /Sign in/);
});
test('transactions update multiple scoped documents atomically', async () => {
  const s = store();
  await s.setDocument('data/count', { value: 1 });
  await s.transaction(async tx => {
    const count = await tx.get('data/count');
    tx.set('data/count', { value: count.value + 1 });
    tx.set('projects/p1', { ready: true });
  });
  assert.deepEqual(await s.getDocument('data/count'), { value: 2 });
  assert.deepEqual(await s.getDocument('projects/p1'), { ready: true });
});
test('realtime subscriptions receive document and collection updates', async () => {
  const s = store();
  const observed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Subscription timed out')); }, 10000);
    const unsubscribe = s.subscribeCollection('notes', rows => {
      if (rows.some(row => row.data.text === 'live')) { clearTimeout(timeout); unsubscribe(); resolve(rows); }
    }, reject);
  });
  await s.addDocument('notes', { text: 'live' });
  assert.equal((await observed).length, 1);
  const changed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Document subscription timed out')); }, 10000);
    const unsubscribe = s.subscribeDocument('settings/ui', data => {
      if (data?.theme === 'dark') { clearTimeout(timeout); unsubscribe(); resolve(data); }
    }, reject);
  });
  await s.setDocument('settings/ui', { theme: 'dark' });
  assert.deepEqual(await changed, { theme: 'dark' });
});
