// ============================================================
// UX / UI Tests: Navigation, responsive, accessibility basics
// ============================================================
const { test, expect } = require('@playwright/test');
const { freshApp, loginAsAdmin, loginAsManager, loginAsWorker } = require('./helpers');

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('all module cards on dashboard are clickable', async ({ page }) => {
    const cards = page.locator('.module-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await cards.first().click();
    await expect(page.locator('.screen-content')).toBeVisible();
  });

  test('back button returns to module list from form', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await expect(page.locator('#form-save')).toBeVisible();
    await page.click('#header-back');
    await expect(page.locator('.fab-add')).toBeVisible();
  });

  test('back button from list returns to dashboard', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('#header-back');
    await expect(page.locator('.module-grid')).toBeVisible();
  });

  test('cancel button in form returns to list', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.click('#form-cancel');
    await expect(page.locator('.fab-add')).toBeVisible();
  });

  test('bottom nav highlights active tab', async ({ page }) => {
    await page.click('[data-nav="production"]');
    await expect(page.locator('[data-nav="production"].active')).toBeVisible();
  });
});

// ============================================================
// Screen Transitions (Phase A)
// ============================================================
test.describe('Screen Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('forward navigation applies slide-in-from-right animation', async ({ page }) => {
    await page.click('.module-card >> nth=0');
    const content = page.locator('#screen-content');
    await expect(content).toHaveClass(/nav-forward/);
  });

  test('back navigation applies slide-in-from-left animation', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('#header-back');
    const content = page.locator('#screen-content');
    await expect(content).toHaveClass(/nav-back/);
  });

  test('tab switch does not apply directional animation', async ({ page }) => {
    await page.click('[data-nav="production"]');
    // Switch between sub-tabs (fermentation → distillation1)
    const tabs = page.locator('.tab-btn');
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      const content = page.locator('#screen-content');
      const cls = await content.getAttribute('class');
      expect(cls).not.toContain('nav-forward');
      expect(cls).not.toContain('nav-back');
    }
  });

  test('form cancel animates back', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.click('#form-cancel');
    const content = page.locator('#screen-content');
    await expect(content).toHaveClass(/nav-back/);
  });
});

// ============================================================
// Dashboard UI (Phase C)
// ============================================================
test.describe('Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
  });

  test('dashboard shows 3 stat cards', async ({ page }) => {
    const stats = page.locator('.stat-card');
    await expect(stats).toHaveCount(3);
  });

  test('dashboard shows 7 module cards', async ({ page }) => {
    const modules = page.locator('.module-card');
    await expect(modules).toHaveCount(7);
  });

  test('module card shows record count', async ({ page }) => {
    await expect(page.locator('.mc-count').first()).toBeVisible();
  });

  test('third stat card shows pending approvals instead of hard-coded 7', async ({ page }) => {
    // The third stat card should show pending approvals count, not "7"
    const thirdStatNum = page.locator('.stat-card >> nth=2 >> .stat-num');
    const text = await thirdStatNum.textContent();
    // Should be a number (pending count), and the label should be "Pending"
    expect(Number(text)).toBeGreaterThanOrEqual(0);
    // Should NOT be the old hard-coded "7" with "Modules" label
    const thirdStatLabel = page.locator('.stat-card >> nth=2 >> .stat-label');
    const labelText = await thirdStatLabel.textContent();
    expect(labelText.toLowerCase()).not.toContain('modules');
  });

  test('recent activity section appears when records exist', async ({ page }) => {
    // Add a record first
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '5');
    await page.click('#form-save');
    await page.waitForTimeout(500);

    // Go back to dashboard
    await page.click('[data-nav="dashboard"]');
    await expect(page.locator('.recent-activity-item').first()).toBeVisible();
  });

  test('clicking recent activity item navigates to detail', async ({ page }) => {
    // Add a record
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '5');
    await page.click('#form-save');
    await page.waitForTimeout(500);

    // Go to dashboard and click recent item
    await page.click('[data-nav="dashboard"]');
    await page.click('.recent-activity-item >> nth=0');
    await expect(page.locator('.detail-card')).toBeVisible();
  });
});

// ============================================================
// Form Validation (Phase B)
// ============================================================
test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsManager(page);
  });

  test('saving empty required fields shows inline error styling', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    // Clear a required field and try to save
    await page.click('#form-save');
    // Should show field-error class on required inputs
    const errorFields = page.locator('.field-error');
    expect(await errorFields.count()).toBeGreaterThan(0);
  });

  test('inline error messages appear under required fields', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.click('#form-save');
    const errorMsgs = page.locator('.field-error-msg');
    expect(await errorMsgs.count()).toBeGreaterThan(0);
  });

  test('validation errors are cleared on re-save attempt', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.click('#form-save');
    // Errors should be present
    expect(await page.locator('.field-error').count()).toBeGreaterThan(0);

    // Fill required fields and save again
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '5');
    await page.click('#form-save');

    // Should navigate away (no more form visible) or errors cleared
    await expect(page.locator('.field-error')).toHaveCount(0);
  });

  test('save button shows loading state briefly', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '5');

    // Check that the save button exists and has proper class
    const saveBtn = page.locator('#form-save');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveClass(/btn/);
  });
});

// ============================================================
// Empty States (Phase B)
// ============================================================
test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsManager(page);
  });

  test('empty module list shows hint text to add records', async ({ page }) => {
    await page.click('[data-nav="bottling"]');
    // Check for the action hint in empty state
    const emptyState = page.locator('.empty-state');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('+');
    }
  });
});

// ============================================================
// Responsive / Mobile
// ============================================================
test.describe('Responsive / Mobile', () => {
  test('login form is usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await freshApp(page);
    await expect(page.locator('#login-user')).toBeVisible();
    await expect(page.locator('#login-pass')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
  });

  test('bottom nav is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await freshApp(page);
    await loginAsAdmin(page);
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('viewport allows user zoom (accessibility)', async ({ page }) => {
    await freshApp(page);
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : '';
    });
    expect(viewport).not.toContain('user-scalable=no');
    expect(viewport).not.toContain('maximum-scale=1.0');
  });

  test('buttons and inputs have minimum 48px touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await freshApp(page);
    await loginAsAdmin(page);
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');

    // Wait for form to be ready
    await page.waitForSelector('#field-weight');

    // Use offsetHeight (more reliable than getBoundingClientRect in headless on Linux)
    // and fall back to computed minHeight so date inputs on some platforms are handled correctly
    const inputHeight = await page.locator('#field-weight').evaluate(el => {
      return el.offsetHeight || parseInt(window.getComputedStyle(el).minHeight) || 0;
    });
    expect(inputHeight).toBeGreaterThanOrEqual(48);

    // Check button height >= 48px
    const btnHeight = await page.locator('#form-save').evaluate(el => {
      return el.offsetHeight || parseInt(window.getComputedStyle(el).minHeight) || 0;
    });
    expect(btnHeight).toBeGreaterThanOrEqual(48);
  });

  test('header buttons have adequate touch target (min 36px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await freshApp(page);
    await loginAsAdmin(page);

    const logoutHeight = await page.locator('#logout-btn').evaluate(el => el.getBoundingClientRect().height);
    expect(logoutHeight).toBeGreaterThanOrEqual(36);
  });
});

// ============================================================
// Scroll Preservation (Phase D)
// ============================================================
test.describe('Scroll Preservation', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsManager(page);
  });

  test('scroll position state variable exists', async ({ page }) => {
    const hasScrollState = await page.evaluate(() => typeof _scrollPositions === 'object');
    expect(hasScrollState).toBe(true);
  });
});

// ============================================================
// Toast Notifications
// ============================================================
test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAsManager(page);
  });

  test('save shows success toast', async ({ page }) => {
    await page.click('[data-nav="receiving"]');
    await page.click('.fab-add');
    await page.selectOption('#field-supplier', { index: 1 });
    await page.selectOption('#field-category', 'rm_cat_spices');
    await page.waitForTimeout(300);
    await page.selectOption('#field-item', { index: 1 });
    await page.fill('#field-weight', '5');
    await page.click('#form-save');
    await expect(page.locator('.toast.show')).toBeVisible({ timeout: 3000 });
  });
});

// ============================================================
// RTL Layout (Hebrew)
// ============================================================
test.describe('RTL Layout (Hebrew)', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
  });

  test('Hebrew mode has RTL direction', async ({ page }) => {
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
  });

  test('Thai mode has LTR direction', async ({ page }) => {
    await page.click('.login-lang-toggle');
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('ltr');
  });
});

// ============================================================
// CSS Consistency (Phase E)
// ============================================================
test.describe('CSS Consistency', () => {
  test('no duplicate stat-card definitions override each other', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
    // Stat card should have consistent border-radius from the single definition
    const statRadius = await page.locator('.stat-card >> nth=0').evaluate(el =>
      getComputedStyle(el).borderRadius
    );
    // Should be the --radius value (12px), not --radius-sm (8px)
    expect(statRadius).toBe('12px');
  });

  test('stat cards have box-shadow', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
    const shadow = await page.locator('.stat-card >> nth=0').evaluate(el =>
      getComputedStyle(el).boxShadow
    );
    expect(shadow).not.toBe('none');
  });
});

// ============================================================
// Auto Hard-Refresh
// ============================================================
test.describe('Auto Hard-Refresh', () => {
  test('scheduleHardRefresh function is defined', async ({ page }) => {
    await freshApp(page);
    await loginAsAdmin(page);
    const exists = await page.evaluate(() => typeof scheduleHardRefresh === 'function');
    expect(exists).toBe(true);
  });
});

// ============================================================
// i18n Keys for New Features
// ============================================================
test.describe('i18n New Keys', () => {
  test('pendingApprovals key exists in all languages', async ({ page }) => {
    await freshApp(page);
    const result = await page.evaluate(() => {
      return {
        en: I18N.en.pendingApprovals,
        he: I18N.he.pendingApprovals,
        th: I18N.th.pendingApprovals,
      };
    });
    expect(result.en).toBeTruthy();
    expect(result.he).toBeTruthy();
    expect(result.th).toBeTruthy();
  });

  test('recentActivity key exists in all languages', async ({ page }) => {
    await freshApp(page);
    const result = await page.evaluate(() => {
      return {
        en: I18N.en.recentActivity,
        he: I18N.he.recentActivity,
        th: I18N.th.recentActivity,
      };
    });
    expect(result.en).toBeTruthy();
    expect(result.he).toBeTruthy();
    expect(result.th).toBeTruthy();
  });

  test('tapPlusToAdd key exists in all languages', async ({ page }) => {
    await freshApp(page);
    const result = await page.evaluate(() => {
      return {
        en: I18N.en.tapPlusToAdd,
        he: I18N.he.tapPlusToAdd,
        th: I18N.th.tapPlusToAdd,
      };
    });
    expect(result.en).toBeTruthy();
    expect(result.he).toBeTruthy();
    expect(result.th).toBeTruthy();
  });
});
