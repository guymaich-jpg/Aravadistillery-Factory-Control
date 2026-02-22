# Component Patterns

## Contents
- Buttons (6 variants)
- Cards (module, stat, welcome, detail)
- Forms (inputs, selects, toggles, signature pad)
- Navigation (header, bottom nav, tab bar)
- Modals
- Lists & records
- Badges & pills
- Progress indicators & skeletons
- Toast notifications

---

## Buttons

### Anatomy
```
[  icon?  ] [  label  ]
     ↑            ↑
  optional    required
```

### 6 variants

| Class | Background | Text | Use |
|---|---|---|---|
| `.btn-primary` | `var(--accent)` | white | Single primary CTA per screen |
| `.btn-secondary` | `var(--bg-surface)` | `var(--text)` | Cancel, secondary action |
| `.btn-danger` | `var(--danger)` at 15% opacity | `var(--danger)` | Delete, reject — destructive only |
| `.btn-success` | `var(--success)` at 15% opacity | `var(--success)` | Approve, confirm positive |
| `.btn-ghost` | transparent | `var(--accent)` | Tertiary, inline actions |
| `.btn-icon` | transparent | `var(--text-secondary)` | Icon-only header actions |

### States per variant

| State | Visual | CSS |
|---|---|---|
| Default | As specified above | — |
| Hover | 10% lighter background | `filter: brightness(1.1)` |
| Active / press | Scale down | `transform: scale(0.97)` |
| Disabled | Faded | `opacity: 0.5; pointer-events: none` |
| Loading | Spinner + disabled | `class="is-loading"` + `disabled` attribute |
| Focus | Blue outline | `outline: 2px solid var(--accent); outline-offset: 2px` |

### Specs
- Min height: **48px**
- Padding: `12px 20px`
- Border-radius: `var(--radius-sm)` (8px)
- Font: 15px / 600

### FAB (Floating Action Button)
```html
<button class="fab-add" aria-label="Add new record">
  <i data-feather="plus"></i>
</button>
```
- 52×52px circle (`border-radius: 50%`)
- Background: `var(--accent)`
- Shadow: `0 4px 16px rgba(79,140,255,0.4)`
- Position: `fixed; bottom: 80px; right: 16px; z-index: 200`
- Entry animation: `fadeInUp 0.3s`

### Accessibility
- All buttons need accessible text — either visible label or `aria-label`
- Icon-only (`.btn-icon`): **must** have `aria-label`
- Loading state: add `aria-busy="true"` + `aria-label="Saving, please wait"`
- Keyboard: `Enter` and `Space` both trigger; visible focus ring always shown

### Usage guidelines
- ✅ One `.btn-primary` per screen
- ✅ `.btn-danger` only for irreversible destructive actions (delete, reject)
- ❌ Never two primary buttons side by side
- ❌ Never use `--danger` red for warnings or highlights

---

## Cards

### Module card

**Anatomy:**
```
┌─── [3px accent bar] ────────────┐
│  [icon bg]  Module Name         │
│             12 records          │
└─────────────────────────────────┘
```

```html
<div class="module-card" data-module="fermentation" role="button" tabindex="0"
     aria-label="Fermentation — 12 records">
  <div class="mc-icon"><i data-feather="droplet" aria-hidden="true"></i></div>
  <div class="mc-info">
    <div class="mc-title">Fermentation</div>
    <div class="mc-count">12 records</div>
  </div>
</div>
```

States:
- Default: `var(--bg-card)`, top border `3px solid [module-color]`
- Hover: `background: var(--bg-surface)`
- Press: `transform: scale(0.97)`
- Focus: `outline: 2px solid var(--accent); outline-offset: 2px`

Specs: padding 16px · border-radius 12px · icon bg = module-color at 20% opacity, 40×40px rounded 8px

---

### Stat card

**Anatomy:**
```
┌──────────────┐
│     247      │  ← display size, --text
│ Total Batches│  ← caption, --text-secondary
└──────────────┘
```

```html
<div class="stat-card">
  <div class="sc-value" aria-label="247 total batches">247</div>
  <div class="sc-label">Total Batches</div>
</div>
```

- Always used in `.stats-row` (3-column grid)
- Value: 24px/700, Label: 12px/600 `--text-secondary`
- No interactive states — purely display

---

### Welcome card

- Gradient background: `linear-gradient(135deg, var(--accent), #8b5cf6)`
- All text white
- Used **only on the dashboard** — do not reuse on other screens
- Contains: user greeting, role pill, optional quick-action buttons

---

### Detail card

**Anatomy:**
```
┌─────────────────────────────────┐
│ Batch ID          FC-2024-001   │
│ Volume            120L          │
│ Created           Jan 15        │
└─────────────────────────────────┘
```

```html
<div class="detail-card">
  <div class="detail-row">
    <span class="dr-label">Batch ID</span>
    <span class="dr-value">FC-2024-001</span>
  </div>
</div>
```

- Label: 13px/500 `--text-secondary`, Value: 14px/600 `--text`
- Each row: `padding: 12px 0; border-bottom: 1px solid var(--border)`
- Last row: no bottom border

---

## Forms

### Form group anatomy

```
[Form label *]          ← 13px/600 --text-secondary
[                    ]  ← input, 48px min height
[Error message]         ← 12px/500 --danger (only on error)
```

```html
<div class="form-group">
  <label class="form-label" for="batchId">
    Batch ID <span class="req" aria-label="required">*</span>
  </label>
  <input
    type="text"
    id="batchId"
    class="form-input"
    placeholder="FC-2024-..."
    aria-required="true"
    aria-describedby="batchId-error"
  >
  <div id="batchId-error" class="field-error-msg" role="alert" hidden>
    Batch ID is required
  </div>
</div>
```

### Input states

| State | Visual |
|---|---|
| Default | `var(--bg-input)` bg, `var(--border)` border |
| Focus | border-color → `var(--accent)` |
| Error | Add `.field-error` class → border-color → `var(--danger)` |
| Disabled | `opacity: 0.5; pointer-events: none` |
| Filled | Same as default |

Specs: `padding: 12px 14px` · `border-radius: 8px` · `font-size: 16px` (iOS zoom prevention) · `min-height: 48px`

### Select

```html
<select class="form-select" aria-label="Module type">
  <option value="">Select module...</option>
</select>
```

- Custom arrow: SVG background-image `right 14px center`
- Padding-right: 36px (avoid text under arrow)
- RTL: arrow at `left 14px center`, padding-left: 36px

### Toggle switch

```html
<label class="toggle-switch" aria-label="Enable approval required">
  <input type="checkbox" role="switch" aria-checked="false">
  <span class="slider" aria-hidden="true"></span>
</label>
```

- Track off: `var(--border)` · Track on: `var(--success)`
- Thumb: 22px white circle, `transition: transform 0.3s`
- Width: 48px, Height: 28px (thumb 22px + 3px inset each side)

### Signature pad

```html
<div class="sig-pad-wrapper" role="img" aria-label="Signature capture area">
  <canvas id="sigCanvas" aria-hidden="true"></canvas>
  <button class="sig-clear-btn" aria-label="Clear signature">Clear</button>
</div>
```

- Canvas: 120px height, `var(--bg-input)` background
- Clear button: absolute top-right, 6px inset, `var(--text-secondary)`

### Form keyboard behavior
- `Tab` moves to next field
- `Shift+Tab` moves to previous field
- `Enter` in last field submits form (if single-field sections)
- `Space` toggles toggle switches
- Error messages use `role="alert"` — announced by screen readers on appear

---

## Navigation

### App header

**Anatomy:**
```
┌──────────────────────────────────────────────────┐
│ [← back]   Screen Title          [action] [lang] │
└──────────────────────────────────────────────────┘
```

```html
<header class="app-header" role="banner">
  <button class="btn-icon back-btn" aria-label="Go back">
    <i data-feather="arrow-left" aria-hidden="true"></i>
  </button>
  <h1 class="header-title">Fermentation</h1>
  <div class="header-actions">
    <button class="btn-icon" aria-label="Search records">
      <i data-feather="search" aria-hidden="true"></i>
    </button>
  </div>
</header>
```

Specs: `min-height: 52px` · `padding: max(8px, env(safe-area-inset-top)) 12px 8px` · `position: sticky; top: 0; z-index: 100` · `background: var(--bg-card)` · `border-bottom: 1px solid var(--border)`

---

### Bottom nav

```html
<nav class="bottom-nav" role="navigation" aria-label="Main navigation">
  <button class="nav-item active" aria-label="Dashboard" aria-current="page">
    <i data-feather="home" aria-hidden="true"></i>
    <span class="nav-label">Dashboard</span>
  </button>
  <button class="nav-item" aria-label="Records">
    <i data-feather="list" aria-hidden="true"></i>
    <span class="nav-label">Records</span>
  </button>
</nav>
```

States:
- Default: icon + label in `--text-secondary`
- Active: icon + label in `var(--accent)`, `aria-current="page"`

Specs: `position: sticky; bottom: 0; z-index: 100` · `padding: 8px 0 max(8px, env(safe-area-inset-bottom))` · Items: `flex: 1`, icon 20px, label 10px/500

Apple rule: **Tab bar items navigate. They never open modals or trigger actions.**

---

### Tab bar

```html
<div class="tab-bar" role="tablist" aria-label="View filter">
  <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-batches">
    Batches
  </button>
  <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-reports">
    Reports
  </button>
</div>
```

States:
- Active: `background: var(--accent)`, white text, `aria-selected="true"`
- Inactive: `--text-secondary`, `aria-selected="false"`

Keyboard: `←` / `→` arrows move between tabs (ARIA tabs pattern).

---

## Modals

### Manager password modal

**Anatomy:**
```
┌─── Backdrop (blur) ─────────────┐
│  ┌─── Dialog ────────────────┐  │
│  │  [icon] Title             │  │
│  │  Subtitle text            │  │
│  │  [input field]            │  │
│  │  [Cancel]    [Confirm]    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

```html
<div class="manager-pwd-modal" role="dialog" aria-modal="true"
     aria-labelledby="modal-title" aria-describedby="modal-desc">
  <div class="mpd-dialog">
    <div class="mpd-title" id="modal-title">
      <i data-feather="lock" aria-hidden="true"></i> Approval Required
    </div>
    <div class="mpd-subtitle" id="modal-desc">
      Manager password is required to continue.
    </div>
    <!-- form -->
    <div class="mpd-actions">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

Specs: backdrop `rgba(0,0,0,0.55)` + `backdrop-filter: blur(4px)` · dialog max-width 360px, border-radius 16px · entry `fadeIn 0.2s` · shadow `0 20px 60px rgba(0,0,0,0.25)` · z-index 9999

**Focus trap:** When modal opens, focus moves to first interactive element inside. Tab cycles only within the modal. `Escape` closes the modal. On close, focus returns to the element that triggered it.

---

## Lists & records

### Record item

**Anatomy:**
```
┌─────────────────────────────────┐
│ Batch FC-001            Jan 15  │
│ 120L · Wheat          [Approved]│
└─────────────────────────────────┘
```

```html
<div class="record-item" role="button" tabindex="0"
     aria-label="Batch FC-001, 120 liters, approved, January 15">
  <div class="ri-top">
    <span class="ri-title">Batch FC-001</span>
    <span class="ri-date">Jan 15</span>
  </div>
  <div class="ri-details">
    <span class="ri-meta">120L · Wheat</span>
    <span class="ri-badge approved" aria-label="Status: Approved">Approved</span>
  </div>
</div>
```

States:
- Default: `var(--bg-card)` bg, `1px solid var(--border)` border
- Hover: `background: var(--bg-surface)`
- Press: `transform: scale(0.98)`
- Focus: outline accent

Badge variants:
- `.ri-badge.approved` → `var(--success)` background at 15% + text
- `.ri-badge.pending` → `var(--warning)` at 15% + text
- `.ri-badge.not-approved` → `var(--danger)` at 15% + text

---

## Badges & pills

### Role pill

```html
<span class="role-pill role-pill-manager" aria-label="Role: Manager">Manager</span>
```

- Font: 10px/700, uppercase, letter-spacing 0.05em
- Padding: `2px 8px`, border-radius: 20px (pill)
- Manager: `#4f8cff` bg at 15% + `#4f8cff` text
- Worker: `#34d399` bg at 15% + `#34d399` text
- Admin: `#8b5cf6` bg at 15% + `#8b5cf6` text

### User badge

```html
<div class="user-badge" aria-label="Logged in as Sarah M., Manager">
  <span class="role-dot" aria-hidden="true"></span>
  <span>Sarah M.</span>
</div>
```

- Padding: `4px 10px`, border-radius 20px, background `var(--bg-surface)`
- Role dot: 8px circle, color matches role

---

## Progress indicators & skeletons

### Loading skeleton

For lists and cards while data loads:

```html
<div class="skeleton-card" aria-busy="true" aria-label="Loading records">
  <div class="sk-line sk-title"></div>
  <div class="sk-line sk-meta"></div>
</div>
```

```css
.sk-line {
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-surface) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
/* Reduce Motion: */
@media (prefers-reduced-motion: reduce) {
  .sk-line { animation: none; opacity: 0.6; }
}
```

### Button loading state

```html
<button class="btn btn-primary is-loading" disabled aria-busy="true" aria-label="Saving, please wait">
  Saving...
</button>
```

- `.is-loading::after` adds 16px spinning circle via `btnSpin` keyframe
- Always set `disabled` + `aria-busy="true"` together

---

## Toast notifications

```js
showToast('Record saved successfully', 'success');
showToast('Failed to save record', 'error');
```

```html
<div class="toast toast-success" role="status" aria-live="polite">
  Record saved successfully
</div>
```

- `role="status"` + `aria-live="polite"` — announced by screen readers without interrupting
- Position: fixed bottom-center, 80px from bottom (above nav)
- Border-radius: 24px (pill)
- Auto-dismiss: 3000ms
- Animation: `translateY(100px)` → 0, fade in 0.3s; fade out 0.3s before dismiss
- Only one toast visible at a time — queue new ones, dismiss current first

Variants:
- Success: `var(--success)` bg, dark text
- Error: `var(--danger)` bg, white text
- Default: `var(--bg-surface)` bg, `var(--text)`

Reduce Motion: skip translate, use opacity fade only.
