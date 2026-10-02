import { test, expect } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { createCatalogueRegistrar } from '../../scripts/register-catalogue.js';
import { resolveAppInfo } from '../../lib/app-info.js';
test('setup-time Firestore creation appears automatically in the public catalogue without visiting or signing into the new app', async ({ page }) => {
  const info = resolveAppInfo({ repository: 'harshaxnim/setup-before-visit', details: { name: 'Created during setup', description: 'Registered before its first visitor.', themeColor: '#466a51' }, hostname: 'harshaxnim.github.io', pathname: '/setup-before-visit/' });
  await page.route(info.url, route => route.fulfill({ contentType: 'text/html', body: '<title>Setup app</title>' }));
  await page.route(info.iconUrl, route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
  await page.goto('/');
  const card = page.locator('.app-card').filter({ has: page.getByRole('heading', { name: 'Created during setup', exact: true }) });
  await expect(card).toHaveCount(0);
  const config = { apiKey: 'demo-key', projectId: 'demo-personal-apps', authDomain: 'demo-personal-apps.firebaseapp.com', appId: 'demo-personal-apps-web' };
  const app = initializeApp(config, 'setup-before-visit');
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  try {
    const result = await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'setup-browser-publisher', email: 'setup-browser-publisher@example.test', email_verified: true })));
    const registrar = createCatalogueRegistrar({ config, endpoints: { auth: 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1', token: 'http://127.0.0.1:9099/securetoken.googleapis.com/v1', firestore: 'http://127.0.0.1:8080/v1' } });
    await registrar.register({ schemaVersion: 1, repository: info.repository, template: info.template, apps: [info] }, { refreshToken: result.user.refreshToken });
    await expect(card).toContainText('Registered before its first visitor.');
    await expect(card).toHaveCSS('--app-theme', '#466a51');
    await expect(card.locator('.status-badge')).toHaveText('Live');
    await expect(card.getByRole('button', { name: /Manage/ })).toHaveCount(0);
    await page.reload();
    await expect(card).toContainText('Created during setup');
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
  } finally { await deleteApp(app); }
});
