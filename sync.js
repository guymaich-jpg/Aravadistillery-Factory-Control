// ============================================================
// sync.js — Google Sheets sync & CRM sync
// ============================================================

const SHEETS_SYNC_URL = 'https://script.google.com/macros/s/AKfycbz4IIUXvDoo7qJH1Ytn7hEWZ85Ek7hViA9riSezMZCXQbjKQG3VwfppQlq0kuTwOHT3/exec';
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

  const fields = ALL_MODULE_SYNC_FIELDS[module];
  if (!fields) return;

  const keys = [...fields.map(f => f.key), 'notes', 'createdAt'];
  const labels = [...fields.map(f => tHe(f.labelKey)), tHe('notes'), 'Created At'];

  const dropdowns = SYNC_DROPDOWN_FIELDS[module] || {};

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
    });
  });
}

// Helper: write inventory directly to Firestore (shared by syncInventorySnapshot fallbacks)
function _writeInventoryToFirestore(bottleInv, session, triggeredBy) {
  fbSetDoc('factory_inventory', 'current', {
    bottles: { ...bottleInv },
    total: Object.values(bottleInv).reduce((s, v) => s + v, 0),
    updatedAt: new Date().toISOString(),
    updatedBy: session?.username || 'system',
    trigger: triggeredBy || 'save',
  });
  syncCrmStockLevels(bottleInv);
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

  const bottleInv = {};
  DRINK_TYPES.forEach(dt => { bottleInv[dt] = 0; });
  bottlingRecords.forEach(r => {
    if (r.drinkType && r.decision === 'approved') {
      bottleInv[r.drinkType] = (bottleInv[r.drinkType] || 0) + (parseInt(r.bottleCount) || 0);
    }
  });

  // Include base inventory in totals
  const baseRecords = getData(STORE_KEYS.inventoryBase);
  if (baseRecords.length > 0) {
    const latestBase = baseRecords[0];
    DRINK_TYPES.forEach(dt => {
      bottleInv[dt] = (bottleInv[dt] || 0) + (parseInt(latestBase[dt]) || 0);
    });
  }

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

  // Push inventory to backend for CRM reads (backend writes to Firestore)
  if (typeof apiUpdateInventory === 'function') {
    apiUpdateInventory(bottleInv, triggeredBy || 'save').then(function(result) {
      if (!result) {
        _writeInventoryToFirestore(bottleInv, session, triggeredBy);
      }
    }).catch(function() {
      _writeInventoryToFirestore(bottleInv, session, triggeredBy);
    });
  } else {
    _writeInventoryToFirestore(bottleInv, session, triggeredBy);
  }
}
