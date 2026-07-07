// ============================================================
// firestore-sync.js — Real-time Firestore ↔ localStorage sync
// ============================================================
// Hydrates localStorage from Firestore on startup, then subscribes
// to the active module's collection for real-time cross-user updates.
// Falls back gracefully when Firebase is unavailable.
// ============================================================

var _activeSubscription = null; // { key, unsub }
var _syncInProgress = false;
var _initialHydrationDone = false;
var _renderInProgress = false;

var _SYNC_COLLECTIONS = [
  'factory_rawMaterials',
  'factory_dateReceiving',
  'factory_fermentation',
  'factory_distillation1',
  'factory_distillation2',
  'factory_bottling',
  // Inventory base + declarations must reach every device: the dashboard and
  // the CRM stock sync are computed from inventoryBase, so a declaration made
  // on one device is meaningless to others until they hydrate it.
  'factory_inventoryBase',
  'factory_inventoryDeclarations',
];

// ── Initialization ───────────────────────────────────────────

function initFirestoreSync() {
  if (typeof isFirebaseReady !== 'function') return;
  var attempts = 0;
  var maxAttempts = 20; // 10 seconds (20 × 500ms)
  var poll = setInterval(function () {
    attempts++;
    // Wait for both Firebase SDK and auth state to be resolved.
    // Without auth, Firestore security rules will reject reads.
    var authReady = typeof _auth !== 'undefined' && _auth && _auth.currentUser;
    if (isFirebaseReady() && authReady) {
      clearInterval(poll);
      _hydrateAllCollections();
    } else if (attempts >= maxAttempts) {
      clearInterval(poll);
    }
  }, 500);
}

// ── Initial hydration (one-time bulk fetch) ──────────────────

function _hydrateAllCollections() {
  if (typeof fbGetAll !== 'function') return;

  var promises = _SYNC_COLLECTIONS.map(function (key) {
    return fbGetAll(key)
      .then(function (records) {
        if (records) _mergeFirestoreIntoLocal(key, records);
      })
      .catch(function () {});
  });

  // Load the shared product catalog (names only) from Firestore alongside hydration.
  if (typeof loadCatalog === 'function') promises.push(loadCatalog().catch(function () {}));

  Promise.all(promises).then(function () {
    _initialHydrationDone = true;
    if (typeof renderApp === 'function' && typeof currentView !== 'undefined' && currentView !== 'form') {
      renderApp();
    }
  });
}

// ── Visibility re-hydration ──────────────────────────────────
// A device left open (e.g. tablet on the distillery floor) only subscribes to
// the active module. Re-hydrate everything when the tab regains focus so
// declarations made on other devices are reflected without a manual reload.

var _lastHydrationAt = 0;

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible') return;
  if (!_initialHydrationDone) return;
  if (typeof currentView !== 'undefined' && currentView === 'form') return;
  if (Date.now() - _lastHydrationAt < 30000) return; // throttle: 30s
  _lastHydrationAt = Date.now();
  _hydrateAllCollections();
});

// ── Module subscription management ───────────────────────────

function onModuleChange(moduleName) {
  if (!moduleName || typeof STORE_KEYS === 'undefined') {
    _unsubscribeFromModule();
    return;
  }
  var storeKey = STORE_KEYS[moduleName];
  if (!storeKey || _SYNC_COLLECTIONS.indexOf(storeKey) === -1) {
    _unsubscribeFromModule();
    return;
  }
  _subscribeToModule(storeKey);
}

function _subscribeToModule(storeKey) {
  if (typeof fbSubscribe !== 'function' || typeof isFirebaseReady !== 'function' || !isFirebaseReady()) return;
  if (_activeSubscription && _activeSubscription.key === storeKey) return;

  _unsubscribeFromModule();

  _activeSubscription = {
    key: storeKey,
    unsub: fbSubscribe(storeKey, function (firestoreRecords) {
      if (_syncInProgress) return;
      if (typeof currentView !== 'undefined' && currentView === 'form') return;
      if (document.querySelector('.modal-overlay')) return;

      var changed = _mergeFirestoreIntoLocal(storeKey, firestoreRecords);
      if (changed && typeof renderApp === 'function') {
        renderApp();
      }
    }),
  };
}

function _unsubscribeFromModule() {
  if (_activeSubscription) {
    if (typeof _activeSubscription.unsub === 'function') _activeSubscription.unsub();
    _activeSubscription = null;
  }
}

// ── Merge algorithm ──────────────────────────────────────────

function _mergeFirestoreIntoLocal(storeKey, fbRecords) {
  if (!fbRecords || !Array.isArray(fbRecords)) return false;
  if (typeof getData !== 'function') return false;

  var local = getData(storeKey);
  var localById = {};
  local.forEach(function (r) {
    if (r.id) localById[r.id] = r;
  });

  var fbById = {};
  fbRecords.forEach(function (r) {
    if (r.id) fbById[r.id] = r;
  });

  var merged = [];
  var seenIds = {};

  // Process Firestore records (source of truth for shared data)
  fbRecords.forEach(function (fbRec) {
    if (!fbRec.id) return;
    seenIds[fbRec.id] = true;
    var localRec = localById[fbRec.id];

    if (localRec) {
      var fbTime = fbRec.updatedAt || fbRec.createdAt || '';
      var localTime = localRec.updatedAt || localRec.createdAt || '';
      if (fbTime >= localTime) {
        merged.push(Object.assign({}, localRec, fbRec, { _deleted: false }));
      } else {
        merged.push(Object.assign({}, localRec, { _deleted: false }));
      }
    } else {
      merged.push(Object.assign({}, fbRec, { _deleted: false }));
    }
  });

  // Local-only records: keep them, but mark as _deleted if they previously
  // existed in Firestore (had been synced) and are now gone from the snapshot.
  local.forEach(function (localRec) {
    if (!localRec.id) {
      // Legacy record with no id (pre-sync data, e.g. an old declared base):
      // it can never appear in Firestore, so dropping or tombstoning it would
      // silently destroy local-only data. Preserve as-is.
      merged.push(localRec);
      return;
    }
    if (seenIds[localRec.id]) return;
    // Record exists locally but not in Firestore
    var age = Date.now() - new Date(localRec.createdAt || 0).getTime();
    if (age < 15000) {
      // Very recent — probably still in-flight to Firestore
      merged.push(Object.assign({}, localRec, { _deleted: false }));
    } else if (localRec._deleted) {
      // Already marked deleted — keep the marker
      merged.push(localRec);
    } else {
      // Was synced before but now missing from Firestore → mark as deleted
      merged.push(Object.assign({}, localRec, { _deleted: true }));
    }
    seenIds[localRec.id] = true;
  });

  // Sort newest first
  merged.sort(function (a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // Compare with current data to avoid unnecessary writes
  var currentJSON = JSON.stringify(local);
  var mergedJSON = JSON.stringify(merged);
  if (currentJSON === mergedJSON) return false;

  // Write directly to localStorage (bypasses fbAdd — no loop)
  _syncInProgress = true;
  if (typeof setData === 'function') {
    setData(storeKey, merged);
  } else {
    localStorage.setItem(storeKey, JSON.stringify(merged));
  }
  _syncInProgress = false;

  return true;
}
