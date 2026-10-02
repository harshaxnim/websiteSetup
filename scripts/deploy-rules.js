import { spawnSync } from 'node:child_process';
import { firebaseConfig, validateFirebaseConfig } from '../config/firebase-config.js';
validateFirebaseConfig(firebaseConfig);
const result = spawnSync('node_modules/.bin/firebase', ['deploy', '--only', 'firestore:rules', '--project', firebaseConfig.projectId], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
