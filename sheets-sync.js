// ============================================================
// sheets-sync.js — Google Sheets & Inventory Sync
// ============================================================
// ============================================================
// GOOGLE SHEETS SYNC
// ============================================================
const SHEETS_SYNC_URL = 'https://script.google.com/macros/s/AKfycbz4IIUXvDoo7qJH1Ytn7hEWZ85Ek7hViA6riSezMZCXQbjKQG3VwfppQlq0kuTwOHT3/exec';
const INVENTORY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/14rYu6QgRD2r4X4ZjOs45Rqtl4p0XOPvJfcs5BpY54EE/edit?gid=1634965365#gid=1634965365';

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

  // Build field definitions — bypass permission filter for sync
  // so decision/all fields always appear in the sheet regardless of who is logged in
  const allModuleFields = {
    rawMaterials: [
      { key: 'date', labelKey: 'rm_receiveDate' },
      { key: 'supplier', labelKey: 'rm_supplier' },
      { key: 'category', labelKey: 'rm_category' },
      { key: 'item', labelKey: 'rm_item' },
      { key: 'weight', labelKey: 'rm_weight' },
      { key: 'unit', labelKey: 'rm_unit' },
      { key: 'expiry', labelKey: 'rm_expiry' },
      { key: 'tithing', labelKey: 'rm_tithing' },
      { key: 'healthCert', labelKey: 'rm_healthCert' },
      { key: 'kosher', labelKey: 'rm_kosher' },
    ],
    dateReceiving: [
      { key: 'date', labelKey: 'dr_receiveDate' },
      { key: 'supplier', labelKey: 'dr_supplier' },
      { key: 'weight', labelKey: 'dr_weight' },
      { key: 'tithing', labelKey: 'dr_tithing' },
      { key: 'expiryPeriod', labelKey: 'dr_expiryPeriod' },
      { key: 'qtyInDate', labelKey: 'dr_qtyInDate' },
    ],
    fermentation: [
      { key: 'date', labelKey: 'fm_date' },
      { key: 'tankSize', labelKey: 'fm_tankSize' },
      { key: 'datesCrates', labelKey: 'fm_datesCrates' },
      { key: 'temperature', labelKey: 'fm_temperature' },
      { key: 'sugar', labelKey: 'fm_sugar' },
      { key: 'ph', labelKey: 'fm_ph' },
      { key: 'sentToDistillation', labelKey: 'fm_sentToDistillation' },
    ],
    distillation1: [
      { key: 'date', labelKey: 'd1_date' },
      { key: 'type', labelKey: 'd1_type' },
      { key: 'stillName', labelKey: 'd1_stillName' },
      { key: 'fermDate', labelKey: 'd1_fermDate' },
      { key: 'distQty', labelKey: 'd1_distQty' },
      { key: 'initAlcohol', labelKey: 'd1_initAlcohol' },
      { key: 'finalAlcohol', labelKey: 'd1_finalAlcohol' },
      { key: 'temp', labelKey: 'd1_temp' },
      { key: 'timeRange', labelKey: 'd1_timeRange' },
      { key: 'distilledQty', labelKey: 'd1_distilledQty' },
    ],
    distillation2: [
      { key: 'date', labelKey: 'd2_date' },
      { key: 'productType', labelKey: 'd2_productType' },
      { key: 'd1Dates', labelKey: 'd2_d1Dates' },
      { key: 'batchNumber', labelKey: 'd2_batchNumber' },
      { key: 'initAlcohol', labelKey: 'd2_initAlcohol' },
      { key: 'headSep', labelKey: 'd2_headSep' },
      { key: 'tailAlcohol', labelKey: 'd2_tailAlcohol' },
      { key: 'temp', labelKey: 'd2_temp' },
      { key: 'timeRange', labelKey: 'd2_timeRange' },
      { key: 'quantity', labelKey: 'd2_quantity' },
      { key: 'd1InputQty', labelKey: 'd2_d1InputQty' },
    ],
    bottling: [
      { key: 'date', labelKey: 'bt_bottlingDate' },
      { key: 'drinkType', labelKey: 'bt_drinkType' },
      { key: 'batchNumber', labelKey: 'bt_batchNumber' },
      { key: 'barrelNumber', labelKey: 'bt_barrelNumber' },
      { key: 'd2Date', labelKey: 'bt_d2Date' },
      { key: 'alcohol', labelKey: 'bt_alcohol' },
      { key: 'filtered', labelKey: 'bt_filtered' },
      { key: 'color', labelKey: 'bt_color' },
      { key: 'taste', labelKey: 'bt_taste' },
      { key: 'contaminants', labelKey: 'bt_contaminants' },
      { key: 'bottleCount', labelKey: 'bt_bottleCount' },
      { key: 'd2InputQty', labelKey: 'bt_d2InputQty' },
      { key: 'decision', labelKey: 'bt_decision' },
    ],
  };

  const fields = allModuleFields[module];
  if (!fields) return;

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

// Sync bottle counts to the CRM stockLevels Firestore collection.
// Called as fallback when the backend API is unavailable.
// CRM products: 1=ערק, 2=ליקריץ, 3=ADV, 4=ג'ין, 5=ברנדי
function syncCrmStockLevels(bottleInv) {
  if (typeof fbSetDoc !== 'function') return;
  var DRINK_TO_CRM = {
    drink_arak: '1', drink_licorice: '2', drink_edv: '3', drink_gin: '4',
    drink_brandyVS: '5', drink_brandyVSOP: '5', drink_brandyMed: '5',
  };
  var aggregated = {};
  Object.keys(bottleInv).forEach(function(dt) {
    var pid = DRINK_TO_CRM[dt];
    if (!pid) return;
    aggregated[pid] = (aggregated[pid] || 0) + (bottleInv[dt] || 0);
  });
  var now = new Date().toISOString();
  Object.keys(aggregated).forEach(function(productId) {
    fbSetDoc('stockLevels', productId, {
      productId: productId,
      currentStock: aggregated[productId],
      unit: 'בקבוק',
      lastUpdated: now,
      factoryLastSync: now,
    }, true).catch(function() {});
  });
}

// Append a timestamped inventory snapshot row to the Sheets Inventory ledger.
// Called automatically after any record is saved, updated, or deleted.
function syncInventorySnapshot(triggeredBy) {
  const bottlingRecords = getData(STORE_KEYS.bottling);
  const rawRecords = getData(STORE_KEYS.rawMaterials);
  const dateRecords = getData(STORE_KEYS.dateReceiving);
  const fermRecords = getData(STORE_KEYS.fermentation);
  const d1Records = getData(STORE_KEYS.distillation1);
  const d2Records = getData(STORE_KEYS.distillation2);

  // Base inventory (read first so we can filter bottling by declaration date)
  const baseRecords = getData(STORE_KEYS.inventoryBase);
  const baseDeclaredAt = (baseRecords.length > 0 && baseRecords[0].declared_at) || null;

  const bottleInv = {};
  DRINK_TYPES.forEach(dt => { bottleInv[dt] = 0; });
  if (baseRecords.length > 0) {
    const latestBase = baseRecords[0];
    DRINK_TYPES.forEach(dt => {
      bottleInv[dt] = (bottleInv[dt] || 0) + (parseInt(latestBase[dt]) || 0);
    });
  }
  // Only count bottling records created after the last declaration
  bottlingRecords.forEach(r => {
    if (r.drinkType && r.decision === 'approved') {
      if (!baseDeclaredAt || (r.createdAt && r.createdAt > baseDeclaredAt)) {
        bottleInv[r.drinkType] = (bottleInv[r.drinkType] || 0) + (parseInt(r.bottleCount) || 0);
      }
    }
  });

  const totalDatesReceived = dateRecords.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  const totalDatesInFerm = fermRecords.reduce((sum, r) => {
    if (r.datesCrates !== undefined && r.datesCrates !== '') return sum + (parseFloat(r.datesCrates) || 0) * 20;
    return sum + (parseFloat(r.datesKg) || 0);
  }, 0);

  const d1Produced = d1Records.reduce((sum, r) => sum + (parseFloat(r.distilledQty) || 0), 0);
  const d1Consumed = d2Records.reduce((sum, r) => sum + (parseFloat(r.d1InputQty) || 0), 0);
  const d2Produced = d2Records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
  const d2Consumed = bottlingRecords.reduce((sum, r) => sum + (parseFloat(r.d2InputQty) || 0), 0);

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
    d2_available: Math.max(0, d2Produced - d2Consumed),
    ...DRINK_TYPES.reduce((acc, dt) => ({ ...acc, [dt]: bottleInv[dt] || 0 }), {}),
  };

  const keys = Object.keys(record);
  const labels = [
    'Timestamp', 'User', 'Triggered By',
    tHe('inv_dates'), 'Dates Received (kg)', tHe('inv_datesUsed'),
    'D1 Produced (L)', 'D1 Available (L)',
    'D2 Produced (L)', 'D2 Available (L)',
    ...DRINK_TYPES.map(dt => tHe(dt)),
  ];

  if (SHEETS_SYNC_URL) {
    postToSheets({
      sheetName: tHe('mod_inventory'),
      action: 'append',
      keys,
      labels,
      records: [record],
    });
  }

  // Write directly to Firestore (primary path — immediate, no backend dependency)
  if (typeof fbSetDoc === 'function') {
    fbSetDoc('factory_inventory', 'current', {
      bottles: { ...bottleInv },
      total: Object.values(bottleInv).reduce((s, v) => s + v, 0),
      updatedAt: new Date().toISOString(),
      updatedBy: session?.username || 'system',
      trigger: triggeredBy || 'save',
    }).catch(function() {});
  }

  syncCrmStockLevels(bottleInv);

  // Also notify backend (fire-and-forget for any server-side processing)
  if (typeof apiUpdateInventory === 'function') {
    apiUpdateInventory(bottleInv, triggeredBy || 'save').catch(function() {});
  }
}
