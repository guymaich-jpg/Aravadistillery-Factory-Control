# 🚀 Deploy Factory Control to GitHub Pages

This guide will help you publish your Factory Control app to GitHub and make it accessible online for free.

---

## 📋 Prerequisites

- A GitHub account (create one at https://github.com/signup if you don't have one)
- Git installed on your computer (check with `git --version`)

---

## 🎯 Step-by-Step Deployment

### Step 1: Initialize Git Repository

Open Terminal in the `factory-control-app` folder and run:

```bash
cd /Users/guy.maich/Documents/Aravadistillery-Production-system/factory-control-app
git init
```

### Step 2: Add All Files

```bash
git add .
git commit -m "Initial commit: Factory Control App"
```

### Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `factory-control` (or any name you prefer)
3. Description: `Alcohol Production Documentation App - Bilingual (EN/TH)`
4. Choose **Public** (required for free GitHub Pages)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click **Create repository**

### Step 4: Connect to GitHub

Copy the commands from GitHub's "push an existing repository" section, or use these (replace `YOUR_USERNAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/factory-control.git
git branch -M main
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/guymaich/factory-control.git
git branch -M main
git push -u origin main
```

You'll be prompted to enter your GitHub credentials.

### Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under "Source":
   - Select branch: **main**
   - Select folder: **/ (root)**
5. Click **Save**

### Step 6: Wait for Deployment

- GitHub will build your site (takes 1-2 minutes)
- Refresh the Pages settings page
- You'll see: **"Your site is live at https://YOUR_USERNAME.github.io/factory-control/"**

---

## 🎉 Your App is Live!

Your app will be available at:
```
https://YOUR_USERNAME.github.io/factory-control/
```

Example: `https://guymaich.github.io/factory-control/`

---

## 🔄 Update Your Published App

Whenever you make changes:

```bash
git add .
git commit -m "Description of your changes"
git push
```

GitHub Pages will automatically update in 1-2 minutes.

---

## 🔗 Share Your App

You can now share the URL with:
- Factory workers (they can use it on their phones)
- Managers (they can access from any device)
- Anyone with the link (it's public)

---

## 🔒 Make it Private (Optional)

If you want to restrict access:

1. Go to repository **Settings** → **General**
2. Scroll to "Danger Zone"
3. Click "Change visibility" → "Make private"

**Note:** Private repositories require a paid GitHub plan for Pages, or you can use Netlify/Vercel for free private hosting.

---

## 🌐 Alternative Deployment Options

### Netlify (Easiest - Drag & Drop)

1. Go to https://app.netlify.com/drop
2. Drag the entire `factory-control-app` folder onto the page
3. Get instant live URL (e.g., `random-name-123.netlify.app`)
4. Free, supports private repos, custom domains

### Vercel (CLI-based)

```bash
npm install -g vercel
cd factory-control-app
vercel
```

Follow prompts, get instant deployment.

---

## 📱 Mobile Access

Once deployed, workers can:
1. Open the URL on their phone
2. Tap "Share" → "Add to Home Screen"
3. Use it like a native app!

---

## 🛠️ Troubleshooting

**"Permission denied" when pushing?**
- Make sure you're logged into GitHub
- Use a Personal Access Token instead of password (GitHub requires this now)
- Generate token at: https://github.com/settings/tokens

**Pages not showing up?**
- Wait 2-3 minutes after enabling Pages
- Check that `.nojekyll` file is included (it is!)
- Verify branch is set to `main` and folder to `/`

**404 Error?**
- Make sure `index.html` is in the root folder (it is!)
- Check repository is public
- Wait a few more minutes

---

## 📞 Need Help?

- GitHub Pages Docs: https://pages.github.com/
- GitHub Support: https://support.github.com/

---

Happy deploying! 🚀
