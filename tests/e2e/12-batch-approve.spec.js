// ============================================================
// Batch Approve Tests — bottling module only
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin, loginAsWorker, logout } = require('./helpers');

test.describe('Batch Approve', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
  });

  test('admin sees checkboxes on bottling and can batch approve records', async ({ page }) => {
    await loginAsAdmin(page);

    // Seed bottling records via localStorage (avoids signature requirement)
    await page.evaluate(() => {
      const records = [
        { id: 'bt1', drinkType: 'drink_arak', batchNumber: 'B1', alcohol: '0.40', bottleCount: '10', date: '2026-01-01', createdAt: new Date().toISOString(), createdBy: 'admin' },
        { id: 'bt2', drinkType: 'drink_gin', batchNumber: 'B2', alcohol: '0.40', bottleCount: '20', date: '2026-01-02', createdAt: new Date().toISOString(), createdBy: 'admin' },
        { id: 'bt3', drinkType: 'drink_licorice', batchNumber: 'B3', alcohol: '0.40', bottleCount: '15', date: '2026-01-03', createdAt: new Date().toISOString(), createdBy: 'admin' },
      ];
      localStorage.setItem('factory_bottling', JSON.stringify(records));
    });

    // Navigate to bottling via bottom nav
    await page.click('[data-nav="bottling"]');
    await page.waitForTimeout(300);

    // Verify checkboxes appear for admin on bottling
    const checkboxes = page.locator('.batch-checkbox');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Select first two records
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Verify batch action bar appears
    await expect(page.locator('#batch-action-bar')).toBeVisible();

    // Click Approve All
    await page.click('#batch-approve-btn');

    // Verify records get decision: 'approved' (not status)
    const decisions = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem('factory_bottling') || '[]');
      return records.map(r => ({ id: r.id, decision: r.decision, status: r.status }));
    });
    const approved = decisions.filter(d => d.decision === 'approved');
    expect(approved.length).toBeGreaterThanOrEqual(2);
    // Ensure we're NOT using the wrong field
    const withStatus = decisions.filter(d => d.status === 'approved');
    expect(withStatus.length).toBe(0);
  });

  test('admin does NOT see batch checkboxes on non-bottling modules', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('[data-nav="receiving"]');
    await page.waitForTimeout(300);

    // Add a record to raw materials
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '10');
    await page.click('#form-save');
    await page.waitForTimeout(500);

    // Verify NO checkboxes on raw materials even for admin
    const checkboxes = page.locator('.batch-checkbox');
    await expect(checkboxes).toHaveCount(0);
  });

  test('worker does NOT see batch checkboxes on bottling', async ({ page }) => {
    // Seed bottling records
    await loginAsAdmin(page);
    await page.evaluate(() => {
      const records = [
        { id: 'bt1', drinkType: 'drink_arak', batchNumber: 'B1', alcohol: '0.40', bottleCount: '5', date: '2026-01-01', createdAt: new Date().toISOString(), createdBy: 'admin' },
      ];
      localStorage.setItem('factory_bottling', JSON.stringify(records));
    });
    await logout(page);

    // Login as worker — navigate to bottling
    await loginAsWorker(page);
    await page.click('[data-nav="bottling"]');
    await page.waitForTimeout(300);

    // Verify NO checkboxes for worker
    const checkboxes = page.locator('.batch-checkbox');
    await expect(checkboxes).toHaveCount(0);
  });
});
