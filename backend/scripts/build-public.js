// Copies all frontend static assets from the repo root into backend/public/
// so Vercel can serve them as the SPA alongside the serverless API functions.
//
// .js/.css files are minified with esbuild during the copy (source stays
// readable in the repo; only the deployed output is minified). Classic
// <script> load order and the shared global scope between files are
// untouched — this only shrinks bytes, no bundling/concatenation, so it
// carries none of the execution-order risk a real bundler migration would.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

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

let bytesBefore = 0;
let bytesAfter = 0;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
      continue;
    }
    if (!EXTS.has(path.extname(entry.name))) continue;

    const ext = path.extname(entry.name);
    const alreadyMinified = entry.name.endsWith('.min.js');
    if ((ext === '.js' || ext === '.css') && !alreadyMinified) {
      const source = fs.readFileSync(srcPath, 'utf8');
      const loader = ext === '.js' ? 'js' : 'css';
      // charset: 'utf8' keeps Hebrew/Thai/etc. strings as raw UTF-8 instead
      // of esbuild's default \uXXXX escaping, which would bloat (not shrink)
      // this app's heavily multilingual i18n.js.
      const result = esbuild.transformSync(source, { loader, minify: true, charset: 'utf8' });
      fs.writeFileSync(destPath, result.code);
      bytesBefore += source.length;
      bytesAfter += result.code.length;
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(root, pub);

if (bytesBefore > 0) {
  const pct = (100 * (1 - bytesAfter / bytesBefore)).toFixed(1);
  console.log(`✓ Minified JS/CSS: ${bytesBefore} → ${bytesAfter} bytes (${pct}% smaller)`);
}

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
