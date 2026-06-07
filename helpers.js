// ============================================================
// helpers.js — State, Routing & DOM Utilities
// ============================================================
// ============================================================
// script.js — Factory Control App (main controller)
// ============================================================

// ---------- State ----------
// Restore navigation state from sessionStorage so refresh keeps the user's place
let currentScreen = sessionStorage.getItem('fc_screen') || 'home';
let currentModule = sessionStorage.getItem('fc_module') || null;
let currentView = sessionStorage.getItem('fc_view') || 'list';
let editingRecord = null;

// Persist navigation state on every change
function _persistNavState() {
  sessionStorage.setItem('fc_screen', currentScreen || 'home');
  if (currentModule) sessionStorage.setItem('fc_module', currentModule);
  else sessionStorage.removeItem('fc_module');
  sessionStorage.setItem('fc_view', currentView || 'list');
}

// --- Hash-based routing for browser back/forward ---
let _suppressHashChange = false;

function _syncHashToState() {
  _suppressHashChange = true;
  let hash = '#/';
  if (currentModule) {
    hash = '#/' + currentModule;
    if (currentView && currentView !== 'list') hash += '/' + currentView;
  } else if (currentScreen && currentScreen !== 'home') {
    hash = '#/' + currentScreen;
  }
  if (location.hash !== hash) {
    history.pushState(null, '', hash);
  }
  _suppressHashChange = false;
}

function _restoreStateFromHash() {
  const hash = location.hash.replace('#/', '').split('/');
  const segment = hash[0] || '';
  const view = hash[1] || 'list';

  // Handle invitation links: #/invite/TOKEN
  if (segment === 'invite' && hash[1]) {
    authMode = 'invite';
    _inviteToken = hash[1];
    currentScreen = 'home';
    currentModule = null;
    currentView = 'list';
    return;
  }

  const moduleNames = ['rawMaterials', 'dateReceiving', 'fermentation', 'distillation1', 'distillation2', 'bottling', 'inventory'];
  const screenNames = ['dashboard', 'backoffice', 'home', 'declare', 'menu'];

  if (moduleNames.includes(segment)) {
    currentModule = segment;
    currentScreen = segment === 'inventory' ? 'inventory' : segment;
    currentView = (view === 'form' || view === 'detail') ? view : 'list';
  } else if (screenNames.includes(segment)) {
    currentScreen = segment;
    currentModule = null;
    currentView = 'list';
  } else {
    currentScreen = 'home';
    currentModule = null;
    currentView = 'list';
  }
  // Can't restore editingRecord from URL, fall back to list
  if ((currentView === 'form' || currentView === 'detail') && !editingRecord) {
    currentView = 'list';
  }
}

window.addEventListener('popstate', () => {
  if (_suppressHashChange) return;
  _restoreStateFromHash();
  renderApp();
});
let signatureCanvas = null;
let sigCtx = null;
let sigDrawing = false;
let _navDirection = 'none'; // 'forward' | 'back' | 'none' — for iOS-style transitions
const _scrollPositions = {}; // keyed by "screen:module" — preserves scroll on tab switch

// ---------- Helpers ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
// NOTE: el() sets innerHTML — callers must ensure any user data is escaped via esc()
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

// HTML escape helper — prevents XSS when interpolating user data into innerHTML
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function formatDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(currentLang === 'he' ? 'he-IL' : 'en-GB'); }
  catch { return d; }
}

function _renderSparkline(data, color) {
  if (!data || data.length < 2) return '';
  const w = 80, h = 22;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const c = color || 'var(--accent)';
  return `<div class="sparkline-wrap"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${pts}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/></svg></div>`;
}

function showToast(msg) {
  let toast = $('.toast');
  if (!toast) {
    toast = el('div', 'toast');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
