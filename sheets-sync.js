// ============================================================
// sheets-sync.js — Google Sheets & Inventory Sync
// ============================================================
// ============================================================
// GOOGLE SHEETS SYNC
// ============================================================
// Per-environment endpoints served by /api/env.js (Vercel env vars
// SHEETS_SYNC_URL / INVENTORY_SHEET_URL) — loads before this script (defer
// order in index.html). Staging must never write to the production business
// spreadsheet, so on staging only explicit config is used (empty disables
// sync; every call site guards on a falsy URL). Everywhere else the
// production URLs are the fallback, so production and local dev keep
// working with no Vercel env vars configured.
const _sheetsCfg = (typeof window !== 'undefined' && window.__FC_CONFIG__) || {};
const _isStaging = _sheetsCfg.environment === 'staging';
const SHEETS_SYNC_URL = _sheetsCfg.sheetsSyncUrl ||
  (_isStaging ? '' : 'https://script.google.com/macros/s/AKfycbz4IIUXvDoo7qJH1Ytn7hEWZ85Ek7hViA6riSezMZCXQbjKQG3VwfppQlq0kuTwOHT3/exec');
const INVENTORY_SHEET_URL = _sheetsCfg.inventorySheetUrl ||
  (_isStaging ? '' : 'https://docs.google.com/spreadsheets/d/14rYu6QgRD2r4X4ZjOs45Rqtl4p0XOPvJfcs5BpY54EE/edit?gid=1634965365#gid=1634965365');

// Sync state for the visual indicator
let _syncQueue = 0;

// ── Sync infrastructure ──────────────────────────────────────

// Sends a POST to GAS. Always fire-and-forget (no-cors), with 1 retry and console logging.
async function postToSheets(payload) {
  const url = SHEETS_SYNC_URL;
  if (!url) return;

  _syncQueue++;
  updateSyncIndicator('syncing');

  const attempt = async (n) => {
    try {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      return true;
    } catch (err) {
      if (n < 1) {
        await new Promise(r => setTimeout(r, 2000));
        return attempt(n + 1);
      }
      return false;
    }
  };

  const sent = await attempt(0);
  _syncQueue--;

  if (!sent) {
    updateSyncIndicator(_syncQueue > 0 ? 'syncing' : 'error');
    showToast(t('syncFailed'));
    return;
  }

  updateSyncIndicator(_syncQueue > 0 ? 'syncing' : 'success');
}

// Verifies sync via GET request (GAS doGet supports CORS — we can read the response)
async function verifySyncStatus(sheetName) {
  const url = SHEETS_SYNC_URL;
  if (!url) return { verified: false, error: 'no-url' };
  try {
    const resp = await fetch(`${url}?action=syncStatus&sheet=${encodeURIComponent(sheetName)}`);
    if (!resp.ok) return { verified: false, error: 'http-' + resp.status };
    const data = await resp.json();
    return { verified: true, ...data };
  } catch (err) {
    return { verified: false, error: err.message };
  }
}

// Shows a small persistent pill in the corner: Syncing / Synced / Sync failed
function updateSyncIndicator(state) {
  let indicator = document.querySelector('.sync-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'sync-indicator';
    document.body.appendChild(indicator);
  }

  indicator.className = 'sync-indicator sync-' + state;

  switch (state) {
    case 'syncing':
      indicator.innerHTML = '<span class="sync-dot pulse"></span>' + t('syncInProgress');
      break;
    case 'success':
      indicator.innerHTML = '<span class="sync-dot green"></span>' + t('syncSuccess');
      setTimeout(() => { if (indicator.classList.contains('sync-success')) indicator.classList.add('sync-fade'); }, 4000);
      break;
    case 'error':
      indicator.innerHTML = '<span class="sync-dot red"></span>' + t('syncFailed');
      break;
    default:
      indicator.classList.add('sync-fade');
  }
}

// ── Module sync ───────────────────────────────────────────────

function syncModuleToSheets(module) {
  const url = SHEETS_SYNC_URL;
  if (!url) return;

  const storeKey = STORE_KEYS[module];
  if (!storeKey) return;

  const records = getData(storeKey);

  // Derive sync fields from the authoritative getModuleFields() registry,
  // bypassing the permission filter by always including bottling's 'decision'.
  var baseFields = typeof getModuleFields === 'function' ? getModuleFields(module) : [];
  var fields = baseFields.map(function(f) { return { key: f.key, labelKey: f.labelKey }; });
  if (module === 'bottling' && !fields.some(function(f) { return f.key === 'decision'; })) {
    fields.push({ key: 'decision', labelKey: 'bt_decision' });
  }
  if (!fields || fields.length === 0) return;

  const keys = [...fields.map(f => f.key), 'notes', 'createdAt'];
  const labels = [...fields.map(f => tHe(f.labelKey)), tHe('notes'), 'Created At'];

  // Map of dropdown field keys to their i18n option lists per module
  const dropdownFields = {
    rawMaterials: { supplier: SUPPLIERS_RAW, category: CATEGORIES, unit: null },
    dateReceiving: { supplier: SUPPLIERS_DATES },
    fermentation: {},
    distillation1: { type: D1_TYPES, stillName: STILL_NAMES },
    distillation2: { productType: D2_PRODUCT_TYPES },
    bottling: { drinkType: DRINK_TYPES, filtered: null, color: null, taste: null, decision: null },
  };
  const dropdowns = dropdownFields[module] || {};

  // Format dropdown values as "key (Hebrew label)" for the sheet
  const formattedRecords = records.map(r => {
    const copy = { ...r };
    Object.keys(dropdowns).forEach(fieldKey => {
      const val = copy[fieldKey];
      if (val && typeof val === 'string' && I18N.he[val]) {
        copy[fieldKey] = val + ' (' + tHe(val) + ')';
      }
    });
    return copy;
  });

  postToSheets({
    sheetName: tHe('mod_' + module),
    keys,
    labels,
    records: formattedRecords,
    freeTextKeys: ['notes'],
  });
}


// ============================================================
// THEME
// ============================================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('factory_theme', next);
  const btn = document.querySelector('.theme-btn');
  if (btn) btn.innerHTML = next === 'dark'
    ? '<i data-feather="sun" class="icon-sm"></i>'
    : '<i data-feather="moon" class="icon-sm"></i>';
  if (typeof feather !== 'undefined') feather.replace();
}

function togglePalette() {
  const palettes = ['terroir', 'desert', 'kiln', 'mono'];
  const current = document.documentElement.getAttribute('data-palette') || 'terroir';
  const idx = palettes.indexOf(current);
  const next = palettes[(idx + 1) % palettes.length];
  document.documentElement.setAttribute('data-palette', next);
  localStorage.setItem('factory_palette', next);
  renderApp();
}

// Write per-item bottle stock to the CRM `stockLevels` collection (1:1 by
// product id — no drink-type aggregation). `itemCounts` = { productId: count }.
function syncCrmStockLevels(itemCounts) {
  if (typeof fbSetDoc !== 'function') {
    console.warn('[CRM-sync] fbSetDoc not available — skipping stock sync');
    return;
  }
  console.info('[CRM-sync] Writing stockLevels (per item) →', JSON.stringify(itemCounts));
  var now = new Date().toISOString();
  Object.keys(itemCounts).forEach(function(productId) {
    fbSetDoc('stockLevels', productId, {
      productId: productId,
      currentStock: itemCounts[productId] || 0,
      unit: 'בקבוק',
      lastUpdated: now,
      factoryLastSync: now,
    }, true).then(function() {
      console.info('[CRM-sync] ✓ stockLevels/' + productId + ' → ' + (itemCounts[productId] || 0));
    }).catch(function(err) {
      console.error('[CRM-sync] ✗ stockLevels/' + productId + ' FAILED:', err && (err.code || err.message || err));
    });
  });
}

// After a declaration/save, push current per-item stock to Firestore + the CRM,
// and log a production snapshot to the Sheets ledger.
// Per-item stock is the count from the latest inventory declaration (keyed by
// catalog product id); bottling remains a spirit-level production log.
async function syncInventorySnapshot(triggeredBy) {
  const dateRecords = getData(STORE_KEYS.dateReceiving);
  const fermRecords = getData(STORE_KEYS.fermentation);
  const d1Records = getData(STORE_KEYS.distillation1);
  const d2Records = getData(STORE_KEYS.distillation2);
  const bottlingRecords = getData(STORE_KEYS.bottling);

  const baseRecords = getData(STORE_KEYS.inventoryBase);
  const base = baseRecords.length > 0 ? baseRecords[0] : {};
  const catalog = (typeof getCatalog === 'function') ? getCatalog() : [];
  const itemCounts = {};
  catalog.forEach(function(item) { itemCounts[item.id] = parseInt(base[item.id]) || 0; });
  const bottlesTotal = Object.keys(itemCounts).reduce(function(s, k) { return s + itemCounts[k]; }, 0);

  // Production metrics (spirit-level, unchanged — for the Sheets ledger)
  const totalDatesReceived = dateRecords.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  const totalDatesInFerm = fermRecords.reduce((sum, r) => {
    if (r.datesCrates !== undefined && r.datesCrates !== '') return sum + (parseFloat(r.datesCrates) || 0) * 20;
    return sum + (parseFloat(r.datesKg) || 0);
  }, 0);
  const d1Produced = d1Records.reduce((sum, r) => sum + (parseFloat(r.distilledQty) || 0), 0);
  const d1Consumed = d2Records.reduce((sum, r) => sum + (parseFloat(r.d1InputQty) || 0), 0);
  const d2Produced = d2Records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);

  const session = getSession();
  const record = {
    timestamp: new Date().toISOString(),
    user: session?.username || 'unknown',
    triggeredBy: triggeredBy || 'save',
    dates_available: Math.max(0, totalDatesReceived - totalDatesInFerm),
    dates_received: totalDatesReceived,
    dates_in_ferm: totalDatesInFerm,
    d1_produced: d1Produced,
    d1_available: Math.max(0, d1Produced - d1Consumed),
    d2_produced: d2Produced,
    bottles_total: bottlesTotal,
    ...catalog.reduce((acc, item) => ({ ...acc, ['item_' + item.id]: itemCounts[item.id] || 0 }), {}),
  };
  const keys = Object.keys(record);
  const labels = [
    'Timestamp', 'User', 'Triggered By',
    tHe('inv_dates'), 'Dates Received (kg)', tHe('inv_datesUsed'),
    'D1 Produced (L)', 'D1 Available (L)',
    'D2 Produced (L)',
    'Bottles Total',
    ...catalog.map(item => item.name),
  ];

  if (SHEETS_SYNC_URL) {
    postToSheets({ sheetName: tHe('mod_inventory'), action: 'append', keys, labels, records: [record] });
  }

  // Prefer the backend (single authoritative Firestore writer — avoids every
  // client having direct write access to stockLevels/factory_inventory).
  // Fall back to the direct client writes below only when the backend call
  // is unavailable or fails, so behavior is unchanged while this path is
  // verified on staging. See docs on the staging/production stabilization
  // plan for why single-writer matters here.
  var backendResult = (typeof apiUpdateInventory === 'function')
    ? await apiUpdateInventory(itemCounts, triggeredBy)
    : null;

  if (backendResult && backendResult.success) {
    return;
  }

  if (backendResult && backendResult.error) {
    console.warn('[inventory-sync] Backend inventory sync failed, using direct client write:', backendResult.error);
  }

  // Firestore: current inventory doc (per item) — cross-device (fallback)
  if (typeof fbSetDoc === 'function') {
    fbSetDoc('factory_inventory', 'current', {
      bottles: { ...itemCounts },
      total: bottlesTotal,
      updatedAt: new Date().toISOString(),
      updatedBy: session?.username || 'system',
      trigger: triggeredBy || 'save',
    }).catch(function(err) {
      console.warn('[inventory-sync] Firestore factory_inventory write failed:', err && (err.code || err.message || err));
    });
  }

  // CRM per-item stock (client-side write fallback; allowed by the current
  // interim dual-write rules)
  syncCrmStockLevels(itemCounts);
}
