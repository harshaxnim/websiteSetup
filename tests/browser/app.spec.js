import { test, expect } from '@playwright/test';

test('signed-out users see the workspace and cannot save without authentication', async ({ page }) => {
  await page.goto('/examples/notebook/');
  await expect(page.getByRole('heading', { name: /Start with an idea/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeEnabled();
  await expect(page.locator('#notice')).toBeHidden();
  await expect(page.getByRole('button', { name: /Save note/ })).toBeDisabled();
  await expect(page.locator('#app-identity')).toHaveText('LOCAL-APP');
});
test('directory works on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Apps', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Small ideas/ })).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search apps' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await expect(page.locator('#add-app')).toBeHidden();
});
