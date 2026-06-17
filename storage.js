// ============================================================
// storage.js — Offline Queue & Online Indicator
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
