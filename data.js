// ============================================================
// data.js — Data Layer (Firebase + localStorage fallback)
// ============================================================

const STORE_KEYS = {
  rawMaterials: 'factory_rawMaterials',
  dateReceiving: 'factory_dateReceiving',
  fermentation: 'factory_fermentation',
  distillation1: 'factory_distillation1',
  distillation2: 'factory_distillation2',
  bottling: 'factory_bottling',
  inventoryVersions: 'factory_inventoryVersions',
  inventoryCounts: 'factory_inventoryCounts',
  inventoryBase: 'factory_inventoryBase',
  inventoryDeclarations: 'factory_inventoryDeclarations',
  customSuppliers: 'factory_customSuppliers',
  users: 'factory_users',
};

// ---- localStorage helpers ----
function getData(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    // Backup corrupted data before removing
    const raw = localStorage.getItem(key);
    if (raw) {
      try { localStorage.setItem(key + '_corrupted_backup', raw); } catch(_) {}
    }
    localStorage.removeItem(key);
    return [];
  }
}

function setData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert('Storage is full. Please export and clear old data.');
    }
    return;
  }
  const session = JSON.parse(localStorage.getItem('factory_session') || 'null');
  if (session && session.username) {
    updateUserLastActivity(session.username);
  }
}

function updateUserLastActivity(username) {
  const users = JSON.parse(localStorage.getItem(STORE_KEYS.users) || '[]');
  const idx = users.findIndex(u => u.username === username);
  if (idx !== -1) {
    users[idx].lastActivity = new Date().toISOString();
    localStorage.setItem(STORE_KEYS.users, JSON.stringify(users));
  }
}

// ---- CRUD (localStorage, synced to Firebase when available) ----
function addRecord(key, record) {
  // Validate: reject prototype pollution keys
  const dangerousKeys = ['__proto__', 'constructor'];
  for (const k of Object.keys(record)) {
    if (dangerousKeys.includes(k)) {
      return null;
    }
  }

  // Validate: limit record size to 100KB
  const recordJSON = JSON.stringify(record);
  if (recordJSON.length > 100 * 1024) {
    return null;
  }

  const data = getData(key);
  record.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  record.createdAt = new Date().toISOString();
  record.createdBy = getSession()?.username || 'unknown';
  data.unshift(record);
  setData(key, data);

  // Sync to Firebase using record.id as doc ID (idempotent — safe to retry)
  if (typeof fbSetDoc === 'function' && !_syncInProgress) {
    fbSetDoc(key, record.id, record).then(ok => {
      if (!ok && typeof queueOfflineAction === 'function') {
        queueOfflineAction({ type: 'firestore-set', collection: key, docId: record.id, data: record, merge: false });
      }
    }).catch(() => {
      if (typeof queueOfflineAction === 'function') {
        queueOfflineAction({ type: 'firestore-set', collection: key, docId: record.id, data: record, merge: false });
      }
    });
  }

  return record;
}

function updateRecord(key, id, updates) {
  // Validate: reject prototype pollution keys
  const dangerousKeys = ['__proto__', 'constructor'];
  for (const k of Object.keys(updates)) {
    if (dangerousKeys.includes(k)) {
      return null;
    }
  }

  // Validate: limit update size to 100KB
  const updatesJSON = JSON.stringify(updates);
  if (updatesJSON.length > 100 * 1024) {
    return null;
  }

  const data = getData(key);
  const idx = data.findIndex(r => r.id === id);
  if (idx !== -1) {
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    setData(key, data);

    if (typeof fbSetDoc === 'function' && !_syncInProgress) {
      const payload = { ...updates, updatedAt: data[idx].updatedAt };
      fbSetDoc(key, id, payload, true).then(ok => {
        if (!ok && typeof queueOfflineAction === 'function') {
          queueOfflineAction({ type: 'firestore-set', collection: key, docId: id, data: payload, merge: true });
        }
      }).catch(() => {
        if (typeof queueOfflineAction === 'function') {
          queueOfflineAction({ type: 'firestore-set', collection: key, docId: id, data: payload, merge: true });
        }
      });
    }

    return data[idx];
  }
  return null;
}

function deleteRecord(key, id) {
  const data = getData(key);
  const filtered = data.filter(r => r.id !== id);
  setData(key, filtered);

  if (typeof fbDelete === 'function' && !_syncInProgress) {
    fbDelete(key, id).then(ok => {
      if (!ok && typeof queueOfflineAction === 'function') {
        queueOfflineAction({ type: 'firestore-delete', collection: key, docId: id });
      }
    }).catch(() => {
      if (typeof queueOfflineAction === 'function') {
        queueOfflineAction({ type: 'firestore-delete', collection: key, docId: id });
      }
    });
  }
}

function getRecordCount(key) {
  return getData(key).length;
}

function getTodayRecords(key) {
  const today = new Date().toISOString().slice(0, 10);
  return getData(key).filter(r => r.createdAt && r.createdAt.startsWith(today));
}

// ---- Custom Dropdown Options ----
// Store custom options per field key
function getCustomOptions(fieldKey) {
  return JSON.parse(localStorage.getItem('factory_customOptions_' + fieldKey) || '[]');
}

async function addCustomOption(fieldKey, value) {
  value = value.trim();
  if (!value) return;
  const opts = getCustomOptions(fieldKey);
  if (!opts.includes(value)) {
    opts.push(value);
    localStorage.setItem('factory_customOptions_' + fieldKey, JSON.stringify(opts));
  }
  // Sync to Firebase
  if (typeof fbAddCustomOption === 'function') {
    await fbAddCustomOption(fieldKey, value).catch(() => {});
  }
  return value;
}

// ---- Inventory Versioning ----
function saveInventoryVersion(snapshot) {
  const versions = getData(STORE_KEYS.inventoryVersions);
  const prevVersion = versions.length > 0 ? versions[0] : null;

  const gaps = {};
  if (prevVersion) {
    Object.keys(snapshot.items).forEach(key => {
      const current = snapshot.items[key] || 0;
      const previous = prevVersion.items[key] || 0;
      gaps[key] = current - previous;
    });
  }

  const record = {
    version: versions.length + 1,
    items: snapshot.items,
    gaps: gaps,
    note: snapshot.note || '',
    createdAt: new Date().toISOString(),
    createdBy: snapshot.createdBy || getSession()?.username || 'unknown'
  };

  versions.unshift(record);
  setData(STORE_KEYS.inventoryVersions, versions);

  if (typeof fbAdd === 'function') {
    fbAdd(STORE_KEYS.inventoryVersions, record).catch(() => {});
  }

  return record;
}

// ---- Dropdown data ----
const SUPPLIERS_RAW = [
  'sup_tamartushka', 'sup_nichuchot', 'sup_iherb',
  'sup_shlr', 'sup_pcsi', 'sup_yakev', 'sup_selfHarvest', 'sup_other'
];

const SUPPLIERS_DATES = [
  'sup_gamliel', 'sup_lara', 'sup_selfHarvest', 'sup_other'
];

const CATEGORIES = ['rm_cat_spices', 'rm_cat_labels', 'rm_cat_packaging'];

const ITEMS_BY_CATEGORY = {
  rm_cat_spices: [
    'Anise Seeds / เมล็ดโป๊ยกั๊ก',
    'Star Anise / โป๊ยกั๊ก',
    'Licorice / ชะเอม',
    'Juniper / จูนิเปอร์',
    'Cardamom / กระวาน',
    'Cinnamon / อบเชย',
    'Chamomile / คาโมมายล์',
    'Coriander Seeds / เมล็ดผักชี',
    'Citrus Orange / ส้ม',
    'Citrus Lemon / มะนาว',
    'Jujube / พุทรา',
    'Carob / แคร็อบ',
    'Pennyroyal / เพนนีรอยัล',
    'Allspice / ออลสไปซ์',
    'Katlav / คัทลาฟ',
    'Mastic / มาสติก',
    'Terebinth / เทเรบินท์',
  ],
  rm_cat_labels: [
    'Arak Neck / ฉลากคออารัก',
    'Arak Body / ฉลากตัวอารัก',
    'Gin Neck / ฉลากคอจิน',
    'Gin Body / ฉลากตัวจิน',
    'EDV Neck / ฉลากคอ EDV',
    'EDV Body / ฉลากตัว EDV',
    'Licorice Neck / ฉลากคอชะเอม',
    'Licorice Body / ฉลากตัวชะเอม',
    'Brandy VS Neck / ฉลากคอบรั่นดี VS',
    'Brandy VS Body / ฉลากตัวบรั่นดี VS',
    'Brandy VSOP Neck / ฉลากคอบรั่นดี VSOP',
    'Brandy VSOP Body / ฉลากตัวบรั่นดี VSOP',
    'Cork Label Copper / ฉลากจุกทองแดง',
    'Cork Label Gold / ฉลากจุกทอง',
  ],
  rm_cat_packaging: [
    'Obulo Bottle (Brandy) / ขวดโอบูโล (บรั่นดี)',
    'Demos Bottle (Gin, EDV) / ขวดเดมอส (จิน, EDV)',
    'Lov Bottle (Arak, Licorice) / ขวดลอฟ (อารัก, ชะเอม)',
    'Demos Cork / จุกเดมอส',
    'Obulo/Lov Cork / จุกโอบูโล/ลอฟ',
    'Carton 6-Obulo / กล่อง 6 โอบูโล',
    'Carton 6-Demos / กล่อง 6 เดมอส',
    'Carton 6-Lov / กล่อง 6 ลอฟ',
    'Carton Single / กล่องเดี่ยว',
    'Carton 12-Obulo / กล่อง 12 โอบูโล',
    'Carton 12-Demos / กล่อง 12 เดมอส',
    'Carton 12-Lov / กล่อง 12 ลอฟ',
    'Barrels / ถังไม้โอ๊ค',
  ],
};

const TANK_SIZES = [400, 500, 900, 1000];

const DRINK_TYPES = [
  'drink_arak', 'drink_gin', 'drink_edv', 'drink_licorice',
  'drink_brandyVS', 'drink_brandyVSOP', 'drink_brandyMed'
];

// ---- Product catalog (the 19 finished-product SKUs) ----------------------
// Single source of truth shared with the CRM (Firestore `products` collection).
// Factory Control uses NAME + id only — never price. `_catalog` is loaded live
// from Firestore on startup; CATALOG_FALLBACK keeps the app working offline.
const CATALOG_FALLBACK = [
  { id: '1',  name: 'ערק 500 מ"ל' },      { id: '2',  name: 'ליקריץ 500 מ"ל' },
  { id: '3',  name: 'או-דה-וי 500 מ"ל' },  { id: '4',  name: 'ג\'ין 500 מ"ל' },
  { id: '5',  name: 'ברנדי VS 500 מ"ל' },  { id: '6',  name: 'ערק 200 מ"ל' },
  { id: '7',  name: 'ג\'ין 200 מ"ל' },      { id: '8',  name: 'ברנדי 200 מ"ל' },
  { id: '9',  name: 'ליקר ערק תאנים' },     { id: '10', name: 'ליקר ג\'ין הדרים' },
  { id: '11', name: 'ערק גלי' },           { id: '12', name: 'ליקריץ גלי' },
  { id: '13', name: 'גין גלי' },           { id: '14', name: 'ערק רואי' },
  { id: '15', name: 'ליקריץ אורי' },       { id: '16', name: 'גין רואי' },
  { id: '17', name: 'ערק עידו' },          { id: '18', name: 'ליקריץ עידו' },
  { id: '19', name: 'גין עידו' },
];

var _catalog = CATALOG_FALLBACK.slice();

function getCatalog() { return _catalog; }

// Load the live catalog from Firestore (active products only), sorted by id.
// Falls back silently to CATALOG_FALLBACK if Firestore is unavailable.
async function loadCatalog() {
  if (typeof fbGetAll !== 'function' || (typeof isFirebaseReady === 'function' && !isFirebaseReady())) return;
  try {
    const products = await fbGetAll('products');
    if (products && products.length) {
      const active = products
        .filter(p => p && p.isActive !== false && p.id != null)
        .map(p => ({ id: String(p.id), name: p.name || String(p.id) }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
      if (active.length) _catalog = active;
    }
  } catch (e) { /* keep fallback */ }
}

const D1_TYPES = [
  'd1_type_dist1', 'd1_type_tailsArak', 'd1_type_tailsGin',
  'd1_type_tailsEDV', 'd1_type_cleaning'
];

const STILL_NAMES = ['d1_still_amiti', 'd1_still_aladdin'];

const D2_PRODUCT_TYPES = ['drink_edv', 'drink_arak', 'drink_gin'];

// ---- Record Archiving ----
// Moves records older than `monthsOld` months from the active store
// to an archive key (factory_<module>_archive). Nothing is deleted —
// records are COPIED first, then removed from the active set only if
// the copy succeeded.

function archiveOldRecords(moduleName, monthsOld) {
  monthsOld = monthsOld || 6;
  var key = STORE_KEYS[moduleName];
  if (!key) return 0;

  var cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsOld);
  var cutoffISO = cutoff.toISOString();

  var data = getData(key);
  var toArchive = [];
  var toKeep = [];

  data.forEach(function (r) {
    var ts = r.createdAt || '';
    if (ts && new Date(ts).getTime() < cutoff.getTime()) {
      toArchive.push(r);
    } else {
      toKeep.push(r);
    }
  });

  if (toArchive.length === 0) return 0;

  // Step 1: COPY to archive key (append to any existing archive)
  var archiveKey = key + '_archive';
  var existing;
  try {
    existing = JSON.parse(localStorage.getItem(archiveKey) || '[]');
  } catch (e) {
    existing = [];
  }

  // Avoid duplicates — only add records whose id isn't already archived
  var archivedIds = {};
  existing.forEach(function (r) { if (r.id) archivedIds[r.id] = true; });
  var newArchived = [];
  toArchive.forEach(function (r) {
    if (r.id && !archivedIds[r.id]) {
      newArchived.push(r);
    }
  });

  var mergedArchive = existing.concat(newArchived);

  try {
    localStorage.setItem(archiveKey, JSON.stringify(mergedArchive));
  } catch (e) {
    // If storage fails, abort — don't remove from active set
    return 0;
  }

  // Step 2: Remove archived records from active set
  setData(key, toKeep);

  return newArchived.length;
}

function countOldRecords(moduleName, monthsOld) {
  monthsOld = monthsOld || 6;
  var key = STORE_KEYS[moduleName];
  if (!key) return 0;

  var cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsOld);
  var cutoffMs = cutoff.getTime();

  var data = getData(key);
  var count = 0;
  data.forEach(function (r) {
    if (r.createdAt && new Date(r.createdAt).getTime() < cutoffMs) count++;
  });
  return count;
}

// ---- CSV Export ----
function exportToCSV(keyOrData, filename) {
  let data = Array.isArray(keyOrData) ? keyOrData : getData(keyOrData);
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const sanitizeCSV = (val) => {
    if (val === undefined || val === null) return '""';
    let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    s = s.replace(/"/g, '""');
    // Prevent CSV formula injection
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s + '"';
  };

  const rowStrings = data.map(row =>
    headers.map(h => sanitizeCSV(row[h])).join(',')
  );

  const csvContent = headers.map(h => sanitizeCSV(h)).join(',') + '\n' + rowStrings.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'export.csv');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function exportAllData() {
  const keys = [
    'factory_rawMaterials', 'factory_dateReceiving', 'factory_fermentation',
    'factory_distillation1', 'factory_distillation2', 'factory_bottling',
    'factory_inventoryVersions', 'factory_inventoryCounts', 'factory_inventoryBase',
    'factory_inventoryDeclarations', 'factory_customSuppliers'
  ];
  const today = new Date().toISOString().slice(0, 10);
  keys.forEach(key => {
    if (localStorage.getItem(key)) {
      exportToCSV(key, key + '_' + today + '.csv');
    }
  });
}
