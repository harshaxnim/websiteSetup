import { test, expect } from '@playwright/test';
test('publisher connects a Firebase account and copies a credential only on explicit click without exposing it in the page', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/setup/publisher/');
  await expect(page.getByRole('button', { name: 'Copy publishing credential' })).toBeDisabled();
  await page.evaluate(async () => {
    const { signInEmulatedGoogle } = await import('/tests/emulator/sign-in-fixture.js');
    await signInEmulatedGoogle('publishing-owner@example.test');
  });
  await expect(page.locator('#account')).toContainText('publishing-owner@example.test');
  await expect(page.getByRole('button', { name: 'Copy publishing credential' })).toBeEnabled();
  await page.getByRole('button', { name: 'Copy publishing credential' }).click();
  await expect(page.locator('#notice')).toContainText('Credential copied');
  expect(await page.evaluate(async () => {
    const { getCurrentUser } = await import('/lib/platform.js');
    const credential = await navigator.clipboard.readText();
    return Boolean(credential) && credential === getCurrentUser().refreshToken && !document.body.innerText.includes(credential);
  })).toBe(true);
  await expect(page.locator('#secret-settings')).toHaveAttribute('href', 'https://github.com/harshaxnim/websiteSetup/settings/secrets/actions');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy publishing credential' })).toBeDisabled();
});
