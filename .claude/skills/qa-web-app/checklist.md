# QA Testing Checklist

Use this checklist when testing a web application. Work through each section systematically. Mark items as PASS, FAIL (with bug report), or N/A.

---

## 1. Smoke Tests

- [ ] Page returns HTTP 200
- [ ] Page has a meaningful `<title>`
- [ ] Page body renders (not blank)
- [ ] No JavaScript errors in console on load
- [ ] No failed network requests (404s, 500s)
- [ ] All CSS/JS/image resources load successfully
- [ ] Page loads within 5 seconds on broadband
- [ ] Favicon loads (or at least doesn't 404)

---

## 2. Functional Tests

### Navigation
- [ ] All navigation links work (no dead links)
- [ ] Browser back button works correctly
- [ ] Browser forward button works correctly
- [ ] Deep links / direct URL access work
- [ ] Hash/route changes update browser URL
- [ ] Page refresh preserves current view/state

### Forms
- [ ] All form fields accept input
- [ ] Required field validation works (empty submission blocked)
- [ ] Invalid input shows clear error message
- [ ] Valid submission succeeds and provides feedback
- [ ] Form resets/clears after successful submission (if applicable)
- [ ] Dropdown menus populate correctly
- [ ] Date pickers work and enforce valid ranges
- [ ] File uploads accept correct types, reject others
- [ ] Textarea respects max length (if any)
- [ ] Auto-complete/suggestions work (if any)

### Buttons & Actions
- [ ] All buttons are clickable and respond
- [ ] Submit buttons are disabled during processing (prevent double-submit)
- [ ] Delete actions require confirmation
- [ ] Cancel/close buttons work on all modals/dialogs
- [ ] Toggle buttons reflect correct state

### Authentication (if applicable)
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Logout works and clears session
- [ ] Session persists across page refresh
- [ ] Session expires after timeout (if applicable)
- [ ] Protected pages redirect to login when unauthenticated
- [ ] Role-based access restricts features correctly

### CRUD Operations (if applicable)
- [ ] Create — new items appear in list
- [ ] Read — item details display correctly
- [ ] Update — changes persist after save
- [ ] Delete — items are removed from list
- [ ] List updates after each operation without refresh

---

## 3. UI/UX Tests

### Layout
- [ ] No horizontal scrollbar on any viewport
- [ ] Content doesn't overflow its containers
- [ ] Text doesn't overlap other elements
- [ ] Images don't stretch or distort
- [ ] Consistent spacing and alignment
- [ ] Z-index is correct (modals > content > background)
- [ ] Sticky headers/footers stay in position

### Responsive Design
- [ ] Desktop (1920x1080) — layout is correct
- [ ] Laptop (1280x720) — layout adapts
- [ ] Tablet portrait (768x1024) — layout adapts
- [ ] Tablet landscape (1024x768) — layout adapts
- [ ] Mobile (375x667) — layout is single-column
- [ ] Small mobile (320x568) — nothing breaks

### Typography
- [ ] Text is readable (appropriate size, contrast)
- [ ] No text clipping or truncation without ellipsis
- [ ] Long words/URLs don't break layout (word-break)
- [ ] Line height is comfortable for reading
- [ ] Font loads correctly (no FOUT/FOIT flash)

### Interactive Elements
- [ ] Hover states visible on desktop
- [ ] Active/pressed states provide feedback
- [ ] Focus states visible for keyboard navigation
- [ ] Disabled elements look disabled and can't be clicked
- [ ] Loading states shown during async operations
- [ ] Error states are clear and actionable
- [ ] Empty states provide guidance (not blank screens)
- [ ] Success confirmations appear after actions

### Visual Consistency
- [ ] Color scheme is consistent throughout
- [ ] Icon style is consistent
- [ ] Button styles are consistent for same action type
- [ ] Spacing rhythm is consistent
- [ ] No orphaned/mismatched UI elements

---

## 4. Accessibility Tests

### Keyboard
- [ ] All interactive elements reachable via Tab
- [ ] Tab order follows visual layout
- [ ] Focus indicator is clearly visible
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys navigate within components (tabs, menus)
- [ ] No keyboard traps (can always Tab away)
- [ ] Skip-to-content link present (if applicable)

### Screen Reader
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Headings follow logical hierarchy (h1 > h2 > h3)
- [ ] ARIA roles used correctly
- [ ] Dynamic content changes announced (aria-live)
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Page landmarks present (nav, main, footer)
- [ ] Links have descriptive text (not "click here")

### Visual
- [ ] Text contrast ≥ 4.5:1 (WCAG AA normal text)
- [ ] Large text contrast ≥ 3:1 (WCAG AA large text)
- [ ] UI not dependent on color alone (icons/text supplement)
- [ ] Respects prefers-reduced-motion
- [ ] Respects prefers-color-scheme (if applicable)
- [ ] Content readable at 200% browser zoom
- [ ] Touch targets ≥ 44x44px (ideally 48x48px)

---

## 5. Security Tests

### Input Validation
- [ ] XSS: `<script>alert(1)</script>` is escaped in all inputs
- [ ] HTML injection: `<h1>test</h1>` is escaped (no raw HTML rendered)
- [ ] SQL injection: `'; DROP TABLE --` doesn't cause errors
- [ ] Path traversal: `../../../etc/passwd` is rejected
- [ ] Null bytes: `%00` in inputs doesn't cause issues
- [ ] Unicode abuse: RTL override characters don't break layout

### Authentication & Session
- [ ] Passwords are not visible in page source
- [ ] Passwords are not logged to console
- [ ] Session tokens are not in URL
- [ ] Logout invalidates session completely
- [ ] Inactive sessions expire
- [ ] Brute force protection (rate limiting/lockout)

### Data Exposure
- [ ] No API keys in client-side code
- [ ] No secrets in localStorage visible to XSS
- [ ] No sensitive data in URL parameters
- [ ] Error messages don't leak internal details
- [ ] Source maps not exposed in production
- [ ] `.env` files not accessible via URL

### HTTP Security
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] No mixed content (HTTP resources on HTTPS page)
- [ ] Cookies have Secure and HttpOnly flags
- [ ] CORS configured correctly (not `*` for sensitive APIs)

---

## 6. Performance Tests

### Load Times
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Time to Interactive (TTI) < 3.8s
- [ ] Total page weight < 3MB

### Resources
- [ ] JavaScript is minified (production)
- [ ] CSS is minified (production)
- [ ] Images are optimized (WebP/AVIF preferred)
- [ ] No unnecessary large dependencies loaded
- [ ] Resources are cached (Cache-Control headers)
- [ ] Gzip/Brotli compression enabled

### Runtime
- [ ] No memory leaks during extended use
- [ ] No increasing CPU usage over time
- [ ] Smooth scrolling (60fps)
- [ ] Animations don't cause frame drops
- [ ] App usable on slow 3G connection

---

## 7. Edge Case Tests

### Input Boundaries
- [ ] Empty input handled gracefully
- [ ] Maximum length input handled
- [ ] Minimum value boundary works
- [ ] Maximum value boundary works
- [ ] Zero/null/undefined handled
- [ ] Negative numbers handled (if applicable)
- [ ] Decimal precision handled (if applicable)
- [ ] Date boundaries handled (leap years, DST, etc.)

### User Behavior
- [ ] Double-click doesn't cause duplicate actions
- [ ] Rapid repeated clicks don't crash the app
- [ ] Back button after form submission is safe
- [ ] Refresh during operation doesn't corrupt state
- [ ] Multiple browser tabs don't conflict
- [ ] Copy-paste into fields works correctly
- [ ] Browser autocomplete doesn't break forms

### Network
- [ ] App handles network disconnection gracefully
- [ ] App recovers when network reconnects
- [ ] Slow network doesn't cause timeouts/crashes
- [ ] Retry mechanisms work for failed requests

### State
- [ ] Fresh install / first-use experience works
- [ ] Migration from previous version works (if applicable)
- [ ] Clear storage / reset works correctly
- [ ] Export / import data works (if applicable)

---

## 8. Cross-Browser & Device Tests

### Browsers
- [ ] Chrome (latest) — Desktop
- [ ] Chrome (latest) — Mobile (Android)
- [ ] Safari (latest) — Mobile (iOS)
- [ ] Firefox (latest) — Desktop
- [ ] Edge (latest) — Desktop

### Viewport Sizes
- [ ] 1920x1080 (Full HD desktop)
- [ ] 1440x900 (Standard laptop)
- [ ] 1280x720 (Smaller laptop)
- [ ] 768x1024 (Tablet portrait)
- [ ] 375x667 (iPhone SE)
- [ ] 390x844 (iPhone 14)
- [ ] 360x800 (Android standard)
- [ ] 320x568 (Minimum supported)

---

## 9. Internationalization (if applicable)

- [ ] Language switching works
- [ ] All UI strings are translated
- [ ] RTL layout correct for RTL languages
- [ ] Date/time formats localized
- [ ] Number formats localized
- [ ] Currency formats localized
- [ ] No hard-coded strings in the UI
- [ ] Translated text doesn't break layout (longer strings)
- [ ] Unicode characters display correctly
- [ ] Placeholder text is translated
