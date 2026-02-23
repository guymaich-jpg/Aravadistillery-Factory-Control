---
name: qa-web-app
description: QA testing skill for web applications. Given a URL, performs comprehensive automated and manual testing using Playwright to find bugs, accessibility issues, security vulnerabilities, UI/UX problems, and performance bottlenecks. Use when the user provides a URL and asks to QA test, break, audit, or find bugs in a web app.
---

# QA Web App — Break It Before Users Do

**Purpose:** Systematically test any web application given a URL, find bugs, and report them in actionable detail.

**Trigger:** User provides a URL and asks to QA test, break, audit, or find bugs in it.

---

## How this skill works

When the user provides a URL to test:

1. **Confirm scope** — Ask the user what they want tested (or test everything).
2. **Launch Playwright** — Use the `qa-runner.js` script or write ad-hoc Playwright tests against the target URL.
3. **Run the checklist** — Systematically work through every category in [checklist.md](checklist.md) using the methodology in [methodology.md](methodology.md).
4. **Capture evidence** — Take screenshots, record console errors, measure timings.
5. **Report bugs** — Use the structured format in [bug-report.md](bug-report.md) for every issue found.

---

## Quick start

```bash
# Run the automated QA scanner against any URL
node tests/qa/qa-runner.js <URL>

# Or run specific Playwright test suites against the URL
TARGET_URL=<URL> npx playwright test tests/qa/
```

---

## Testing phases (in order)

| Phase | What | Reference |
|-------|------|-----------|
| 1. Smoke | Does the page load? Are there console errors? Does it render? | [methodology.md § Smoke](methodology.md) |
| 2. Functional | Do all interactive elements work? Forms, buttons, navigation? | [checklist.md § Functional](checklist.md) |
| 3. UI/UX | Visual regressions, layout breaks, responsive issues? | [checklist.md § UI/UX](checklist.md) |
| 4. Accessibility | WCAG AA compliance, keyboard navigation, screen reader? | [checklist.md § Accessibility](checklist.md) |
| 5. Security | XSS, injection, auth bypass, exposed secrets? | [checklist.md § Security](checklist.md) |
| 6. Performance | Load times, memory leaks, network waterfall? | [checklist.md § Performance](checklist.md) |
| 7. Edge cases | Empty states, boundary values, rapid clicks, back button? | [checklist.md § Edge Cases](checklist.md) |
| 8. Cross-browser | Desktop Chrome, Mobile Chrome (Pixel 5), viewport variations? | [checklist.md § Cross-browser](checklist.md) |

---

## Severity levels

| Level | Label | Definition |
|-------|-------|------------|
| P0 | **Blocker** | App crashes, data loss, security vulnerability, complete feature failure |
| P1 | **Critical** | Major feature broken, no workaround, affects most users |
| P2 | **Major** | Feature partially broken, workaround exists |
| P3 | **Minor** | Cosmetic issue, minor UX friction, edge case |
| P4 | **Enhancement** | Not a bug — suggestion for improvement |

---

## Key principles

1. **Be destructive** — Your job is to break things. Try unexpected inputs, rapid interactions, edge cases, and adversarial scenarios.
2. **Evidence over opinion** — Every bug needs a screenshot, console log, or reproducible steps. No "it feels slow."
3. **Prioritize impact** — Report blockers first. A crashing bug matters more than a misaligned pixel.
4. **Test like a user** — Follow real user flows, not just happy paths. What happens when a user makes a mistake?
5. **Automate first, then explore** — Run the automated scanner, then manually poke at anything suspicious.

---

## File index

| File | Purpose |
|------|---------|
| [SKILL.md](SKILL.md) | This file — skill overview and quick reference |
| [methodology.md](methodology.md) | Step-by-step QA testing methodology |
| [checklist.md](checklist.md) | Comprehensive test checklist by category |
| [bug-report.md](bug-report.md) | Bug report format and examples |

---

## Using Playwright for QA

The skill relies on Playwright (already installed in this project) to automate testing. When testing a target URL:

```javascript
// Basic pattern for testing any URL with Playwright
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(TARGET_URL);

  // ... run checks ...

  await browser.close();
})();
```

### What to automate vs. manual test

**Automate:**
- Console error collection
- Broken link detection
- Missing alt text / accessibility violations
- Responsive viewport testing (multiple sizes)
- Form validation (empty, invalid, boundary values)
- HTTP status codes
- Performance metrics (LCP, CLS, FID)
- Screenshot capture at key states

**Manual (Claude reviews):**
- Visual layout correctness
- Content accuracy
- UX flow logic
- Business rule validation
- Subjective quality assessment
