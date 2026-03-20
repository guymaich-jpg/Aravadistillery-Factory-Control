// ============================================================
// inventory-ui.js — Inventory & Spirit Stock screens
// ============================================================

// Returns records where createdAt is at least 60 seconds old (1-min buffer).
// Also returns the count of pending (< 1 min) records for the badge.
function getBufferedRecords(key) {
  const all = getData(key);
  const cutoff = Date.now() - 60 * 1000;
  const visible = all.filter(r => !r.createdAt || new Date(r.createdAt).getTime() <= cutoff);
  const pending = all.length - visible.length;
  return { visible, pending };
}

// Schedule a re-render of inventory after oldest pending record becomes visible.
let _invRefreshTimer = null;
function scheduleInventoryRefresh(container) {
  if (_invRefreshTimer) clearTimeout(_invRefreshTimer);
  const all = [
    ...getData(STORE_KEYS.bottling),
    ...getData(STORE_KEYS.rawMaterials),
    ...getData(STORE_KEYS.dateReceiving),
    ...getData(STORE_KEYS.fermentation),
  ];
  const cutoff = Date.now() - 60 * 1000;
  const pending = all.filter(r => r.createdAt && new Date(r.createdAt).getTime() > cutoff);
  if (pending.length === 0) return;

  // Find the one that will become visible soonest
  const earliest = Math.min(...pending.map(r => new Date(r.createdAt).getTime()));
  const delay = earliest + 60 * 1000 - Date.now() + 200; // +200ms margin
  _invRefreshTimer = setTimeout(() => {
    if (currentModule === 'inventory') {
      renderApp();
    }
  }, Math.max(delay, 1000));
}

function renderInventory(container) {
  // 1-minute buffer: only count records older than 60s
  const { visible: bottlingRecords, pending: pendingBottling } = getBufferedRecords(STORE_KEYS.bottling);
  const { visible: rawRecords, pending: pendingRaw } = getBufferedRecords(STORE_KEYS.rawMaterials);
  const { visible: dateRecords, pending: pendingDates } = getBufferedRecords(STORE_KEYS.dateReceiving);
  const { visible: fermRecords, pending: pendingFerm } = getBufferedRecords(STORE_KEYS.fermentation);

  const totalPending = pendingBottling + pendingRaw + pendingDates + pendingFerm;

  // Col 2: Factory-created bottles (approved bottling records)
  const bottleInv = {};
  DRINK_TYPES.forEach(dt => { bottleInv[dt] = 0; });
  bottlingRecords.forEach(r => {
    if (r.drinkType && r.decision === 'approved') {
      const count = parseInt(r.bottleCount) || 0;
      bottleInv[r.drinkType] = (bottleInv[r.drinkType] || 0) + count;
    }
  });

  // Base inventory (imported by manager)
  const baseInv = {};
  const baseRecords = getData(STORE_KEYS.inventoryBase);
  if (baseRecords.length > 0) {
    const latest = baseRecords[0]; // most recent import
    DRINK_TYPES.forEach(dt => {
      baseInv[dt] = parseInt(latest[dt]) || 0;
    });
  }

  // Col 3: Latest real signed count per product
  const countRecords = getData(STORE_KEYS.inventoryCounts);
  const latestCount = {};
  let latestCountRecord = null;
  if (countRecords.length > 0) {
    latestCountRecord = countRecords[0];
    DRINK_TYPES.forEach(dt => {
      latestCount[dt] = parseInt(latestCountRecord[dt]) || 0;
    });
  }

  const rawInv = {};
  rawRecords.forEach(r => {
    const key = r.item || r.category || 'Unknown';
    const qty = parseFloat(r.weight) || 0;
    rawInv[key] = (rawInv[key] || 0) + qty;
  });

  const totalDatesReceived = dateRecords.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  // Support both new records (datesCrates) and legacy records (datesKg stored as kg)
  const totalDatesInFerm = fermRecords.reduce((sum, r) => {
    if (r.datesCrates !== undefined && r.datesCrates !== '') {
      return sum + (parseFloat(r.datesCrates) || 0) * 20;
    }
    return sum + (parseFloat(r.datesKg) || 0);
  }, 0);
  const availableDates = Math.max(0, totalDatesReceived - totalDatesInFerm);
  const activeFerm = fermRecords.filter(r => !r.sentToDistillation).length;

  // Format last signed date
  const lastSignedInfo = latestCountRecord
    ? `${t('inv_lastSigned')}: ${formatDate(latestCountRecord.createdAt)} — ${esc(latestCountRecord.signedBy || latestCountRecord.createdBy)}`
    : '';

  container.innerHTML = `
    <h1 class="sr-only">${t('mod_inventory')}</h1>
    ${totalPending > 0 ? `
    <div class="inv-pending-banner">
      <i data-feather="clock" style="width:14px;height:14px;margin-inline-end:6px;"></i>
      ${t('pendingChanges').replace('{n}', totalPending)}
    </div>` : ''}

    <div class="tab-bar">
      <button class="tab-btn active" data-inv-tab="bottles">${t('mod_bottleInventory')}</button>
      <button class="tab-btn" data-inv-tab="raw">${t('mod_rawInventory')}</button>
      <button class="tab-btn" data-inv-tab="history">${t('inv_countHistory')}</button>
    </div>

    <div id="inv-bottles">
      <div class="inv-section">
        <div class="stats-row" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:16px;">
          <div class="stat-card">
            <div class="stat-num" style="color:var(--success)">${availableDates.toFixed(0)}</div>
            <div class="stat-label">${t('inv_dates')}</div>
            <div style="font-size:10px;opacity:0.6;margin-top:2px;">+${totalDatesReceived.toFixed(0)} / -${totalDatesInFerm.toFixed(0)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${activeFerm}</div>
            <div class="stat-label">${t('mod_fermentation')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color:var(--warning,#f59e0b)">${totalDatesInFerm.toFixed(0)}</div>
            <div class="stat-label">${t('inv_datesUsed')}</div>
          </div>
        </div>

        <h3>${t('mod_bottleInventory')}</h3>
        ${lastSignedInfo ? `<p class="inv-last-signed"><i data-feather="check-circle" style="width:13px;height:13px;vertical-align:middle;margin-inline-end:4px;"></i>${lastSignedInfo}</p>` : ''}

        <div class="inv-table-wrap">
          <table class="inv-table inv-table-4col">
            <thead>
              <tr>
                <th>${t('inv_drinkType')}</th>
                <th style="text-align:right">${t('inv_factoryCreated')}</th>
                <th style="text-align:right">${t('inv_realCount')}</th>
                <th style="text-align:right">${t('inv_gap')}</th>
              </tr>
            </thead>
            <tbody>
              ${DRINK_TYPES.map(dt => {
    const created = (bottleInv[dt] || 0) + (baseInv[dt] || 0);
    const real = latestCount[dt] !== undefined ? latestCount[dt] : null;
    const gap = real !== null ? created - real : null;
    const createdCls = created > 0 ? 'stock-positive' : created < 0 ? 'stock-negative' : 'stock-zero';
    const realCls = real !== null ? (real > 0 ? 'stock-positive' : real < 0 ? 'stock-negative' : 'stock-zero') : 'stock-zero';
    const gapCls = gap !== null ? (gap > 0 ? 'stock-warning' : gap < 0 ? 'stock-negative' : 'stock-positive') : 'stock-zero';
    const gapDisplay = gap !== null ? (gap > 0 ? '+' + gap : gap) : '—';
    return `<tr>
      <td>${t(dt)}</td>
      <td style="text-align:right" class="${createdCls}">${created}</td>
      <td style="text-align:right" class="${realCls}">${real !== null ? real : '—'}</td>
      <td style="text-align:right" class="${gapCls}">${gapDisplay}</td>
    </tr>`;
  }).join('')}
            </tbody>
          </table>
        </div>

        <div class="inv-actions">
          <button class="btn btn-primary" id="btn-sign-inventory">
            <i data-feather="edit-3" style="width:15px;height:15px;vertical-align:middle;margin-inline-end:4px;"></i>${t('inv_signInventory')}
          </button>
          <button class="btn btn-secondary" id="btn-import-base" style="margin-inline-start:8px;">
            <i data-feather="upload" style="width:15px;height:15px;vertical-align:middle;margin-inline-end:4px;"></i>${t('inv_importBase')}
          </button>
        </div>
      </div>
    </div>

    <div id="inv-raw" style="display:none;">
      <div class="inv-section">
        <h3>${t('mod_rawInventory')}</h3>
        <table class="inv-table">
          <thead><tr><th>${t('inv_item')}</th><th style="text-align:right">${t('inv_stock')}</th></tr></thead>
          <tbody>
            ${Object.entries(rawInv).length === 0 ? `<tr><td colspan="2" style="text-align:center">${t('noData')}</td></tr>` :
      Object.entries(rawInv).map(([item, qty]) => {
        const cls = qty > 0 ? 'stock-positive' : qty < 0 ? 'stock-negative' : 'stock-zero';
        return `<tr><td>${esc(item)}</td><td style="text-align:right" class="${cls}">${esc(qty)}</td></tr>`;
      }).join('')
    }
          </tbody>
        </table>
      </div>
    </div>

    <div id="inv-history" style="display:none;">
      <div class="inv-section">
        <h3>${t('inv_countHistory')}</h3>
        ${countRecords.length === 0 ? `
          <div class="empty-state" style="padding:24px 0;">
            <i data-feather="clipboard"></i>
            <p>${t('inv_noSignings')}</p>
          </div>
        ` : `
          <div class="inv-history-list">
            ${countRecords.map((cr, idx) => `
              <div class="inv-history-card${idx === 0 ? ' inv-history-latest' : ''}">
                <div class="inv-history-header">
                  <span class="inv-history-date">${formatDate(cr.createdAt)}</span>
                  <span class="inv-history-signer">${t('inv_signedBy')}: ${esc(cr.signedBy || cr.createdBy)}</span>
                </div>
                <div class="inv-history-items">
                  ${DRINK_TYPES.map(dt => {
      const qty = parseInt(cr[dt]) || 0;
      return qty !== 0 ? `<span class="inv-history-chip">${t(dt)}: <strong>${qty}</strong></span>` : '';
    }).join('')}
                </div>
                ${cr.note ? `<div class="inv-history-note">${esc(cr.note)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Bind tabs
  container.querySelectorAll('[data-inv-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.invTab;
      container.querySelector('#inv-bottles').style.display = tab === 'bottles' ? '' : 'none';
      container.querySelector('#inv-raw').style.display = tab === 'raw' ? '' : 'none';
      container.querySelector('#inv-history').style.display = tab === 'history' ? '' : 'none';
    });
  });

  // Bind sign inventory button
  const signBtn = container.querySelector('#btn-sign-inventory');
  if (signBtn) {
    signBtn.addEventListener('click', () => showSignInventoryModal(bottleInv, baseInv));
  }

  // Bind import base inventory button (manager-only, behind password gate)
  const importBtn = container.querySelector('#btn-import-base');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      showManagerPasswordModal(() => {
        showImportBaseInventoryModal();
      });
    });
  }

  // Schedule auto-refresh when pending records become visible
  scheduleInventoryRefresh(container);
}

// ============================================================
// SIGN WEEKLY INVENTORY MODAL
// ============================================================
function showSignInventoryModal(bottleInv, baseInv) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content inv-sign-modal">
      <div class="modal-header">
        <h3>${t('inv_signTitle')}</h3>
        <button class="modal-close" aria-label="${t('cancel')}">&times;</button>
      </div>
      <p class="inv-sign-subtitle">${t('inv_signSubtitle')}</p>
      <div class="inv-sign-form">
        ${DRINK_TYPES.map(dt => {
    const expected = (bottleInv[dt] || 0) + (baseInv[dt] || 0);
    return `
          <div class="inv-sign-row">
            <label class="inv-sign-label">${t(dt)}</label>
            <div class="inv-sign-expected">${t('inv_factoryCreated')}: ${expected}</div>
            <input type="number" class="form-input inv-sign-input" data-drink="${dt}" min="0" step="1" placeholder="0" value="">
          </div>`;
  }).join('')}
        <div class="inv-sign-row inv-sign-signature-row">
          <label class="inv-sign-label">${t('inv_signature')}</label>
          <input type="text" class="form-input" id="inv-sign-name" placeholder="${t('inv_signature')}" value="${esc(getUserDisplayName())}" required>
        </div>
      </div>
      <div class="inv-sign-error" id="inv-sign-error" role="alert"></div>
      <div class="inv-sign-actions">
        <button class="btn btn-secondary inv-sign-cancel">${t('cancel')}</button>
        <button class="btn btn-primary inv-sign-confirm">
          <i data-feather="check" style="width:15px;height:15px;vertical-align:middle;margin-inline-end:4px;"></i>${t('inv_signConfirm')}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (typeof feather !== 'undefined') feather.replace();

  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('.inv-sign-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('.inv-sign-confirm').addEventListener('click', () => {
    const signedBy = overlay.querySelector('#inv-sign-name').value.trim();
    if (!signedBy) {
      overlay.querySelector('#inv-sign-error').textContent = t('inv_signature') + ' — required';
      return;
    }

    const record = {};
    let hasAnyValue = false;
    DRINK_TYPES.forEach(dt => {
      const input = overlay.querySelector(`[data-drink="${dt}"]`);
      const val = parseInt(input.value) || 0;
      record[dt] = val;
      if (val > 0) hasAnyValue = true;
    });

    if (!hasAnyValue) {
      overlay.querySelector('#inv-sign-error').textContent = 'Enter at least one product count';
      return;
    }

    record.signedBy = signedBy;
    addRecord(STORE_KEYS.inventoryCounts, record);
    syncInventorySnapshot('inventory-sign');
    close();
    showToast(t('inv_signConfirm') + ' ✓');
    renderApp();
  });
}

// ============================================================
// IMPORT BASE INVENTORY MODAL (manager-only, hidden from workers)
// ============================================================
function showImportBaseInventoryModal() {
  const existing = getData(STORE_KEYS.inventoryBase);
  const current = existing.length > 0 ? existing[0] : {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content inv-sign-modal">
      <div class="modal-header">
        <h3>${t('inv_importTitle')}</h3>
        <button class="modal-close" aria-label="${t('cancel')}">&times;</button>
      </div>
      <p class="inv-sign-subtitle">${t('inv_importSubtitle')}</p>
      <div class="inv-sign-form">
        ${DRINK_TYPES.map(dt => `
          <div class="inv-sign-row">
            <label class="inv-sign-label">${t(dt)}</label>
            <input type="number" class="form-input inv-sign-input" data-drink="${dt}" min="0" step="1" placeholder="0" value="${parseInt(current[dt]) || ''}">
          </div>
        `).join('')}
      </div>
      <div class="inv-sign-error" id="inv-import-error" role="alert"></div>
      <div class="inv-sign-actions">
        <button class="btn btn-secondary inv-sign-cancel">${t('cancel')}</button>
        <button class="btn btn-primary inv-import-confirm">
          <i data-feather="download" style="width:15px;height:15px;vertical-align:middle;margin-inline-end:4px;"></i>${t('inv_importConfirm')}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (typeof feather !== 'undefined') feather.replace();

  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('.inv-sign-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('.inv-import-confirm').addEventListener('click', () => {
    const record = {};
    DRINK_TYPES.forEach(dt => {
      const input = overlay.querySelector(`[data-drink="${dt}"]`);
      record[dt] = parseInt(input.value) || 0;
    });

    // Store as the latest base (overwrite previous)
    const data = getData(STORE_KEYS.inventoryBase);
    record.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    record.createdAt = new Date().toISOString();
    record.createdBy = getSession()?.username || 'unknown';
    data.unshift(record);
    setData(STORE_KEYS.inventoryBase, data);
    if (typeof fbAdd === 'function') {
      fbAdd(STORE_KEYS.inventoryBase, record).catch(() => {});
    }

    syncInventorySnapshot('base-import');
    close();
    showToast(t('inv_baseImported') + ' ✓');
    renderApp();
  });
}

// ============================================================
// SPIRIT PIPELINE SCREEN
// ============================================================
function renderSpiritStock(container) {
  const d1Records = getData('distillation1');
  const d2Records = getData('distillation2');

  if (!d1Records.length && !d2Records.length) {
    container.innerHTML = `
      <div class="screen-header"><h2>${t('mod_spiritStock')}</h2></div>
      <div class="empty-state">
        <p>${t('spirit_noData')}</p>
      </div>`;
    return;
  }

  // Calculate D1 produced and D2 consumed/produced
  const d1Produced = d1Records.reduce((sum, r) => sum + (parseFloat(r.distilledQty) || 0), 0);
  const d2Consumed = d2Records.reduce((sum, r) => sum + (parseFloat(r.d1InputQty) || 0), 0);
  const d2Produced = d2Records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
  const d1Available = d1Produced - d2Consumed;

  container.innerHTML = `
    <div class="screen-header"><h2>${t('mod_spiritStock')}</h2></div>
    <div class="spirit-pipeline">
      <div class="spirit-card">
        <h3>${t('spirit_d1Label')}</h3>
        <p>${t('spirit_produced')}: ${d1Produced.toFixed(1)}</p>
        <p>${t('spirit_consumed')}: ${d2Consumed.toFixed(1)}</p>
        <p><strong>${t('spirit_available')}: ${d1Available.toFixed(1)}</strong></p>
      </div>
      <div class="spirit-card">
        <h3>${t('spirit_d2Label')}</h3>
        <p>${t('spirit_produced')}: ${d2Produced.toFixed(1)}</p>
        ${d1Available > 0 ? `<p class="spirit-ready">${t('spirit_readyToBottle')}</p>` : ''}
      </div>
    </div>`;
}
