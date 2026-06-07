// ============================================================
// storage.js — IndexedDB Storage Layer with localStorage Fallback
// ============================================================

const IDB_NAME = 'factory_control';
const IDB_VERSION = 1;
const IDB_STORE = 'records';

let _idb = null;
let _idbReady = false;

function initIndexedDB() {
  if (!window.indexedDB) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => {
        _idb = e.target.result;
        _idbReady = true;
        _migrateFromLocalStorage();
        resolve(true);
      };
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

function _migrateFromLocalStorage() {
  if (!_idbReady) return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('factory_'));
  if (keys.length === 0) return;

  const tx = _idb.transaction(IDB_STORE, 'readwrite');
  const store = tx.objectStore(IDB_STORE);

  keys.forEach(key => {
    store.get(key).onsuccess = (e) => {
      if (!e.target.result) {
        try {
          store.put(localStorage.getItem(key), key);
        } catch (err) { /* skip */ }
      }
    };
  });
}

function idbGet(key) {
  if (!_idbReady) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const tx = _idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

function idbSet(key, value) {
  if (!_idbReady) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const tx = _idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}

function idbDelete(key) {
  if (!_idbReady) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const tx = _idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}

// ============================================================
// Offline Queue — retries failed syncs when back online
// ============================================================
const OFFLINE_QUEUE_KEY = 'factory_offline_queue';

function _getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function _setOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function queueOfflineAction(action) {
  const queue = _getOfflineQueue();
  queue.push({ ...action, queuedAt: new Date().toISOString() });
  _setOfflineQueue(queue);
}

async function flushOfflineQueue() {
  if (!navigator.onLine) return;
  const queue = _getOfflineQueue();
  if (queue.length === 0) return;

  const failed = [];
  for (const item of queue) {
    try {
      if (item.type === 'sheets-sync' && typeof postToSheets === 'function') {
        await postToSheets(item.payload);
      } else if (item.type === 'firestore-set' && typeof fbSetDoc === 'function') {
        await fbSetDoc(item.collection, item.docId, item.data, item.merge);
      } else {
        failed.push(item);
      }
    } catch (e) {
      failed.push(item);
    }
  }
  _setOfflineQueue(failed);
  if (failed.length === 0 && queue.length > 0) {
    showToast(t('syncSuccess'));
  }
}

// Auto-flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOfflineQueue();
    _updateOnlineIndicator(true);
  });
  window.addEventListener('offline', () => {
    _updateOnlineIndicator(false);
  });
}

function _updateOnlineIndicator(online) {
  let indicator = document.querySelector('.offline-indicator');
  if (online) {
    if (indicator) indicator.remove();
    return;
  }
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    document.body.appendChild(indicator);
  }
  indicator.textContent = t('offline') || 'Offline';
}
