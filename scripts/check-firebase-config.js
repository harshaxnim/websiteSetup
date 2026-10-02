import { firebaseConfig, validateFirebaseConfig } from '../config/firebase-config.js';
try {
  validateFirebaseConfig(firebaseConfig);
  console.log(`Public Firebase Web configuration is present for ${firebaseConfig.projectId}. Live auth/database readiness must be verified separately.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
