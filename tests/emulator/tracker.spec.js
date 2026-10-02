import { test, expect } from '@playwright/test';
async function login(page, email) {
  await page.evaluate(async email => {
    const { signInEmulatedGoogle } = await import('/tests/emulator/sign-in-fixture.js');
    await signInEmulatedGoogle(email);
  }, email);
  await expect(page.locator('#save-status')).toHaveText('Synced · Your private list');
}
async function add(page, title) {
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Links', { exact: true }).fill('https://example.com/');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
}
async function logout(page) {
  await page.getByRole('button', { name: 'Open tools' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#save-status')).toContainText('Saved on this device');
}
test('guest migration, cloud sync, reload, separate accounts and nested app storage', async ({ page, browser }) => {
  await page.goto('/learning-tracker/');
  await add(page, 'Guest learning');
  await login(page, 'tracker-alice@example.test');
  await expect(page.locator('.entry-title')).toContainText(['Two videos to explore', 'Guest learning']);
  await add(page, 'Alice private learning');
  await expect(page.locator('#save-status')).toHaveText('Synced · Your private list');
  await page.reload();
  await expect(page.locator('.entry-title')).toHaveText(['Two videos to explore', 'Guest learning', 'Alice private learning']);
  await expect(page.locator('#save-status')).toHaveText('Synced · Your private list');
  await page.context().setOffline(true);
  await add(page, 'Offline private draft');
  await expect(page.locator('#save-status')).toContainText('Offline');
  await page.context().setOffline(false);
  await expect(page.locator('#save-status')).toHaveText('Synced · Your private list');
  const context2 = await browser.newContext(); const otherDevice = await context2.newPage();
  await otherDevice.goto('http://127.0.0.1:4173/learning-tracker/');
  await login(otherDevice, 'tracker-alice@example.test');
  await expect(otherDevice.locator('.entry-title')).toHaveText(['Two videos to explore', 'Guest learning', 'Alice private learning', 'Offline private draft']);
  await context2.close();
  await logout(page);
  await expect(page.locator('.entry-title')).toHaveText(['Two videos to explore', 'Guest learning']);
  await login(page, 'tracker-bob@example.test');
  await expect(page.locator('.entry-title')).toHaveText(['Two videos to explore', 'Guest learning']);
  await add(page, 'Bob private learning');
  await expect(page.locator('#save-status')).toHaveText('Synced · Your private list');
  await logout(page);
  await login(page, 'tracker-alice@example.test');
  await expect(page.locator('.entry-title')).toHaveText(['Two videos to explore', 'Guest learning', 'Alice private learning', 'Offline private draft']);
  // The other app's namespace remains separate for the same authenticated UID.
  await page.goto('/examples/notebook/');
  await expect(page.locator('#storage-status')).toContainText('Your private notebook is ready');
  await expect(page.locator('.note-card')).toHaveCount(0);
});
