// ============================================================
// Firestore Sync: cross-user data synchronization
// Tests that the sync layer merges data correctly, preserves
// local records, and renders deleted records with visual styling.
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin, loginAsManager } = require('./helpers');

test.describe('Firestore Sync: merge logic', () => {
  test('syncFromFirestore and onModuleChange functions exist after app load', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const fnExists = await page.evaluate(() => ({
      initFirestoreSync: typeof initFirestoreSync === 'function',
      onModuleChange: typeof onModuleChange === 'function',
      _mergeFirestoreIntoLocal: typeof _mergeFirestoreIntoLocal === 'function',
    }));
    expect(fnExists.initFirestoreSync).toBe(true);
    expect(fnExists.onModuleChange).toBe(true);
    expect(fnExists._mergeFirestoreIntoLocal).toBe(true);
  });

  test('merge adds new Firestore records to localStorage without duplicating existing ones', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      // Seed localStorage with one local record
      const localRecord = {
        id: 'local-001',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        supplier: 'sup_lara',
        item: 'Anise Seeds',
        weight: '10',
        createdBy: 'admin',
      };
      localStorage.setItem('factory_rawMaterials', JSON.stringify([localRecord]));

      // Simulate a Firestore snapshot with the same record + a new one
      const firestoreRecords = [
        { ...localRecord }, // same id — should not duplicate
        {
          id: 'remote-001',
          createdAt: new Date().toISOString(),
          supplier: 'sup_dates',
          item: 'Dates',
          weight: '20',
          createdBy: 'yonatan',
        },
      ];

      const changed = _mergeFirestoreIntoLocal('factory_rawMaterials', firestoreRecords);
      const merged = JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]');
      return { changed, count: merged.length, ids: merged.map(r => r.id) };
    });

    expect(result.changed).toBe(true);
    expect(result.count).toBe(2);
    expect(result.ids).toContain('local-001');
    expect(result.ids).toContain('remote-001');
  });

  test('merge picks newer record when both local and Firestore have same id', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      const oldTime = new Date(Date.now() - 120000).toISOString();
      const newTime = new Date().toISOString();

      // Local has older version
      localStorage.setItem('factory_rawMaterials', JSON.stringify([
        { id: 'rec-001', createdAt: oldTime, item: 'Old Item', weight: '5' },
      ]));

      // Firestore has newer version
      _mergeFirestoreIntoLocal('factory_rawMaterials', [
        { id: 'rec-001', createdAt: oldTime, updatedAt: newTime, item: 'Updated Item', weight: '15' },
      ]);

      const merged = JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]');
      return { item: merged[0]?.item, weight: merged[0]?.weight };
    });

    expect(result.item).toBe('Updated Item');
    expect(result.weight).toBe('15');
  });

  test('local-only records are preserved when not in Firestore', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      // Local has a recent record not yet in Firestore (in-flight)
      const recentRecord = {
        id: 'inflight-001',
        createdAt: new Date().toISOString(), // just created
        item: 'Fresh Record',
        weight: '1',
      };
      localStorage.setItem('factory_rawMaterials', JSON.stringify([recentRecord]));

      // Firestore returns empty — this record hasn't synced yet
      _mergeFirestoreIntoLocal('factory_rawMaterials', []);

      const merged = JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]');
      return { count: merged.length, preserved: merged[0]?.id === 'inflight-001', deleted: merged[0]?._deleted };
    });

    // Very recent records (< 15s) should NOT be marked as deleted
    expect(result.count).toBe(1);
    expect(result.preserved).toBe(true);
    expect(result.deleted).toBe(false);
  });

  test('old local records missing from Firestore are marked _deleted', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    const result = await page.evaluate(() => {
      // Local has an old record that was previously synced
      const oldRecord = {
        id: 'old-001',
        createdAt: new Date(Date.now() - 60000).toISOString(), // 1 min ago
        item: 'Old Record',
        weight: '5',
      };
      localStorage.setItem('factory_rawMaterials', JSON.stringify([oldRecord]));

      // Firestore returns empty — record was deleted by another user
      _mergeFirestoreIntoLocal('factory_rawMaterials', []);

      const merged = JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]');
      return { count: merged.length, deleted: merged[0]?._deleted };
    });

    expect(result.count).toBe(1);
    expect(result.deleted).toBe(true);
  });
});

test.describe('Firestore Sync: deleted record UI', () => {
  test('deleted records render with strikethrough styling and deleted badge', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    // Seed a record with _deleted: true
    await page.evaluate(() => {
      const records = [{
        id: 'deleted-001',
        createdAt: new Date(Date.now() - 120000).toISOString(),
        supplier: 'sup_lara',
        category: 'rm_cat_spices',
        item: 'Anise Seeds',
        weight: '10',
        createdBy: 'admin',
        _deleted: true,
      }, {
        id: 'active-001',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        supplier: 'sup_dates',
        category: 'rm_cat_spices',
        item: 'Active Record',
        weight: '5',
        createdBy: 'admin',
        _deleted: false,
      }];
      localStorage.setItem('factory_rawMaterials', JSON.stringify(records));
    });

    await page.click('[data-nav="receiving"]');
    await expect(page.locator('.record-item')).toHaveCount(2, { timeout: 3000 });

    // Deleted record should have the .record-deleted class
    const deletedItem = page.locator('.record-item.record-deleted');
    await expect(deletedItem).toHaveCount(1);

    // Active record should not have .record-deleted
    const activeItems = page.locator('.record-item:not(.record-deleted)');
    await expect(activeItems).toHaveCount(1);

    // Deleted record should have a "Deleted" badge
    const badge = deletedItem.locator('.ri-badge.deleted');
    await expect(badge).toBeVisible();

    // Deleted record should have reduced opacity (strikethrough applied via CSS)
    const opacity = await deletedItem.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(1);
  });

  test('deleted records are not clickable', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    await page.evaluate(() => {
      localStorage.setItem('factory_rawMaterials', JSON.stringify([{
        id: 'del-001',
        createdAt: new Date(Date.now() - 120000).toISOString(),
        supplier: 'sup_lara',
        item: 'Deleted Item',
        weight: '10',
        _deleted: true,
      }]));
    });

    await page.click('[data-nav="receiving"]');
    await expect(page.locator('.record-item.record-deleted')).toBeVisible();

    // pointer-events: none should prevent navigation to detail view
    const pointerEvents = await page.locator('.record-item.record-deleted').evaluate(
      el => getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe('none');
  });
});

test.describe('Firestore Sync: backward compatibility', () => {
  test('app works normally without Firebase (full CRUD flow)', async ({ page }) => {
    await freshApp(page);
    await loginAsManager(page);
    await page.click('[data-nav="receiving"]');

    // Add a record
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '10');
    await page.click('#form-save');

    // Record should appear in the list
    await expect(page.locator('.record-item')).toBeVisible({ timeout: 3000 });

    // Verify it's in localStorage
    const count = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]').length;
    });
    expect(count).toBe(1);
  });

  test('renderApp re-entrancy guard prevents infinite loops', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);

    // Calling renderApp multiple times rapidly should not hang
    const result = await page.evaluate(() => {
      let callCount = 0;
      const orig = renderApp;
      renderApp = function () {
        callCount++;
        if (callCount > 10) return; // safety valve
        return orig();
      };
      renderApp();
      renderApp();
      renderApp();
      renderApp = orig; // restore
      return callCount;
    });

    // Re-entrancy guard should have prevented most recursive calls
    expect(result).toBeLessThanOrEqual(10);
  });
});
