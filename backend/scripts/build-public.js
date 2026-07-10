// Copies all frontend static assets from the repo root into backend/public/
// so Vercel can serve them as the SPA alongside the serverless API functions.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const pub = path.join(__dirname, '..', 'public');

fs.mkdirSync(pub, { recursive: true });

// Copy every file in root that matches these extensions
const EXTS = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.ico', '.webmanifest', '.txt']);
const SKIP = new Set([
  'node_modules', 'backend', 'tests', '.git', '.github', '.claude',
  // Not referenced by index.html/sw.js — no reason to ship these to every
  // visitor. preview.html/tests.html are dev-only pages; google-apps-script.js
  // is deployed separately, directly to Google Apps Script.
  'preview.html', 'tests.html', 'google-apps-script.js',
]);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (EXTS.has(path.extname(entry.name))) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(root, pub);

// .well-known/security.txt
const wellKnownSrc = path.join(root, '.well-known');
if (fs.existsSync(wellKnownSrc)) {
  copyDir(wellKnownSrc, path.join(pub, '.well-known'));
}

const copied = [];
function count(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) count(path.join(dir, e.name));
    else copied.push(path.join(dir, e.name).replace(pub, ''));
  }
}
count(pub);
console.log(`✓ Copied ${copied.length} files to backend/public/`);
