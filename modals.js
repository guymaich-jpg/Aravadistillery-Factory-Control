// ============================================================
// modals.js — Modal dialogs (manager password, etc.)
// ============================================================

// ---- Manager Password Modal (required for any delete action) ----
function showManagerPasswordModal(onSuccess) {
  // Remove any existing modal
  const existing = document.querySelector('.manager-pwd-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'manager-pwd-modal';
  modal.innerHTML = `
    <div class="manager-pwd-backdrop"></div>
    <div class="manager-pwd-dialog">
      <div class="mpd-title"><i data-feather="lock" style="width:20px;height:20px;margin-inline-end:8px;"></i>${t('deleteConfirmTitle')}</div>
      <p class="mpd-subtitle">${t('deleteConfirmSubtitle')}</p>
      <input type="password" class="form-input mpd-input" id="mpd-password" placeholder="${t('managerPasswordPlaceholder')}" aria-label="${t('managerPasswordPlaceholder')}" autocomplete="current-password">
      <div class="mpd-error" id="mpd-error"></div>
      <div class="mpd-actions">
        <button class="btn btn-secondary mpd-cancel">${t('cancel')}</button>
        <button class="btn btn-danger mpd-confirm">${t('delete')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (typeof feather !== 'undefined') feather.replace();

  const input = modal.querySelector('#mpd-password');
  const errorEl = modal.querySelector('#mpd-error');
  input.focus();

  const close = () => modal.remove();

  modal.querySelector('.mpd-cancel').addEventListener('click', close);
  modal.querySelector('.manager-pwd-backdrop').addEventListener('click', close);

  const doConfirm = () => {
    const pwd = input.value;
    if (!pwd) { errorEl.textContent = t('required'); return; }

    // Verify: must be a manager or admin password
    const users = getUsers();
    const hashedPwd = typeof hashPassword === 'function' ? hashPassword(pwd) : pwd;
    const authorized = users.find(
      u => (u.role === 'manager' || u.role === 'admin') &&
           (u.password === hashedPwd || u.password === pwd)
    );
    if (!authorized) {
      errorEl.textContent = t('deleteWrongPassword');
      input.value = '';
      input.focus();
      return;
    }
    close();
    onSuccess(authorized);
  };

  modal.querySelector('.mpd-confirm').addEventListener('click', doConfirm);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doConfirm(); });
}
