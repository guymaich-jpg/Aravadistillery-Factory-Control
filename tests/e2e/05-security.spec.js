// ============================================================
// Security Tests: Access control, injection, session
// Desktop-only — these test JS logic, not viewport behavior
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsWorker, loginAsManager, loginAsAdmin, seedTestUsers, TEST_ADMIN } = require('./helpers');

test.describe('Security: Session Management', () => {
  test('cannot access app without login', async ({ page }) => {
    await freshApp(page);
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('.app-header')).not.toBeVisible();
  });

  test('clearing session redirects to login', async ({ page }) => {
    await freshApp(page);
    // Use CI test account (owner accounts require Firebase Auth, unavailable in CI)
    await seedTestUsers(page);
    await page.fill('#login-user', TEST_ADMIN.email);
    await page.fill('#login-pass', TEST_ADMIN.password);
    await page.click('#login-btn');
    await expect(page.locator('.app-header')).toBeVisible();

    await page.evaluate(() => localStorage.removeItem('factory_session'));
    await page.reload();
    await expect(page.locator('#login-btn')).toBeVisible();
  });
});

test.describe('Security: Permission Enforcement', () => {
  test('worker permissions are enforced at code level', async ({ page }) => {
    await freshApp(page);
    await loginAsWorker(page);

    const permissions = await page.evaluate(() => {
      if (typeof hasPermission !== 'function') return 'n/a';
      return {
        backoffice: hasPermission('canAccessBackoffice'),
        delete: hasPermission('canDeleteRecords'),
        export: hasPermission('canExportData'),
      };
    });
    expect(permissions.backoffice).toBe(false);
    expect(permissions.delete).toBe(false);
    expect(permissions.export).toBe(false);
  });
});

test.describe('Security: Input Handling', () => {
  test('login error message does not execute scripts', async ({ page }) => {
    await freshApp(page);
    await page.fill('#login-user', '<script>alert(1)</script>');
    await page.fill('#login-pass', 'whatever');
    await page.click('#login-btn');
    const errorText = await page.locator('#login-error').textContent();
    expect(errorText).not.toContain('<script>');
    await expect(page.locator('.app-header')).not.toBeVisible();
  });

  test('request access rejects existing user email', async ({ page }) => {
    await freshApp(page);
    await page.click('#go-request');
    await page.fill('#req-name', 'Copy');
    // guymaich@gmail.com is a known owner account in DEFAULT_USERS
    await page.fill('#req-email', 'guymaich@gmail.com');
    await page.click('#req-btn');
    await expect(page.locator('#req-error')).not.toBeEmpty();
  });
});

test.describe('Security: Backward Compatibility', () => {
  test('app handles corrupted or missing localStorage gracefully', async ({ page }) => {
    // Empty localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#login-btn')).toBeVisible();

    // Corrupted session
    await page.evaluate(() => localStorage.setItem('factory_session', '{invalid json}'));
    await page.reload();
    await expect(page.locator('#login-btn')).toBeVisible();

    // Corrupted user data
    await page.evaluate(() => localStorage.setItem('factory_users', '{invalid json}'));
    await page.reload();
    await expect(page.locator('#login-btn')).toBeVisible();
  });
});
