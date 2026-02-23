# QA Testing Methodology

Step-by-step process for testing any web application.

---

## Phase 1: Smoke Testing

**Goal:** Confirm the app loads and is minimally functional.

### Steps

1. **Load the URL** — Navigate to the target URL with Playwright.
2. **Check HTTP status** — Verify the response is 200 (not 4xx/5xx).
3. **Check page title** — Is there a `<title>` tag? Is it meaningful (not "Untitled")?
4. **Check for render** — Is the `<body>` non-empty? Are key elements visible?
5. **Collect console errors** — Listen for `console.error` and `pageerror` events. Log all errors.
6. **Check for JavaScript exceptions** — Any uncaught exceptions on load?
7. **Check network failures** — Any failed resource loads (404 images, CSS, JS)?
8. **Take a baseline screenshot** — Full-page screenshot for reference.

### Playwright implementation

```javascript
// Smoke test pattern
const response = await page.goto(url, { waitUntil: 'networkidle' });
const status = response.status();
const title = await page.title();
const bodyText = await page.textContent('body');
const screenshot = await page.screenshot({ fullPage: true });

// Report
console.log(`Status: ${status}`);
console.log(`Title: ${title}`);
console.log(`Body length: ${bodyText.length} chars`);
console.log(`Console errors: ${errors.length}`);
```

---

## Phase 2: Functional Testing

**Goal:** Verify all interactive features work correctly.

### Steps

1. **Map all interactive elements** — Find all buttons, links, forms, dropdowns, modals.
2. **Test each button** — Click every button. Does it do something? Does it error?
3. **Test all forms** — Submit with valid data, empty data, invalid data.
4. **Test navigation** — Click every link/tab. Does it navigate correctly? Can you go back?
5. **Test CRUD operations** — If the app has create/read/update/delete, test all four.
6. **Test authentication** — Login, logout, session persistence, role-based access.
7. **Test state persistence** — Refresh the page. Is state preserved? Close and reopen.
8. **Test error recovery** — Trigger an error condition. Can the user recover?

### Destructive patterns to try

```
# Form inputs that break things
""                          # Empty string
" "                         # Whitespace only
"a" * 10000                 # Very long string
"<script>alert(1)</script>" # XSS attempt
"'; DROP TABLE users; --"   # SQL injection attempt
"null"                      # Literal "null" string
"undefined"                 # Literal "undefined"
"-1"                        # Negative number
"0"                         # Zero
"99999999999999"            # Very large number
"1.999999999"               # Many decimal places
"test@"                     # Incomplete email
"@test.com"                 # Email without local part
"emoji: 🎉🔥💀"             # Unicode/emoji
"RTL: مرحبا"                # Right-to-left text
"path/../../../etc/passwd"  # Path traversal
```

---

## Phase 3: UI/UX Testing

**Goal:** Find visual bugs, layout issues, and UX problems.

### Steps

1. **Desktop viewport** — Test at 1920x1080, 1440x900, 1280x720.
2. **Tablet viewport** — Test at 768x1024 (iPad), 1024x768 (landscape).
3. **Mobile viewport** — Test at 375x667 (iPhone SE), 390x844 (iPhone 14), 360x800 (Android).
4. **Small viewport** — Test at 320x568 (smallest supported).
5. **Check overflow** — Any horizontal scrollbar? Text overflow? Clipped content?
6. **Check z-index** — Do modals appear above content? Any layering bugs?
7. **Check animations** — Are transitions smooth? Any janky animations?
8. **Check dark/light mode** — If supported, test both. Check contrast.
9. **Check text wrapping** — Long text, short text, multi-line text, single character.
10. **Check empty states** — What does the app look like with no data?
11. **Take comparison screenshots** — At each viewport size.

### Playwright viewport testing

```javascript
const viewports = [
  { name: 'Desktop HD',  width: 1920, height: 1080 },
  { name: 'Desktop',     width: 1440, height: 900  },
  { name: 'Laptop',      width: 1280, height: 720  },
  { name: 'Tablet',      width: 768,  height: 1024 },
  { name: 'Mobile',      width: 375,  height: 667  },
  { name: 'Small',       width: 320,  height: 568  },
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.screenshot({
    fullPage: true,
    path: `screenshots/${vp.name}.png`
  });
}
```

---

## Phase 4: Accessibility Testing

**Goal:** Ensure WCAG AA compliance and usability for all users.

### Steps

1. **Keyboard navigation** — Can you Tab through all interactive elements? Is focus visible?
2. **Focus order** — Does Tab order follow visual layout (left→right, top→bottom)?
3. **Focus trapping** — When a modal opens, is focus trapped inside? Can you Escape out?
4. **Alt text** — Do all images have meaningful alt text?
5. **Form labels** — Does every input have an associated `<label>` or `aria-label`?
6. **Color contrast** — Do all text/background combinations meet 4.5:1 (normal) or 3:1 (large)?
7. **Heading hierarchy** — Is there a logical h1→h2→h3 structure? No skipped levels?
8. **ARIA attributes** — Are `role`, `aria-label`, `aria-expanded`, etc. used correctly?
9. **Touch targets** — Are all clickable elements at least 44x44px (ideally 48x48)?
10. **Reduced motion** — Does the app respect `prefers-reduced-motion`?
11. **Screen reader** — Are important state changes announced? (aria-live regions)

### Playwright accessibility checks

```javascript
// Check all images for alt text
const images = await page.$$('img');
for (const img of images) {
  const alt = await img.getAttribute('alt');
  const src = await img.getAttribute('src');
  if (!alt) console.log(`MISSING ALT: ${src}`);
}

// Check form inputs for labels
const inputs = await page.$$('input, select, textarea');
for (const input of inputs) {
  const id = await input.getAttribute('id');
  const ariaLabel = await input.getAttribute('aria-label');
  const label = id ? await page.$(`label[for="${id}"]`) : null;
  if (!label && !ariaLabel) {
    console.log(`MISSING LABEL: input#${id}`);
  }
}

// Check focus visibility
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => {
  const el = document.activeElement;
  const styles = getComputedStyle(el);
  return {
    tag: el.tagName,
    outline: styles.outline,
    boxShadow: styles.boxShadow,
  };
});
```

---

## Phase 5: Security Testing

**Goal:** Find common web vulnerabilities (authorized testing only).

### Steps

1. **XSS (Cross-Site Scripting)** — Inject `<script>alert(1)</script>` into every input. Check if it executes.
2. **Stored XSS** — Submit XSS payload, reload page. Does it persist and execute?
3. **HTML injection** — Submit `<h1>Injected</h1>`. Does raw HTML render?
4. **URL manipulation** — Modify query parameters, hash fragments. Any unexpected behavior?
5. **Auth bypass** — Can you access protected pages without logging in? (Direct URL access)
6. **Session handling** — Does logout actually invalidate the session? Can you reuse old tokens?
7. **Sensitive data exposure** — Check localStorage, sessionStorage, cookies for secrets.
8. **Console secrets** — Are API keys, tokens, or passwords logged to console?
9. **Source map exposure** — Are `.map` files accessible in production?
10. **HTTP headers** — Check for security headers (CSP, X-Frame-Options, HSTS).
11. **Mixed content** — Any HTTP resources on an HTTPS page?
12. **Open redirects** — Can URL parameters redirect to external sites?

### Playwright security checks

```javascript
// Check localStorage for sensitive data patterns
const storageData = await page.evaluate(() => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  return data;
});

// Look for common secret patterns
const sensitivePatterns = [
  /api[_-]?key/i, /secret/i, /token/i, /password/i,
  /private[_-]?key/i, /auth/i, /credential/i,
];

for (const [key, value] of Object.entries(storageData)) {
  for (const pattern of sensitivePatterns) {
    if (pattern.test(key) || pattern.test(value)) {
      console.log(`POTENTIAL SECRET in localStorage: ${key}`);
    }
  }
}

// Check for inline scripts (potential XSS vectors)
const inlineScripts = await page.$$eval('script:not([src])', scripts =>
  scripts.map(s => s.textContent.substring(0, 100))
);
```

---

## Phase 6: Performance Testing

**Goal:** Identify slow loads, memory leaks, and bottleneck resources.

### Steps

1. **Page load time** — Measure from navigation start to load complete.
2. **Largest Contentful Paint (LCP)** — Should be under 2.5 seconds.
3. **Cumulative Layout Shift (CLS)** — Should be under 0.1.
4. **First Input Delay (FID)** — Should be under 100ms.
5. **Network waterfall** — Which resources are largest? Any blocking resources?
6. **Image optimization** — Are images compressed? Are they sized appropriately?
7. **JavaScript bundle size** — How large are the JS files? Are they minified?
8. **Memory usage** — Monitor heap size over time. Does it grow without bound?
9. **Repeated interactions** — Click the same button 100 times. Memory leak? Slowdown?
10. **Throttled network** — Test on slow 3G. Is the app usable?

### Playwright performance metrics

```javascript
// Collect Web Vitals
const metrics = await page.evaluate(() => {
  return new Promise(resolve => {
    const data = {};

    // LCP
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      data.lcp = entries[entries.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS
    let cls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      data.cls = cls;
    }).observe({ type: 'layout-shift', buffered: true });

    // Navigation timing
    const nav = performance.getEntriesByType('navigation')[0];
    data.ttfb = nav.responseStart - nav.requestStart;
    data.domLoad = nav.domContentLoadedEventEnd - nav.startTime;
    data.fullLoad = nav.loadEventEnd - nav.startTime;

    setTimeout(() => resolve(data), 3000);
  });
});
```

---

## Phase 7: Edge Case Testing

**Goal:** Find bugs that only appear in unusual conditions.

### Steps

1. **Double-click everything** — Do buttons fire twice? Do forms submit twice?
2. **Rapid clicking** — Click a button 20 times in 1 second. Any crashes?
3. **Back button** — Navigate deep, then press back. Is state correct?
4. **Refresh mid-action** — Refresh during a form submission. What happens?
5. **Multiple tabs** — Open the app in two tabs. Do they conflict?
6. **Very long content** — Paste 10,000 characters into a text field.
7. **Special characters** — Test with `<`, `>`, `&`, `"`, `'`, `\`, `/`, `%00`.
8. **Empty state → populated** — Start with no data, add one item. Does UI update?
9. **Populated → empty** — Delete all items. Does empty state appear?
10. **Concurrent operations** — Start two actions at once. Any race conditions?
11. **Network offline** — Disconnect network mid-use. Graceful degradation?
12. **Browser zoom** — Test at 50%, 100%, 150%, 200% zoom.

### Playwright edge case patterns

```javascript
// Rapid click test
const button = page.locator('button.submit');
for (let i = 0; i < 20; i++) {
  await button.click({ force: true, noWaitAfter: true });
}

// Browser zoom simulation
await page.evaluate(() => {
  document.body.style.zoom = '200%';
});
await page.screenshot({ path: 'screenshots/zoom-200.png', fullPage: true });

// Network offline simulation
await page.context().setOffline(true);
// Interact with app...
await page.context().setOffline(false);
```

---

## Phase 8: Cross-Browser & Device Testing

**Goal:** Ensure consistent behavior across browsers and devices.

### Playwright projects for cross-browser

```javascript
// Test across multiple browser/device combos
const configs = [
  { name: 'Desktop Chrome', use: devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', use: devices['Desktop Firefox'] },
  { name: 'Mobile Chrome', use: devices['Pixel 5'] },
  { name: 'Mobile Safari', use: devices['iPhone 13'] },
  { name: 'Tablet', use: devices['iPad (gen 7)'] },
];
```

### What to check per device

- Layout doesn't break
- Touch interactions work (mobile)
- Hover states have touch alternatives
- Virtual keyboard doesn't obscure inputs
- Safe area insets respected (notch devices)
- Orientation changes handled (portrait ↔ landscape)
