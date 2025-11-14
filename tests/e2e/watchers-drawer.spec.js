import { test, expect } from '@playwright/test';

test.describe('watchers drawer', () => {
  test('shows default watcher labels and ids after opening the menu', async ({ page }) => {
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const drawer = page.locator('.q-drawer');
    await expect(drawer.getByText('目前監看點')).toBeVisible();
    await expect(drawer.getByText('中午', { exact: true })).toBeVisible();
    await expect(drawer.getByText('ID: 894299')).toBeVisible();
    await expect(drawer.getByText('晚上', { exact: true })).toBeVisible();
    await expect(drawer.getByText('ID: 995714')).toBeVisible();
  });
});
