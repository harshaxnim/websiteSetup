import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig, validateFirebaseConfig } from '../config/firebase-config.js';

let services;
export function getFirebaseServices() {
  if (services) return services;
  const emulated = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
  const config = emulated ? {
    apiKey: 'demo-key', authDomain: 'demo-personal-apps.firebaseapp.com',
    projectId: 'demo-personal-apps', appId: 'demo-personal-apps-web',
  } : validateFirebaseConfig(firebaseConfig);
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (emulated) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  services = { app, auth, db };
  return services;
}
