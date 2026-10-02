import { test, expect } from '@playwright/test';
test('compiled app installs a scoped worker and supports offline editing at the Pages subpath', async ({ page, context }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('learning-tracker/');
  await expect(page.locator('.entry')).toHaveCount(1);
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel=manifest]');
    return { url: link.href, value: await (await fetch(link.href)).json() };
  });
  expect(new URL(manifest.value.start_url, manifest.url).pathname).toBe('/websiteSetup/learning-tracker/');
  expect(manifest.value.display).toBe('standalone');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe('/websiteSetup/learning-tracker/');
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.entry')).toHaveCount(1);
  // Chromium may report navigator.onLine=true for an offline navigation served
  // by a worker. Prove the network is unavailable instead of trusting that flag.
  expect(await page.evaluate(async () => {
    try { await fetch('../uncached-connectivity-check'); return true; } catch { return false; }
  })).toBe(false);
  await expect(page.locator('#save-status')).toContainText('Saved on this device');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Offline learning');
  await page.getByLabel('Links', { exact: true }).fill('https://example.com/');
  await page.getByLabel('Notes optional').fill('Added without a connection.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.reload();
  await expect(page.locator('.entry-title')).toHaveText(['Two videos to explore', 'Offline learning']);
  await page.getByRole('button', { name: 'Mark Offline learning done', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Open tools' }).click();
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^learning-tracker-.*\.json$/);
  const caches = await page.evaluate(async () => (await Promise.all((await window.caches.keys()).map(async key => (await (await window.caches.open(key)).keys()).map(request => request.url)))).flat());
  expect(caches.every(url => new URL(url).origin === 'http://127.0.0.1:4174')).toBe(true);
  expect(caches.some(url => /firestore|identitytoolkit|googleapis/.test(url))).toBe(false);
  expect(errors).toEqual([]);
});
