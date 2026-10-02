import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { getFirebaseServices } from '../../lib/firebase.js';

// Official Auth emulator credential flow, confined to emulator tests. Production
// uses the Google popup. This avoids Google's external helper JS in these tests.
export async function signInEmulatedGoogle(email) {
  const { auth } = getFirebaseServices();
  if (!auth.emulatorConfig) throw new Error('Test credentials must never be used against live Firebase.');
  const token = JSON.stringify({ sub: email, email, name: email.split('@')[0], email_verified: true });
  return signInWithCredential(auth, GoogleAuthProvider.credential(token));
}
