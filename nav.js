// ============================================================
// nav.js — Header & Bottom Navigation
// ============================================================

function getModuleTitle(mod) {
  const map = {
    rawMaterials: 'mod_rawMaterials',
    dateReceiving: 'mod_dateReceiving',
    fermentation: 'mod_fermentation',
    distillation1: 'mod_distillation1',
    distillation2: 'mod_distillation2',
    bottling: 'mod_bottling',
    inventory: 'mod_inventory',
  };
  return t(map[mod] || mod);
}

function renderHeader() {
  const session = getSession();
  const showBack = currentModule !== null;
  const title = currentModule ? getModuleTitle(currentModule)
    : currentScreen === 'backoffice' ? t('nav_backoffice')
    : t('appName');
  const roleClass = session.role === 'worker' ? 'worker' : '';

  return `
    <header class="app-header" role="banner">
      <div class="header-left">
        ${showBack ? `<button class="header-back" id="header-back" aria-label="${t('back') || 'Back'}"><i data-feather="arrow-left"></i></button>` : ''}
        <span class="user-badge"><span class="role-dot ${roleClass}"></span>${esc(getUserDisplayName())}</span>
      </div>
      <span class="header-title">${esc(title)}</span>
      <div class="header-right">
        <button class="theme-btn" onclick="toggleTheme()" aria-label="${t('toggleTheme') || 'Toggle theme'}">
          ${(document.documentElement.getAttribute('data-theme') || 'light') === 'dark'
            ? '<i data-feather="sun" style="width:14px;height:14px"></i>'
            : '<i data-feather="moon" style="width:14px;height:14px"></i>'}
        </button>
        <button class="lang-btn" onclick="toggleLang()">${t('langToggle')}</button>
        <button class="logout-btn" id="logout-btn" aria-label="${t('logoutLabel') || 'Log out'}"><i data-feather="log-out" style="width:14px;height:14px"></i></button>
      </div>
    </header>
  `;
}

function renderBottomNav() {
  const items = [
    { id: 'dashboard', icon: 'grid', label: 'nav_dashboard' },
    { id: 'receiving', icon: 'package', label: 'nav_receiving' },
    { id: 'production', icon: 'activity', label: 'nav_production' },
    { id: 'spiritStock', icon: 'droplet', label: 'nav_spiritStock' },
    { id: 'bottling', icon: 'check-circle', label: 'nav_bottling' },
    { id: 'inventory', icon: 'database', label: 'nav_inventory' },
  ];

  if (hasPermission('canManageUsers')) {
    items.push({ id: 'backoffice', icon: 'settings', label: 'nav_backoffice' });
  }

  return `
    <nav class="bottom-nav">
      ${items.map(it => `
        <button class="nav-item ${currentScreen === it.id ? 'active' : ''}" data-nav="${it.id}">
          <i data-feather="${it.icon}"></i>
          ${t(it.label)}
        </button>
      `).join('')}
    </nav>
  `;
}

function bindNav() {
  // Save current scroll before navigating away
  function saveScroll() {
    const sc = $('#screen-content');
    if (sc) _scrollPositions[(currentModule || currentScreen) + ':' + currentView] = sc.scrollTop;
  }

  // Bottom nav
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      saveScroll();
      const nav = btn.dataset.nav;
      _navDirection = 'forward';
      currentScreen = nav;
      currentView = 'list';
      editingRecord = null;

      if (nav === 'dashboard') { currentModule = null; _navDirection = 'back'; }
      else if (nav === 'receiving') { currentModule = 'rawMaterials'; }
      else if (nav === 'production') { currentModule = 'fermentation'; }
      else if (nav === 'bottling') { currentModule = 'bottling'; }
      else if (nav === 'inventory') { currentModule = 'inventory'; }
      else if (nav === 'backoffice') { currentModule = null; }

      renderApp();
    });
  });

  // Back button
  const backBtn = $('#header-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      saveScroll();
      _navDirection = 'back';
      if (currentView === 'form' || currentView === 'detail') {
        currentView = 'list';
        editingRecord = null;
      } else {
        currentModule = null;
        currentScreen = 'dashboard';
      }
      renderApp();
    });
  }

  // Logout
  const logoutBtn = $('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      renderApp();
    });
  }
}
