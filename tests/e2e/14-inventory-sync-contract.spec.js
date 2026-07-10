// ============================================================
// E2E: Cross-App Inventory Sync Contract Verification
// Verifies the data FORMAT that Factory Control writes matches
// what the CRM expects via validateStockLevel().
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin } = require('./helpers');

test.describe('Cross-App Inventory Sync Contract', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('valid stock sync format after inventory calculation', async ({ page }) => {
    // Trigger inventory calculation and capture CRM stock data
    const result = await page.evaluate(async () => {
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };
      window.postToSheets = () => {};
      // Resolves with no `success` field, so syncInventorySnapshot() falls
      // through to the direct client writes below — same as a real backend
      // miss/failure. syncInventorySnapshot is async (awaits the backend
      // call before falling back), so it must be awaited here too.
      window.apiUpdateInventory = () => Promise.resolve();

      // Seed bottling records so inventory has stock
      localStorage.setItem('factory_bottling', JSON.stringify([
        { id: 'b1', drinkType: 'drink_arak', decision: 'approved', bottleCount: 15, createdAt: '2024-06-01T00:00:00Z' },
        { id: 'b2', drinkType: 'drink_gin', decision: 'approved', bottleCount: 8, createdAt: '2024-06-02T00:00:00Z' },
      ]));
      localStorage.setItem('factory_rawMaterials', '[]');
      localStorage.setItem('factory_dateReceiving', '[]');
      localStorage.setItem('factory_fermentation', '[]');
      localStorage.setItem('factory_distillation1', '[]');
      localStorage.setItem('factory_distillation2', '[]');

      await syncInventorySnapshot('test');

      // Return only CRM stockLevels calls
      return calls.filter(c => c.collection === 'stockLevels');
    });

    expect(result.length).toBeGreaterThan(0);

    // Each entry must have the fields the CRM's validateStockLevel() expects
    for (const call of result) {
      const data = call.data;
      expect(data).toHaveProperty('productId');
      expect(data).toHaveProperty('currentStock');
      expect(data).toHaveProperty('unit');
      expect(data).toHaveProperty('lastUpdated');
      // factoryLastSync is optional per CRM spec, but Factory always sends it
      expect(data).toHaveProperty('factoryLastSync');
    }
  });

  test('per-item stock writes doc ids that equal the product id (1:1)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };
      // Per-item counts keyed by catalog product id — written 1:1 (no mapping).
      syncCrmStockLevels({ '1': 10, '2': 5, '3': 8, '4': 3 });
      return calls;
    });

    const byDocId = {};
    result.forEach(c => { byDocId[c.docId] = c.data; });

    for (const [id, stock] of [['1', 10], ['2', 5], ['3', 8], ['4', 3]]) {
      expect(byDocId[id]).toBeDefined();
      expect(byDocId[id].productId).toBe(id); // doc id === productId
      expect(byDocId[id].currentStock).toBe(stock);
    }
  });

  test('stock values are non-negative numbers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };
      window.postToSheets = () => {};
      window.apiUpdateInventory = () => Promise.resolve();

      // Seed with zero and positive values
      localStorage.setItem('factory_bottling', JSON.stringify([
        { id: 'b1', drinkType: 'drink_arak', decision: 'approved', bottleCount: 0, createdAt: '2024-06-01T00:00:00Z' },
        { id: 'b2', drinkType: 'drink_gin', decision: 'approved', bottleCount: 12, createdAt: '2024-06-02T00:00:00Z' },
      ]));
      localStorage.setItem('factory_rawMaterials', '[]');
      localStorage.setItem('factory_dateReceiving', '[]');
      localStorage.setItem('factory_fermentation', '[]');
      localStorage.setItem('factory_distillation1', '[]');
      localStorage.setItem('factory_distillation2', '[]');

      await syncInventorySnapshot('test');
      return calls.filter(c => c.collection === 'stockLevels');
    });

    expect(result.length).toBeGreaterThan(0);

    for (const call of result) {
      expect(typeof call.data.currentStock).toBe('number');
      expect(call.data.currentStock).toBeGreaterThanOrEqual(0);
    }
  });

  test('timestamp format is valid ISO date', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };

      syncCrmStockLevels({ drink_arak: 5 });
      return calls;
    });

    expect(result.length).toBeGreaterThan(0);

    for (const call of result) {
      const { lastUpdated, factoryLastSync } = call.data;

      // lastUpdated must be a parseable ISO date
      expect(typeof lastUpdated).toBe('string');
      expect(lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedLast = new Date(lastUpdated);
      expect(parsedLast.getTime()).not.toBeNaN();

      // factoryLastSync must be a parseable ISO date
      expect(typeof factoryLastSync).toBe('string');
      expect(factoryLastSync).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedSync = new Date(factoryLastSync);
      expect(parsedSync.getTime()).not.toBeNaN();
    }
  });

  test('unit field is always set to non-empty string', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };

      // Test with all drink types
      syncCrmStockLevels({
        drink_arak: 10,
        drink_licorice: 5,
        drink_edv: 8,
        drink_gin: 3,
        drink_brandyVS: 2,
        drink_brandyVSOP: 4,
        drink_brandyMed: 1,
      });
      return calls;
    });

    expect(result.length).toBeGreaterThan(0);

    for (const call of result) {
      expect(typeof call.data.unit).toBe('string');
      expect(call.data.unit.length).toBeGreaterThan(0);
      // Factory always uses 'בקבוק' (bottle) as the unit
      expect(call.data.unit).toBe('בקבוק');
    }
  });
});
