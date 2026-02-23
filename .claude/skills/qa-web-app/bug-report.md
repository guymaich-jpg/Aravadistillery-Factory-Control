# Bug Report Format

Use this format for every bug found during QA testing. Each bug should be a standalone, actionable report.

---

## Template

```markdown
### BUG-{number}: {Short descriptive title}

**Severity:** P0 (Blocker) | P1 (Critical) | P2 (Major) | P3 (Minor) | P4 (Enhancement)
**Category:** Functional | UI/UX | Accessibility | Security | Performance | Edge Case | i18n
**Browser/Device:** {Browser name + version, viewport size, device if mobile}
**URL:** {Exact URL where bug occurs}

**Description:**
{One paragraph explaining what the bug is and why it matters.}

**Steps to Reproduce:**
1. Navigate to {URL}
2. {Step 2}
3. {Step 3}
4. Observe: {What actually happens}

**Expected Result:**
{What should happen instead.}

**Actual Result:**
{What actually happens, with specific details.}

**Evidence:**
- Screenshot: {path or inline}
- Console errors: {any relevant errors}
- Network: {any failed requests}

**Environment:**
- Browser: {e.g., Chrome 120, Safari 17}
- Viewport: {e.g., 1920x1080, 375x667}
- OS: {e.g., macOS 14, Android 14}
- Network: {e.g., broadband, 3G throttled}
```

---

## Severity Guide

### P0 — Blocker
The application crashes, loses data, or has a security vulnerability. No workaround exists. Must fix before any release.

**Examples:**
- App shows blank white screen on load
- Submitting a form deletes all user data
- XSS vulnerability allows script execution
- Authentication bypass lets anyone access admin

### P1 — Critical
A major feature is completely broken. Most users would be affected. No reasonable workaround.

**Examples:**
- Login form doesn't work — users can't sign in
- Data saved in one session is lost on refresh
- Navigation is completely broken on mobile
- Required form field doesn't validate, allowing corrupt data

### P2 — Major
A feature is partially broken or a significant UX issue. A workaround exists but it's inconvenient.

**Examples:**
- Dropdown menu items cut off on tablet viewport
- Date picker doesn't work, but manual typing does
- Delete button requires two clicks to register
- Error message is wrong/misleading

### P3 — Minor
Cosmetic issues, minor UX friction, or edge cases that affect few users.

**Examples:**
- Text slightly misaligned by 2px
- Hover state color is inconsistent with rest of app
- Scrollbar flashes briefly on page load
- Placeholder text is unclear

### P4 — Enhancement
Not a bug — a suggestion for improvement based on QA observations.

**Examples:**
- "Would benefit from a loading spinner during save"
- "Empty state could include a call-to-action"
- "Consider adding keyboard shortcuts for common actions"
- "Touch targets are 40px — WCAG recommends 44px minimum"

---

## Example Bug Reports

### BUG-001: Form submits with empty required fields

**Severity:** P1 (Critical)
**Category:** Functional
**Browser/Device:** Chrome 120, Desktop 1920x1080
**URL:** https://example.com/add-record

**Description:**
The "Add Record" form can be submitted with all fields empty, bypassing client-side validation. This creates empty records in the database that break the list view.

**Steps to Reproduce:**
1. Navigate to https://example.com/add-record
2. Leave all fields empty
3. Click "Save" button
4. Observe: Form submits successfully, empty record appears in list

**Expected Result:**
Required fields should show validation errors and prevent submission.

**Actual Result:**
Form submits with no validation. Empty record created. List view shows "undefined" for the record name.

**Evidence:**
- Screenshot: `screenshots/bug-001-empty-submit.png`
- Console errors: None (validation simply missing)
- Network: POST /api/records returns 200 with empty payload

---

### BUG-002: Horizontal scroll on mobile viewport

**Severity:** P2 (Major)
**Category:** UI/UX
**Browser/Device:** Chrome Mobile, Pixel 5 (393x851)
**URL:** https://example.com/dashboard

**Description:**
On mobile viewport (393px wide), the dashboard has a horizontal scrollbar due to a table overflowing its container. This makes the app feel broken on mobile.

**Steps to Reproduce:**
1. Open https://example.com/dashboard on Pixel 5 (or 393px viewport)
2. Observe: Horizontal scrollbar appears at bottom
3. Scroll right to see table overflowing

**Expected Result:**
Table should be responsive (horizontal scroll within table container, or collapsed layout).

**Actual Result:**
Entire page scrolls horizontally. Content extends ~150px beyond viewport.

**Evidence:**
- Screenshot: `screenshots/bug-002-mobile-overflow.png`
- Console errors: None
- Element causing overflow: `.data-table` (min-width: 600px, no overflow wrapper)

---

### BUG-003: XSS in search field — script executes

**Severity:** P0 (Blocker)
**Category:** Security
**Browser/Device:** Chrome 120, Desktop
**URL:** https://example.com/search

**Description:**
The search field does not sanitize user input before rendering results. Entering a `<script>` tag causes JavaScript execution. This is a stored XSS vulnerability if search terms are logged or shared.

**Steps to Reproduce:**
1. Navigate to https://example.com/search
2. Type `<img src=x onerror=alert('XSS')>` in the search field
3. Press Enter or click Search
4. Observe: JavaScript alert pops up

**Expected Result:**
Input should be HTML-escaped before rendering. No script execution.

**Actual Result:**
Alert dialog appears with text "XSS". The input is rendered as raw HTML in the results area using `innerHTML`.

**Evidence:**
- Screenshot: `screenshots/bug-003-xss-alert.png`
- Console errors: None (XSS executed cleanly)
- Root cause: `resultsDiv.innerHTML = 'No results for ' + query` (line 342 of search.js)

---

## Summary Report Format

After completing all QA phases, provide a summary:

```markdown
# QA Summary Report

**Target:** {URL}
**Date:** {Test date}
**Tester:** Claude (automated + manual review)
**Browser:** {Primary browser tested}
**Duration:** {Total testing phases completed}

## Results Overview

| Category | Checked | Passed | Failed | N/A |
|----------|---------|--------|--------|-----|
| Smoke | X | X | X | X |
| Functional | X | X | X | X |
| UI/UX | X | X | X | X |
| Accessibility | X | X | X | X |
| Security | X | X | X | X |
| Performance | X | X | X | X |
| Edge Cases | X | X | X | X |
| Cross-browser | X | X | X | X |

## Bugs Found: {total count}

| ID | Title | Severity | Category |
|----|-------|----------|----------|
| BUG-001 | ... | P1 | Functional |
| BUG-002 | ... | P2 | UI/UX |
| ... | ... | ... | ... |

## Top Priority Issues
1. {Most critical bug}
2. {Second most critical}
3. {Third most critical}

## Recommendations
- {Key recommendation 1}
- {Key recommendation 2}
- {Key recommendation 3}
```
