import { APP_ID, APP_DETAILS } from '../config/app-config.js';
import { resolveAppId } from './app-id.js';
import { getFirebaseServices } from './firebase.js';
import { signIn, signOut, getCurrentUser, onUserChanged as watchUser } from './auth.js';
import { createStorage } from './storage.js';
import { createAppRegistry } from './registry.js';
import { resolveAppInfo } from './app-info.js';

export { signIn, signOut, getCurrentUser };
export const appId = resolveAppId({ override: APP_ID, hostname: location.hostname, pathname: location.pathname });
let storage;
export function getStorage() {
  if (!storage) storage = createStorage({ db: getFirebaseServices().db, getUser: getCurrentUser, appId });
  return storage;
}
// Multiple apps can share a static site while keeping separate private data.
// Apps still use the same auth and registry services as generated repositories.
export function createAppPlatform({ appId: id, details, repository = __APP_REPOSITORY__ }) {
  const info = resolveAppInfo({ repository, override: id, details, hostname: location.hostname, pathname: location.pathname });
  const scopedStorage = createStorage({ db: getFirebaseServices().db, getUser: getCurrentUser, appId: info.appId });
  return {
    appInfo: info,
    getStorage: () => scopedStorage,
    signIn, signOut, getCurrentUser,
    onUserChanged(callback, onError) {
      return watchUser(callback, onError);
    },
  };
}
// Convenient state API; richer apps can use getStorage() for documents, queries,
// realtime subscriptions, and transactions without reconstructing namespaces.
export function loadState(defaultState) { return getStorage().loadState(defaultState); }
export function saveState(state) { return getStorage().saveState(state); }

export const appInfo = resolveAppInfo({ repository: __APP_REPOSITORY__, override: APP_ID, details: APP_DETAILS, hostname: location.hostname, pathname: location.pathname });
let registry;
export function getAppRegistry() {
  if (!registry) registry = createAppRegistry({ db: getFirebaseServices().db, getUser: getCurrentUser });
  return registry;
}

export function onUserChanged(callback, onError) {
  // Catalogue ownership is established by template setup, before visitors use
  // the app. Signing in for private data must not claim an unregistered app.
  return watchUser(callback, onError);
}
