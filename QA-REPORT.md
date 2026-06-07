# QA Report — Factory Control App v1.8.0

**Date:** 2026-05-17  
**E2E Suite:** 102 passed, 13 skipped, 0 failed  
**Manual Testing:** Playwright headless Chromium across all modules  

---

## Bugs Found: 6 total (1 P1, 3 P2, 2 P3)

---

### BUG #1 — Backoffice: Invite Role `<select>` Missing Closing Bracket

| Field | Value |
|-------|-------|
| **Severity** | P1 (functional — blocks admin workflow) |
| **Module** | Backoffice > Invite User |
| **File** | `script.js`, line ~2563 |

**Steps to reproduce:**
1. Login as admin
2. Navigate to Backoffice ("ניהול")
3. Look at the "Invite User" role dropdown

**Expected:** 3 options (Worker, Manager, Admin), default = Worker  
**Actual:** Only 2 options render (Manager, Admin). Worker is parsed as a `<select>` attribute due to missing `>`.

**Fix:** Add `>` to close the `<select>` tag before the first `<option>`.

---

### BUG #2 — No min/max validation on number inputs

| Field | Value |
|-------|-------|
| **Severity** | P2 (data integrity) |
| **Module** | All modules with number fields |
| **File** | `script.js`, line ~1788-1824 |

**Steps to reproduce:**
1. Navigate to Raw Materials > Add record
2. Enter `-5` in the Weight field (which has `min=0`)
3. Save

**Expected:** Form rejects negative value  
**Actual:** Record saves with weight=-5

**Affected fields:**
- rawMaterials: weight (min=0) — accepts negative
- bottling: alcohol (max=1) — accepts values > 1
- fermentation: pH (max=14) — accepts values > 14
- distillation1/2: alcohol (max=100) — accepts values > 100

**Fix:** Add validity check in `saveCurrentForm()`:
```javascript
if (f.type === 'number') {
  var el = document.querySelector('#field-' + f.key);
  if (el && !el.validity.valid) {
    missing.push(t(f.labelKey));
    el.classList.add('field-error');
  }
}
```

---

### BUG #3 — Dark Mode: FAB Button Insufficient Contrast

| Field | Value |
|-------|-------|
| **Severity** | P2 (accessibility — WCAG 1.4.11) |
| **Module** | All module list views (dark mode only) |
| **File** | `style.css` |

**Details:** FAB "+" icon (`#EFEFEC`) on sage green (`#8BAF96`) = 2.10:1 contrast ratio. Fails 3:1 WCAG AA minimum for non-text UI components. Light mode passes (11.24:1).

**Fix:** Darken FAB text in dark mode to `#1A1E1B` (5.35:1 ratio).

---

### BUG #4 — Toggle Switch Track Low Contrast (Both Themes)

| Field | Value |
|-------|-------|
| **Severity** | P2 (accessibility — WCAG 1.4.11) |
| **Module** | All forms with toggle fields |
| **File** | `style.css`, line ~998 |

**Details:** Unchecked toggle track uses `rgba(120, 120, 128, 0.25)` with no dark mode override. Contrast ~1.34:1 (light) / ~1.41:1 (dark). Track is nearly invisible.

**Fix:** Increase opacity to 0.40 or add border: `border: 1px solid var(--border);`

---

### BUG #5 — Bottling Alcohol Field UX Ambiguity

| Field | Value |
|-------|-------|
| **Severity** | P3 (UX confusion) |
| **Module** | Bottling |
| **File** | `module-fields.js` |

**Details:** The alcohol field has `max=1` and `step=0.001` (decimal format: 0.40 = 40%), but since Bug #2 allows values > 1, users could enter "40" thinking it means 40%.

**Fix:** Add placeholder text "0.40 = 40%" or add a label suffix showing the unit.

---

### BUG #6 — Header Buttons Missing :focus-visible Styles

| Field | Value |
|-------|-------|
| **Severity** | P3 (accessibility — WCAG 2.4.7) |
| **Module** | Global header |
| **File** | `style.css` |

**Details:** `.theme-btn`, `.lang-btn`, `.logout-btn` lack `:focus-visible` rules. They rely on browser defaults which may be suppressed by `background:none` and `border:none`.

**Fix:**
```css
.theme-btn:focus-visible, .lang-btn:focus-visible, .logout-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 50%;
}
```

---

## Verified Working (No Bugs)

| Area | Status |
|------|--------|
| Auth (3 roles, login/logout/session) | Pass |
| CRUD (all 6 modules) | Pass |
| Role enforcement (worker restrictions) | Pass |
| Required field validation | Pass |
| Cascading dropdowns (category → item) | Pass |
| Double-submit protection | Pass |
| XSS protection (esc() function) | Pass |
| Hebrew text storage/display | Pass |
| Hash routing + back button | Pass |
| Mobile nav (375px) | Pass |
| RTL layout | Pass |
| Dark theme (most elements) | Pass |
| Deleted record styling | Pass |
| Performance (200 records: 335ms, 60fps) | Pass |
| Empty states | Pass |
| Google Sheets link | Pass |
| Sync indicator states | Pass |
| Rate limiting (5 attempts/15min) | Pass |
| Session timeout (12h) | Pass |
| Record size limit (100KB) | Pass |
