import { test, expect } from '@playwright/test';

async function signIn(page, email) {
  await page.evaluate(async email => {
    const { signInEmulatedGoogle } = await import('/tests/emulator/sign-in-fixture.js');
    await signInEmulatedGoogle(email);
  }, email);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  await expect(page.locator('#storage-status')).toContainText('Your private notebook is ready');
}

test('Google emulator sign-in, write, reload, sign-out, and second-user isolation', async ({ page }) => {
  page.on('requestfailed', request => console.error('Browser request failed:', request.url().split('?')[0], request.failure()?.errorText));
  page.on('pageerror', error => console.error('Browser exception:', error.message));
  await page.goto('/');
  await signIn(page, 'alice@example.test');
  await page.getByLabel('Title', { exact: true }).fill('A reusable platform');
  await page.getByLabel('Note', { exact: true }).fill('<script>this must remain text</script>');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.locator('.note-card')).toContainText('A reusable platform');
  await expect(page.locator('.note-card')).toContainText('<script>this must remain text</script>');
  await expect(page.locator('#composer-hint')).toHaveText('Saved to your notebook.');
  await page.reload();
  await expect(page.locator('.note-card')).toContainText('A reusable platform');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.note-card')).toHaveCount(0);
  await expect(page.getByLabel('Title', { exact: true })).toBeDisabled();
  await signIn(page, 'bob@example.test');
  await expect(page.locator('.note-card')).toHaveCount(0);
  await page.getByLabel('Title', { exact: true }).fill('Bob private note');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.locator('.note-card')).toContainText('Bob private note');
  await expect(page.locator('#composer-hint')).toHaveText('Saved to your notebook.');
  await page.getByRole('button', { name: /Delete Bob private note/ }).click();
  await expect(page.locator('.note-card')).toHaveCount(0);
});
