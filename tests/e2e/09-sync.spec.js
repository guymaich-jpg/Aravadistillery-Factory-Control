// ============================================================
// Sync Tests: Cross-device real-time sync via Firestore
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin, logout } = require('./helpers');

test.describe('Sync Layer', () => {

  test('sync.js loads and exposes startSync/stopSync/mergeFirestoreIntoLocal', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const fns = await page.evaluate(() => ({
      startSync: typeof startSync === 'function',
      stopSync: typeof stopSync === 'function',
      mergeFirestoreIntoLocal: typeof mergeFirestoreIntoLocal === 'function',
      scheduleSyncRefresh: typeof scheduleSyncRefresh === 'function',
    }));

    expect(fns.startSync).toBe(true);
    expect(fns.stopSync).toBe(true);
    expect(fns.mergeFirestoreIntoLocal).toBe(true);
    expect(fns.scheduleSyncRefresh).toBe(true);
  });

  test('startSync is called on login', async ({ page }) => {
    await freshApp(page);

    await page.evaluate(() => {
      window._syncStarted = false;
      const orig = startSync;
      startSync = function() { window._syncStarted = true; return orig.apply(this, arguments); };
    });

    await loginAsAdmin(page);

    const started = await page.evaluate(() => window._syncStarted);
    expect(started).toBe(true);
  });

  test('stopSync is called on logout', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    await page.evaluate(() => {
      window._syncStopped = false;
      const orig = stopSync;
      stopSync = function() { window._syncStopped = true; return orig.apply(this, arguments); };
    });

    await logout(page);

    const stopped = await page.evaluate(() => window._syncStopped);
    expect(stopped).toBe(true);
  });

  test('mergeFirestoreIntoLocal adds new records to localStorage', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      localStorage.removeItem('factory_rawMaterials');
      const fbRecords = [
        { id: 'fb-001', date: '2026-01-01', weight: '10', createdAt: '2026-01-01T00:00:00Z', createdBy: 'yon' },
        { id: 'fb-002', date: '2026-01-02', weight: '20', createdAt: '2026-01-02T00:00:00Z', createdBy: 'yon' },
      ];
      mergeFirestoreIntoLocal('factory_rawMaterials', fbRecords);
      return JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]');
    });

    expect(result.length).toBe(2);
    expect(result.find(r => r.id === 'fb-001')).toBeTruthy();
    expect(result.find(r => r.id === 'fb-002')).toBeTruthy();
  });

  test('mergeFirestoreIntoLocal respects last-write-wins', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      const local = [{ id: 'rec-1', weight: '10', updatedAt: '2026-01-01T00:00:00Z', createdAt: '2025-12-01T00:00:00Z' }];
      localStorage.setItem('factory_rawMaterials', JSON.stringify(local));

      const fbRecords = [{ id: 'rec-1', weight: '99', updatedAt: '2026-05-01T00:00:00Z', createdAt: '2025-12-01T00:00:00Z' }];
      mergeFirestoreIntoLocal('factory_rawMaterials', fbRecords);

      return JSON.parse(localStorage.getItem('factory_rawMaterials'));
    });

    const rec = result.find(r => r.id === 'rec-1');
    expect(rec).toBeTruthy();
    expect(rec.weight).toBe('99');
  });

  test('mergeFirestoreIntoLocal preserves local-only records', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      const local = [{ id: 'local-only-1', weight: '5', createdAt: '2026-05-19T00:00:00Z' }];
      localStorage.setItem('factory_rawMaterials', JSON.stringify(local));

      const fbRecords = [{ id: 'fb-only-1', weight: '10', createdAt: '2026-05-19T01:00:00Z' }];
      mergeFirestoreIntoLocal('factory_rawMaterials', fbRecords);

      return JSON.parse(localStorage.getItem('factory_rawMaterials'));
    });

    expect(result.length).toBe(2);
    expect(result.find(r => r.id === 'local-only-1')).toBeTruthy();
    expect(result.find(r => r.id === 'fb-only-1')).toBeTruthy();
  });

  test('mergeFirestoreIntoLocal strips _fbId', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const hasFbId = await page.evaluate(() => {
      localStorage.removeItem('factory_rawMaterials');
      const fbRecords = [{ id: 'fb-003', _fbId: 'ABC123XYZ', weight: '15', createdAt: '2026-01-01T00:00:00Z' }];
      mergeFirestoreIntoLocal('factory_rawMaterials', fbRecords);
      const stored = JSON.parse(localStorage.getItem('factory_rawMaterials'));
      return stored.some(r => r._fbId !== undefined);
    });

    expect(hasFbId).toBe(false);
  });

  test('mergeFirestoreIntoLocal skips records without id', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const count = await page.evaluate(() => {
      const local = [{ id: 'existing-1', weight: '5', createdAt: '2026-01-01T00:00:00Z' }];
      localStorage.setItem('factory_rawMaterials', JSON.stringify(local));

      const fbRecords = [
        { id: 'valid-1', weight: '10', createdAt: '2026-01-02T00:00:00Z' },
        { weight: '999', createdAt: '2026-01-03T00:00:00Z' },
      ];
      mergeFirestoreIntoLocal('factory_rawMaterials', fbRecords);
      return JSON.parse(localStorage.getItem('factory_rawMaterials')).length;
    });

    expect(count).toBe(2);
  });

  test('scheduleSyncRefresh does NOT refresh during form editing', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await expect(page.locator('#field-supplier')).toBeVisible();

    await page.evaluate(() => {
      window._renderAppCalled = false;
      const orig = renderApp;
      renderApp = function() { window._renderAppCalled = true; return orig.apply(this, arguments); };
      window._renderAppCalled = false;
      scheduleSyncRefresh();
    });

    await page.waitForTimeout(1000);

    const called = await page.evaluate(() => window._renderAppCalled);
    expect(called).toBe(false);
  });

  test('scheduleSyncRefresh DOES refresh on list/dashboard view', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    await page.evaluate(() => {
      window._renderCount = 0;
      const orig = renderApp;
      renderApp = function() { window._renderCount++; return orig.apply(this, arguments); };
      scheduleSyncRefresh();
    });

    await page.waitForTimeout(1000);

    const count = await page.evaluate(() => window._renderCount);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('cross-context sync — record added externally appears in UI', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    await page.click('[data-nav="receiving"]');

    await page.evaluate(() => {
      const records = [{
        id: 'ext-001', supplier: 'sup_tamartushka', category: 'rm_cat_spices',
        item: 'Anise Seeds', weight: '5', createdAt: new Date().toISOString(), createdBy: 'yon',
      }];
      mergeFirestoreIntoLocal('factory_rawMaterials', records);
    });

    await page.waitForTimeout(800);

    await expect(page.locator('.record-item')).toBeVisible({ timeout: 3000 });
  });

  test('merge with empty Firestore preserves all local records', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const count = await page.evaluate(() => {
      const local = [
        { id: 'loc-1', weight: '1', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'loc-2', weight: '2', createdAt: '2026-01-02T00:00:00Z' },
      ];
      localStorage.setItem('factory_rawMaterials', JSON.stringify(local));
      mergeFirestoreIntoLocal('factory_rawMaterials', []);
      return JSON.parse(localStorage.getItem('factory_rawMaterials')).length;
    });

    expect(count).toBe(2);
  });

});
