# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

1. **Develop** - Make changes on the feature branch
2. **Create PR** - Open a pull request to merge into `main`
3. **New Version** - After merge, bump the version and create a GitHub release

## Commands

### Dev Server
```bash
npm run dev                  # python3 -m http.server 8080
```

### Testing
```bash
npm run test:e2e             # Playwright E2E tests (headless, launches server on :8099)
npm run test:e2e:headed      # E2E with visible browser
npx playwright test tests/e2e/01-login.spec.js   # Run a single E2E test file
```

Browser tests: open `tests.html` in a browser (42 unit tests, run on page load).

### Backend (Vercel serverless, in `backend/`)
```bash
cd backend && npm run build  # tsc --noEmit + create public stub
cd backend && npm run lint   # tsc --noEmit (type check only)
cd backend && npm run dev    # vercel dev
```

## Architecture

**Pure HTML/CSS/JS SPA** — no build step, no framework. Hash-based routing (`#/module`). Offline-first with localStorage as primary storage.

### Frontend Files (root)

| File | Purpose |
|------|---------|
| `index.html` | SPA entry point, loads all scripts in order |
| `script.js` | Main controller: routing, form rendering, record CRUD, views (list/form/detail) |
| `auth.js` | Login, signup, RBAC (Admin/Manager/Worker), session management (12h timeout) |
| `data.js` | localStorage CRUD, dropdown data, CSV export |
| `firebase.js` | Firestore sync (always enabled: `FIREBASE_ENABLED = true`) |
| `i18n.js` | Bilingual translations (English/Hebrew), `t('key')` lookup |
| `api-client.js` | Backend API client for Vercel serverless |
| `sync.js` | Google Sheets + CRM sync |
| `inventory-ui.js` | Inventory dashboard rendering |
| `dashboard.js` | Main dashboard view |
| `module-fields.js` | Field definitions for all 7 production modules |
| `nav.js` | Navigation & tab management |
| `style.css` | Full design system: mobile-first, dark theme, RTL support |

### Backend (`backend/`)

Vercel serverless TypeScript functions:
- `api/` — Endpoints: health, inventory, quick-access, users/*, invitations/*
- `lib/` — Shared: Firebase Admin SDK, auth (ID token verification), CORS, CRM sync

### Routing & State

Global state in `script.js`: `currentScreen`, `currentModule`, `currentView`, `editingRecord`. Navigation state persisted to `sessionStorage` (survives refresh). Hash changes trigger `_restoreStateFromHash()`.

Screens: `dashboard`, `backoffice`, `invite`
Modules: `rawMaterials`, `dateReceiving`, `fermentation`, `distillation1`, `distillation2`, `bottling`, `inventory`

### Data Storage

All data in `localStorage` under `factory_*` keys (e.g., `factory_rawMaterials`, `factory_session`, `factory_lang`). Record format: `{ id, createdAt, createdBy, updatedAt, ...fields }`.

### Testing

- **E2E** (Playwright): 8 test files in `tests/e2e/`, serial execution with 1 worker for localStorage isolation. Two projects: Desktop Chrome + Mobile Chrome (mobile skips security/sheets tests). CI runs on push/PR to main.
- **Browser tests**: `tests.html` — 42 inline unit tests.

## Code Conventions

- DOM helpers: `el(tag, cls, html)` creates elements, `esc(str)` escapes HTML, `$(sel)`/`$$(sel)` for querySelector
- Private functions prefixed with `_`
- Section markers: `// ===`
- Default test accounts: `admin`/`admin123`, `manager`/`manager123`, `worker1`/`worker123`
- 3 roles: Admin (full + backoffice), Manager (full production), Worker (add + view only)
