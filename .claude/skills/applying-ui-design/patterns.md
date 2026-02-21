# Page Patterns

## Contents
- Page templates (4)
- User flows (3)
- Special states: Empty, Error, Loading

---

## Page templates

### 1. Dashboard

**Purpose:** First screen after login. Surfaces the three most critical metrics, then modules, then recent activity.

**Visual hierarchy:**
1. Welcome card (user greeting + role)
2. Stats row (3 key metrics)
3. Module grid (navigation to work areas)
4. Recent activity feed (last 5 records)

**Layout:**
```
┌─── Header: "Factory Control" + user badge ────┐
│                                                │
│  ┌──────── Welcome Card ──────────────────┐   │
│  │ Good morning, Sarah                    │   │
│  │ Manager                    [MANAGER]   │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  [247 Batches] [94% Approved] [3 Active]       │
│                                                │
│  ┌── MODULES ──────────────────────────────┐  │
│  │ [Receiving] [Dates] [Fermentation]      │  │
│  │ [Dist. 1]   [Dist. 2] [Bottling]       │  │
│  │ [Inventory]                             │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  RECENT ACTIVITY                               │
│  ○ FC-001 submitted — 2 min ago               │
│  ○ FC-002 approved — 1 hr ago                 │
│                                                │
└─── Bottom Nav: [Home] [Records] [Settings] ───┘
```

**Empty state (no activity):** Replace activity list with centered illustration + "No activity yet — add your first record."

**FAB:** Not shown on dashboard (navigation happens via module cards).

---

### 2. Module list screen

**Purpose:** Shows all records for a specific module (e.g., Fermentation). Allows browsing, filtering, and adding.

**Visual hierarchy:**
1. Header with module name + search
2. Filter/tab bar (All · Approved · Pending)
3. Record list (most recent first)
4. FAB for adding

**Layout:**
```
┌─── Header: "← Fermentation" + [search] ───────┐
│                                                 │
│  [All]  [Approved]  [Pending]  [Not Approved]  │
│                                                 │
│  ┌── Record Item ──────────────────────────┐   │
│  │ Batch FC-001                  Jan 15    │   │
│  │ 120L · Wheat              [Approved]    │   │
│  └─────────────────────────────────────────┘   │
│  ┌── Record Item ──────────────────────────┐   │
│  │ Batch FC-002                  Jan 14    │   │
│  │ 80L · Barley               [Pending]    │   │
│  └─────────────────────────────────────────┘   │
│  ...                                           │
│                                    [+ FAB]     │
└─── Bottom Nav ─────────────────────────────────┘
```

**Search:** Inline search bar under header (hidden by default, revealed on [search] tap). Filters list as user types. No separate search screen.

**Loading state:** 3 skeleton record items.

**Empty state:** "No records yet" with [+ Add First Record] button (replaces FAB in this case).

---

### 3. Record detail screen

**Purpose:** Full view of one record. Shows all fields, approval status, signature, and manager actions.

**Visual hierarchy:**
1. Header: batch ID + back button
2. Status badge (dominant visual element — approved/pending/rejected)
3. Detail card (all field values)
4. Signature section (if present)
5. Manager action buttons (if role permits)

**Layout:**
```
┌─── Header: "← Batch FC-001" + [edit?] ────────┐
│                                                 │
│  ╔══════════════════════════════════════╗       │
│  ║           ✓ APPROVED                ║       │
│  ╚══════════════════════════════════════╝       │
│                                                 │
│  ┌─── Detail Card ─────────────────────────┐   │
│  │ Batch ID        FC-2024-001             │   │
│  │ Volume          120L                    │   │
│  │ Material        Wheat                   │   │
│  │ Created         Jan 15, 2024            │   │
│  │ Created by      Sarah M.               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  MANAGER SIGNATURE                             │
│  [signature image]                             │
│                                                 │
│  [Approve]  [Reject]                           │
│  (manager-only, shown if status = pending)     │
│                                                 │
└─── Bottom Nav ─────────────────────────────────┘
```

**Approve/Reject flow:** Tapping either opens the manager password modal. On success → status updates in-place with animation → success toast.

---

### 4. Add record form

**Purpose:** Data entry for a new batch record. Single scrollable form, no tabs.

**Visual hierarchy:**
1. Header: "← Add Fermentation Record"
2. Required fields first, optional fields after
3. Signature pad (if required by module)
4. Submit button (full-width, bottom)

**Layout:**
```
┌─── Header: "← Add Fermentation Record" ────────┐
│                                                 │
│  Batch ID *                                     │
│  [                                          ]   │
│                                                 │
│  Volume (L) *                                   │
│  [                                          ]   │
│                                                 │
│  Material                                       │
│  [▼ Select material...                      ]   │
│                                                 │
│  Start Date *                                   │
│  [                                          ]   │
│                                                 │
│  Notes                                          │
│  [                                          ]   │
│  [                                          ]   │
│                                                 │
│  WORKER SIGNATURE                              │
│  ┌──────────────────────────────┐  [Clear]     │
│  │ (draw signature here)        │              │
│  └──────────────────────────────┘              │
│                                                 │
│  [          Save Record          ]              │
│                                                 │
└─── Bottom Nav ─────────────────────────────────┘
```

**Validation:** Inline — validate on blur (not on change). Show all errors before submit attempt, then re-validate on next save.

**Submit flow:** Tap Save → validate → if errors: highlight fields + scroll to first error; if valid: show loading state → save → navigate back to list → show success toast.

---

## User flows

### Flow 1: Add a record

```
Dashboard
  → tap module card (e.g., Fermentation)
    → [slide right] Module list screen
      → tap FAB (+)
        → [slide right] Add record form
          → fill fields
            → tap Save Record
              → [loading state: 0.8s typical]
                ✓ success → [slide left] back to list + toast "Record saved"
                ✗ error   → stay on form, highlight errors
```

**Designer's note:** The form never auto-submits. The user always taps Save explicitly. This prevents accidental submissions on factory floors where devices may have gloves.

---

### Flow 2: Approve a pending record (manager)

```
Module list → tap pending record
  → [slide right] Record detail
    → status badge shows "PENDING"
    → tap [Approve]
      → Manager password modal appears (fade in)
        → enter password
          → tap Confirm
            → [inline loading 0.5s]
              ✓ correct → modal closes, status badge animates to "APPROVED", toast
              ✗ wrong   → input shakes, error message, stay in modal
```

**Designer's note:** The approval is a two-step action (tap Approve → enter password). The password gate prevents accidental approvals. The confirmation is modal, not a separate screen, to keep context visible.

---

### Flow 3: Search and filter records

```
Module list → tap [search icon] in header
  → search bar slides down (0.2s)
    → type query
      → list filters in real-time (no submit needed)
        → tap record to view detail
          → clear search → list restores
```

**Tab filter (All / Approved / Pending):**
```
Tap tab → active tab animates to accent bg
        → list re-filters (no loading state if local data)
        → if remote: show skeleton for 0.3s
```

---

## Special states

### Empty state

Used when a module has no records, or a search returns nothing.

```html
<div class="empty-state" role="status" aria-label="No records found">
  <div class="es-icon">
    <i data-feather="inbox" aria-hidden="true"></i>
  </div>
  <div class="es-title">No records yet</div>
  <div class="es-desc">Add your first fermentation batch to get started.</div>
  <button class="btn btn-primary">Add Record</button>
</div>
```

Specs: centered vertically in remaining space · icon 48px, `--text-muted` · title 16px/700 · desc 13px/500 `--text-secondary` · button optional

**Search empty state:** "No results for '[query]'" — do not show Add Record button.

---

### Error state

Used when data fails to load (network error, permission error).

```html
<div class="error-state" role="alert">
  <div class="es-icon error-icon">
    <i data-feather="alert-circle" aria-hidden="true"></i>
  </div>
  <div class="es-title">Couldn't load records</div>
  <div class="es-desc">Check your connection and try again.</div>
  <button class="btn btn-secondary" onclick="reload()">Try Again</button>
</div>
```

- Icon: `var(--danger)` color
- Title: same as empty state
- Always provide a recovery action ("Try Again", "Go Back")
- Use `role="alert"` so screen readers announce it immediately

---

### Loading skeleton

Shown while records are fetching. Replaces actual content, not overlaid on top.

```html
<div class="skeleton-list" aria-busy="true" aria-label="Loading records">
  <!-- Repeat 3–5 times -->
  <div class="skeleton-record">
    <div class="sk-line sk-title" style="width: 60%"></div>
    <div class="sk-line sk-meta"  style="width: 40%"></div>
  </div>
</div>
```

- Show after 200ms delay (avoid flicker for fast connections)
- Show for minimum 300ms (avoid jarring flash)
- Skeleton rows match the height of real record items

---

## Screen patterns summary

| Screen | Entry animation | Exit animation | FAB |
|---|---|---|---|
| Dashboard | `fadeInUp` | — | No |
| Module list | `slideInFromRight` | `slideInFromLeft` | Yes |
| Record detail | `slideInFromRight` | `slideInFromLeft` | No |
| Add record form | `slideInFromRight` | `slideInFromLeft` | No |
| Login | `fadeInUp` | — | No |
