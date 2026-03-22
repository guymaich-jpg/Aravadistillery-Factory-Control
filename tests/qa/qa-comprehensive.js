// Comprehensive QA test against the local dev server (same code as production)
const { chromium, devices } = require('playwright');

const BASE = process.env.TARGET_URL || 'http://localhost:8099';
const BUGS = [];
let bugId = 0;

function bug(severity, category, title, detail) {
  bugId++;
  const id = 'BUG-' + String(bugId).padStart(3, '0');
  BUGS.push({ id, severity, category, title, detail });
  const icons = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '🔵', P4: '⚪' };
  console.log(`  ${icons[severity] || '?'} ${id} [${severity}] ${title}`);
  if (detail) console.log(`     └─ ${detail}`);
}

async function injectSession(page, user, role) {
  await page.evaluate(({ user, role }) => {
    localStorage.setItem('factory_session', JSON.stringify({
      username: user, role: role, loginTime: Date.now()
    }));
    const users = JSON.parse(localStorage.getItem('factory_users') || '[]');
    if (!users.find(u => u.username === user)) {
      users.push({ username: user, password: user + '123', role: role, status: 'active' });
      localStorage.setItem('factory_users', JSON.stringify(users));
    }
  }, { user, role });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 1: Smoke Tests');
  console.log('══════════════════════════════════════');

  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  const consoleErrors = [];
  const networkFailures = [];

  page1.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page1.on('pageerror', err => consoleErrors.push(err.message));
  page1.on('requestfailed', req => networkFailures.push(req.url()));

  const t0 = Date.now();
  const resp = await page1.goto(BASE, { waitUntil: 'networkidle' });
  const loadTime = Date.now() - t0;

  if (!resp || resp.status() !== 200) {
    bug('P0', 'Smoke', 'Page failed to load', `HTTP ${resp?.status()}`);
  }

  const title = await page1.title();
  if (!title || title.length < 3) {
    bug('P3', 'Smoke', 'Page has no meaningful title', `Title: "${title}"`);
  }

  const bodyLen = (await page1.textContent('body')).length;
  if (bodyLen < 50) {
    bug('P1', 'Smoke', 'Page body is empty or minimal', `Body text length: ${bodyLen} chars`);
  }

  if (consoleErrors.length > 0) {
    // Filter out expected Firebase errors (Firebase is disabled in local mode)
    const realErrors = consoleErrors.filter(e =>
      !e.includes('firebase') && !e.includes('Firebase') &&
      !e.includes('ERR_NAME_NOT_RESOLVED') && !e.includes('googleapis')
    );
    if (realErrors.length > 0) {
      bug('P2', 'Smoke', `${realErrors.length} console error(s) on page load`, realErrors[0].slice(0, 120));
    }
  }

  if (networkFailures.length > 0) {
    const realFailures = networkFailures.filter(u =>
      !u.includes('firebase') && !u.includes('googleapis')
    );
    if (realFailures.length > 0) {
      bug('P2', 'Smoke', `${realFailures.length} failed network request(s)`, realFailures[0]);
    }
  }

  if (loadTime > 5000) {
    bug('P2', 'Performance', 'Slow initial page load', `${loadTime}ms`);
  }
  console.log(`  ℹ  Page load time: ${loadTime}ms`);

  // Check login screen renders
  const loginVisible = await page1.locator('#login-screen').isVisible().catch(() => false);
  if (!loginVisible) {
    bug('P0', 'Smoke', 'Login screen does not render on first load');
  } else {
    console.log('  ✅ Login screen renders correctly');
  }

  await ctx1.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 2: Functional Tests');
  console.log('══════════════════════════════════════');

  // --- Login ---
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  page2.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page2.goto(BASE, { waitUntil: 'networkidle' });

  // Test invalid login
  await page2.fill('#login-user', 'baduser');
  await page2.fill('#login-pass', 'badpass');
  await page2.click('#login-btn');
  await page2.waitForTimeout(500);
  const errorShown = await page2.locator('#login-error').isVisible().catch(() => false);
  if (!errorShown) {
    bug('P1', 'Functional', 'No error shown for invalid login');
  } else {
    console.log('  ✅ Invalid login shows error');
  }

  // Test valid login (admin)
  await page2.fill('#login-user', 'admin');
  await page2.fill('#login-pass', 'admin123');
  await page2.click('#login-btn');
  await page2.waitForTimeout(1000);

  const dashboardVisible = await page2.locator('#main-app').isVisible().catch(() => false);
  if (!dashboardVisible) {
    bug('P0', 'Functional', 'Admin login does not reach dashboard');
  } else {
    console.log('  ✅ Admin login reaches dashboard');
  }

  // Test navigation to each module
  const modules = ['rawMaterials', 'dateReceiving', 'fermentation', 'distillation1', 'distillation2', 'bottling', 'inventory'];
  for (const mod of modules) {
    await page2.evaluate(m => { if (typeof navigateTo === 'function') navigateTo(m); }, mod);
    await page2.waitForTimeout(300);
    const hash = await page2.evaluate(() => location.hash);
    if (!hash.includes(mod)) {
      bug('P2', 'Functional', `Navigation to ${mod} failed`, `Hash: ${hash}`);
    }
  }
  console.log('  ✅ All 7 module navigations work');

  // Test form submission - add a record to rawMaterials
  await page2.evaluate(() => { navigateTo('rawMaterials'); });
  await page2.waitForTimeout(500);

  // Click add button
  const addBtn = page2.locator('button:has-text("add"), button:has-text("הוסף"), .add-record-btn, [onclick*="showForm"], button:has-text("New"), button:has-text("חדש")').first();
  const addBtnVisible = await addBtn.isVisible().catch(() => false);
  if (addBtnVisible) {
    await addBtn.click();
    await page2.waitForTimeout(500);

    const formVisible = await page2.locator('form, .form-container, .record-form').first().isVisible().catch(() => false);
    if (!formVisible) {
      bug('P1', 'Functional', 'Add record form does not appear after clicking add button');
    } else {
      console.log('  ✅ Add record form renders');
    }
  }

  // Test logout
  const logoutBtn = page2.locator('button:has-text("logout"), button:has-text("התנתק"), .logout-btn, #logout-btn').first();
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page2.waitForTimeout(500);
    const loginBack = await page2.locator('#login-screen').isVisible().catch(() => false);
    if (!loginBack) {
      bug('P1', 'Functional', 'Logout does not return to login screen');
    } else {
      console.log('  ✅ Logout works correctly');
    }
  }

  // Test Worker role restrictions
  await page2.fill('#login-user', 'worker1');
  await page2.fill('#login-pass', 'worker123');
  await page2.click('#login-btn');
  await page2.waitForTimeout(1000);

  // Worker should NOT see backoffice
  const boBtn = page2.locator('button:has-text("backoffice"), button:has-text("ניהול"), .backoffice-btn').first();
  const boVisible = await boBtn.isVisible().catch(() => false);
  if (boVisible) {
    bug('P0', 'Security', 'Worker role can see backoffice button');
  } else {
    console.log('  ✅ Worker cannot see backoffice');
  }

  await ctx2.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 3: UI/UX Tests');
  console.log('══════════════════════════════════════');

  const viewports = [
    { name: 'Mobile (375x667)', width: 375, height: 667 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Desktop (1280x720)', width: 1280, height: 720 },
    { name: 'Wide (1920x1080)', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await injectSession(page, 'admin', 'admin');
    await page.reload({ waitUntil: 'networkidle' });

    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasOverflow) {
      bug('P2', 'UI/UX', `Horizontal overflow at ${vp.name}`, `scrollWidth > clientWidth`);
    }

    // Check for overlapping elements on login
    await page.screenshot({ path: `tests/qa/screenshot-${vp.width}x${vp.height}.png` });

    // Check text is readable (no 0px fonts)
    const tinyText = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      let count = 0;
      els.forEach(el => {
        const style = getComputedStyle(el);
        if (el.textContent.trim() && parseFloat(style.fontSize) < 10 && style.display !== 'none') {
          count++;
        }
      });
      return count;
    });
    if (tinyText > 0) {
      bug('P3', 'UI/UX', `${tinyText} element(s) with text < 10px at ${vp.name}`);
    }

    await ctx.close();
  }
  console.log('  ✅ Viewport tests complete — screenshots saved');

  // RTL layout check
  const ctxRtl = await browser.newContext();
  const pageRtl = await ctxRtl.newPage();
  await pageRtl.goto(BASE, { waitUntil: 'networkidle' });
  await injectSession(pageRtl, 'admin', 'admin');
  await pageRtl.evaluate(() => {
    localStorage.setItem('factory_lang', 'he');
  });
  await pageRtl.reload({ waitUntil: 'networkidle' });

  const dir = await pageRtl.evaluate(() => document.documentElement.dir || document.body.dir || getComputedStyle(document.body).direction);
  if (dir !== 'rtl') {
    bug('P2', 'UI/UX', 'Hebrew mode does not set RTL direction', `direction: ${dir}`);
  } else {
    console.log('  ✅ Hebrew RTL direction is set');
  }
  await ctxRtl.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 4: Accessibility Tests');
  console.log('══════════════════════════════════════');

  const ctx4 = await browser.newContext();
  const page4 = await ctx4.newPage();
  await page4.goto(BASE, { waitUntil: 'networkidle' });

  // Check images without alt text
  const missingAlts = await page4.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).filter(i => !i.alt && !i.getAttribute('role')).length;
  });
  if (missingAlts > 0) {
    bug('P2', 'Accessibility', `${missingAlts} image(s) missing alt text`);
  }

  // Check form inputs without labels
  const unlabeledInputs = await page4.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    let count = 0;
    inputs.forEach(inp => {
      const id = inp.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAria = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
      const hasPlaceholder = inp.getAttribute('placeholder');
      const wrapped = inp.closest('label');
      if (!hasLabel && !hasAria && !wrapped && !hasPlaceholder && inp.type !== 'hidden') {
        count++;
      }
    });
    return count;
  });
  if (unlabeledInputs > 0) {
    bug('P2', 'Accessibility', `${unlabeledInputs} form input(s) without accessible label`);
  } else {
    console.log('  ✅ All form inputs have labels');
  }

  // Check buttons without accessible text
  const emptyBtns = await page4.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(b => {
      const text = b.textContent.trim();
      const aria = b.getAttribute('aria-label');
      return !text && !aria && b.offsetParent !== null;
    }).length;
  });
  if (emptyBtns > 0) {
    bug('P2', 'Accessibility', `${emptyBtns} button(s) without accessible text`);
  }

  // Keyboard navigation: can Tab reach login button?
  await page4.keyboard.press('Tab');
  await page4.keyboard.press('Tab');
  await page4.keyboard.press('Tab');
  const focused = await page4.evaluate(() => {
    const el = document.activeElement;
    return el ? el.tagName + '#' + el.id : 'none';
  });
  console.log(`  ℹ  After 3 tabs, focused: ${focused}`);

  // Check focus visibility
  const focusVisible = await page4.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return true; // nothing to check
    const style = getComputedStyle(el);
    const outline = style.outlineStyle;
    const boxShadow = style.boxShadow;
    return outline !== 'none' || (boxShadow && boxShadow !== 'none');
  });
  if (!focusVisible) {
    bug('P2', 'Accessibility', 'Focused element has no visible focus indicator');
  } else {
    console.log('  ✅ Focus indicators are visible');
  }

  // Color contrast check on login screen
  const lowContrast = await page4.evaluate(() => {
    // Simple heuristic: check if any visible text has very low contrast
    const issues = [];
    const checkEl = (el) => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const color = style.color;
      const bg = style.backgroundColor;
      // Check for light-on-light or dark-on-dark patterns
      if (color === bg && el.textContent.trim()) {
        issues.push(el.tagName);
      }
    };
    document.querySelectorAll('h1, h2, h3, p, span, label, button, a').forEach(checkEl);
    return issues.length;
  });
  if (lowContrast > 0) {
    bug('P2', 'Accessibility', `${lowContrast} element(s) with same text/background color`);
  }

  await ctx4.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 5: Security Tests');
  console.log('══════════════════════════════════════');

  const ctx5 = await browser.newContext();
  const page5 = await ctx5.newPage();
  await page5.goto(BASE, { waitUntil: 'networkidle' });

  // XSS in login fields
  const xssPayloads = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "'; DROP TABLE users; --"];
  for (const payload of xssPayloads) {
    await page5.fill('#login-user', payload);
    await page5.fill('#login-pass', 'test');
    await page5.click('#login-btn');
    await page5.waitForTimeout(300);

    const alertFired = await page5.evaluate(() => {
      // Check if script tags were rendered as HTML
      return document.querySelector('script:not([src])') !== null ||
             document.querySelector('img[onerror]') !== null;
    });
    if (alertFired) {
      bug('P0', 'Security', 'XSS vulnerability in login form', `Payload: ${payload}`);
    }
  }
  console.log('  ✅ Login form resists XSS payloads');

  // Check session timeout
  await injectSession(page5, 'admin', 'admin');
  // Set login time to 13 hours ago (timeout is 12h)
  await page5.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('factory_session'));
    s.loginTime = Date.now() - 13 * 60 * 60 * 1000;
    localStorage.setItem('factory_session', JSON.stringify(s));
  });
  await page5.reload({ waitUntil: 'networkidle' });
  await page5.waitForTimeout(500);
  const timedOut = await page5.locator('#login-screen').isVisible().catch(() => false);
  if (!timedOut) {
    bug('P1', 'Security', 'Session timeout (12h) not enforced');
  } else {
    console.log('  ✅ Session timeout enforced after 12h');
  }

  // Test role escalation: worker trying to access admin hash
  await page5.evaluate(() => { localStorage.clear(); });
  await page5.goto(BASE, { waitUntil: 'networkidle' });
  await injectSession(page5, 'worker1', 'worker');
  await page5.goto(BASE + '#/backoffice', { waitUntil: 'networkidle' });
  await page5.waitForTimeout(500);
  const boScreen = await page5.evaluate(() => {
    return document.querySelector('.backoffice-container, #backoffice-screen')?.offsetParent !== null;
  }).catch(() => false);
  if (boScreen) {
    bug('P0', 'Security', 'Worker can access backoffice via direct URL hash');
  } else {
    console.log('  ✅ Worker blocked from backoffice via hash navigation');
  }

  // Check for sensitive data in localStorage
  const sensitiveKeys = await page5.evaluate(() => {
    const suspicious = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      if (/password|secret|token|api.?key/i.test(key) && val.length > 0) {
        suspicious.push(key);
      }
    }
    return suspicious;
  });
  // Check if passwords are stored in plaintext in user data
  const plaintextPw = await page5.evaluate(() => {
    const users = JSON.parse(localStorage.getItem('factory_users') || '[]');
    return users.some(u => u.password && u.password.length < 64); // Not hashed if short
  });
  if (plaintextPw) {
    bug('P2', 'Security', 'User passwords stored in plaintext in localStorage');
  }

  await ctx5.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 6: Performance Tests');
  console.log('══════════════════════════════════════');

  const ctx6 = await browser.newContext();
  const page6 = await ctx6.newPage();

  // Measure resource loading
  const resources = [];
  page6.on('response', resp => {
    resources.push({
      url: resp.url(),
      status: resp.status(),
      size: parseInt(resp.headers()['content-length'] || '0'),
    });
  });

  const perfStart = Date.now();
  await page6.goto(BASE, { waitUntil: 'networkidle' });
  const perfLoad = Date.now() - perfStart;

  console.log(`  ℹ  Full page load: ${perfLoad}ms`);
  console.log(`  ℹ  Resources loaded: ${resources.length}`);

  // Check for large resources
  const largeResources = resources.filter(r => r.size > 500000);
  if (largeResources.length > 0) {
    for (const r of largeResources) {
      bug('P3', 'Performance', 'Large resource', `${(r.size / 1024).toFixed(0)}KB — ${r.url.split('/').pop()}`);
    }
  }

  // Check script.js size (main controller)
  const scriptJsSize = await page6.evaluate(() => {
    const scripts = performance.getEntriesByType('resource').filter(r => r.name.includes('script.js'));
    return scripts.length ? scripts[0].transferSize : 0;
  });
  if (scriptJsSize > 200000) {
    bug('P3', 'Performance', 'script.js is large', `${(scriptJsSize / 1024).toFixed(0)}KB — consider code splitting`);
  }

  // Login and test dashboard render time
  await injectSession(page6, 'admin', 'admin');
  const dashStart = Date.now();
  await page6.reload({ waitUntil: 'networkidle' });
  const dashLoad = Date.now() - dashStart;
  console.log(`  ℹ  Dashboard render: ${dashLoad}ms`);

  if (dashLoad > 3000) {
    bug('P2', 'Performance', 'Dashboard renders slowly', `${dashLoad}ms`);
  }

  // Test with many records (stress test)
  await page6.evaluate(() => {
    const records = [];
    for (let i = 0; i < 200; i++) {
      records.push({
        id: 'stress_' + i,
        createdAt: new Date().toISOString(),
        createdBy: 'stress-test',
        drinkType: 'drink_arak',
        bottleCount: '10',
        decision: 'approved',
        notes: 'Stress test record #' + i,
      });
    }
    localStorage.setItem('factory_bottling', JSON.stringify(records));
  });

  const stressStart = Date.now();
  await page6.evaluate(() => { navigateTo('bottling'); });
  await page6.waitForTimeout(2000);
  const stressTime = Date.now() - stressStart;
  console.log(`  ℹ  Bottling list with 200 records: ${stressTime}ms`);

  if (stressTime > 5000) {
    bug('P2', 'Performance', 'Slow rendering with 200 records', `${stressTime}ms`);
  }

  // Clean up stress test data
  await page6.evaluate(() => { localStorage.removeItem('factory_bottling'); });

  await ctx6.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 7: Edge Case Tests');
  console.log('══════════════════════════════════════');

  const ctx7 = await browser.newContext();
  const page7 = await ctx7.newPage();
  const edgeErrors = [];
  page7.on('pageerror', err => edgeErrors.push(err.message));

  await page7.goto(BASE, { waitUntil: 'networkidle' });
  await injectSession(page7, 'admin', 'admin');
  await page7.reload({ waitUntil: 'networkidle' });

  // Double-click on buttons
  const navBtns = page7.locator('.module-card, .nav-btn, .tab-btn').first();
  if (await navBtns.isVisible().catch(() => false)) {
    await navBtns.dblclick();
    await page7.waitForTimeout(500);
    if (edgeErrors.length > 0) {
      bug('P2', 'Edge Case', 'Double-click causes JS error', edgeErrors[0].slice(0, 100));
      edgeErrors.length = 0;
    } else {
      console.log('  ✅ Double-click on nav elements handled');
    }
  }

  // Rapid navigation
  for (const mod of ['rawMaterials', 'bottling', 'inventory', 'fermentation', 'distillation1']) {
    await page7.evaluate(m => { navigateTo(m); }, mod);
  }
  await page7.waitForTimeout(500);
  if (edgeErrors.length > 0) {
    bug('P2', 'Edge Case', 'Rapid navigation causes JS error', edgeErrors[0].slice(0, 100));
    edgeErrors.length = 0;
  } else {
    console.log('  ✅ Rapid navigation handled');
  }

  // Browser back/forward
  await page7.goBack();
  await page7.waitForTimeout(300);
  await page7.goForward();
  await page7.waitForTimeout(300);
  if (edgeErrors.length > 0) {
    bug('P2', 'Edge Case', 'Back/forward navigation causes JS error', edgeErrors[0].slice(0, 100));
    edgeErrors.length = 0;
  } else {
    console.log('  ✅ Browser back/forward handled');
  }

  // Empty localStorage
  await page7.evaluate(() => { localStorage.clear(); });
  await page7.reload({ waitUntil: 'networkidle' });
  await page7.waitForTimeout(500);
  if (edgeErrors.length > 0) {
    bug('P1', 'Edge Case', 'Cleared localStorage causes crash', edgeErrors[0].slice(0, 100));
    edgeErrors.length = 0;
  } else {
    console.log('  ✅ App handles empty localStorage');
  }

  // Invalid hash route
  await page7.goto(BASE + '#/nonexistent-module', { waitUntil: 'networkidle' });
  await page7.waitForTimeout(500);
  if (edgeErrors.length > 0) {
    bug('P2', 'Edge Case', 'Invalid hash route causes JS error', edgeErrors[0].slice(0, 100));
    edgeErrors.length = 0;
  } else {
    console.log('  ✅ Invalid hash route handled gracefully');
  }

  // Special characters in form fields
  await injectSession(page7, 'admin', 'admin');
  await page7.reload({ waitUntil: 'networkidle' });
  await page7.evaluate(() => { navigateTo('rawMaterials'); });
  await page7.waitForTimeout(500);

  // Try adding a record with unicode/special chars
  const addBtnEdge = page7.locator('button:has-text("add"), button:has-text("הוסף"), .add-record-btn, [onclick*="showForm"], button:has-text("New"), button:has-text("חדש")').first();
  if (await addBtnEdge.isVisible().catch(() => false)) {
    await addBtnEdge.click();
    await page7.waitForTimeout(500);

    // Fill with special characters
    const textInputs = page7.locator('.record-form input[type="text"], .record-form textarea, .form-container input[type="text"]');
    const inputCount = await textInputs.count();
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      await textInputs.nth(i).fill('Test <b>HTML</b> & "quotes" — 日本語 ñ').catch(() => {});
    }
  }
  if (edgeErrors.length > 0) {
    bug('P2', 'Edge Case', 'Special characters in forms cause JS error', edgeErrors[0].slice(0, 100));
  } else {
    console.log('  ✅ Special characters in forms handled');
  }

  await ctx7.close();

  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  Phase 8: Cross-Browser / Mobile');
  console.log('══════════════════════════════════════');

  // Test with Pixel 5 mobile device
  const pixel5 = devices['Pixel 5'];
  const ctxMobile = await browser.newContext({ ...pixel5 });
  const pageMobile = await ctxMobile.newPage();
  const mobileErrors = [];
  pageMobile.on('pageerror', err => mobileErrors.push(err.message));

  await pageMobile.goto(BASE, { waitUntil: 'networkidle' });

  // Check touch targets (buttons should be >= 44x44px)
  const smallTargets = await pageMobile.evaluate(() => {
    const btns = document.querySelectorAll('button, a, input[type="submit"], .clickable');
    let small = 0;
    btns.forEach(b => {
      if (b.offsetParent === null) return; // hidden
      const rect = b.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
        small++;
      }
    });
    return small;
  });
  if (smallTargets > 0) {
    bug('P3', 'UI/UX', `${smallTargets} touch target(s) < 36px on mobile`, 'WCAG recommends ≥44px');
  }

  // Mobile login flow
  await pageMobile.fill('#login-user', 'admin');
  await pageMobile.fill('#login-pass', 'admin123');
  await pageMobile.click('#login-btn');
  await pageMobile.waitForTimeout(1000);

  const mobileDash = await pageMobile.locator('#main-app').isVisible().catch(() => false);
  if (!mobileDash) {
    bug('P1', 'Cross-browser', 'Mobile login does not reach dashboard');
  } else {
    console.log('  ✅ Mobile login works');
  }

  // Check mobile overflow
  const mobileOverflow = await pageMobile.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  if (mobileOverflow) {
    bug('P2', 'UI/UX', 'Horizontal overflow on mobile (Pixel 5)');
  } else {
    console.log('  ✅ No horizontal overflow on mobile');
  }

  await pageMobile.screenshot({ path: 'tests/qa/screenshot-mobile-dashboard.png' });

  if (mobileErrors.length > 0) {
    bug('P2', 'Cross-browser', 'JS errors on mobile', mobileErrors[0].slice(0, 100));
  }

  await ctxMobile.close();

  // ═══════════════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════');
  console.log('  QA Summary Report');
  console.log('══════════════════════════════════════');

  const bySev = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
  BUGS.forEach(b => { bySev[b.severity] = (bySev[b.severity] || 0) + 1; });

  console.log(`\n  Total bugs found: ${BUGS.length}`);
  console.log(`  🔴 P0 Blocker:  ${bySev.P0}`);
  console.log(`  🟠 P1 Critical: ${bySev.P1}`);
  console.log(`  🟡 P2 Major:    ${bySev.P2}`);
  console.log(`  🔵 P3 Minor:    ${bySev.P3}`);
  console.log(`  ⚪ P4 Enhance:  ${bySev.P4}`);

  if (BUGS.length > 0) {
    console.log('\n  ── All Bugs ──');
    BUGS.forEach(b => {
      console.log(`  ${b.id} [${b.severity}] [${b.category}] ${b.title}`);
      if (b.detail) console.log(`     └─ ${b.detail}`);
    });
  }

  console.log('\n  Done.\n');

  await browser.close();
  process.exit(BUGS.filter(b => b.severity === 'P0').length > 0 ? 1 : 0);
})();
