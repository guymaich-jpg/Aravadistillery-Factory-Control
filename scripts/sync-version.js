#!/usr/bin/env node
// sync-version.js — single source of truth for the app version.
//
// package.json "version" is authoritative. This script propagates it to every
// other place the version appears, so cache-busting can never silently drift:
//   - sw.js         → const APP_VERSION = 'X.Y.Z'   (drives the SW cache name)
//   - index.html    → every ?v=X.Y.Z query on a script/link tag
//
// Usage:
//   node scripts/sync-version.js          → rewrite sw.js + index.html to match package.json
//   node scripts/sync-version.js --check  → exit 1 if anything is out of sync (CI guard)
//
// Wired to the npm "version" lifecycle so `npm version patch|minor|major`
// updates every file in one step.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`[sync-version] package.json version "${version}" is not X.Y.Z`);
  process.exit(1);
}

/** @type {{file:string, apply:(s:string)=>string, find:(s:string)=>string[]}[]} */
const targets = [
  {
    file: 'sw.js',
    apply: (s) => s.replace(/(const APP_VERSION = ')(\d+\.\d+\.\d+)(')/, `$1${version}$3`),
    find: (s) => [...s.matchAll(/const APP_VERSION = '(\d+\.\d+\.\d+)'/g)].map(m => m[1]),
  },
  {
    file: 'index.html',
    apply: (s) => s.replace(/(\?v=)\d+\.\d+\.\d+/g, `$1${version}`),
    find: (s) => [...s.matchAll(/\?v=(\d+\.\d+\.\d+)/g)].map(m => m[1]),
  },
];

let drift = false;
for (const t of targets) {
  const p = path.join(root, t.file);
  const src = fs.readFileSync(p, 'utf8');
  const found = t.find(src);
  const mismatched = found.filter(v => v !== version);

  if (check) {
    if (mismatched.length) {
      drift = true;
      console.error(`[sync-version] ${t.file}: found ${[...new Set(mismatched)].join(', ')} — expected ${version}`);
    }
    continue;
  }

  const next = t.apply(src);
  if (next !== src) {
    fs.writeFileSync(p, next);
    console.log(`[sync-version] ${t.file} → ${version}`);
  }
}

if (check) {
  if (drift) {
    console.error('[sync-version] version drift detected. Run: node scripts/sync-version.js');
    process.exit(1);
  }
  console.log(`[sync-version] all files match package.json (${version}) ✓`);
} else {
  console.log(`[sync-version] done — everything at ${version}`);
}
