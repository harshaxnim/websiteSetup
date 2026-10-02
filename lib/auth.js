import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseServices } from './firebase.js';

const provider = new GoogleAuthProvider();
export function signIn() {
  return signInWithPopup(getFirebaseServices().auth, provider).then(result => result.user);
}
export function signOut() {
  return firebaseSignOut(getFirebaseServices().auth);
}
export function getCurrentUser() {
  return getFirebaseServices().auth.currentUser;
}
// Firebase's default browser persistence survives reloads. The initial callback
// waits for persistence restoration; use it before making storage requests.
// Returns an unsubscribe function.
export function onUserChanged(callback, onError) {
  return onAuthStateChanged(getFirebaseServices().auth, callback, onError);
}
