// ============================================================
// Service Worker & PWA Tests
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp } = require('./helpers');

test.describe('PWA Service Worker', () => {
  test('app loads successfully (smoke test)', async ({ page }) => {
    await freshApp(page);
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
  });

  test('manifest.json is accessible and valid JSON', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    const body = await response.text();
    const manifest = JSON.parse(body);
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('start_url');
  });

  test('sw.js file is accessible', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);
  });
});
