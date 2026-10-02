import { test, expect } from '@playwright/test';

async function login(page, email) {
  await page.evaluate(async email => {
    const { signInEmulatedGoogle } = await import('/tests/emulator/sign-in-fixture.js');
    await signInEmulatedGoogle(email);
  }, email);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled();
}

test('mobile directory supports app creation, status management, search, public reading, and per-owner controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await login(page, 'directory-owner@example.test');
  await page.getByRole('button', { name: 'Add an app', exact: true }).click();
  await page.getByLabel('GitHub repository', { exact: true }).fill('harshaxnim/research-desk');
  await page.getByLabel('App ID', { exact: true }).fill('research-desk');
  await page.getByLabel('App name', { exact: true }).fill('Research Desk With A Particularly Long Name');
  await page.getByLabel('Description', { exact: true }).fill('Connect the dots across your reading.');
  await page.getByLabel('App URL', { exact: true }).fill('https://harshaxnim.github.io/research-desk/');
  await page.getByLabel('Status', { exact: true }).selectOption('development');
  await page.getByRole('button', { name: 'Save app', exact: true }).click();
  await expect(page.locator('#app-dialog')).not.toBeVisible();
  await expect(page.locator('.app-card')).toContainText('Research Desk');
  await expect(page.locator('.app-card .status-badge')).toHaveText('In development');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: /Manage Research Desk/ }).click();
  await expect(page.getByLabel('GitHub repository', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('Status', { exact: true }).selectOption('live');
  await page.getByRole('button', { name: 'Save app', exact: true }).click();
  await expect(page.locator('.app-card .status-badge')).toHaveText('Live');
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
});
