// ============================================================
// Dashboard Chart Tests
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin } = require('./helpers');

test.describe('Dashboard Chart', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('dashboard chart container exists', async ({ page }) => {
    // Navigate from Home -> Menu -> Dashboard
    await page.click('.hub-tile >> nth=0');
    await page.click('.menu-row[data-screen="dashboard"]');
    await expect(page.locator('.dashboard-chart')).toBeVisible();
  });

  test('chart shows bars after adding records', async ({ page }) => {
    // Add a record to rawMaterials
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '15');
    await page.click('#form-save');
    await page.waitForTimeout(500);

    // Navigate to Dashboard
    await page.click('[data-nav="home"]');
    await page.click('.hub-tile >> nth=0');
    await page.click('.menu-row[data-screen="dashboard"]');

    // Verify chart has SVG bars
    await expect(page.locator('.dashboard-chart')).toBeVisible();
    await expect(page.locator('.dashboard-chart svg')).toBeVisible();
    const bars = page.locator('.dashboard-chart .chart-bar');
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThan(0);
  });
});
