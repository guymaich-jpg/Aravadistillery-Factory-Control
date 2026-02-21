# Accessibility

## Contents
- WCAG AA requirements
- Contrast ratio table
- Dynamic Type / font scaling
- VoiceOver labels per component
- Keyboard navigation
- Focus management
- Reduce Motion
- Screen reader announcements

---

## WCAG AA requirements

This app targets **WCAG 2.1 Level AA** compliance.

| Requirement | Threshold | Our target |
|---|---|---|
| Text contrast (normal, < 18px) | 4.5:1 minimum | ≥ 4.5:1 |
| Text contrast (large, ≥ 18px or bold ≥ 14px) | 3:1 minimum | ≥ 4.5:1 |
| UI component contrast (borders, icons) | 3:1 minimum | ≥ 3:1 |
| Focus indicator | Visible, ≥ 3:1 against adjacent | 2px accent outline |
| Touch target size | — (WCAG 2.5.8 target: 24×24) | **48×48px minimum** |
| Color as only information | Forbidden | Always pair color with text/icon |
| Keyboard accessibility | All interactions keyboard-reachable | Yes |
| Text resize | Up to 200% without content loss | Yes (fluid layout) |

---

## Contrast ratio table

Full palette measured against `--bg` (#0f0f1a):

| Token | Color | Ratio | WCAG Level |
|---|---|---|---|
| `--text` | `#e8e8f0` | **13.5:1** | AAA |
| `--text-secondary` | `#8888aa` | **4.6:1** | AA |
| `--text-muted` | `#555577` | **2.1:1** | Fail — decorative only |
| `--accent` | `#4f8cff` | **5.2:1** | AA |
| `--success` | `#34d399` | **8.1:1** | AAA |
| `--warning` | `#fbbf24` | **9.4:1** | AAA |
| `--danger` | `#f87171` | **5.7:1** | AA |

**Critical rule:** `--text-muted` (#555577) **fails WCAG AA** against the app background. Never use it for any text that conveys meaning — only for decorative placeholder text inside form inputs.

---

## Dynamic Type / font scaling

The app must remain legible when the user's operating system text size is increased.

**Rules:**
- All text sizes defined in `px` — use `rem` or `clamp()` where possible for root-scaling
- No fixed-height containers that clip text — use `min-height` not `height`
- No `overflow: hidden` on text containers without scroll fallback
- Verify layout at 200% text zoom in browser (Ctrl/Cmd + browser text zoom)

**Minimum sizes by role:**

| Role | Min size | Rationale |
|---|---|---|
| Body / record title | 14px | Apple HIG minimum body |
| Form label | 13px | HIG minimum label |
| Caption / nav label | 10px | Acceptable for nav-only labels with icons |
| Form inputs | **16px** | iOS auto-zoom prevention |
| Any functional text | **12px** | WCAG minimum legibility |

**Scaling check:** At 200% zoom, the screen-content area must still be scrollable. The stats row (3-column) may need to reflow to 1-column at high zoom. Test with browser Accessibility > Zoom: 200%.

---

## VoiceOver labels per component

Every interactive element must have an accessible name. Every status indicator must convey its meaning in text.

### Navigation

```html
<!-- Bottom nav item -->
<button aria-label="Dashboard" aria-current="page">
  <i data-feather="home" aria-hidden="true"></i>
  <span class="nav-label">Dashboard</span>
</button>
<!-- Note: nav-label is visible text, so aria-label could be omitted.
     But add it if the label text is ambiguous. -->

<!-- Header back button (no visible label) -->
<button aria-label="Go back to Fermentation list">
  <i data-feather="arrow-left" aria-hidden="true"></i>
</button>

<!-- Header icon button -->
<button aria-label="Search records">
  <i data-feather="search" aria-hidden="true"></i>
</button>
```

### Module cards

```html
<div class="module-card" role="button" tabindex="0"
     aria-label="Fermentation module — 12 records">
  <!-- All inner content is aria-hidden or redundant with aria-label -->
</div>
```

### Stat cards

```html
<div class="stat-card">
  <!-- sc-value has full aria-label spelling out the number and unit -->
  <div class="sc-value" aria-label="247 total batches">247</div>
  <div class="sc-label" aria-hidden="true">Total Batches</div>
</div>
```

### Record items

```html
<div class="record-item" role="button" tabindex="0"
     aria-label="Batch FC-001, 120 liters, wheat, approved, January 15">
  <!-- Inner spans are aria-hidden; context is in the aria-label -->
</div>
```

### Status badges

```html
<!-- Bad: color alone conveys status -->
<span class="ri-badge approved">Approved</span>

<!-- Good: text "Approved" is the label; color is supplementary -->
<span class="ri-badge approved" aria-label="Status: Approved">Approved</span>
```

### Form fields

```html
<!-- Input: linked label is the accessible name -->
<label for="batchId" class="form-label">Batch ID</label>
<input id="batchId" aria-required="true" aria-describedby="batchId-error">

<!-- Toggle: aria-label on the label element -->
<label class="toggle-switch" aria-label="Require manager approval">
  <input type="checkbox" role="switch" aria-checked="false">
</label>

<!-- Select: aria-label if no linked label -->
<select aria-label="Filter by status">
```

### Modal

```html
<div role="dialog" aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-desc">
  <h2 id="modal-title">Approval Required</h2>
  <p id="modal-desc">Enter your manager password to approve this record.</p>
</div>
```

### Toast

```html
<!-- Polite: doesn't interrupt current reading -->
<div role="status" aria-live="polite">Record saved successfully</div>

<!-- Assertive: for errors that need immediate attention -->
<div role="alert" aria-live="assertive">Failed to save. Please try again.</div>
```

---

## Keyboard navigation

### Tab order

Tab order must follow the visual reading order (top-left to bottom-right, or RTL equivalent). Never rely on `tabindex > 0` to reorder — fix the DOM order instead.

**Global tab order:**
1. App header (back button, then right actions)
2. Screen content (cards, inputs, buttons in order)
3. Bottom nav
4. FAB (visually last, logically after content)

**Modal tab order:**
1. First focusable element in modal (usually first input or Cancel)
2. Loops within modal (Tab/Shift+Tab cycle only inside)
3. Escape closes and returns focus to trigger

### Keyboard interactions per component

| Component | Key | Action |
|---|---|---|
| Button | `Enter`, `Space` | Activate |
| Module card (`role=button`) | `Enter`, `Space` | Navigate to module |
| Record item (`role=button`) | `Enter`, `Space` | Open record detail |
| Tab bar | `←` / `→` | Move between tabs |
| Toggle | `Space` | Toggle on/off |
| Select | `↑` / `↓` | Navigate options; `Enter` to select |
| Modal | `Escape` | Close modal, return focus |
| Bottom nav | `Tab` | Move between items; `Enter`/`Space` to activate |

### Focus indicator

```css
/* Applied globally — never remove the default outline */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove outline only for mouse clicks (not keyboard) */
:focus:not(:focus-visible) {
  outline: none;
}
```

**Rule:** Never use `outline: none` without also providing `:focus-visible` styling.

---

## Focus management

### On screen navigation

When navigating to a new screen, focus must move to the top of the new screen:

```js
// After screen transition completes (0.25s)
document.querySelector('.screen-content h1, .screen-content [tabindex]')?.focus();
```

### On modal open

```js
function openModal(modal) {
  modal.removeAttribute('hidden');
  const firstFocusable = modal.querySelector('button, input, [tabindex]');
  firstFocusable?.focus();
  // Trap focus inside modal — see focus trap implementation
}
```

### On modal close

```js
function closeModal(modal, triggerElement) {
  modal.setAttribute('hidden', '');
  triggerElement?.focus(); // Return to the element that opened it
}
```

### On error

When form validation fails, focus moves to the first field with an error:

```js
const firstError = form.querySelector('.field-error');
firstError?.focus();
firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

---

## Reduce Motion

See `layout.md → Reduce Motion` for the full CSS block.

**Summary of substitutions:**

| Animation | Default | Reduce Motion |
|---|---|---|
| Screen entry | `translateY + opacity` | `opacity` only |
| Screen navigation | `translateX + opacity` | `opacity` only |
| Button press | `scale(0.97)` | `opacity: 0.8` |
| Modal entry | `translateY + opacity` | `opacity` only |
| Skeleton shimmer | gradient animation | static opacity |
| Toggle | transform slide | instant |
| Toast | translateY + opacity | opacity only |

**Detection:**
```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Use this in JS when adding animations programmatically (e.g., toast). For CSS animations, the `@media` block in `layout.md` handles it automatically.

---

## Screen reader announcements

### Page title

Each screen must update `document.title` when displayed:

```js
document.title = `Fermentation — Factory Control`;
```

### Live region for dynamic content

When a list updates (filter applied, new record added), announce the result count:

```html
<div aria-live="polite" aria-atomic="true" class="sr-only" id="list-status"></div>
```

```js
document.getElementById('list-status').textContent = `Showing 12 records`;
```

### Screen-reader-only utility class

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Use `.sr-only` for text that should be read aloud but not seen — e.g., "required" next to the asterisk, or "Status: " before a badge.
