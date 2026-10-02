import { doc, collection, getDocs, onSnapshot, runTransaction, updateDoc, serverTimestamp } from 'firebase/firestore';
import { validateAppRecord, APP_STATUSES } from './app-info.js';

export function createAppRegistry({ db, getUser }) {
  const apps = collection(db, 'appDirectory');
  const rows = snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  function requireUser() {
    const user = getUser();
    if (!user?.uid) throw new Error('Sign in to manage the app directory.');
    return user;
  }
  return {
    async listApps() { return rows(await getDocs(apps)); },
    subscribeApps(callback, onError) { return onSnapshot(apps, snapshot => callback(rows(snapshot)), onError); },
    // Existing app status and metadata remain under the owner's control. Ordinary
    // visits/registration never reset manually paused/archived status or names.
    async registerApp(info) {
      const user = requireUser();
      validateAppRecord(info);
      const reference = doc(apps, info.appId);
      return runTransaction(db, async transaction => {
        const existing = await transaction.get(reference);
        if (getUser()?.uid !== user.uid) throw new Error('The signed-in user changed. Try again.');
        if (existing.exists()) {
          if (existing.data().repository !== info.repository) throw new Error('This APP_ID is already registered to another repository. Set a unique APP_ID override.');
          return { created: false, id: reference.id };
        }
        transaction.set(reference, {
          ...info, ownerUid: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        return { created: true, id: reference.id };
      });
    },
    async saveApp(info) {
      const user = requireUser();
      validateAppRecord(info);
      const reference = doc(apps, info.appId);
      return runTransaction(db, async transaction => {
        const existing = await transaction.get(reference);
        if (getUser()?.uid !== user.uid) throw new Error('The signed-in user changed. Try again.');
        if (existing.exists() && existing.data().ownerUid !== user.uid) throw new Error('Only this app’s owner can edit its directory record.');
        transaction.set(reference, {
          ...info,
          ownerUid: user.uid,
          createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true }); // Preserve metadata added by other app versions.
      });
    },
    async setStatus(appId, status) {
      requireUser();
      if (!APP_STATUSES.includes(status)) throw new Error('Choose a valid app status.');
      await updateDoc(doc(apps, appId), { status, updatedAt: serverTimestamp() });
    },
  };
}
