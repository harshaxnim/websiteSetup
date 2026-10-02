import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readCatalogue, createCatalogueRegistrar } from './register-catalogue.js';
import { firebaseConfig } from '../config/firebase-config.js';
import { TEMPLATE_REPOSITORY } from '../lib/app-info.js';
function gh(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', error = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { error += data; });
    child.on('error', () => reject(new Error('GitHub CLI is required for shared registration. Use the environment’s existing GitHub connection.')));
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(error.trim() || 'GitHub registration request failed.')));
    child.stdin.end(input);
  });
}
async function main() {
  const catalogue = await readCatalogue();
  if (!catalogue.apps.length) return console.log('No application metadata to register.');
  if (process.env.FIREBASE_REFRESH_TOKEN || process.env.FIREBASE_ID_TOKEN) {
    const results = await createCatalogueRegistrar({ config: firebaseConfig }).register(catalogue, {
      refreshToken: process.env.FIREBASE_REFRESH_TOKEN, idToken: process.env.FIREBASE_ID_TOKEN,
    });
    for (const result of results) console.log(`${result.created ? 'Created' : 'Preserved'} appDirectory/${result.appId}`);
    return;
  }
  let central;
  for (const candidate of [TEMPLATE_REPOSITORY, 'harshaxnim/websiteSetup']) {
    try { central = JSON.parse(await gh(['api', `repos/${candidate}`])).full_name; break; }
    catch (error) { if (!error.message.includes('HTTP 404')) throw error; }
  }
  if (!central) throw new Error('The shared template registration repository could not be found.');
  if (Buffer.byteLength(JSON.stringify(catalogue)) > 50000) throw new Error('Catalogue metadata is too large for shared registration. Use a secure Firebase credential in the setup environment.');
  const requestId = randomUUID();
  await gh(['workflow', 'run', 'register-app.yml', '--repo', central, '--ref', 'main', '--json'], JSON.stringify({ catalogue: JSON.stringify(catalogue), request_id: requestId }));
  console.log('Requested shared Firebase registration. Waiting for the actual result…');
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const runs = JSON.parse(await gh(['run', 'list', '--repo', central, '--workflow', 'register-app.yml', '--limit', '30', '--json', 'databaseId,displayTitle,status,conclusion,url']));
    const run = runs.find(item => item.displayTitle.includes(requestId));
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`App registration failed: ${run.url}\nThe shared publisher must have FIREBASE_REFRESH_TOKEN configured once. No successful registration is being assumed.`);
      console.log(`App catalogue registration succeeded: ${run.url}`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  throw new Error('Registration did not complete before the timeout. Check the shared registration workflow before proceeding with setup.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
