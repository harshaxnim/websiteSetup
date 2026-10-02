// Shared public Web App configuration. Every repository created from this
// template inherits the same Firebase identity and storage infrastructure.
// No private keys, service-account credentials, or per-app environment variables.
export const firebaseConfig = {
  apiKey: 'AIzaSyCq1Fk4UCjdtrFrcRGnY8pgPSaIcraZge4',
  authDomain: 'gatewaybsite.firebaseapp.com',
  projectId: 'gatewaybsite',
  storageBucket: 'gatewaybsite.firebasestorage.app',
  messagingSenderId: '912975890626',
  appId: '1:912975890626:web:45929655a29e99fa5e535b',
  measurementId: 'G-QSRS1ESWZD',
};

export function validateFirebaseConfig(config) {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  if (!config || required.some(key => typeof config[key] !== 'string' || !config[key].trim())) {
    throw new Error('The shared Firebase platform has not been configured. The template owner must complete ONE_TIME_SETUP.md once.');
  }
  if (Object.values(config).some(value => typeof value === 'string' && /YOUR_|REPLACE_|<[^>]+>/.test(value))) {
    throw new Error('Firebase configuration contains placeholder values. Use the real public Web App configuration.');
  }
  return config;
}
