// ============================================================
// Auth Tests: Login, Logout, Request Access, Session
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin, loginAsManager, loginAsWorker, logout } = require('./helpers');

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
  });

  test('shows login screen by default', async ({ page }) => {
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('.login-screen')).toBeVisible();
  });

  test('rejects wrong password', async ({ page }) => {
    await page.fill('#login-user', 'nobody@example.com');
    await page.fill('#login-pass', 'wrongpassword');
    await page.click('#login-btn');
    await expect(page.locator('#login-error')).not.toBeEmpty();
    await expect(page.locator('.app-header')).not.toBeVisible();
  });

  test('rejects empty credentials', async ({ page }) => {
    await page.click('#login-btn');
    await expect(page.locator('.app-header')).not.toBeVisible();
  });

  test('admin can login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.user-badge')).toBeVisible();
  });

  test('manager can login', async ({ page }) => {
    await loginAsManager(page);
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('worker can login', async ({ page }) => {
    await loginAsWorker(page);
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('logout clears session and returns to login', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('.app-header')).not.toBeVisible();
  });

  test('Enter key submits login form', async ({ page }) => {
    await page.fill('#login-user', 'guymaich@gmail.com');
    await page.fill('#login-pass', 'Guy1234');
    await page.press('#login-pass', 'Enter');
    await expect(page.locator('.app-header')).toBeVisible({ timeout: 5000 });
  });

  test('can request access', async ({ page }) => {
    await page.click('#go-request');
    await expect(page.locator('#req-btn')).toBeVisible();
    await page.fill('#req-name', 'New User');
    await page.fill('#req-email', 'newuser@example.com');
    await page.click('#req-btn');
    await expect(page.locator('#req-success')).not.toBeEmpty();
  });

  test('request access rejects empty fields', async ({ page }) => {
    await page.click('#go-request');
    await page.click('#req-btn');
    await expect(page.locator('#req-error')).not.toBeEmpty();
  });

  test('request access rejects duplicate pending email', async ({ page }) => {
    // First request
    await page.click('#go-request');
    await page.fill('#req-name', 'First Request');
    await page.fill('#req-email', 'duplicate@example.com');
    await page.click('#req-btn');
    await expect(page.locator('#req-success')).not.toBeEmpty();

    // Go back and try same email again
    await page.click('#go-login');
    await page.click('#go-request');
    await page.fill('#req-name', 'Second Request');
    await page.fill('#req-email', 'duplicate@example.com');
    await page.click('#req-btn');
    await expect(page.locator('#req-error')).not.toBeEmpty();
  });

  test('session persists on page reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload();
    await expect(page.locator('.app-header')).toBeVisible();
  });
});
