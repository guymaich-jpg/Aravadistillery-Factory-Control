# Layout & Spacing

## Contents
- Spacing system
- App shell structure
- 12-column grid
- Responsive breakpoints
- Safe area handling
- Easing curves & animation
- Reduce Motion
- RTL layout rules

---

## Spacing system

**Base unit: 8px.** All values are multiples of 4.

| Step | Value | CSS var idea | Typical use |
|---|---|---|---|
| `2xs` | 4px | — | Icon-to-label, dot-to-text, inline micro |
| `xs` | 8px | — | Header item gaps, time-range inputs |
| `sm` | 12px | — | Card grid gap, stats grid, list gap |
| `input-pad` | 14px | — | Input vertical padding |
| `base` | 16px | — | Screen H-padding, form-group margin-bottom |
| `card` | 20px | — | Welcome card internal padding |
| `section` | 24px | — | Between major page sections |
| `lg` | 32px | — | Large section separation |
| `xl` | 48px | — | Full-page vertical centering |
| `2xl` | 64px | — | Hero section top padding |
| `3xl` | 96px | — | — |
| `nav-clear` | 100px | — | Screen-content bottom padding (above sticky nav) |

**Rule:** Never invent values outside this scale. Always use a multiple of 4. When in doubt, pick the next step up.

---

## App shell structure

```
body  (min-height: 100svh, background: var(--bg))
└── #app  (display: flex, flex-direction: column, height: 100%, max-width: 600px)
    ├── .app-header      (sticky top: 0, min-height: 52px, z-index: 100)
    ├── .screen-content  (flex: 1, overflow-y: auto, padding: 16px 16px 100px)
    └── .bottom-nav      (position: sticky, bottom: 0, z-index: 100)
```

**Login screen exception:** No header or bottom nav. Body centers vertically. Form max-width: 400px.

**Screen transitions:** `.screen-content` is the animation target. Each new screen enters with `fadeInUp` by default, or directional slide for navigating forward/back.

---

## 12-column grid

The app is phone-first with a max-width of 600px, so a 12-column grid maps to:

| Breakpoint | Container | Gutter | Margin |
|---|---|---|---|
| Mobile 375px | 343px (375 − 32) | 12px | 16px each side |
| Tablet 768px | 704px (capped at 600px app) | 16px | 16px each side |
| Desktop 1024px | 568px (app frame) | 16px | 16px each side |

### Column definitions

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
  padding: 0 16px;
}

/* Module cards: 6 cols each (2-up on mobile) */
.col-6  { grid-column: span 6; }

/* Module cards: 4 cols each (3-up on tablet+) */
@media (min-width: 768px) {
  .col-md-4 { grid-column: span 4; }
}

/* Full-width form fields */
.col-12 { grid-column: span 12; }

/* Side-by-side date inputs */
.col-6  { grid-column: span 6; }
```

### Named grid areas

```css
/* Stats row — always 3 equal columns */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* Module cards grid */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 768px) {
  .module-grid { grid-template-columns: repeat(3, 1fr); }
}
```

---

## Responsive breakpoints

| Breakpoint | Name | Context |
|---|---|---|
| 375px | `mobile` | Default — phone, full bleed |
| 481px | `mobile-lg` | App frame border/shadow appears |
| 768px | `tablet` | Module grid → 3 col; wider login form |
| 1024px | `desktop` | App centered, 90vh, rounded corners |

```css
/* 481px — app frame */
@media (min-width: 481px) {
  #app {
    max-width: 480px;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    box-shadow: 0 0 40px rgba(0,0,0,0.3);
  }
}

/* 768px — tablet */
@media (min-width: 768px) {
  .module-grid { grid-template-columns: repeat(3, 1fr); }
  .login-form  { max-width: 460px; }
}

/* 1024px — desktop */
@media (min-width: 1024px) {
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  #app {
    height: 90vh;
    max-height: 900px;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 0 60px rgba(0,0,0,0.4);
  }
}
```

---

## Safe area handling

Always account for notched devices (iPhone dynamic island, home indicator):

```css
/* Header — notch area */
.app-header {
  padding-top: max(8px, env(safe-area-inset-top));
}

/* Bottom nav — home indicator */
.bottom-nav {
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

/* Screen content — bottom clearance */
.screen-content {
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}
```

---

## Easing curves & animation

### Named easing functions

| Name | CSS | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Things entering the screen |
| `ease-in` | `cubic-bezier(0.4, 0.0, 1, 1)` | Things leaving the screen |
| `ease-in-out` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Elements moving within screen |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Press/release feedback (subtle overshoot) |

### Screen transitions

```css
/* Default entry — most screen loads */
@keyframes fadeInUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
/* duration: 0.22s, easing: ease-out */

/* Navigate forward — going deeper into a record */
@keyframes slideInFromRight {
  from { transform: translateX(30%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
/* duration: 0.25s, easing: ease-out */

/* Navigate back — returning up the hierarchy */
@keyframes slideInFromLeft {
  from { transform: translateX(-30%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
/* duration: 0.25s, easing: ease-out */

/* Modal entry */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* duration: 0.2s, easing: ease-out */
```

**Direction rule (Apple + Whoop):**
- Slide right → going deeper (more specific)
- Slide left → going back (less specific)
- Fade up → new context / new screen not in hierarchy

### Duration table

| Interaction | Duration | Easing |
|---|---|---|
| Color/opacity transition | 0.2s | ease |
| Screen entry | 0.22s | ease-out |
| Screen navigation | 0.25s | ease-out |
| Button press (scale) | 0.1s | spring |
| Modal entry | 0.2s | ease-out |
| Toggle slider | 0.3s | ease-in-out |
| Toast entry | 0.3s | ease-out |
| Skeleton shimmer | 1.4s | linear, infinite |

---

## Reduce Motion

All animations must have a Reduce Motion alternative. When `prefers-reduced-motion: reduce` is active, substitute transforms with opacity fades.

```css
@media (prefers-reduced-motion: reduce) {
  /* Screen transitions */
  .screen { animation: none; opacity: 1; }

  /* Button press — no scale */
  .btn:active,
  .module-card:active,
  .record-item:active {
    transform: none;
    opacity: 0.8;
  }

  /* Modal — fade only */
  .manager-pwd-modal .mpd-dialog {
    animation: none;
    opacity: 1;
  }

  /* Toast — no translate */
  .toast { animation: none; opacity: 1; }

  /* Skeleton — static */
  .sk-line { animation: none; opacity: 0.6; }

  /* Toggle — instant */
  .slider { transition: none; }
}
```

**Rule:** Never suppress feedback entirely. If you remove a transform, always preserve an opacity change so users know the UI responded.

---

## RTL layout rules

Applied when `html[dir="rtl"]` (Hebrew language, `lang="he"`).

```css
/* Header row reverses */
.app-header { flex-direction: row-reverse; }

/* Back button icon flips */
[dir="rtl"] .back-btn i { transform: scaleX(-1); }

/* Select arrow moves to left side */
[dir="rtl"] .form-select {
  background-position: left 14px center;
  padding-right: 14px;
  padding-left: 36px;
}

/* Required asterisk margin flips */
[dir="rtl"] .req {
  margin-left: 0;
  margin-right: 2px;
}

/* Language toggle repositions */
[dir="rtl"] .lang-toggle {
  right: auto;
  left: 16px;
}

/* Detail rows — value aligns to left side */
[dir="rtl"] .dr-value { text-align: left; }
[dir="rtl"] .ri-date  { margin-right: auto; margin-left: 0; }
```

When adding new flex or grid layouts:
1. Check that `flex-direction` or `text-align` behaves correctly in RTL
2. Use logical CSS properties where possible: `margin-inline-start` over `margin-left`
3. Test in Hebrew (`?lang=he`) before committing
