import { test, expect } from '@playwright/test';

test('signed-out users see the workspace and cannot save without authentication', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Start with an idea/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeEnabled();
  await expect(page.locator('#notice')).toBeHidden();
  await expect(page.getByRole('button', { name: /Save note/ })).toBeDisabled();
  await expect(page.locator('#app-identity')).toHaveText('LOCAL-APP');
});
test('mobile layout fits the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your notebook' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
