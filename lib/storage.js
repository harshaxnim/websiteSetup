import {
  doc, collection, getDoc, setDoc, deleteDoc, getDocs, addDoc,
  query, where, orderBy, limit, onSnapshot, runTransaction,
} from 'firebase/firestore';
import { validateAppId } from './app-id.js';

function pathSegments(path, type) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.endsWith('/')) {
    throw new Error('Storage paths must be nonempty relative paths.');
  }
  const segments = path.split('/');
  if (segments.some(part => !part || part === '.' || part === '..')) {
    throw new Error('Storage paths cannot contain empty or traversal segments.');
  }
  if ((segments.length % 2 === 0) !== (type === 'document')) {
    throw new Error(`${type === 'document' ? 'Document' : 'Collection'} path has the wrong number of segments.`);
  }
  return segments;
}

// Injectable services let tests exercise exactly the API apps use.
export function createStorage({ db, getUser, appId }) {
  validateAppId(appId);
  function scope() {
    const user = getUser();
    if (!user?.uid) throw new Error('Sign in before reading or writing application data.');
    return ['users', user.uid, 'apps', appId];
  }
  function documentRef(path) { return doc(db, ...scope(), ...pathSegments(path, 'document')); }
  function collectionRef(path) { return collection(db, ...scope(), ...pathSegments(path, 'collection')); }
  function collectionQuery(path, options = {}) {
    const constraints = [];
    for (const [field, operator, value] of options.where ?? []) constraints.push(where(field, operator, value));
    for (const [field, direction = 'asc'] of options.orderBy ?? []) constraints.push(orderBy(field, direction));
    if (options.limit !== undefined) {
      if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error('Query limit must be a positive integer.');
      constraints.push(limit(options.limit));
    }
    return query(collectionRef(path), ...constraints);
  }
  return {
    async getDocument(path) {
      const snapshot = await getDoc(documentRef(path));
      return snapshot.exists() ? snapshot.data() : null;
    },
    async setDocument(path, data, options = { merge: false }) { await setDoc(documentRef(path), data, options); },
    async deleteDocument(path) { await deleteDoc(documentRef(path)); },
    async loadState(defaultState = {}) {
      const snapshot = await getDoc(documentRef('data/state'));
      return snapshot.exists() ? snapshot.data().value : structuredClone(defaultState);
    },
    async saveState(state) { await setDoc(documentRef('data/state'), { value: state }); },
    async getCollection(path, options) {
      const snapshot = await getDocs(collectionQuery(path, options));
      return snapshot.docs.map(item => ({ id: item.id, data: item.data() }));
    },
    async addDocument(path, data) { return (await addDoc(collectionRef(path), data)).id; },
    subscribeDocument(path, callback, onError) {
      return onSnapshot(documentRef(path), snapshot => callback(snapshot.exists() ? snapshot.data() : null), onError);
    },
    subscribeCollection(path, callback, onError, options) {
      return onSnapshot(collectionQuery(path, options), snapshot => {
        callback(snapshot.docs.map(item => ({ id: item.id, data: item.data() })));
      }, onError);
    },
    // For atomic updates, the callback receives only scoped document operations.
    transaction(callback) {
      const uid = getUser()?.uid;
      return runTransaction(db, transaction => callback({
        async get(path) {
          const snapshot = await transaction.get(documentRef(path));
          if (getUser()?.uid !== uid) throw new Error('The signed-in user changed during the transaction.');
          return snapshot.exists() ? snapshot.data() : null;
        },
        set(path, data, options = { merge: false }) {
          if (getUser()?.uid !== uid) throw new Error('The signed-in user changed during the transaction.');
          transaction.set(documentRef(path), data, options);
        },
        delete(path) {
          if (getUser()?.uid !== uid) throw new Error('The signed-in user changed during the transaction.');
          transaction.delete(documentRef(path));
        },
      }));
    },
  };
}
