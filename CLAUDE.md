# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow — Staging → Production

```
feature/* → PR → staging branch  (Vercel staging auto-deploys)
                       ↓ QA passes
              staging → PR → main  (Vercel production auto-deploys)
                                      ↓
                               git tag vX.Y.Z + GitHub Release
```

1. **Feature branch** — all work starts here, PR targets `staging`
2. **Staging deploy** — Vercel deploys `staging` branch automatically to staging URL
3. **QA on staging** — run E2E suite against staging URL; manual smoke
4. **Version bump** — bump `package.json` + `sw.js` + `?v=` in `index.html` on `staging`
5. **Promote to production** — PR `staging → main`, merge; Vercel auto-deploys
6. **Tag the release** — `git tag vX.Y.Z && git push --tags && gh release create vX.Y.Z`

### Environment config

Firebase keys and other environment values are injected at runtime via `/api/env.js` (a Vercel serverless endpoint that reads env vars). The app code is identical in both environments — only Vercel env vars differ.

**Required Vercel env vars** (set per project in Vercel dashboard):
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
APP_ENV          # "staging" or "production"
```

When `APP_ENV=staging`, a yellow "⚠ STAGING" banner appears at the top of the app.

Local dev (`npm run dev`) works without these — `firebase.js` falls back to the hardcoded production config.

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
| `script.js` | Main controller: routing, form rendering, record CRUD, views |
| `auth.js` | Login, RBAC (Admin/Manager/Worker), session management (12h timeout) |
| `data.js` | localStorage CRUD, dropdown data, CSV export |
| `firebase.js` | Firebase init, Firestore CRUD, Firebase Auth helpers |
| `firestore-sync.js` | Real-time Firestore ↔ localStorage sync |
| `i18n.js` | Bilingual translations (English/Hebrew), `t('key')` lookup |
| `api-client.js` | Backend API client for Vercel serverless |
| `sheets-sync.js` | Google Sheets export integration |
| `storage.js` | IndexedDB + offline mutation queue |
| `helpers.js` | Shared DOM utilities, date formatting, validators |
| `init-theme.js` | Early theme detection (runs before CSS loads) |
| `module-fields.js` | Field definitions for all 7 production modules |
| `backoffice.js` | Admin back-office panel (user management, system info) |
| `sw.js` | Service Worker — offline caching, network strategies |
| `style.css` | Full design system: mobile-first, dark theme, RTL support |

### Backend (`backend/`)

Vercel serverless TypeScript functions:
- `api/` — Endpoints: env (config injection), health, inventory, quick-access, users/*, invitations/*
- `lib/` — Shared: Firebase Admin SDK, auth (ID token verification), CORS, CRM sync

### Routing & State

Global state in `script.js`: `currentScreen`, `currentModule`, `currentView`, `editingRecord`. Navigation state persisted to `sessionStorage` (survives refresh). Hash changes trigger `_restoreStateFromHash()`.

Screens: `dashboard`, `backoffice`, `invite`
Modules: `rawMaterials`, `dateReceiving`, `fermentation`, `distillation1`, `distillation2`, `bottling`, `inventory`

### Data Storage

All data in `localStorage` under `factory_*` keys (e.g., `factory_rawMaterials`, `factory_session`, `factory_lang`). Record format: `{ id, createdAt, createdBy, updatedAt, ...fields }`.

### Testing

- **E2E** (Playwright): 14 test files in `tests/e2e/`, serial execution with 1 worker for localStorage isolation. Two projects: Desktop Chrome + Mobile Chrome (mobile skips security/sheets tests). CI runs on push/PR to main.
- **Browser tests**: `tests.html` — 42 inline unit tests.

## Code Conventions

- DOM helpers: `el(tag, cls, html)` creates elements, `esc(str)` escapes HTML, `$(sel)`/`$$(sel)` for querySelector
- Private functions prefixed with `_`
- Section markers: `// ===`
- Default test accounts: `admin`/`admin123`, `manager`/`manager123`, `worker1`/`worker123`
- 3 roles: Admin (full + backoffice), Manager (full production), Worker (add + view only)

## Project Plan & Recent Improvements

Two-phase improvement plan executed in the Jun 6–7 2026 work session, spanning both the Factory Control and CRM apps. Both phases are **shipped** (Factory Control v1.12.0, CRM v6.3.0).

### Phase 1 — Live inventory sync (Feature)
- The CRM app consumes **live inventory data from Factory Control** (data sync + inventory refresh).
- Factory Control side: expose inventory data in a clean, scalable, **backward-compatible** way.
- Status: ✅ Done.

### Phase 2 — Security hardening
- Remove hardcoded credentials (see commit `d192eaa`).
- Move Google **Sheets sync behind a backend proxy** (`firestore-sync.js` / `backend/`).
- Add **security headers**.
- **Iframe-break / clickjacking protection**.
- Status: ✅ Done.

> Note: reconstructed from the Jun 6–7 session summary. Update this section as the plan evolves.
