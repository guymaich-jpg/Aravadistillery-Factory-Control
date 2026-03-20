/**
 * Comprehensive QA Audit — Arava Distillery Factory Control
 * Playwright (chromium.launch) — run with: node tests/qa/qa-audit.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8099';
const CREDS = { email: 'admin@arava.co.il', password: 'admin123' };

// Local fallback for feather-icons (CDN may be blocked)
const FEATHER_LOCAL = path.resolve(__dirname, '../../node_modules/feather-icons/dist/feather.min.js');

// All screens reachable from bottom nav (admin user)
const NAV_SCREENS = [
  'dashboard', 'receiving', 'production', 'spiritStock', 'bottling', 'inventory', 'backoffice'
];

const VIEWPORTS = [
  { width: 320, height: 568, label: '320px (iPhone SE)' },
  { width: 375, height: 667, label: '375px (iPhone 8)' },
  { width: 414, height: 896, label: '414px (iPhone 11)' },
  { width: 480, height: 854, label: '480px (large phone)' },
];

// ─── Helpers ─────────────────────────────────────────────
const findings = [];
function log(category, severity, message, details = null) {
  const entry = { category, severity, message };
  if (details) entry.details = details;
  findings.push(entry);
}

async function navigateTo(page, screenId) {
  const btn = await page.$(`button.nav-item[data-nav="${screenId}"]`);
  if (btn) {
    await btn.click();
    await page.waitForTimeout(600);
  } else {
    log('NAV', 'warn', `Nav button for "${screenId}" not found`);
  }
}

async function login(page) {
  // First attempt: try normal login flow
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  const emailInput = await page.$('#login-user');
  if (!emailInput) {
    log('LOGIN', 'info', 'Already logged in or no login form found');
    return;
  }

  // Try the provided credentials first
  await emailInput.fill(CREDS.email);
  await page.fill('#login-pass', CREDS.password);
  await page.click('#login-btn');
  await page.waitForTimeout(2000);

  let nav = await page.$('.bottom-nav');
  if (nav) {
    log('LOGIN', 'pass', 'Login succeeded with provided credentials');
    return;
  }

  // If that failed, inject a session directly (Firebase unavailable in this env)
  log('LOGIN', 'info', 'Provided creds failed (Firebase offline) — injecting admin session via localStorage');

  const adminSession = {
    username: 'guymaich',
    role: 'admin',
    name: 'Guy Maich',
    nameHe: 'גיא מייך',
    email: 'guymaich@gmail.com',
    status: 'active',
    loginTime: Date.now(),
    lastActivity: Date.now(),
  };

  await page.evaluate((session) => {
    localStorage.setItem('factory_session', JSON.stringify(session));
    // Ensure default users exist
    const users = JSON.parse(localStorage.getItem('factory_users') || 'null');
    if (!users) {
      localStorage.setItem('factory_users', JSON.stringify([
        { username: 'guymaich', password: 'hashed:1ap7bdv', role: 'admin', name: 'Guy Maich', nameHe: 'גיא מייך', email: 'guymaich@gmail.com', status: 'active' },
        { username: 'yonatangarini', password: 'hashed:1ekzbmw', role: 'admin', name: 'Yonatan Garini', nameHe: 'יונתן גריני', email: 'yonatangarini@gmail.com', status: 'active' },
      ]));
    }
  }, adminSession);

  // Reload to pick up the session
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);

  nav = await page.$('.bottom-nav');
  if (nav) {
    log('LOGIN', 'pass', 'Login succeeded via injected session');
  } else {
    log('LOGIN', 'error', 'Login failed even after session injection');
    // Debug: capture what's on screen
    const bodyText = await page.$eval('body', el => el.innerText.substring(0, 300));
    log('LOGIN', 'info', `Page content after login attempt: "${bodyText}"`);
  }
}

// ─── 1. Smoke Test ───────────────────────────────────────
async function smokeTest(page) {
  console.log('\n=== 1. SMOKE TEST ===');
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Check page title
  const title = await page.title();
  log('SMOKE', title ? 'pass' : 'warn', `Page title: "${title}"`);

  // Check initial render — some content should exist
  const bodyText = await page.$eval('body', el => el.innerText.trim().length);
  log('SMOKE', bodyText > 0 ? 'pass' : 'error', `Body text length: ${bodyText} chars`);

  // Console errors after initial load
  if (consoleErrors.length === 0) {
    log('SMOKE', 'pass', 'No console errors on initial load');
  } else {
    log('SMOKE', 'warn', `Console errors on load: ${consoleErrors.length}`, consoleErrors.slice(0, 5));
  }

  return consoleErrors;
}

// ─── 2. Header Height Consistency ────────────────────────
async function headerConsistency(page) {
  console.log('\n=== 2. HEADER HEIGHT CONSISTENCY ===');
  const heights = {};

  for (const screen of NAV_SCREENS) {
    await navigateTo(page, screen);
    const header = await page.$('.app-header');
    if (header) {
      const box = await header.boundingBox();
      const computedH = await page.$eval('.app-header', el =>
        window.getComputedStyle(el).height
      );
      heights[screen] = { px: box?.height, computed: computedH };
      console.log(`  .app-header on "${screen}": ${computedH} (box: ${box?.height}px)`);
    } else {
      heights[screen] = null;
      console.log(`  .app-header on "${screen}": NOT FOUND`);
    }
  }

  const uniqueHeights = new Set(Object.values(heights).filter(Boolean).map(h => Math.round(h.px)));
  if (uniqueHeights.size <= 1) {
    log('HEADER', 'pass', `Header height consistent across all screens: ${[...uniqueHeights]}px`, heights);
  } else {
    log('HEADER', 'warn', `Header height varies: ${[...uniqueHeights].join(', ')}px`, heights);
  }
  return heights;
}

// ─── 3. Bottom Nav Consistency ───────────────────────────
async function bottomNavConsistency(page) {
  console.log('\n=== 3. BOTTOM NAV CONSISTENCY ===');
  const heights = {};

  for (const screen of NAV_SCREENS) {
    await navigateTo(page, screen);
    const nav = await page.$('.bottom-nav');
    if (nav) {
      const box = await nav.boundingBox();
      const computedH = await page.$eval('.bottom-nav', el =>
        window.getComputedStyle(el).height
      );
      heights[screen] = { px: box?.height, computed: computedH };
      console.log(`  .bottom-nav on "${screen}": ${computedH} (box: ${box?.height}px)`);
    } else {
      heights[screen] = null;
      console.log(`  .bottom-nav on "${screen}": NOT FOUND`);
    }
  }

  const uniqueHeights = new Set(Object.values(heights).filter(Boolean).map(h => Math.round(h.px)));
  if (uniqueHeights.size <= 1) {
    log('BOTTOM-NAV', 'pass', `Bottom nav height consistent: ${[...uniqueHeights]}px`, heights);
  } else {
    log('BOTTOM-NAV', 'warn', `Bottom nav height varies: ${[...uniqueHeights].join(', ')}px`, heights);
  }
  return heights;
}

// ─── 4. RTL Issues ───────────────────────────────────────
async function rtlChecks(page) {
  console.log('\n=== 4. RTL CHECKS ===');

  // Check dir attribute
  const dir = await page.$eval('html', el => el.getAttribute('dir'));
  log('RTL', dir === 'rtl' ? 'pass' : 'error', `html dir="${dir}"`);

  const lang = await page.$eval('html', el => el.getAttribute('lang'));
  log('RTL', lang === 'he' ? 'pass' : 'info', `html lang="${lang}"`);

  // Check text-align on body / main content
  const bodyAlign = await page.$eval('body', el =>
    window.getComputedStyle(el).direction
  );
  log('RTL', bodyAlign === 'rtl' ? 'pass' : 'warn', `body CSS direction: ${bodyAlign}`);

  // Check header-left / header-right overflow
  for (const screen of NAV_SCREENS) {
    await navigateTo(page, screen);
    const viewport = page.viewportSize();

    for (const cls of ['.header-left', '.header-right']) {
      const el = await page.$(cls);
      if (!el) continue;
      const box = await el.boundingBox();
      if (!box) continue;

      const overflowLeft = box.x < 0;
      const overflowRight = (box.x + box.width) > viewport.width + 2; // 2px tolerance
      if (overflowLeft || overflowRight) {
        log('RTL', 'error', `${cls} overflows on "${screen}": x=${box.x}, w=${box.width}, viewport=${viewport.width}`);
      }
    }
  }

  log('RTL', 'pass', 'Header left/right overflow check completed');
}

// ─── 5. Responsive Test ──────────────────────────────────
async function responsiveTest(page) {
  console.log('\n=== 5. RESPONSIVE TEST ===');

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    console.log(`\n  Testing viewport: ${vp.label}`);

    for (const screen of ['dashboard', 'receiving', 'inventory', 'backoffice']) {
      await navigateTo(page, screen);
      await page.waitForTimeout(300);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (overflow) {
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        log('RESPONSIVE', 'error',
          `Horizontal overflow at ${vp.label} on "${screen}": scrollWidth=${scrollW} > clientWidth=${clientW}`);
      }

      // Check for clipped elements (elements partially outside viewport)
      const clipped = await page.evaluate((vpWidth) => {
        const results = [];
        const els = document.querySelectorAll('.app-header, .bottom-nav, .card, .screen-content, button, input, select, h1, h2, h3');
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vpWidth + 5 || r.left < -5) {
            results.push({
              tag: el.tagName,
              class: el.className?.substring?.(0, 40) || '',
              left: Math.round(r.left),
              right: Math.round(r.right),
            });
          }
        }
        return results.slice(0, 5);
      }, vp.width);

      if (clipped.length > 0) {
        log('RESPONSIVE', 'warn',
          `Clipped elements at ${vp.label} on "${screen}"`, clipped);
      }
    }
  }

  // Reset viewport
  await page.setViewportSize({ width: 375, height: 667 });
}

// ─── 6. Accessibility ────────────────────────────────────
async function accessibilityChecks(page) {
  console.log('\n=== 6. ACCESSIBILITY ===');

  await navigateTo(page, 'dashboard');
  await page.waitForTimeout(500);

  // Missing aria-labels on interactive elements
  const missingAria = await page.evaluate(() => {
    const issues = [];
    const interactives = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
    for (const el of interactives) {
      const hasLabel = el.getAttribute('aria-label') ||
                       el.getAttribute('aria-labelledby') ||
                       el.getAttribute('title') ||
                       el.textContent?.trim();
      if (!hasLabel) {
        issues.push({
          tag: el.tagName,
          class: el.className?.substring?.(0, 50) || '',
          id: el.id || '',
          type: el.type || '',
        });
      }
    }
    return issues;
  });

  if (missingAria.length === 0) {
    log('A11Y', 'pass', 'All interactive elements have accessible labels');
  } else {
    log('A11Y', 'warn', `${missingAria.length} interactive elements missing accessible labels`, missingAria.slice(0, 10));
  }

  // Check images for alt text
  const imgsMissingAlt = await page.evaluate(() => {
    return [...document.querySelectorAll('img')].filter(img => !img.alt).map(img => ({
      src: img.src?.substring(0, 60),
      class: img.className,
    }));
  });

  if (imgsMissingAlt.length > 0) {
    log('A11Y', 'warn', `${imgsMissingAlt.length} images missing alt text`, imgsMissingAlt.slice(0, 5));
  } else {
    log('A11Y', 'pass', 'All images have alt text (or no images found)');
  }

  // Focus indicators — check if buttons have visible focus style
  const focusCheck = await page.evaluate(() => {
    const btn = document.querySelector('button.nav-item');
    if (!btn) return 'no-button-found';
    btn.focus();
    const style = window.getComputedStyle(btn);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
    };
  });
  log('A11Y', 'info', 'Focus indicator on nav button', focusCheck);

  // Check for sufficient contrast on key elements
  const contrastIssues = await page.evaluate(() => {
    function getLuminance(r, g, b) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    function parseColor(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    }
    function contrastRatio(l1, l2) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const issues = [];
    const textEls = document.querySelectorAll('h1, h2, h3, p, span, label, button, a, .card');
    for (const el of textEls) {
      const style = window.getComputedStyle(el);
      const fg = parseColor(style.color);
      const bg = parseColor(style.backgroundColor);
      if (!fg || !bg) continue;
      // Skip transparent backgrounds
      const bgAlpha = style.backgroundColor.match(/rgba.*,\s*([\d.]+)\)/);
      if (bgAlpha && parseFloat(bgAlpha[1]) < 0.1) continue;

      const fgLum = getLuminance(...fg);
      const bgLum = getLuminance(...bg);
      const ratio = contrastRatio(fgLum, bgLum);

      if (ratio < 3.0) {
        issues.push({
          tag: el.tagName,
          class: el.className?.substring?.(0, 40) || '',
          text: el.textContent?.substring(0, 30)?.trim() || '',
          fg: style.color,
          bg: style.backgroundColor,
          ratio: ratio.toFixed(2),
        });
      }
    }
    return issues.slice(0, 10);
  });

  if (contrastIssues.length === 0) {
    log('A11Y', 'pass', 'No obvious contrast issues found (ratio >= 3.0)');
  } else {
    log('A11Y', 'warn', `${contrastIssues.length} elements with low contrast ratio (<3.0)`, contrastIssues);
  }

  // Check all screens for missing labels on inputs
  for (const screen of NAV_SCREENS) {
    await navigateTo(page, screen);
    await page.waitForTimeout(300);

    const unlabeledInputs = await page.evaluate((scr) => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const issues = [];
      for (const inp of inputs) {
        const hasLabel = inp.getAttribute('aria-label') ||
                         inp.getAttribute('aria-labelledby') ||
                         inp.id && document.querySelector(`label[for="${inp.id}"]`) ||
                         inp.placeholder;
        if (!hasLabel) {
          issues.push({
            screen: scr,
            tag: inp.tagName,
            type: inp.type || '',
            id: inp.id || '',
            class: inp.className?.substring?.(0, 40) || '',
          });
        }
      }
      return issues;
    }, screen);

    if (unlabeledInputs.length > 0) {
      log('A11Y', 'warn', `Unlabeled inputs on "${screen}"`, unlabeledInputs);
    }
  }
}

// ─── 7. Visual Overflow Check ────────────────────────────
async function visualOverflowCheck(page) {
  console.log('\n=== 7. VISUAL OVERFLOW CHECK ===');

  await page.setViewportSize({ width: 375, height: 667 });

  for (const screen of NAV_SCREENS) {
    await navigateTo(page, screen);
    await page.waitForTimeout(300);

    const overflows = await page.evaluate((scr) => {
      const vpWidth = document.documentElement.clientWidth;
      const results = [];
      // Check all elements
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vpWidth + 2) {
          const tag = el.tagName.toLowerCase();
          const cls = el.className && typeof el.className === 'string'
            ? el.className.substring(0, 60) : '';
          const id = el.id || '';
          // Skip if parent already reported
          results.push({
            screen: scr,
            tag,
            class: cls,
            id,
            right: Math.round(r.right),
            vpWidth,
            overflow: Math.round(r.right - vpWidth),
          });
        }
      }
      // Deduplicate: keep the broadest offenders
      const seen = new Set();
      return results.filter(r => {
        const key = `${r.tag}.${r.class}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 10);
    }, screen);

    if (overflows.length > 0) {
      log('OVERFLOW', 'warn', `Horizontal overflow on "${screen}" at 375px`, overflows);
    }
  }

  // Global scroll check
  const hasHScroll = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  log('OVERFLOW', hasHScroll ? 'warn' : 'pass',
    hasHScroll
      ? `Page has horizontal scroll: ${await page.evaluate(() => document.documentElement.scrollWidth)}px > viewport`
      : 'No horizontal scroll detected at 375px viewport');
}

// ─── MAIN ────────────────────────────────────────────────
(async () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Arava Factory Control — Comprehensive QA Audit ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    locale: 'he-IL',
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Intercept CDN requests that may be blocked by proxy
  await page.route('**/unpkg.com/**feather**', async (route) => {
    try {
      const body = fs.readFileSync(FEATHER_LOCAL, 'utf-8');
      await route.fulfill({ status: 200, contentType: 'application/javascript', body });
    } catch (e) {
      await route.abort();
    }
  });

  // Let Firebase and external services fail silently (app falls back to local auth/offline)
  for (const pattern of [
    '**/*firebaseio.com/**',
    '**/*googleapis.com/**',
    '**/*gstatic.com/**',
    '**/script.google.com/**',
  ]) {
    await page.route(pattern, route => route.abort());
  }

  try {
    // 1. Smoke test (before login — captures initial load)
    const consoleErrors = await smokeTest(page);

    // Login
    await login(page);

    // 2. Header consistency
    await headerConsistency(page);

    // 3. Bottom nav consistency
    await bottomNavConsistency(page);

    // 4. RTL checks
    await rtlChecks(page);

    // 5. Responsive tests
    await responsiveTest(page);

    // 6. Accessibility
    await accessibilityChecks(page);

    // 7. Visual overflow
    await visualOverflowCheck(page);

  } catch (err) {
    log('FATAL', 'error', `Unhandled error: ${err.message}`, err.stack);
    console.error('FATAL:', err);
  } finally {
    await browser.close();
  }

  // ─── REPORT ──────────────────────────────────────────
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║              QA AUDIT REPORT                    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warn');
  const passes = findings.filter(f => f.severity === 'pass');
  const infos = findings.filter(f => f.severity === 'info');

  console.log(`\n  PASS:     ${passes.length}`);
  console.log(`  INFO:     ${infos.length}`);
  console.log(`  WARNINGS: ${warnings.length}`);
  console.log(`  ERRORS:   ${errors.length}`);
  console.log(`  TOTAL:    ${findings.length}\n`);

  function printSection(label, items) {
    if (items.length === 0) return;
    console.log(`\n── ${label} ${'─'.repeat(40 - label.length)}`);
    for (const f of items) {
      console.log(`  [${f.category}] ${f.message}`);
      if (f.details) {
        console.log(`    Details: ${JSON.stringify(f.details, null, 2).split('\n').join('\n    ')}`);
      }
    }
  }

  printSection('ERRORS', errors);
  printSection('WARNINGS', warnings);
  printSection('INFO', infos);
  printSection('PASSES', passes);

  // Output structured JSON
  const reportJson = JSON.stringify({
    summary: { pass: passes.length, info: infos.length, warn: warnings.length, error: errors.length, total: findings.length },
    findings,
  }, null, 2);

  const reportPath = path.join(__dirname, 'qa-audit-report.json');
  fs.writeFileSync(reportPath, reportJson);
  console.log(`\nFull report written to: ${reportPath}`);
})();
