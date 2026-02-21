# Design Tokens

## Contents
- Color system (hex · RGB · HSL · WCAG contrast)
- Semantic color rules
- Module colors
- Border radius & shadow
- Typography scale (size · line-height · letter-spacing · weight)
- Spacing system
- Design token JSON

---

## Color system

### Background palette

| Token | Hex | RGB | HSL | Elevation |
|---|---|---|---|---|
| `--bg` | `#0f0f1a` | `15, 15, 26` | `240°, 27%, 8%` | Layer 0 — app root |
| `--bg-card` | `#1a1a2e` | `26, 26, 46` | `240°, 28%, 14%` | Layer 1 — cards, header, nav |
| `--bg-input` | `#16213e` | `22, 33, 62` | `224°, 48%, 16%` | Layer 1.5 — inputs, canvas |
| `--bg-surface` | `#1f1f3a` | `31, 31, 58` | `240°, 30%, 17%` | Layer 2 — elevated surfaces |
| `--border` | `#2a2a4a` | `42, 42, 74` | `240°, 28%, 23%` | Border — all 1px dividers |

**Layering rule (Whoop):** Each layer must be lighter than the one below. Never place a `--bg-card` element on a `--bg-surface` parent. Elevation = lighter background.

### Text palette

| Token | Hex | Contrast on `--bg` | Contrast on `--bg-card` | WCAG |
|---|---|---|---|---|
| `--text` | `#e8e8f0` | **13.5:1** | **10.2:1** | AAA |
| `--text-secondary` | `#8888aa` | **4.6:1** | **3.5:1** | AA / AA Large |
| `--text-muted` | `#555577` | **2.1:1** | **1.6:1** | Decorative only |

**Rule:** Never use `--text-muted` for functional labels. It fails WCAG AA. Use only for placeholders and purely decorative hints.

### Accent & semantic colors

| Token | Hex | RGB | HSL | Contrast on `--bg` | Use |
|---|---|---|---|---|---|
| `--accent` | `#4f8cff` | `79, 140, 255` | `218°, 100%, 66%` | **5.2:1** | Primary CTA, active nav, focus |
| `--accent-hover` | `#3a6fd8` | `58, 111, 216` | `218°, 65%, 54%` | **4.8:1** | Pressed accent state |
| `--success` | `#34d399` | `52, 211, 153` | `160°, 60%, 51%` | **8.1:1** | Approved, confirmed |
| `--warning` | `#fbbf24` | `251, 191, 36` | `43°, 96%, 56%` | **9.4:1** | Pending, caution |
| `--danger` | `#f87171` | `248, 113, 113` | `0°, 91%, 71%` | **5.7:1** | Destructive, errors |

### Color usage rules

| Color | Permitted | Forbidden |
|---|---|---|
| `--accent` blue | Primary buttons, active nav, focus rings, links | Decorative borders, card accents |
| `--danger` red | Delete/reject buttons, form errors, rejection badges | Warnings, highlights, emphasis |
| `--success` green | Approved badges, completion states | Primary action buttons |
| `--warning` yellow | Pending badges, in-progress indicators | Errors, permanent states |

### Module colors

Each factory module has a dedicated color. Used only for card accent bars and icon container backgrounds (at 20% opacity).

```css
--color-receiving:    #6366f1   /* indigo  — raw materials intake */
--color-dates:        #f59e0b   /* amber   — date receiving */
--color-fermentation: #10b981   /* emerald — fermentation tanks */
--color-dist1:        #3b82f6   /* blue    — distillation pass 1 */
--color-dist2:        #8b5cf6   /* violet  — distillation pass 2 */
--color-bottling:     #ec4899   /* pink    — bottling line */
--color-inventory:    #14b8a6   /* teal    — finished inventory */
```

Usage: `data-module="fermentation"` → CSS reads this via `[data-module="fermentation"]` selector and applies `--color-fermentation`.

---

## Border radius & shadow

```css
/* Radius */
--radius:    12px   /* cards, modals, welcome card, module grid */
--radius-sm:  8px   /* inputs, record items, tab buttons, badges */
/* Pills:    20px   — header action buttons, toasts */
/* Circles:  50%    — FAB, avatar dots, toggle thumb, role dots */
/* Modal:    16px   — calc(var(--radius) + 4px) */
/* Desktop app frame: 24px */

/* Shadows */
--shadow: 0 4px 24px rgba(0,0,0,0.3)    /* standard card */

/* Contextual shadows (not variables — apply directly) */
/* FAB    */ 0 4px 16px rgba(79,140,255,0.4)
/* Modal  */ 0 20px 60px rgba(0,0,0,0.25)
/* Frame  */ 0 0 60px rgba(0,0,0,0.4)
```

---

## Typography scale

**Primary font:** Inter (weights: 500, 600, 700)
**Secondary font:** Noto Sans Thai (same weights, for `lang="th"`)
**System fallback:** `-apple-system, BlinkMacSystemFont, sans-serif`

Full font stack:
```css
font-family: 'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Complete scale

| Role | Token name | Size | Line-height | Letter-spacing | Weight | Color token |
|---|---|---|---|---|---|---|
| Display / large stat | `display` | 24px | 1.2 (28.8px) | -0.02em | 700 | `--text` |
| Headline / screen title | `headline` | 20px | 1.3 (26px) | -0.01em | 700 | `--text` |
| Title / section header | `title` | 15px | 1.4 (21px) | 0 | 700 | `--text` |
| Body / record title | `body` | 14px | 1.5 (21px) | 0 | 600 | `--text` |
| Callout / button text | `callout` | 15px | 1.3 (19.5px) | 0 | 600 | white |
| Subheadline / form label | `subheadline` | 13px | 1.4 (18.2px) | 0.01em | 600 | `--text-secondary` |
| Footnote / meta detail | `footnote` | 12px | 1.4 (16.8px) | 0.01em | 600 | `--text-secondary` |
| Caption / nav label | `caption` | 10px | 1.2 (12px) | 0.02em | 500 | `--text-secondary` |

### Responsive adjustments

| Role | Mobile (375px) | Tablet (768px) | Desktop (1024px) |
|---|---|---|---|
| Display | 24px | 28px | 32px |
| Headline | 20px | 22px | 24px |
| Body | 14px | 14px | 15px |

**Minimum accessible size:** 12px for any visible text. 11px only for decorative/ornamental content.

**iOS zoom prevention:** Form inputs must use `font-size: 16px` minimum. Values below 16px trigger automatic zoom on iOS Safari.

### Weight rules

| Weight | CSS | Permitted use |
|---|---|---|
| 700 | Bold | Headlines, stat values, section titles |
| 600 | Semibold | Body text, buttons, labels, badges |
| 500 | Medium | Nav labels, secondary captions |
| 400 | Regular | Descriptive body copy inside cards only |
| < 400 | — | Never permitted in this UI |

---

## Spacing system

**Base unit: 8px**

| Step | Value | Use |
|---|---|---|
| `xs` | 4px | Icon-to-label gap, dot-to-text, inline micro-gaps |
| `sm` | 8px | Header item gaps, time range input spacing |
| `md` | 12px | Card grid gap, stats grid gap, list item gap |
| `input` | 14px | Input padding (top/bottom) |
| `base` | 16px | Screen horizontal padding, form-group margin-bottom |
| `card` | 20px | Welcome card internal padding |
| `section` | 24px | Between major page sections |
| `lg` | 32px | Large section separation |
| `xl` | 48px | Full-page vertical centering pad |
| `xxl` | 64px | — |
| `nav` | 96–100px | Screen-content bottom padding (above sticky nav) |

**Rule:** All spacing values must be multiples of 4. Never invent values outside this scale.

---

## Design token JSON

```json
{
  "color": {
    "background": {
      "default":  { "value": "#0f0f1a", "comment": "App root" },
      "card":     { "value": "#1a1a2e", "comment": "Cards, header, nav" },
      "input":    { "value": "#16213e", "comment": "Form inputs" },
      "surface":  { "value": "#1f1f3a", "comment": "Elevated surfaces" }
    },
    "border": {
      "default":  { "value": "#2a2a4a" }
    },
    "text": {
      "primary":    { "value": "#e8e8f0" },
      "secondary":  { "value": "#8888aa" },
      "muted":      { "value": "#555577" }
    },
    "accent": {
      "default":    { "value": "#4f8cff" },
      "hover":      { "value": "#3a6fd8" }
    },
    "semantic": {
      "success":    { "value": "#34d399" },
      "warning":    { "value": "#fbbf24" },
      "danger":     { "value": "#f87171" }
    },
    "module": {
      "receiving":    { "value": "#6366f1" },
      "dates":        { "value": "#f59e0b" },
      "fermentation": { "value": "#10b981" },
      "dist1":        { "value": "#3b82f6" },
      "dist2":        { "value": "#8b5cf6" },
      "bottling":     { "value": "#ec4899" },
      "inventory":    { "value": "#14b8a6" }
    }
  },
  "radius": {
    "default": { "value": "12px" },
    "sm":      { "value": "8px" },
    "pill":    { "value": "20px" },
    "modal":   { "value": "16px" }
  },
  "spacing": {
    "xs":      { "value": "4px" },
    "sm":      { "value": "8px" },
    "md":      { "value": "12px" },
    "base":    { "value": "16px" },
    "section": { "value": "24px" },
    "lg":      { "value": "32px" },
    "xl":      { "value": "48px" }
  },
  "typography": {
    "display":     { "size": "24px", "weight": "700", "lineHeight": "1.2" },
    "headline":    { "size": "20px", "weight": "700", "lineHeight": "1.3" },
    "title":       { "size": "15px", "weight": "700", "lineHeight": "1.4" },
    "body":        { "size": "14px", "weight": "600", "lineHeight": "1.5" },
    "callout":     { "size": "15px", "weight": "600", "lineHeight": "1.3" },
    "subheadline": { "size": "13px", "weight": "600", "lineHeight": "1.4" },
    "footnote":    { "size": "12px", "weight": "600", "lineHeight": "1.4" },
    "caption":     { "size": "10px", "weight": "500", "lineHeight": "1.2" }
  }
}
```
