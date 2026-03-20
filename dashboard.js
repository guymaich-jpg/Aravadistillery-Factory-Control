// ============================================================
// dashboard.js — Dashboard screen
// ============================================================

function renderDashboard(container) {
  const session = getSession();
  const modules = [
    { key: 'rawMaterials', icon: 'package', store: STORE_KEYS.rawMaterials, color: 'var(--color-receiving)' },
    { key: 'dateReceiving', icon: 'sun', store: STORE_KEYS.dateReceiving, color: 'var(--color-dates)' },
    { key: 'fermentation', icon: 'thermometer', store: STORE_KEYS.fermentation, color: 'var(--color-fermentation)' },
    { key: 'distillation1', icon: 'droplet', store: STORE_KEYS.distillation1, color: 'var(--color-dist1)' },
    { key: 'distillation2', icon: 'filter', store: STORE_KEYS.distillation2, color: 'var(--color-dist2)' },
    { key: 'bottling', icon: 'check-circle', store: STORE_KEYS.bottling, color: 'var(--color-bottling)' },
    { key: 'inventory', icon: 'database', store: null, color: 'var(--color-inventory)' },
  ];

  const totalRecords = Object.values(STORE_KEYS).reduce((sum, k) => sum + getRecordCount(k), 0);
  const todayTotal = Object.values(STORE_KEYS).reduce((sum, k) => sum + getTodayRecords(k).length, 0);

  // Pending approvals: bottling records without a decision
  const bottlingRecords = getData(STORE_KEYS.bottling);
  const pendingApprovals = bottlingRecords.filter(r => !r.decision || (r.decision !== 'approved' && r.decision !== 'notApproved')).length;

  // Recent activity: latest 5 records across all modules
  const recentRecords = [];
  const moduleEntries = modules.filter(m => m.store);
  moduleEntries.forEach(m => {
    getData(m.store).forEach(r => {
      recentRecords.push({ ...r, _module: m.key, _icon: m.icon, _color: m.color });
    });
  });
  recentRecords.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const topRecent = recentRecords.slice(0, 5);

  container.innerHTML = `
    <h1 class="sr-only">${t('nav_dashboard')}</h1>
    <div class="welcome-card">
      <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(239,239,236,0.45);margin-bottom:10px;font-family:'Quattrocento Sans',sans-serif">Arava Distillery · Production Control</div>
      <h2>${t('welcome')}, ${esc(getUserDisplayName())}</h2>
      <p>${new Date().toLocaleDateString(currentLang === 'he' ? 'he-IL' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="stats-row" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:16px;">
      <div class="stat-card">
        <div class="stat-num">${todayTotal}</div>
        <div class="stat-label">${t('todayActivity')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${totalRecords}</div>
        <div class="stat-label">${t('totalRecords')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" style="color:var(--warning,#f59e0b)">${pendingApprovals}</div>
        <div class="stat-label">${t('pendingApprovals')}</div>
      </div>
    </div>

    <div class="section-title">${t('quickActions')}</div>
    <div class="module-grid">
      ${modules.map(m => `
        <div class="module-card" data-module="${m.key}">
          <div class="mc-icon"><i data-feather="${m.icon}"></i></div>
          <div class="mc-title">${esc(getModuleTitle(m.key))}</div>
          <div class="mc-count">${m.store ? getRecordCount(m.store) + ' ' + t('totalRecords').toLowerCase() : ''}</div>
        </div>
      `).join('')}
    </div>

    ${topRecent.length ? `
      <div class="section-title" style="margin-top:24px;">${t('recentActivity')}</div>
      ${topRecent.map(r => {
        const title = r.item || r.supplier || r.drinkType || r.type || r.batchNumber || getModuleTitle(r._module);
        const time = r.createdAt ? formatDate(r.createdAt) : '';
        return `
          <div class="recent-activity-item" data-ra-module="${esc(r._module)}" data-ra-id="${esc(r.id)}">
            <div class="ra-icon" style="background:${r._color}20;color:${r._color}"><i data-feather="${r._icon}"></i></div>
            <div class="ra-content">
              <div class="ra-title">${esc(title)}</div>
              <div class="ra-meta">${esc(getModuleTitle(r._module))} &bull; ${esc(time)}</div>
            </div>
          </div>`;
      }).join('')}
    ` : ''}
  `;

  // Bind module cards
  container.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', () => {
      currentModule = card.dataset.module;
      currentView = 'list';
      _navDirection = 'forward';
      renderApp();
    });
  });

  // Bind recent activity items
  container.querySelectorAll('.recent-activity-item').forEach(item => {
    item.addEventListener('click', () => {
      const mod = item.dataset.raModule;
      const id = item.dataset.raId;
      const storeKey = STORE_KEYS[mod];
      if (storeKey) {
        const record = getData(storeKey).find(r => r.id === id);
        if (record) {
          currentModule = mod;
          editingRecord = record;
          currentView = 'detail';
          _navDirection = 'forward';
          renderApp();
        }
      }
    });
  });
}
