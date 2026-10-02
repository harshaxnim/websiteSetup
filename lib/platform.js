import { APP_ID } from '../config/app-config.js';
import { resolveAppId } from './app-id.js';
import { getFirebaseServices } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { createStorage } from './storage.js';

export { signIn, signOut, getCurrentUser, onUserChanged } from './auth.js';
export const appId = resolveAppId({ override: APP_ID, hostname: location.hostname, pathname: location.pathname });
let storage;
export function getStorage() {
  if (!storage) storage = createStorage({ db: getFirebaseServices().db, getUser: getCurrentUser, appId });
  return storage;
}
// Convenient state API; richer apps can use getStorage() for documents, queries,
// realtime subscriptions, and transactions without reconstructing namespaces.
export function loadState(defaultState) { return getStorage().loadState(defaultState); }
export function saveState(state) { return getStorage().saveState(state); }
