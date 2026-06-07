// ============================================================
// backoffice.js — Admin UI, User Management & App Init
// ============================================================
// ============================================================
// BACKOFFICE UI
// ============================================================

function renderBackoffice(container) {
  if (!hasPermission('canManageUsers')) {
    container.innerHTML = `<div class="perm-overlay"><i data-feather="lock"></i><p>${t('perm_denied')}</p></div>`;
    return;
  }

  // Sync users from backend in background (updates localStorage, then re-renders)
  if (typeof syncUsersFromBackend === 'function' && !container._syncStarted) {
    container._syncStarted = true;
    syncUsersFromBackend().then(synced => {
      if (synced && synced.length !== getUsers().length) {
        renderBackoffice(container); // re-render with merged data
      }
    }).catch(() => {});
  }

  const users = getUsers();

  if (currentView === 'form') {
    renderUserForm(container);
    return;
  }

  container.innerHTML = `
    <div class="section-title">${t('userManagement')}</div>
    <p class="backoffice-subtitle">${t('backofficeSubtitle')}</p>

    <div class="record-list record-list-mt">
      ${users.map(u => `
        <div class="record-item user-item" data-username="${esc(u.username)}">
          <div class="ri-top">
            <span class="ri-title">
              ${esc(u.username)}
              <span class="role-pill role-pill-${esc(u.role)} role-pill-inline">${t('role_' + u.role)}</span>
            </span>
            <span class="ri-badge ${u.status === 'inactive' ? 'not-approved' : 'approved'}">
              ${u.status === 'inactive' ? t('inactive') : t('active')}
            </span>
          </div>
          <div class="ri-details">
            ${u.email ? `<div class="bo-user-email">${esc(u.email)}</div>` : ''}
            ${esc(currentLang === 'he' ? (u.nameHe || u.name || '-') : (u.name || '-'))}
            <div class="bo-user-activity">
              ${t('lastActivity')}: ${u.lastActivity ? formatDate(u.lastActivity) : '-'}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="invite-section bo-section">
      <div class="section-title section-title-mb">${t('inviteUser')}</div>
      <div class="bo-invite-row">
        <div class="bo-invite-field">
          <input type="email" class="form-input" id="invite-email" placeholder="${t('inviteEmailPlaceholder')}"
            aria-label="${t('inviteEmailPlaceholder')}" autocomplete="off" autocapitalize="none" spellcheck="false">
        </div>
        <select class="form-select bo-role-select" id="invite-role" aria-label="${t('role')}">
          <option value="worker">${t('role_worker')}</option>
          <option value="manager">${t('role_manager')}</option>
          <option value="admin">${t('role_admin')}</option>
        </select>
      </div>
      <button class="btn btn-primary bo-invite-btn" id="btn-send-invite">
        <i data-feather="send"></i> ${t('sendInvitation')}
      </button>
      <div class="login-error bo-feedback" id="invite-error" role="alert" aria-live="polite"></div>
      <div class="login-success bo-feedback" id="invite-success" role="status" aria-live="polite"></div>
    </div>

    <div class="bo-section">
      <div class="section-title section-title-mb">${t('invitationsTitle')}</div>
      <div id="invitations-list" class="record-list">
        <div class="empty-state empty-state-compact"><p>${t('invitationsEmpty')}</p></div>
      </div>
    </div>

    <div class="bo-section">
      <div class="section-title section-title-mb">${t('sheetsIntegration')}</div>
      <a href="${INVENTORY_SHEET_URL}" target="_blank" rel="noopener noreferrer"
         id="inventory-sheet-link" class="btn btn-secondary bo-sheet-link">
        <i data-feather="external-link"></i> ${t('viewInventorySheet')}
      </a>
      <div class="bo-btn-row">
        <button class="btn btn-secondary bo-btn-flex" id="btn-sync-all-sheets">
          <i data-feather="refresh-cw"></i> ${t('sheetsSyncAll')}
        </button>
      </div>
    </div>

    <div class="bo-btn-row">
      <button class="btn btn-secondary bo-btn-flex" id="btn-export-all">
        <i data-feather="download"></i> ${t('exportAllData')}
      </button>
    </div>
  `;

  // Bind export
  const exportBtn = container.querySelector('#btn-export-all');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (confirm(t('confirmExport'))) {
        exportAllData();
      }
    });
  }

  // Bind Sync All — pushes every module to Sheets at once
  const syncAllBtn = container.querySelector('#btn-sync-all-sheets');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', async () => {
      syncAllBtn.disabled = true;
      const origHtml = syncAllBtn.innerHTML;
      syncAllBtn.innerHTML = `<i data-feather="loader"></i> ${t('syncInProgress')}`;
      if (typeof feather !== 'undefined') feather.replace();

      ['rawMaterials', 'dateReceiving', 'fermentation', 'distillation1', 'distillation2', 'bottling']
        .forEach(m => syncModuleToSheets(m));
      syncInventorySnapshot('manual');

      // Wait for GAS to process, then verify via GET
      await new Promise(r => setTimeout(r, 4000));
      const check = await verifySyncStatus(t('mod_bottling'));

      syncAllBtn.disabled = false;
      syncAllBtn.innerHTML = origHtml;
      if (typeof feather !== 'undefined') feather.replace();

      if (check.verified && check.exists) {
        showToast(t('syncSuccess'));
      } else {
        showToast(t('sheetsSyncAll') + ' ✓');
      }
    });
  }

  // Bind user items to edit
  container.querySelectorAll('.user-item').forEach(item => {
    item.addEventListener('click', () => {
      const username = item.dataset.username;
      editingRecord = users.find(u => u.username === username);
      currentView = 'form';
      renderApp();
    });
  });

  // --- Invitation bindings ---
  const sendInviteBtn = container.querySelector('#btn-send-invite');
  if (sendInviteBtn) {
    sendInviteBtn.addEventListener('click', () => {
      const emailInput = container.querySelector('#invite-email');
      const roleInput = container.querySelector('#invite-role');
      const errEl = container.querySelector('#invite-error');
      const successEl = container.querySelector('#invite-success');
      errEl.textContent = '';
      successEl.textContent = '';

      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      const role = roleInput ? roleInput.value : 'worker';

      if (!email) { errEl.textContent = t('inviteError_fillEmail'); return; }
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) { errEl.textContent = t('inviteError_invalidEmail'); return; }

      // Check duplicate in existing users
      const existingUsers = getUsers();
      if (existingUsers.find(u => u.email && u.email.toLowerCase() === email)) {
        errEl.textContent = t('requestError_emailExists');
        return;
      }

      // Check duplicate in local invitations
      const invites = getInvitations();
      if (invites.find(inv => inv.email === email && inv.status === 'pending')) {
        errEl.textContent = t('inviteError_duplicate');
        return;
      }

      // Generate token and send
      const token = generateInviteToken();
      const appUrl = location.origin + location.pathname;
      const session = getSession();

      // Save locally
      addInvitation({
        token,
        email,
        role,
        status: 'pending',
        sentAt: new Date().toISOString(),
        sentBy: session ? session.username : '',
        username: '',
      });

      // Also create invitation via backend (for Firestore storage, fire-and-forget)
      if (typeof apiCreateInvitation === 'function') {
        apiCreateInvitation({
          email,
          role,
          app: 'factory',
          sentBy: session ? session.username : '',
        }).catch(function() {});
      }

      // Send to GAS (fire-and-forget)
      const url = SHEETS_SYNC_URL;
      if (url) {
        sendInviteBtn.disabled = true;
        sendInviteBtn.innerHTML = `<i data-feather="loader"></i> ${t('inviteSending')}`;
        if (typeof feather !== 'undefined') feather.replace();

        fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            action: 'send_invite',
            email,
            token,
            role,
            appUrl,
            sentBy: session ? session.username : '',
          }),
          mode: 'no-cors',
        }).then(() => {
          successEl.textContent = t('inviteSent');
          emailInput.value = '';
          sendInviteBtn.disabled = false;
          sendInviteBtn.innerHTML = `<i data-feather="send"></i> ${t('sendInvitation')}`;
          if (typeof feather !== 'undefined') feather.replace();
          // Refresh invitations list
          loadInvitationsList(container);
        }).catch(() => {
          sendInviteBtn.disabled = false;
          sendInviteBtn.innerHTML = `<i data-feather="send"></i> ${t('sendInvitation')}`;
          if (typeof feather !== 'undefined') feather.replace();
          successEl.textContent = t('inviteSent');
          emailInput.value = '';
          loadInvitationsList(container);
        });
      } else {
        successEl.textContent = t('inviteSent');
        emailInput.value = '';
        loadInvitationsList(container);
      }
    });
  }

  // Load invitations from GAS on backoffice render
  loadInvitationsList(container);
}

// Fetch invitations from backend API (primary) or GAS (fallback) and render
function loadInvitationsList(container) {
  const listEl = container.querySelector('#invitations-list');
  if (!listEl) return;

  // Show local invitations immediately
  const localInvites = getInvitations();
  renderInvitationItems(listEl, localInvites);

  // Try backend API first
  if (typeof apiListInvitations === 'function') {
    apiListInvitations('factory').then(result => {
      if (result && result.invitations) {
        // Map backend format to local format
        const mapped = result.invitations.map(inv => ({
          token: inv.token || inv._fbId,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          sentAt: inv.createdAt || inv.sentAt,
          sentBy: inv.createdBy || inv.sentBy || '',
          username: inv.username || '',
        }));
        saveInvitations(mapped);
        renderInvitationItems(listEl, mapped);
        return; // backend succeeded, skip GAS
      }
      // Backend returned null (unavailable) — fallback to GAS
      fetchInvitationsFromGAS(listEl);
    }).catch(() => fetchInvitationsFromGAS(listEl));
  } else {
    fetchInvitationsFromGAS(listEl);
  }
}

function fetchInvitationsFromGAS(listEl) {
  const url = SHEETS_SYNC_URL;
  if (!url) return;

  fetch(`${url}?action=listInvites`)
    .then(resp => { if (!resp.ok) throw new Error('http'); return resp.json(); })
    .then(data => {
      if (data.status === 'ok' && Array.isArray(data.invites)) {
        saveInvitations(data.invites);
        renderInvitationItems(listEl, data.invites);
      }
    })
    .catch(() => {});
}

function renderInvitationItems(listEl, invites) {
  if (!invites || invites.length === 0) {
    listEl.innerHTML = `<div class="empty-state empty-state-compact"><p>${t('invitationsEmpty')}</p></div>`;
    return;
  }

  listEl.innerHTML = invites.map(inv => `
    <div class="record-item">
      <div class="ri-top">
        <span class="ri-title inv-item-title">
          ${inv.username ? esc(inv.username) : esc(inv.email)}
        </span>
        <span class="inv-item-actions">
          ${inv.status === 'pending' ? `<button class="inv-delete-btn" data-token="${esc(inv.token)}" title="${t('delete')}"><i data-feather="x-circle" class="icon-sm"></i></button>` : ''}
          <span class="ri-badge ${inv.status === 'accepted' ? 'approved' : 'pending'}">
            ${inv.status === 'accepted' ? t('inviteAccepted') : t('invitePending')}
          </span>
        </span>
      </div>
      <div class="ri-details">
        ${inv.username ? `<div class="bo-user-email">${esc(inv.email)}</div>` : ''}
        <span class="role-pill role-pill-${esc(inv.role || 'worker')} inv-item-role">${t('role_' + (inv.role || 'worker'))}</span>
        <span class="inv-item-date">
          ${inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : ''}
        </span>
      </div>
    </div>
  `).join('');

  // Bind delete buttons
  listEl.querySelectorAll('.inv-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const token = btn.dataset.token;
      if (!confirm(t('inviteDeleteConfirm'))) return;
      deleteInvitation(token, listEl);
    });
  });

  if (typeof feather !== 'undefined') feather.replace();
}

function deleteInvitation(token, listEl) {
  // Remove from local storage
  const invites = getInvitations().filter(i => i.token !== token);
  saveInvitations(invites);
  renderInvitationItems(listEl, invites);

  // Remove from backend API (fire-and-forget)
  if (typeof apiDeleteInvitation === 'function') {
    apiDeleteInvitation(token).catch(() => {});
  }

  // Remove from GAS (fire-and-forget)
  const url = SHEETS_SYNC_URL;
  if (url) {
    fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_invite', token }),
      mode: 'no-cors',
    }).catch(() => {});
  }
}

function renderUserForm(container) {
  const isEdit = !!editingRecord;
  const u = editingRecord || {};

  container.innerHTML = `
    <div class="section-title">${isEdit ? t('editUser') : t('addUser')}</div>
    <div class="form-container">
      
      <div class="form-group">
        <label class="form-label">${t('username')} <span class="req">*</span></label>
        <input type="text" class="form-input${isEdit ? ' input-disabled' : ''}" id="bo-username" value="${esc(u.username || '')}" ${isEdit ? 'disabled' : ''}>
      </div>

      ${!isEdit ? `
      <div class="form-group">
        <label class="form-label">${t('password')} <span class="req">*</span></label>
        <input type="password" class="form-input" id="bo-password" placeholder="${t('password')}">
      </div>
      ` : `
      <div class="form-group">
        <label class="form-label">${t('password')} <small>(${t('optional')})</small></label>
        <input type="password" class="form-input" id="bo-password" placeholder="${t('keepCurrentPassword')}">
      </div>
      `}

      <div class="form-group">
        <label class="form-label">${t('nameEnglish')} <span class="req">*</span></label>
        <input type="text" class="form-input" id="bo-name" value="${esc(u.name || '')}">
      </div>

      <div class="form-group">
        <label class="form-label">${t('nameHebrew')}</label>
        <input type="text" class="form-input" id="bo-nameHe" value="${esc(u.nameHe || '')}" dir="rtl">
      </div>

      <!-- Thai name field removed (app now uses English/Hebrew only) -->

      <div class="form-group">
        <label class="form-label">${t('selectRole')} <span class="req">*</span></label>
        <select class="form-select" id="bo-role">
          <option value="worker" ${u.role === 'worker' ? 'selected' : ''}>${t('role_worker')}</option>
          <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>${t('role_manager')}</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('role_admin') || 'Admin'}</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">${t('status')}</label>
        <select class="form-select" id="bo-status">
          <option value="active" ${u.status !== 'inactive' ? 'selected' : ''}>${t('active')}</option>
          <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>${t('inactive')}</option>
        </select>
      </div>

      <div class="login-error" id="bo-error" role="alert" aria-live="polite"></div>

      <div class="form-actions">
        <button class="btn btn-secondary" id="bo-cancel">${t('cancel')}</button>
        ${isEdit ? `<button class="btn btn-danger" id="bo-delete">${t('deleteUser')}</button>` : ''}
        <button class="btn btn-primary" id="bo-save">${t('save')}</button>
      </div>
    </div>
  `;

  // Bind actions
  const cancelBtn = container.querySelector('#bo-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    currentView = 'list';
    editingRecord = null;
    renderApp();
  });

  const deleteBtn = container.querySelector('#bo-delete');
  if (deleteBtn && isEdit) {
    deleteBtn.addEventListener('click', () => {
      if (u.username === 'admin') {
        showToast(t('cannotDeleteAdmin'));
        return;
      }
      if (u.username === getSession().username) {
        showToast(t('cannotDeleteSelf'));
        return;
      }
      showManagerPasswordModal(async () => {
        const delResult = await deleteUserByUsername(u.username);
        if (delResult && !delResult.success) {
          showToast(delResult.error || t('error'));
          return;
        }
        showToast(t('delete') + ' ✓');
        currentView = 'list';
        editingRecord = null;
        renderApp();
      });
    });
  }

  const saveBtn = container.querySelector('#bo-save');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    const errorEl = container.querySelector('#bo-error');
    errorEl.textContent = '';

    const usernameInput = container.querySelector('#bo-username');
    const passwordInput = container.querySelector('#bo-password');
    const nameInput = container.querySelector('#bo-name');
    const nameHeInput = container.querySelector('#bo-nameHe');
    const roleInput = container.querySelector('#bo-role');
    const statusInput = container.querySelector('#bo-status');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const nameHe = nameHeInput ? nameHeInput.value.trim() : '';
    const role = roleInput ? roleInput.value : '';
    const status = statusInput ? statusInput.value : 'active';

    if (!username || !name || (!isEdit && !password)) {
      errorEl.textContent = t('signUpError_fillAll');
      return;
    }

    saveBtn.disabled = true;

    if (isEdit) {
      // Update
      const updates = { name, nameHe, role, status };
      if (password) updates.password = password;

      const res = await updateUser(username, updates);
      if (res.success) {
        showToast(t('saved'));
        currentView = 'list';
        editingRecord = null;
        renderApp();
      } else {
        saveBtn.disabled = false;
        errorEl.textContent = res.error;
      }
    } else {
      // Create (async — may create Firebase Auth account)
      const res = await createUser({ username, password, name, nameHe, role, status });
      if (res.success) {
        showToast(t('signUpSuccess'));
        currentView = 'list';
        editingRecord = null;
        renderApp();
      } else {
        saveBtn.disabled = false;
        errorEl.textContent = t(res.error) || res.error;
      }
    }
  });
}

// ============================================================
// ACCESS REQUESTS
// ============================================================

// ============================================================
// AUTO HARD-REFRESH
// ============================================================
function scheduleHardRefresh(intervalMs = 30 * 60 * 1000) {
  setInterval(() => {
    // Don't reload if user is editing a form (BUG-030)
    if (currentView === 'form' || document.querySelector('.modal-overlay')) return;
    location.reload(true);
  }, intervalMs);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initIndexedDB === 'function') initIndexedDB();
  if (typeof initFirebase === 'function') initFirebase();
  if (typeof initFirestoreSync === 'function') initFirestoreSync();
  // Check backend availability (non-blocking)
  if (typeof apiHealthCheck === 'function') {
    apiHealthCheck();
  }
  // Restore from URL hash if present, otherwise use sessionStorage state
  if (location.hash && location.hash !== '#/') {
    _restoreStateFromHash();
  }
  // On restore, if we're in form/detail view but have no editingRecord, fall back to list
  if ((currentView === 'form' || currentView === 'detail') && !editingRecord) {
    currentView = 'list';
  }
  renderApp();
  scheduleHardRefresh();
});
