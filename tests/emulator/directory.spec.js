import { test, expect } from '@playwright/test';

async function login(page, email) {
  await page.evaluate(async email => {
    const { signInEmulatedGoogle } = await import('/tests/emulator/sign-in-fixture.js');
    await signInEmulatedGoogle(email);
  }, email);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled();
}

test('mobile directory supports branded apps, client page checks, public reading, and per-owner controls', async ({ page }) => {
  let liveStatus = 503;
  let pageRequests = 0;
  await page.route('https://harshaxnim.github.io/research-desk/', route => {
    pageRequests++;
    return route.fulfill({ status: liveStatus, contentType: 'text/html', body: '<title>Research Desk</title>' });
  });
  await page.route('https://harshaxnim.github.io/research-desk/icon.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1e7c86"/></svg>' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await login(page, 'directory-owner@example.test');
  await page.getByRole('button', { name: 'Add app', exact: true }).click();
  await page.getByLabel('GitHub repository', { exact: true }).fill('harshaxnim/research-desk');
  await page.getByLabel('GitHub repository', { exact: true }).press('Tab');
  await expect(page.getByLabel('App ID', { exact: true })).toHaveValue('research-desk');
  await page.getByLabel('App ID', { exact: true }).fill('research-desk');
  await page.getByLabel('App name', { exact: true }).fill('Research Desk With A Particularly Long Name');
  await page.getByLabel('Description', { exact: true }).fill('Connect the dots across your reading.');
  await page.getByLabel('App URL', { exact: true }).fill('https://harshaxnim.github.io/research-desk/');
  await page.getByLabel('Icon URL', { exact: true }).fill('https://harshaxnim.github.io/research-desk/icon.svg');
  await page.getByLabel('Theme color', { exact: true }).fill('#1e7c86');
  await page.getByLabel('Status', { exact: true }).selectOption('development');
  await page.getByLabel('Icon URL', { exact: true }).fill('http://example.com/icon.svg');
  await page.getByRole('button', { name: 'Save app', exact: true }).click();
  await expect(page.locator('#form-error')).toContainText('HTTPS');
  await expect(page.locator('#app-dialog')).toBeVisible();
  await page.getByLabel('Icon URL', { exact: true }).fill('https://harshaxnim.github.io/research-desk/icon.svg');
  await page.getByRole('button', { name: 'Save app', exact: true }).click();
  await expect(page.locator('#app-dialog')).not.toBeVisible();
  await expect(page.locator('.app-card')).toContainText('Research Desk');
  await expect(page.locator('.app-card .status-badge')).toHaveText('In development');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // Ownership rules allow metadata through; display code must remain safe.
  await page.evaluate(async () => {
    const { updateEmulatedAppMetadata } = await import('/tests/emulator/sign-in-fixture.js');
    await updateEmulatedAppMetadata('research-desk', { themeColor: 'red;position:fixed', iconUrl: 'javascript:alert(1)', updatedAt: { toDate: 'invalid' }, tags: ['research'], release: { version: '1.0' } });
  });
  await expect(page.locator('.app-card')).toHaveCSS('--app-theme', '#b97053');
  await expect(page.locator('.app-card .app-icon img')).toHaveCount(0);
  await expect(page.locator('.app-card .card-date')).toHaveText('New to the ecosystem');
  await page.getByRole('button', { name: /Manage Research Desk/ }).click();
  await expect(page.getByLabel('GitHub repository', { exact: true })).not.toHaveAttribute('readonly', '');
  await expect(page.getByLabel('App ID', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('Status', { exact: true }).selectOption('live');
  await page.getByLabel('Theme color', { exact: true }).fill('#1e7c86');
  await page.getByLabel('Icon URL', { exact: true }).fill('https://harshaxnim.github.io/research-desk/icon.svg');
  await page.getByRole('button', { name: 'Save app', exact: true }).click();
  await expect(page.locator('.app-card .status-badge')).toHaveText('Unavailable');
  const extraMetadata = await page.evaluate(async () => {
    const { getAppRegistry } = await import('/lib/platform.js');
    const record = (await getAppRegistry().listApps()).find(app => app.appId === 'research-desk');
    return { tags: record.tags, release: record.release };
  });
  expect(extraMetadata).toEqual({ tags: ['research'], release: { version: '1.0' } });
  await expect(page.locator('.app-card .page-result')).toHaveText('Page returned HTTP 503');
  liveStatus = 200;
  await expect(page.getByRole('button', { name: 'Check pages' })).toBeEnabled();
  await page.getByRole('button', { name: 'Check pages' }).click();
  await expect(page.locator('.app-card .status-badge')).toHaveText('Live');
  await expect(page.locator('.app-card .app-icon img')).toHaveAttribute('src', 'https://harshaxnim.github.io/research-desk/icon.svg');
  await expect(page.locator('.app-card')).toHaveCSS('--app-theme', '#1e7c86');
  expect(pageRequests).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('link', { name: 'Open app', exact: true })).toHaveAttribute('href', 'https://harshaxnim.github.io/research-desk/');
  await page.getByRole('searchbox', { name: 'Search apps' }).fill('no-such-app');
  await expect(page.getByRole('heading', { name: 'No apps match this view.' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search apps' }).fill('');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.app-card')).toContainText('Research Desk');
  await expect(page.getByRole('button', { name: /Manage Research Desk/ })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.app-card')).toContainText('Research Desk');
  await login(page, 'directory-other@example.test');
  await expect(page.getByRole('button', { name: /Manage Research Desk/ })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/appspace-directory-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  await page.screenshot({ path: '/tmp/appspace-directory-desktop.png', fullPage: true });
});
