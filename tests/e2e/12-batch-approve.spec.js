// ============================================================
// Batch Approve Tests
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin, loginAsWorker, logout } = require('./helpers');

test.describe('Batch Approve', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
  });

  test('admin sees checkboxes and can batch approve records', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('[data-nav="receiving"]');

    // Add first record
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '10');
    await page.click('#form-save');
    await page.waitForTimeout(500);

    // Add second record
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '20');
    await page.click('#form-save');
    await page.waitForTimeout(500);

    // Verify checkboxes appear for admin
    const checkboxes = page.locator('.batch-checkbox');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Select both records
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Verify batch action bar appears
    await expect(page.locator('#batch-action-bar')).toBeVisible();

    // Click Approve All
    await page.click('#batch-approve-btn');

    // Verify records get approved status (check via localStorage)
    const statuses = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem('factory_rawMaterials') || '[]');
      return records.map(r => r.status);
    });
    expect(statuses.filter(s => s === 'approved').length).toBeGreaterThanOrEqual(2);
  });

  test('worker does NOT see batch checkboxes', async ({ page }) => {
    // First add records as admin
    await loginAsAdmin(page);
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '5');
    await page.click('#form-save');
    await page.waitForTimeout(500);
    await logout(page);

    // Login as worker
    await loginAsWorker(page);
    await page.click('[data-nav="receiving"]');

    // Verify NO checkboxes for worker
    const checkboxes = page.locator('.batch-checkbox');
    await expect(checkboxes).toHaveCount(0);
  });
});
