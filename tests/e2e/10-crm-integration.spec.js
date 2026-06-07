// ============================================================
// E2E: CRM ↔ Factory Control Integration (Inventory Sync)
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin } = require('./helpers');

test.describe('CRM Integration: Inventory Sync', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('syncCrmStockLevels maps drink types to CRM product IDs correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Mock fbSetDoc to capture calls
      const calls = [];
      window.fbSetDoc = (collection, docId, data, merge) => {
        calls.push({ collection, docId, data, merge });
        return Promise.resolve();
      };

      const bottleInv = {
        drink_arak: 10,
        drink_licorice: 5,
        drink_edv: 8,
        drink_gin: 3,
        drink_brandyVS: 2,
        drink_brandyVSOP: 4,
        drink_brandyMed: 1,
      };

      syncCrmStockLevels(bottleInv);
      return calls;
    });

    // Verify correct CRM product ID mapping
    expect(result.length).toBe(5); // 5 unique CRM product IDs

    const byId = {};
    result.forEach(c => { byId[c.docId] = c; });

    // Product 1 = Arak
    expect(byId['1'].data.currentStock).toBe(10);
    expect(byId['1'].data.productId).toBe('1');
    expect(byId['1'].data.unit).toBe('בקבוק');
    expect(byId['1'].collection).toBe('stockLevels');
    expect(byId['1'].merge).toBe(true);

    // Product 2 = Licorice
    expect(byId['2'].data.currentStock).toBe(5);

    // Product 3 = ADV/EDV
    expect(byId['3'].data.currentStock).toBe(8);

    // Product 4 = Gin
    expect(byId['4'].data.currentStock).toBe(3);

    // Product 5 = Brandy (aggregated: VS + VSOP + Med = 2+4+1 = 7)
    expect(byId['5'].data.currentStock).toBe(7);

    // All entries have required CRM fields
    result.forEach(c => {
      expect(c.data).toHaveProperty('productId');
      expect(c.data).toHaveProperty('currentStock');
      expect(c.data).toHaveProperty('unit');
      expect(c.data).toHaveProperty('lastUpdated');
      expect(c.data).toHaveProperty('factoryLastSync');
      expect(c.data.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  test('syncInventorySnapshot calculates bottle totals from base + approved bottling', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Mock external calls
      const sheetsCalls = [];
      const firestoreCalls = [];
      window.postToSheets = (payload) => { sheetsCalls.push(payload); };
      window.fbSetDoc = (col, id, data) => { firestoreCalls.push({ col, id, data }); return Promise.resolve(); };
      window.apiUpdateInventory = () => Promise.resolve();

      // Seed base inventory
      localStorage.setItem('factory_inventoryBase', JSON.stringify([
        { id: 'base1', declared_at: '2024-01-01T00:00:00Z', drink_arak: 50, drink_gin: 20 }
      ]));

      // Seed approved bottling records (after declaration)
      localStorage.setItem('factory_bottling', JSON.stringify([
        { id: 'b1', drinkType: 'drink_arak', decision: 'approved', bottleCount: 10, createdAt: '2024-06-01T00:00:00Z' },
        { id: 'b2', drinkType: 'drink_gin', decision: 'approved', bottleCount: 5, createdAt: '2024-06-02T00:00:00Z' },
        { id: 'b3', drinkType: 'drink_arak', decision: 'notApproved', bottleCount: 99, createdAt: '2024-06-03T00:00:00Z' },
        { id: 'b4', drinkType: 'drink_arak', decision: 'approved', bottleCount: 3, createdAt: '2023-12-01T00:00:00Z' }, // before declaration — excluded
      ]));

      // Seed empty for other modules
      localStorage.setItem('factory_rawMaterials', '[]');
      localStorage.setItem('factory_dateReceiving', '[]');
      localStorage.setItem('factory_fermentation', '[]');
      localStorage.setItem('factory_distillation1', '[]');
      localStorage.setItem('factory_distillation2', '[]');

      syncInventorySnapshot('test');

      return { sheetsCalls, firestoreCalls };
    });

    // Should write to Firestore factory_inventory/current
    const invWrite = result.firestoreCalls.find(c => c.col === 'factory_inventory' && c.id === 'current');
    expect(invWrite).toBeTruthy();
    expect(invWrite.data.bottles.drink_arak).toBe(60); // base 50 + approved 10
    expect(invWrite.data.bottles.drink_gin).toBe(25); // base 20 + approved 5
    expect(invWrite.data.total).toBeGreaterThanOrEqual(85); // at least arak + gin

    // Should also sync to CRM stockLevels
    const crmWrites = result.firestoreCalls.filter(c => c.col === 'stockLevels');
    expect(crmWrites.length).toBeGreaterThan(0);

    // Arak (product 1) should be 60
    const arakWrite = crmWrites.find(c => c.id === '1');
    expect(arakWrite.data.currentStock).toBe(60);
  });

  test('syncCrmStockLevels is a no-op when fbSetDoc is unavailable', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Remove fbSetDoc
      delete window.fbSetDoc;
      // Should not throw
      syncCrmStockLevels({ drink_arak: 10 });
      return 'ok';
    });
    expect(result).toBe('ok');
  });

  test('inventory data format matches CRM StockLevel interface', async ({ page }) => {
    const result = await page.evaluate(() => {
      const calls = [];
      window.fbSetDoc = (col, id, data, merge) => {
        calls.push({ col, id, data, merge });
        return Promise.resolve();
      };
      syncCrmStockLevels({ drink_arak: 42 });
      return calls[0];
    });

    // Matches CRM's StockLevel interface fields
    const data = result.data;
    expect(typeof data.productId).toBe('string');
    expect(typeof data.currentStock).toBe('number');
    expect(typeof data.unit).toBe('string');
    expect(typeof data.lastUpdated).toBe('string');
    expect(typeof data.factoryLastSync).toBe('string');
    // Verify ISO date format
    expect(new Date(data.lastUpdated).toISOString()).toBe(data.lastUpdated);
  });
});
