---
name: applying-ui-design
description: Applies the Factory Control app's comprehensive design system when building or modifying UI. Covers design philosophy, color tokens with contrast ratios, typography scale, component anatomy with all states, layout grid, accessibility (WCAG AA), micro-interactions, and page patterns. Use when adding new screens, components, or styles; when asked to make UI changes; when ensuring visual consistency; or when implementing accessible interactions.
---

# Factory Control UI Design System

**Brand:** Factory Control
**Personality:** Professional · Minimalist · Data-driven
**Primary emotion:** Trust + Clarity
**Target audience:** Factory floor workers and managers (multilingual: EN/HE/TH)

---

## Five core principles

**1. Clarity (Apple HIG)** — Every element is immediately understandable. Remove anything that doesn't earn its visual weight. Content over chrome.

**2. Deference (Apple HIG)** — The interface serves the data. Dark backgrounds exist so metric values and status badges command attention. Never let UI decoration compete with information.

**3. Depth (Apple HIG)** — Layering communicates hierarchy. Background → card → input → modal follows a deliberate elevation stack. Motion reinforces spatial relationships (deeper = slide right, back = slide left).

**4. Data-first (Whoop)** — Three metric dials rule the dashboard: batch count, approval rate, active processes. Everything else is secondary. Surface the most critical stat first; let the user pull for detail.

**5. Progressive disclosure** — Summary → List → Detail → Edit. Never dump all data at once. Use animation to reveal depth, not to decorate.

---

## Visual hierarchy — what users see first

```
1st  Stat numbers (24px/700, --text)      ← batch counts, rates
2nd  Record titles / module names (14px/600)
3rd  Status badges (approved/pending/danger)
4th  Metadata labels (13px/500, --text-secondary)
5th  Muted hints, timestamps (12px, --text-muted)
```

**F-pattern application:** The eye enters top-left → scans stats row → drops to module grid → continues left-aligned down the list. Primary CTAs (FAB, primary button) are bottom-right or bottom-full-width.

---

## Quick-reference tokens

Full specs: [tokens.md](tokens.md) · [Token JSON](design-tokens.json)

### Colors
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0f0f1a` | App background |
| `--bg-card` | `#1a1a2e` | Cards, header, bottom nav |
| `--bg-input` | `#16213e` | Form inputs |
| `--bg-surface` | `#1f1f3a` | Elevated surfaces |
| `--border` | `#2a2a4a` | All borders |
| `--text` | `#e8e8f0` | Primary text — **13.5:1** on `--bg` |
| `--text-secondary` | `#8888aa` | Labels — **4.6:1** on `--bg` |
| `--accent` | `#4f8cff` | Primary actions, active |
| `--success` | `#34d399` | Approved states |
| `--warning` | `#fbbf24` | Pending states |
| `--danger` | `#f87171` | Destructive, errors |

### Typography (quick scale)
| Role | Size | Line-height | Weight |
|---|---|---|---|
| Display stat | 24px | 1.2 | 700 |
| Screen title | 20px | 1.3 | 700 |
| Section header | 15px | 1.4 | 700 |
| Body / record | 14px | 1.5 | 600 |
| Form label | 13px | 1.4 | 600 |
| Caption / meta | 12px | 1.4 | 600 |
| Nav label | 10px | 1.2 | 500 |

**Rule:** Never use font-weight below 500. Thin weights are illegible on dark backgrounds.

### Spacing (8px base unit)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96px`

---

## Component quick rules

Full specs: [components.md](components.md)

- Touch targets: **min 48×48px** (Apple HIG)
- Press feedback: `transform: scale(0.97)` on cards/buttons
- Focus: `outline: 2px solid var(--accent); outline-offset: 2px`
- Disabled: `opacity: 0.5; pointer-events: none`
- Error: border-color → `var(--danger)` + `.field-error-msg` below

**Button hierarchy** (one primary per screen):
1. `.btn-primary` — accent blue, single CTA
2. `.btn-secondary` — surface + border
3. `.btn-danger` — destructive only (red = destructive, Apple HIG)
4. `.btn-success` — approval confirmation

---

## Layout quick rules

Full specs: [layout.md](layout.md)

```
app-header    sticky top,    52px min,  z-index: 100
screen-content flex: 1,      padding: 16px 16px 100px
bottom-nav    sticky bottom, z-index: 100
```

Breakpoints: `375px (mobile) · 481px · 768px · 1024px`
Max app width: `600px` (phone-first, centered on desktop)

---

## Accessibility

Full specs: [accessibility.md](accessibility.md)

- WCAG AA minimum: **4.5:1** text, **3:1** UI elements
- All inputs: `aria-label` or visible `<label for>`
- All icon-only buttons: `aria-label`
- Keyboard: Tab order follows visual order; modals trap focus
- Reduce Motion: substitute `opacity` transitions for transforms when `prefers-reduced-motion: reduce`

---

## Page patterns

Full specs: [patterns.md](patterns.md)

Templates: Dashboard · Module List · Record Detail · Add Record Form
User flows: Add record · Approve record · Search & filter
Special states: Empty · Error · Loading skeleton

---

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| One primary CTA per screen | Stack multiple primary buttons |
| Use `--danger` only for destructive actions | Use red for warnings or highlights |
| Show the summary first, detail on demand | Dump all batch fields on one screen |
| 48px minimum for every touch target | Use small icon-only buttons without labels |
| Animate to communicate direction or state | Animate for decoration |
| Use `var(--success)` green only for confirmed states | Use green for primary actions |
| Keep contrast ≥ 4.5:1 for all text | Use `--text-muted` for important labels |
| Add `aria-label` to every icon button | Leave `<button>` without accessible text |
| Match animation to Reduce Motion preference | Ignore `prefers-reduced-motion` |
| Test all new layouts in RTL (Hebrew) | Assume LTR-only layout |
