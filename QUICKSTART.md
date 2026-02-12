# 🏭 Factory Control App - Quick Start Guide

## 🚀 Run the App (3 Easy Ways)

### Method 1: One Command (Recommended)
```bash
./start.sh
```
This will:
- Start a local web server on port 8080
- Automatically open the app in your browser
- Press `Ctrl+C` to stop when done

### Method 2: Direct Browser Open (Simplest)
Just double-click `index.html` in Finder - it will open in your default browser.

### Method 3: Manual Server Start
```bash
python3 -m http.server 8080
```
Then open http://localhost:8080 in your browser.

---

## 📦 What's Included

```
factory-control-app/
├── index.html          # Main app entry
├── style.css           # All styles (mobile-first, dark theme)
├── script.js           # App controller & routing
├── i18n.js             # English + Thai translations
├── auth.js             # Authentication & permissions
├── data.js             # Data layer & CSV export
├── manifest.json       # PWA manifest
├── tests.html          # 42 automated tests
├── start.sh            # Quick start script ⭐
├── QUICKSTART.md       # This file
├── GITHUB_DEPLOY.md    # GitHub deployment guide
├── .gitignore          # Git ignore rules
├── .nojekyll           # GitHub Pages config
└── README.md           # Full documentation
```

---

## 🔐 Demo Login Credentials

| Username  | Password     | Role    | Permissions                          |
|-----------|-------------|---------|--------------------------------------|
| `manager` | `manager123` | Manager | Full access: add, edit, delete, export |
| `worker1` | `worker123`  | Worker  | Add records, view history            |
| `worker2` | `worker123`  | Worker  | Add records, view history            |
| `qa`      | `qa123`      | Worker  | Add records, view history            |

You can also create new accounts from the login page!

---

## 🧪 Run Tests

Open `tests.html` in your browser to run all 42 automated tests.

---

## 🌍 Language Toggle

Click the language button (TH/EN) in the top-right corner to switch between English and Thai.

---

## 📱 Mobile Use

The app is optimized for mobile devices. You can:
1. Open it on your phone's browser
2. Add to home screen for app-like experience
3. Works offline after first load

---

## 🔄 Reset All Data

Open browser DevTools (F12) → Application → Local Storage → Clear all `factory_*` keys

---

## 📤 Next Steps: Deploy to GitHub

See **GITHUB_DEPLOY.md** for step-by-step instructions to:
- Create a GitHub repository
- Push your code
- Deploy to GitHub Pages (free hosting)
- Get a public URL to share

---

## 💡 Tips

- **Managers** can export data to CSV files
- **Workers** can add records but cannot edit/delete
- All data is stored locally in your browser
- The app works completely offline
- Supports touch signatures for QA approval

---

## 🆘 Troubleshooting

**Port 8080 already in use?**
```bash
python3 -m http.server 8081
```
Then open http://localhost:8081

**Script won't run?**
```bash
chmod +x start.sh
./start.sh
```

**Python not installed?**
Just double-click `index.html` - no server needed!

---

Enjoy using Factory Control! 🎉
