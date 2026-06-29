# Factory Control App — Improvement Plan

**Date**: 2026-05-16  
**Scope**: Full codebase analysis covering UX, UI, architecture, performance, security, and testing.

---

## 1. UX Improvements

### 1.1 No Search or Filter on Record Lists
**File**: `script.js` lines 1265-1377 (`renderModuleList`)  
**Issue**: Record lists display all items with no way to search, filter by date range, or filter by field values. With growing production data, finding a specific batch record requires scrolling through the entire list.  
**Impact**: High — workers waste significant time scanning records daily.

### 1.2 No Pagination / Virtual Scrolling for Large Lists
**File**: `script.js` line 1317 — `records.map(r => renderRecordItem(r)).join('')`  
**Issue**: All records are rendered into the DOM at once. With 500+ records per module, this creates a long scroll with no lazy loading.  
**Impact**: Medium — performance degrades and usability drops with scale.

### 1.3 No Loading States During Async Operations
**File**: `script.js` lines 1876-1888 (`saveCurrentForm`)  
**Issue**: After save, `syncModuleToSheets()` and `syncInventorySnapshot()` fire async but no feedback is shown beyond the toast. The `is-loading` class is applied to the button (line 1871) but removed immediately at line 1884 before syncs complete.  
**Impact**: Medium — users may think the sync failed or double-tap.

### 1.4 No Confirmation Before Losing Unsaved Form Data
**File**: `script.js` lines 1555-1559 (cancel button handler)  
**Issue**: Pressing "Cancel" or the back button while a form has data discards everything without confirmation.  
**Impact**: Medium — accidental data loss, especially on mobile where swipe-back gestures trigger navigation.

### 1.5 Missing Batch Operations
**File**: `script.js` — no batch delete/edit anywhere  
**Issue**: No ability to select multiple records and delete, approve, or export a subset. Admin must handle one record at a time.  
**Impact**: Medium — bottling approval of 10+ records one-by-one is tedious.

### 1.6 No Onboarding / First-Time Experience
**File**: `script.js` line 1152 (`renderDashboard`) — shows empty module cards  
**Issue**: New users see a dashboard of zeros with no guidance. No walkthrough, tooltips, or suggested first actions.  
**Impact**: Low-Medium — users need external training to understand the workflow.

### 1.7 Signature Pad UX on Small Screens
**File**: `script.js` lines 1894-1927 (`initSignaturePad`)  
**Issue**: Canvas height is hardcoded at 120px (line 1900). On small phones, the drawing area is cramped. No "full-screen" signature mode.  
**Impact**: Low — signatures are illegible but still serve as confirmation.

### 1.8 Hard Refresh Every 30 Minutes
**File**: `script.js` lines 3031-3037 (`scheduleHardRefresh`)  
**Issue**: A `location.reload(true)` fires every 30 minutes. Users mid-scroll lose their place, and any typed-but-unsaved notes are lost (only `currentView === 'form'` is checked, not unsaved changes in forms that were just opened).  
**Impact**: Medium — disruptive on mobile when the user left the app backgrounded.

---

## 2. UI Improvements

### 2.1 Massive Code Duplication Between `script.js` and Extracted Files
**Files**: `script.js` lines 1020-1146 vs `nav.js` lines 1-125, `script.js` lines 1148-1260 vs `dashboard.js` lines 1-114, `script.js` lines 1930-2328 vs `inventory-ui.js` lines 1-438  
**Issue**: Functions `renderHeader`, `renderBottomNav`, `bindNav`, `renderDashboard`, `getBufferedRecords`, `scheduleInventoryRefresh`, `renderInventory`, `showSignInventoryModal`, `showImportBaseInventoryModal` exist in BOTH `script.js` AND the extracted files. The later-loaded file overwrites the earlier definition, making the `script.js` versions dead code — but they inflate the main file and create confusion.  
**Impact**: Medium — maintenance hazard; developers edit the wrong copy.

### 2.2 Bottom Nav Overflows on Mobile with 7 Items
**File**: `style.css` lines 545-606 (`.bottom-nav`, `.nav-item`)  
**Issue**: The nav bar shows up to 7 items (Dashboard, Receiving, Production, Spirit, Bottling, Inventory, Backoffice). At `font-size: 8px` with 7 items on a 320px screen, labels are unreadable and the touch targets (52px height, but split 7 ways across width) fall below the 44px WCAG AA minimum width.  
**Impact**: High — primary navigation is unusable on small phones for admin users.

### 2.3 Focus Indicators Missing on Custom Components
**File**: `style.css` — toggle switches (lines 972-1031), module cards (lines 702-768), record items (lines 1092-1161)  
**Issue**: Only `.nav-item:focus-visible` has a focus ring (line 589). Toggle switches, module cards, record items, and FAB buttons have no visible focus indicator for keyboard users.  
**Impact**: High (accessibility) — fails WCAG 2.1 SC 2.4.7.

### 2.4 Contrast Issues in Light Mode
**File**: `style.css` line 19 — `--text-secondary: rgba(37, 37, 37, 0.65)`  
**Issue**: Secondary text on cream background (`#EFEFEC`) calculates to roughly 3.8:1 contrast ratio, below WCAG AA requirement of 4.5:1 for normal text. The muted text (`0.38 opacity`) at 2.1:1 is used for important labels like `stat-label` (line 858).  
**Impact**: High (accessibility) — users with low vision cannot read stat labels and form labels.

### 2.5 RTL Layout Inconsistencies
**File**: `style.css` lines 131-145  
**Issue**: Manual RTL overrides are incomplete. The select dropdown arrow (`background-position: right 0 center`, line 962) does not get mirrored for RTL — the chevron overlaps text in Hebrew. The `detail-row .dv` has `text-align: right` hardcoded (line 1689) which is wrong in RTL (values appear on the wrong side).  
**Impact**: Medium — Hebrew users see clipped text and misaligned values.

### 2.6 No Skeleton/Placeholder During Initial Firebase Hydration
**File**: `firestore-sync.js` lines 25-58  
**Issue**: On first load with Firebase enabled, `_hydrateAllCollections()` fetches all 6 collections. During this 1-3 second window, the user sees stale localStorage data, then a full re-render flashes new content.  
**Impact**: Low — visual jank on first load.

### 2.7 Signature Pad Stroke Color Hardcoded for Dark Theme
**File**: `script.js` line 1902 — `sigCtx.strokeStyle = '#e8e8f0'`  
**Issue**: Stroke color is near-white, designed for a dark canvas. But the canvas background is `var(--bg-card)` which is cream in light mode. Light gray strokes on cream are nearly invisible.  
**Impact**: Medium — signatures are invisible in light mode.

---

## 3. Architecture & Code Quality

### 3.1 `script.js` is 3059 Lines — Proposed Logical Splits
The file contains 8 distinct sections that should be separate modules:

| Lines | Section | Proposed File |
|-------|---------|---------------|
| 1-80 | State & routing | `router.js` |
| 86-210 | Helpers, sync indicator, sheets sync | Already partially in `sync.js` (dead code in script.js) |
| 340-488 | Theme, CRM sync, inventory snapshot | Already partially in `sync.js` |
| 490-546 | Manager password modal | `modal.js` |
| 548-612 | renderApp (main controller) | Keep in `script.js` (50 lines) |
| 614-1018 | Login/Auth UI | `login-ui.js` |
| 1020-1146 | Header/Nav/BottomNav | Already in `nav.js` (dead code in script.js) |
| 1148-1260 | Dashboard | Already in `dashboard.js` (dead code in script.js) |
| 1265-1430 | Module list | `module-list.js` |
| 1432-1498 | Module detail | `module-detail.js` |
| 1500-1889 | Module form | `module-form.js` |
| 1894-1928 | Signature pad | Part of `module-form.js` |
| 1930-2328 | Inventory | Already in `inventory-ui.js` (dead code in script.js) |
| 2330-2500 | Module fields | Already in `module-fields.js` (dead code in script.js) |
| 2502-3022 | Backoffice | `backoffice.js` |
| 3024-3060 | Init | Keep in `script.js` |

### 3.2 Global Mutable State
**File**: `script.js` lines 7-10  
**Issue**: `currentScreen`, `currentModule`, `currentView`, `editingRecord` are bare globals mutated from everywhere. No event system, no state change notifications. Leads to stale state bugs (e.g., Firestore sync calls `renderApp()` while a modal is open).  
**Fix**: Wrap in a state object with a single `setState()` function that triggers re-render.

### 3.3 Full DOM Re-render on Every Navigation
**File**: `script.js` line 575 — `app.innerHTML = ...`  
**Issue**: Every call to `renderApp()` destroys the entire DOM tree and rebuilds it. This breaks focus state, kills scroll position (partially mitigated by `_scrollPositions`), and tears down/re-creates all event listeners.  
**Impact**: Medium — causes flicker, accessibility issues (screen readers re-announce page), and wasted CPU.

### 3.4 Event Listeners Leaked on Every Render
**File**: `script.js` line 75 — `window.addEventListener('popstate', ...)` called once globally is fine. But `bindNav()` (line 1093) re-adds click listeners to `.nav-item` elements on every render. Since innerHTML replaces elements, old listeners are GC'd — but the pattern is fragile if any element persists.  
**Impact**: Low — no actual leak today, but the architecture invites bugs.

### 3.5 Duplicated `getModuleFields()` Definition
**File**: `script.js` lines 2372-2500 AND `module-fields.js` lines 89-218  
**Issue**: The function is defined twice. Since `module-fields.js` is loaded via `<script>` in `<head>` and `script.js` in `<body>`, the `script.js` version wins (later definition). The `module-fields.js` version is dead code.  
**Impact**: High (maintenance) — a developer may edit the wrong copy.

### 3.6 Duplicated `syncModuleToSheets()` / `syncInventorySnapshot()` / `syncCrmStockLevels()`
**File**: `script.js` lines 213-488 AND `sync.js` lines 1-289  
**Issue**: Both define the same sync functions. `sync.js` is NOT loaded in `index.html` (checked the script tags), so the `script.js` versions are the ones that run. But `sync.js` exists as if it should be the canonical source.  
**Impact**: High (maintenance) — file exists but is unused; confusing.

### 3.7 No Error Boundaries
**Issue**: If any render function throws (e.g., a null record in the list), the entire app crashes with no recovery. There is no try/catch around `renderApp()`.  
**Impact**: Medium — a single corrupted localStorage record can white-screen the app.

---

## 4. Performance

### 4.1 All Records Loaded for Dashboard Stats
**File**: `script.js` lines 1163-1179 (now in `dashboard.js`)  
**Issue**: `renderDashboard()` calls `getData()` on every store key, parsing all JSON from localStorage, iterating all records to compute totals, then repeating the same to find recent records. With 6 modules x 500 records, that is 3000 JSON-parsed records on every dashboard render.  
**Fix**: Cache computed stats and invalidate only on data change.

### 4.2 `syncInventorySnapshot()` Recomputes Full Inventory on Every Save
**File**: `sync.js` lines 205-289 (also in `script.js` lines 382-488)  
**Issue**: Every time any record is saved, all 6 module stores are read and processed to compute the full inventory snapshot. This happens on every add/edit/delete.  
**Impact**: Medium — 100ms+ on devices with 1000+ records.

### 4.3 Font Loading: 4 Font Families = ~250KB
**File**: `index.html` lines 37-39  
**Issue**: Loading Trirong, Quattrocento Sans, Inter, and Noto Sans Thai. The Thai font (Noto Sans Thai) is loaded but Thai language support was removed ("Thai name field removed" — `script.js` line 2905). Inter Hebrew glyphs are only needed for Hebrew users.  
**Fix**: Remove Noto Sans Thai; use `font-display: swap` and subset Inter.

### 4.4 Feather Icons Replaced on Every Render
**File**: `script.js` line 602 — `feather.replace()`  
**Issue**: After every `renderApp()` call, `feather.replace()` scans the entire DOM for `<i data-feather>` elements and replaces them with SVGs. This is O(n) on the full DOM each time.  
**Fix**: Replace feather with inline SVG sprites, or call `feather.replace()` only on the changed subtree.

### 4.5 localStorage Parsed Repeatedly in Same Call Stack
**File**: `data.js` — `getData()` called multiple times per render  
**Issue**: `getData('factory_bottling')` is called in `renderDashboard`, `renderInventory`, and `syncInventorySnapshot` — each call re-parses the same JSON string. No caching layer.  
**Fix**: Add a read-through cache that invalidates on `setData()`.

---

## 5. Security

### 5.1 Firebase API Key Exposed in Client Code
**File**: `firebase.js` lines 13-20  
**Issue**: The Firebase config (API key, project ID) is embedded in source. This is standard for Firebase client apps (the key is not secret), BUT the comment on lines 5-10 warns about Firestore security rules. If rules are still in test mode, anyone can read/write all data.  
**Mitigation**: Verify Firestore security rules require authentication. The code already uses Firebase Auth, so rules should enforce `request.auth != null`.

### 5.2 FNV Hash for Passwords is Not Cryptographic
**File**: `auth.js` lines 6-16 (`hashPassword`)  
**Issue**: FNV-1a produces a 32-bit hash. With only ~4 billion possible outputs, a brute-force or rainbow table attack is trivial. This is acknowledged ("not a substitute for server-side bcrypt") but passwords are stored locally in this format.  
**Mitigation**: Firebase Auth is the primary auth mechanism now. Local hash is only a fallback. But if a device is compromised, all password hashes are trivially reversible.  
**Impact**: Medium — mitigated by Firebase Auth being primary.

### 5.3 XSS: `el()` Helper Uses innerHTML
**File**: `script.js` line 91 — `if (html !== undefined) e.innerHTML = html`  
**Issue**: The `el()` function sets innerHTML directly. All callers MUST use `esc()` for user data. One missed call creates XSS. Grep through the codebase shows proper `esc()` usage in most places, but some template literals interpolate variables like `${r._color}` (line 1222) without escaping (CSS color variables are safe, but the pattern is fragile).  
**Impact**: Low (currently safe) — but the pattern is an ongoing risk.

### 5.4 CSP Allows `unsafe-inline` for Scripts
**File**: `index.html` line 14  
**Issue**: `script-src 'self' ... 'unsafe-inline'` is needed for the inline `<script>` on lines 18-33 (theme/lang preload). This negates much of CSP's XSS protection.  
**Fix**: Move the inline script to a separate file or use a nonce-based CSP (requires server support).

### 5.5 Manager Password Check is Client-Side Only
**File**: `script.js` lines 523-545 (`showManagerPasswordModal`)  
**Issue**: The delete confirmation checks the hashed password against localStorage. An attacker with DevTools access can skip this entirely by calling `deleteRecord()` directly, or by modifying localStorage to change a user's role to admin.  
**Impact**: Low — this is an offline-first app; physical access to the device is required.

### 5.6 Session Token is Just a JSON Object in localStorage
**File**: `auth.js` lines 353-377 (`getSession`)  
**Issue**: No signature or integrity check on the session object. Anyone with DevTools can write `{username: "guymaich", role: "admin", loginTime: Date.now()}` to localStorage and gain admin access. Backend API calls are protected by Firebase ID tokens, but local app RBAC is fully client-side.  
**Impact**: Medium — all client-side RBAC is bypassable.

---

## 6. Testing

### 6.1 Test Coverage Gaps
**Current coverage**: 9 E2E spec files + 42 browser unit tests.

**Missing test scenarios**:
- **Inventory sign workflow**: No E2E test for the sign-inventory modal  
- **Import base inventory**: No test for the import flow  
- **Custom dropdown "Add New"**: No test for adding custom options  
- **Session timeout**: No test for 12h inactivity expiry  
- **Firestore real-time merge**: `09-firestore-sync.spec.js` exists but merge conflict resolution is hard to test  
- **Offline/online transitions**: No test for behavior when Firebase is unreachable  
- **CSV export**: No test validates export content  
- **Spirit Pipeline screen**: No E2E test for the spirit stock view  

### 6.2 Test Reliability Issues
**File**: `tests/e2e/03-modules.spec.js` lines 30-35  
**Issue**: Uses `waitForTimeout(300)` as a timing hack for cascading dropdown to populate. Flaky on slow CI runners.  
**Fix**: Use `waitForSelector` for the populated option.

### 6.3 Test Isolation Concern
**File**: `tests/e2e/helpers.js` lines 28-36 (`freshApp`)  
**Issue**: `freshApp()` clears localStorage keys starting with `factory_` then reloads. But Firebase may re-hydrate data from Firestore during the test, causing non-deterministic behavior if the test environment has a live Firebase connection.  
**Fix**: Mock/disable Firebase in test environment via a URL parameter or env flag.

---

## Prioritized Improvement Plan

---

### Option A: Quick Wins (1-2 Days)

High impact, low effort changes that can ship immediately:

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| A1 | **Remove dead code from `script.js`**: Delete the duplicated functions that are overwritten by `nav.js`, `dashboard.js`, `inventory-ui.js`, `module-fields.js`. Remove `sync.js` duplicate functions from `script.js`. | 2h | Reduces `script.js` from 3059 to ~1500 lines. Eliminates confusion. |
| A2 | **Add search/filter to record lists**: Add a text input at the top of `renderModuleList()` that filters records by any visible field. Client-side filter, no backend needed. | 3h | Dramatically improves usability for finding records. |
| A3 | **Fix signature pad in light mode**: Set `sigCtx.strokeStyle` based on current theme (`data-theme` attribute). | 15min | Fixes invisible signatures in light mode. |
| A4 | **Fix WCAG contrast**: Increase `--text-secondary` opacity from 0.65 to 0.75, and `--text-muted` from 0.38 to 0.55 in light mode. | 30min | Fixes accessibility compliance for labels and secondary text. |
| A5 | **Add focus-visible outlines to interactive components**: Add `:focus-visible` rules for `.module-card`, `.record-item`, `.toggle-switch`, `.fab-add`, `.btn`. | 1h | Fixes WCAG 2.4.7 keyboard focus visibility. |
| A6 | **Remove Noto Sans Thai font**: Remove from Google Fonts URL in `index.html`. Thai was removed from the app. | 5min | Saves ~60KB download. |
| A7 | **Add unsaved-changes confirmation**: Add a `beforeunload` listener and check dirty state on cancel/back navigation. | 1h | Prevents accidental data loss. |
| A8 | **Fix RTL select arrow**: Use logical property `background-position: inline-end 14px center` or add RTL override for `.form-select`. | 30min | Fixes Hebrew dropdown UX. |

**Total estimated effort**: ~8-9 hours

---

### Option B: Medium Investment (1 Week)

Significant UX and architecture improvements:

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| B1 | **Split `script.js` into logical modules**: Extract to `router.js`, `login-ui.js`, `module-list.js`, `module-detail.js`, `module-form.js`, `backoffice.js`, `modal.js`. Wire into `index.html` in correct order. | 4h | Maintainability: each file is 100-300 lines. |
| B2 | **Add pagination (load-more) to record lists**: Show 20 records initially with a "Load More" button. | 3h | Performance with large datasets. |
| B3 | **Add getData() caching layer**: Implement a read-through cache in `data.js` that returns cached parse results until `setData()` invalidates. | 2h | Eliminates repeated JSON.parse calls (5-10x per render cycle). |
| B4 | **Replace full DOM re-render with targeted updates**: For list views, diff the record list and only update changed items. For forms, never destroy while active. | 8h | Eliminates flicker, preserves focus/scroll, improves perceived speed. |
| B5 | **Add batch-approve for bottling**: Allow selecting multiple pending records and approving in one action. | 4h | Major time saver for admin workflow. |
| B6 | **Add date-range filter to lists**: Filter controls for "This week", "This month", "Custom range". | 3h | Essential for reviewing historical data. |
| B7 | **Centralized state management**: Create `state.js` with `getState()`, `setState()`, and an event bus. Replace global mutations with state transitions. | 6h | Eliminates stale-state bugs, makes Firestore sync safer. |
| B8 | **Add error boundary to renderApp()**: Wrap in try/catch, show "Something went wrong" with a reload button instead of white screen. | 1h | Prevents total app crash from data corruption. |
| B9 | **Improve bottom nav for mobile**: Collapse to 5 items max, put Backoffice behind a "more" menu. | 3h | Fixes nav overflow on small screens. |
| B10 | **Replace `feather.replace()` with SVG sprite**: Inline the ~20 used icons as an SVG sprite sheet, reference via `<use>`. | 3h | Eliminates 50ms+ DOM scan on each render, removes CDN dependency. |

**Total estimated effort**: ~37 hours (5 working days)

---

### Option C: Full Refactor (2-3 Weeks)

Comprehensive modernization while keeping the "no build step" philosophy:

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| C1 | **All items from Options A and B** | ~45h | Foundation |
| C2 | **Implement virtual scrolling for lists**: Use IntersectionObserver to render only visible records. Handle 10,000+ records smoothly. | 8h | Enterprise-scale performance. |
| C3 | **Add IndexedDB storage layer**: Replace localStorage (5MB limit) with IndexedDB for production data. Keep localStorage for session/preferences only. | 12h | Removes storage quota risk, enables structured queries. |
| C4 | **Add offline queue with conflict resolution**: When offline, queue writes. On reconnect, replay queue with conflict detection (last-writer-wins with user notification). | 16h | True offline-first reliability. |
| C5 | **Move auth session to HttpOnly cookie via backend**: Issue JWT from backend, validate server-side. Remove client-side RBAC bypass vulnerability. | 12h | Proper security architecture. |
| C6 | **Add Service Worker for true PWA**: Cache app shell, serve offline, background sync for Sheets/Firebase. | 10h | App works fully offline, instant load on repeat visits. |
| C7 | **Add comprehensive E2E test coverage**: Write tests for inventory sign, import base, spirit pipeline, offline mode, session timeout, CSV export. Target 90%+ workflow coverage. | 12h | Confidence in deployments. |
| C8 | **Replace FNV hash with Web Crypto PBKDF2**: Use `crypto.subtle.deriveBits` for local password hashing fallback. Still not as good as server bcrypt, but 1000x harder to brute-force. | 4h | Better security for offline auth fallback. |
| C9 | **Add i18n plural support and date formatting**: Replace simple key lookup with ICU MessageFormat for proper plurals. Use `Intl.RelativeTimeFormat` for "2 hours ago" style timestamps. | 6h | Better bilingual UX. |
| C10 | **Refactor CSS with CSS Custom Properties for spacing**: Add `--space-xs`, `--space-sm`, etc. Replace hardcoded px values. Add CSS Container Queries for adaptive layouts. | 8h | Design system consistency, easier future changes. |
| C11 | **Add data visualization to dashboard**: Show production trend charts (last 7 days) using lightweight canvas rendering. | 8h | Executive-level visibility into production trends. |
| C12 | **Move CSP inline script to separate file + add nonce**: Remove `unsafe-inline` from CSP. | 2h | Better XSS protection. |

**Total estimated effort**: ~12-15 working days

---

## Priority Ranking (if doing incrementally)

1. **A1** — Dead code removal (immediate, zero risk)
2. **A3** — Signature pad fix (bug fix, 15 minutes)
3. **A4 + A5** — Accessibility fixes (legal compliance risk)
4. **A2** — Search/filter (highest user-facing value)
5. **A6** — Remove unused font (free performance win)
6. **B1** — Split script.js (enables all future work)
7. **B3** — getData caching (instant performance win)
8. **B8** — Error boundary (prevents crashes)
9. **B9** — Bottom nav fix (mobile usability)
10. **B7** — State management (architectural foundation)

---

## Architecture Decision: Keep No-Build-Step?

The current "pure HTML/CSS/JS" approach has genuine benefits:
- Zero toolchain dependencies
- Any developer can start in 5 seconds
- No build failures in CI
- Direct source debugging in browser

**Recommendation**: Keep the no-build-step approach but adopt ES modules (`type="module"` in script tags). This gives:
- Clean imports/exports without global namespace pollution  
- Native browser support (all modern mobile browsers)
- Lazy loading of heavy modules (inventory, backoffice)
- No bundler required

This is the natural evolution that preserves all current benefits while fixing the global-scope architecture.
