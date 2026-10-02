import { APP_ID, APP_DETAILS } from '../config/app-config.js';
import { resolveAppId } from './app-id.js';
import { getFirebaseServices } from './firebase.js';
import { getCurrentUser, onUserChanged as watchUser } from './auth.js';
import { createStorage } from './storage.js';
import { createAppRegistry } from './registry.js';
import { resolveAppInfo, TEMPLATE_REPOSITORY } from './app-info.js';

export { signIn, signOut, getCurrentUser } from './auth.js';
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

export const appInfo = resolveAppInfo({ repository: __APP_REPOSITORY__, override: APP_ID, details: APP_DETAILS, hostname: location.hostname, pathname: location.pathname });
let registry;
export function getAppRegistry() {
  if (!registry) registry = createAppRegistry({ db: getFirebaseServices().db, getUser: getCurrentUser });
  return registry;
}

export function onUserChanged(callback, onError) {
  return watchUser(user => {
    callback(user);
    // The first authenticated registration owns this app's directory record.
    // The template directory itself and local development are not registered.
    if (user && location.hostname.endsWith('.github.io') && appInfo.repository !== TEMPLATE_REPOSITORY) {
      const registry = getAppRegistry();
      registry.registerApp({ ...appInfo, status: 'live' })
        .catch(error => console.warn('App directory registration failed:', error.code || error.message));
    }
  }, onError);
}
