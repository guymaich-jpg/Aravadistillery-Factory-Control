# Factory Control — Alcohol Production Documentation App

A bilingual (English / Thai) mobile-first web app for documenting and tracking alcohol production processes in a distillery. Works on any smartphone, tablet, or computer browser. No installation required.

---

## Quick Start — 3 Ways to Run

### Option 1: Open Directly (simplest)
Double-click `index.html` in any browser. That's it.

### Option 2: Local Server (recommended for testing)
```bash
cd factory-control
python3 -m http.server 8080
# Open http://localhost:8080
```

### Option 3: Deploy Online (share a link with anyone)
See "Deployment" section below for GitHub Pages, Netlify, and Vercel instructions.

---

## Demo Accounts

| Username  | Password     | Role    | Permissions                          |
|-----------|-------------|---------|--------------------------------------|
| `manager` | `manager123` | Manager | Full access: add, edit, delete, export |
| `worker1` | `worker123`  | Worker  | Add records, view history            |
| `worker2` | `worker123`  | Worker  | Add records, view history            |
| `qa`      | `qa123`      | Worker  | Add records, view history            |

New users can sign up from the login page. Managers can do everything; workers can only add and view.

---

## Features

- **7 Production Modules**: Raw Materials, Date Receiving, Fermentation, Distillation 1 & 2, Bottling QA, Inventory Dashboard
- **Bilingual**: Full English and Thai language support — one-tap toggle everywhere
- **Role-Based Access**: Manager vs Worker permissions (edit, delete, export, approve)
- **Sign Up Flow**: New workers/managers can create accounts from the login page
- **Offline-First**: All data stored in browser localStorage — works without internet
- **Responsive**: Optimized for phones (320px+), tablets (768px+), and desktops (1024px+)
- **CSV Export**: Managers can export any module's data to spreadsheet-ready CSV files
- **QA Signatures**: Touch-based signature capture for bottling approval
- **42 Automated Tests**: Full test suite at `tests.html`

---

## File Structure

```
factory-control/
  index.html        — Main app entry point
  style.css         — All styles (mobile-first, responsive, dark theme)
  script.js         — App controller (routing, forms, rendering)
  i18n.js           — English + Thai translations (~200 keys each)
  auth.js           — Login, sign-up, roles, permissions
  data.js           — LocalStorage CRUD, dropdown data, CSV export
  manifest.json     — PWA manifest (add to home screen)
  tests.html        — Automated test suite (42 tests)
  .nojekyll         — Prevents Jekyll processing on GitHub Pages
  .gitignore        — Ignores node_modules and .DS_Store
  README.md         — This file
```

---

## Modules

| # | Module              | What it records                                                   |
|---|---------------------|-------------------------------------------------------------------|
| 1 | Raw Material Receiving | Supplier, category (spices/labels/packaging), item, weight, expiry, certifications |
| 2 | Date Receiving      | Supplier, weight (kg), tithing status, expiry period              |
| 3 | Fermentation        | Tank size, dates added (kg), quantity, temperature, sugar, pH     |
| 4 | Distillation 1      | Type, still name, fermentation date, alcohol %, time range, output |
| 5 | Distillation 2      | Product type, batch number, head/tail separation, output          |
| 6 | Bottling QA         | Drink type, batch, alcohol %, filtered, color, taste, contaminants, decision, signature |
| 7 | Inventory           | Auto-calculated from all modules — bottle stock + raw material stock |

---

## Deployment — Run It Anywhere

### GitHub Pages (free, easiest for sharing)

1. Go to https://github.com/new and create a new repository (e.g. `factory-control`)
2. Upload all files or push via git:
```bash
cd factory-control
git init
git add .
git commit -m "Factory Control app"
git remote add origin https://github.com/YOUR_USERNAME/factory-control.git
git branch -M main
git push -u origin main
```
3. Go to your repo **Settings > Pages**
4. Set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**
5. Wait 1-2 minutes. Your app is live at:
   **https://YOUR_USERNAME.github.io/factory-control/**

### Netlify (free, drag-and-drop)

1. Go to https://app.netlify.com/drop
2. Drag the entire `factory-control` folder onto the page
3. Done — you get a live URL instantly

### Vercel (free)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `cd factory-control && vercel`
3. Follow the prompts — you get a live URL

### Any Static Web Host

This is a pure static site (HTML/CSS/JS only). It works on **any** web host:
- Amazon S3 + CloudFront
- Google Cloud Storage
- Firebase Hosting (`firebase init` then `firebase deploy`)
- Cloudflare Pages
- Any shared hosting with FTP — just upload the files

---

## Running Tests

Open `tests.html` in a browser. Tests run automatically on load.

**42 tests across 8 sections:**
- i18n (translation parity, fallbacks, toggle)
- Auth (login, logout, session management)
- Sign-up (validation, duplicates, password rules)
- Permissions (manager vs worker access)
- Data CRUD (add, update, delete, unique IDs)
- Dropdown data (suppliers, categories, bilingual items)
- CSV export (blob generation, empty data handling)
- Cross-module integration (inventory aggregation)

---

## Tech Stack

- **Pure HTML/CSS/JavaScript** — no build step, no dependencies, no npm
- **Feather Icons** (loaded from CDN)
- **Google Fonts**: Inter (English) + Noto Sans Thai (Thai)
- **LocalStorage** for all data persistence
- Works offline after first load (fonts/icons cached by browser)

---

## Permissions Matrix

| Action              | Manager | Worker |
|---------------------|---------|--------|
| View dashboard      | Yes     | Yes    |
| Add records         | Yes     | Yes    |
| Edit records        | Yes     | No     |
| Delete records      | Yes     | No     |
| View history        | Yes     | Yes    |
| Export CSV           | Yes     | No     |
| Manage users        | Yes     | No     |
| View inventory      | Yes     | Yes    |
| Approve bottling    | Yes     | No     |

---

## Data Storage

All data is stored in the browser's `localStorage`. Each module has its own key:

| Key                      | Module            |
|--------------------------|-------------------|
| `factory_rawMaterials`   | Raw Materials     |
| `factory_dateReceiving`  | Date Receiving    |
| `factory_fermentation`   | Fermentation      |
| `factory_distillation1`  | Distillation 1    |
| `factory_distillation2`  | Distillation 2    |
| `factory_bottling`       | Bottling QA       |
| `factory_users`          | User accounts     |
| `factory_session`        | Current login     |
| `factory_lang`           | Language setting   |

To reset all data, open browser DevTools > Application > Local Storage > Clear.

---

## License

Internal use. Built for factory documentation.
