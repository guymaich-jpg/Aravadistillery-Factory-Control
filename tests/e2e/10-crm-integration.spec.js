// ============================================================
// E2E: CRM ↔ Factory Control Integration (per-item inventory sync)
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin } = require('./helpers');

test.describe('CRM Integration: Inventory Sync', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('syncCrmStockLevels writes one stockLevels doc per catalog item id', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };
      // Per-item counts, keyed by catalog product id (1:1 — no drink-type mapping)
      syncCrmStockLevels({ '1': 10, '4': 3, '9': 7 });
      return calls;
    });

    expect(result.length).toBe(3);
    const byId = {};
    result.forEach(c => { byId[c.docId] = c; });

    expect(byId['1'].data.currentStock).toBe(10);
    expect(byId['1'].data.productId).toBe('1');
    expect(byId['1'].data.unit).toBe('בקבוק');
    expect(byId['1'].collection).toBe('stockLevels');
    expect(byId['1'].merge).toBe(true);
    expect(byId['4'].data.currentStock).toBe(3);
    expect(byId['9'].data.currentStock).toBe(7);

    result.forEach(c => {
      expect(c.data).toHaveProperty('productId');
      expect(c.data).toHaveProperty('currentStock');
      expect(c.data).toHaveProperty('unit');
      expect(c.data).toHaveProperty('lastUpdated');
      expect(c.data).toHaveProperty('factoryLastSync');
      expect(c.data.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  test('syncInventorySnapshot pushes the declared per-item counts to the CRM', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sheetsCalls = [];
      const firestoreCalls = [];
      window.postToSheets = (payload) => { sheetsCalls.push(payload); };
      window.fbSetDoc = (col, id, data) => { firestoreCalls.push({ col, id, data }); return Promise.resolve(); };

      // The latest declaration = per-item stock, keyed by product id.
      localStorage.setItem('factory_inventoryBase', JSON.stringify([
        { id: 'base1', declared_at: '2026-06-01T00:00:00Z', '1': 50, '4': 20 }
      ]));
      ['rawMaterials', 'dateReceiving', 'fermentation', 'distillation1', 'distillation2', 'bottling']
        .forEach(m => localStorage.setItem('factory_' + m, '[]'));

      syncInventorySnapshot('test');
      return { sheetsCalls, firestoreCalls };
    });

    // factory_inventory/current holds the per-item map
    const invWrite = result.firestoreCalls.find(c => c.col === 'factory_inventory' && c.id === 'current');
    expect(invWrite).toBeTruthy();
    expect(invWrite.data.bottles['1']).toBe(50);
    expect(invWrite.data.bottles['4']).toBe(20);
    expect(invWrite.data.total).toBe(70);

    // stockLevels written per item; item 1 = 50, item 4 = 20
    const crmWrites = result.firestoreCalls.filter(c => c.col === 'stockLevels');
    expect(crmWrites.find(c => c.id === '1').data.currentStock).toBe(50);
    expect(crmWrites.find(c => c.id === '4').data.currentStock).toBe(20);
  });

  test('syncCrmStockLevels is a no-op when fbSetDoc is unavailable', async ({ page }) => {
    const result = await page.evaluate(() => {
      delete window.fbSetDoc;
      syncCrmStockLevels({ '1': 10 }); // should not throw
      return 'ok';
    });
    expect(result).toBe('ok');
  });

  test('inventory data format matches the CRM StockLevel interface', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calls = [];
      window.fbSetDoc = (col, id, data, merge) => { calls.push({ col, id, data, merge }); return Promise.resolve(); };
      syncCrmStockLevels({ '1': 42 });
      return calls[0];
    });
    const data = result.data;
    expect(typeof data.productId).toBe('string');
    expect(typeof data.currentStock).toBe('number');
    expect(typeof data.unit).toBe('string');
    expect(typeof data.lastUpdated).toBe('string');
    expect(typeof data.factoryLastSync).toBe('string');
    expect(new Date(data.lastUpdated).toISOString()).toBe(data.lastUpdated);
  });
});
