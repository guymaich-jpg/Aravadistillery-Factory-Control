// ============================================================
// sync.js — Cross-Device Real-Time Sync via Firestore
// ============================================================

const _SYNC_COLLECTIONS = [
  'factory_rawMaterials', 'factory_dateReceiving', 'factory_fermentation',
  'factory_distillation1', 'factory_distillation2', 'factory_bottling',
  'factory_inventoryVersions', 'factory_customSuppliers'
];

let _syncActive = false;
let _unsubscribers = [];
let _syncRefreshTimer = null;
let _pendingSyncRefresh = false;

function startSync() {
  if (_syncActive) return;

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady()) {
    _retrySyncStart(0);
    return;
  }

  _activateListeners();
}

function _retrySyncStart(attempt) {
  if (attempt >= 5) {
    console.warn('[sync] Firebase not ready after 5 retries — running offline');
    return;
  }
  setTimeout(() => {
    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      _activateListeners();
    } else {
      _retrySyncStart(attempt + 1);
    }
  }, 2000);
}

function _activateListeners() {
  if (_syncActive) return;
  _syncActive = true;

  _SYNC_COLLECTIONS.forEach(key => {
    if (typeof fbSubscribe !== 'function') return;
    const unsub = fbSubscribe(key, records => {
      mergeFirestoreIntoLocal(key, records);
    });
    _unsubscribers.push(unsub);
  });

  _syncCustomOptions();
  console.log('[sync] Real-time listeners active for', _SYNC_COLLECTIONS.length, 'collections');
}

function stopSync() {
  _syncActive = false;
  _unsubscribers.forEach(fn => { try { fn(); } catch (_) {} });
  _unsubscribers = [];
  if (_syncRefreshTimer) {
    clearTimeout(_syncRefreshTimer);
    _syncRefreshTimer = null;
  }
  _pendingSyncRefresh = false;
  console.log('[sync] Listeners stopped');
}

function mergeFirestoreIntoLocal(key, firestoreRecords) {
  const localData = getData(key);
  const localMap = new Map();
  localData.forEach(r => { if (r.id) localMap.set(r.id, r); });

  const fbMap = new Map();
  firestoreRecords.forEach(r => { if (r.id) fbMap.set(r.id, r); });

  let changed = false;
  const merged = [];

  // Process all records from both sources by id
  const allIds = new Set([...localMap.keys(), ...fbMap.keys()]);

  allIds.forEach(id => {
    const local = localMap.get(id);
    const fb = fbMap.get(id);

    if (fb && !local) {
      const clean = _stripFbId(fb);
      merged.push(clean);
      changed = true;
    } else if (local && !fb) {
      merged.push(local);
      if (typeof fbAdd === 'function') {
        fbAdd(key, local).catch(e => console.warn('[sync] Push local record failed:', e.message));
      }
    } else {
      const fbTime = fb.updatedAt || fb.createdAt || '';
      const localTime = local.updatedAt || local.createdAt || '';
      if (fbTime > localTime) {
        const clean = _stripFbId(fb);
        merged.push(clean);
        changed = true;
      } else {
        merged.push(local);
      }
    }
  });

  if (changed) {
    merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    localStorage.setItem(key, JSON.stringify(merged));
    scheduleSyncRefresh();
  }
}

function _stripFbId(record) {
  const clean = { ...record };
  delete clean._fbId;
  return clean;
}

function scheduleSyncRefresh() {
  if (_syncRefreshTimer) clearTimeout(_syncRefreshTimer);
  _syncRefreshTimer = setTimeout(() => {
    _syncRefreshTimer = null;
    if (typeof currentView !== 'undefined' && currentView === 'form') {
      _pendingSyncRefresh = true;
      return;
    }
    if (typeof renderApp === 'function') renderApp();
  }, 500);
}

function _syncCustomOptions() {
  if (typeof _db === 'undefined' || !_db) return;
  _db.collection('factory_customOptions').get().then(snap => {
    const groups = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (!data.fieldKey || !data.value) return;
      if (!groups[data.fieldKey]) groups[data.fieldKey] = [];
      groups[data.fieldKey].push(data.value);
    });
    Object.keys(groups).forEach(fieldKey => {
      const localKey = 'factory_customOptions_' + fieldKey;
      const local = JSON.parse(localStorage.getItem(localKey) || '[]');
      const union = [...new Set([...local, ...groups[fieldKey]])];
      if (union.length !== local.length) {
        localStorage.setItem(localKey, JSON.stringify(union));
      }
      local.forEach(val => {
        if (!groups[fieldKey].includes(val) && typeof fbAddCustomOption === 'function') {
          fbAddCustomOption(fieldKey, val).catch(() => {});
        }
      });
    });
  }).catch(e => console.warn('[sync] Custom options sync failed:', e.message));
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && _syncActive) {
    scheduleSyncRefresh();
  }
});
