// Shared helpers for all e2e tests
const { expect } = require('@playwright/test');

// Test users — seeded into localStorage for role-specific tests.
// These are CI-only accounts with non-production credentials.
const TEST_ADMIN = {
  username: 'testadmin',
  password: 'Admin123',
  email: 'testadmin@test.com',
  role: 'admin',
  name: 'Test Admin',
  nameHe: 'מנהל בדיקה',
  status: 'active',
};

const TEST_MANAGER = {
  username: 'testmanager',
  password: 'manager123',
  email: 'testmanager@test.com',
  role: 'manager',
  name: 'Test Manager',
  nameHe: 'מנהל בדיקה',
  status: 'active',
};

const TEST_WORKER = {
  username: 'testworker',
  password: 'Worker123',
  email: 'testworker@test.com',
  role: 'worker',
  name: 'Test Worker',
  nameHe: 'עובד בדיקה',
  status: 'active',
};

// Fake per-env config served to the app in place of /api/env.js.
// The sync URL must stay on script.google.com to satisfy the app's CSP
// connect-src; Playwright intercepts it before any real request leaves.
const E2E_SHEETS_SYNC_URL = 'https://script.google.com/macros/s/E2E-FAKE-ENDPOINT/exec';
const E2E_INVENTORY_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/14rYu6QgRD2r4X4ZjOs45Rqtl4p0XOPvJfcs5BpY54EE/edit?gid=1634965365#gid=1634965365';

/**
 * Clear app state (localStorage) and navigate to the app.
 *
 * Tests run HERMETICALLY: the Firebase SDK network load is blocked so the app
 * falls back to its localStorage-only path. This isolates the suite from the
 * shared production Firestore — previously the app connected to prod on load,
 * hydrated real records into localStorage, and tests saw accumulated prod data
 * (e.g. `.record-item` resolving to 20 elements) → flaky, order-dependent
 * failures, and test runs polluting production. Blocking the SDK makes every
 * test deterministic and side-effect-free. Must be registered before goto().
 */
async function freshApp(page) {
  await page.route(/gstatic\.com\/firebasejs/, route => route.abort());
  // Stub /api/env.js instead of aborting it: the client reads the Sheets URLs
  // from window.__FC_CONFIG__ (per-env config), so tests provide a fake sync
  // endpoint (routed below — nothing leaves the browser) and the expected
  // sheet link. Firebase keys stay empty → localStorage-only path, as before.
  await page.route('**/api/env*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.__FC_CONFIG__ = ${JSON.stringify({
      environment: 'development',
      sheetsSyncUrl: E2E_SHEETS_SYNC_URL,
      inventorySheetUrl: E2E_INVENTORY_SHEET_URL,
    })};`,
  }));
  // Fake Sheets endpoint — sync POSTs/GETs succeed hermetically (no real
  // spreadsheet writes; the old live test wrote marker rows into prod).
  await page.route('**/script.google.com/macros/s/E2E-FAKE-ENDPOINT/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"ok":true}',
  }));
  await page.goto('/');
  // Tear down any service worker + caches first: the PWA's SW can serve a
  // cached Firebase SDK past the network route above, letting the app connect
  // to prod and hydrate real records. Unregister it and clear caches so the
  // block is airtight and each test starts from a truly empty state.
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith('factory_'))
      .forEach(k => localStorage.removeItem(k));
  });
  await page.reload();
}

/**
 * Seed test admin, manager, and worker users into localStorage (after freshApp)
 */
async function seedTestUsers(page) {
  await page.evaluate(([adm, mgr, wrk]) => {
    const existing = JSON.parse(localStorage.getItem('factory_users') || 'null') || [];
    const toAdd = [adm, mgr, wrk].filter(u => !existing.find(e => e.username === u.username));
    localStorage.setItem('factory_users', JSON.stringify([...existing, ...toAdd]));
  }, [TEST_ADMIN, TEST_MANAGER, TEST_WORKER]);
}

/**
 * Login with given credentials (email or username)
 */
async function login(page, emailOrUser, password) {
  await page.fill('#login-user', emailOrUser);
  await page.fill('#login-pass', password);
  await page.click('#login-btn');
  await expect(page.locator('.app-header')).toBeVisible({ timeout: 5000 });
}

/**
 * Login as admin (full access) — uses seeded CI test account (no real credentials)
 */
async function loginAsAdmin(page) {
  await seedTestUsers(page);
  return login(page, TEST_ADMIN.email, TEST_ADMIN.password);
}

/**
 * Login as manager — seeds test manager user first
 */
async function loginAsManager(page) {
  await seedTestUsers(page);
  return login(page, TEST_MANAGER.email, TEST_MANAGER.password);
}

/**
 * Login as worker — seeds test worker user first
 */
async function loginAsWorker(page) {
  await seedTestUsers(page);
  return login(page, TEST_WORKER.email, TEST_WORKER.password);
}

/**
 * Logout
 */
async function logout(page) {
  await page.click('#logout-btn');
  await expect(page.locator('#login-btn')).toBeVisible({ timeout: 3000 });
}

module.exports = {
  freshApp, login, loginAsAdmin, loginAsManager, loginAsWorker, logout, seedTestUsers,
  TEST_ADMIN, TEST_MANAGER, TEST_WORKER,
  E2E_SHEETS_SYNC_URL, E2E_INVENTORY_SHEET_URL,
};
