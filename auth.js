// ============================================================
// auth.js — Authentication & Role Management
// ============================================================

// The two owner accounts — login is by email + password
const DEFAULT_USERS = [
  {
    username: 'guymaich',
    password: 'Guy1234',
    role: 'admin',
    name: 'Guy Maich',
    nameHe: 'גיא מייך',
    email: 'guymaich@gmail.com',
    status: 'active',
  },
  {
    username: 'yonatangarini',
    password: 'Yon1234',
    role: 'admin',
    name: 'Yonatan Garini',
    nameHe: 'יונתן גריני',
    email: 'yonatangarini@gmail.com',
    status: 'active',
  },
];

// Permissions map
const PERMISSIONS = {
  admin: {
    canViewDashboard: true,
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: true,
    canViewHistory: true,
    canExportData: true,
    canManageUsers: true,
    canViewInventory: true,
    canApproveBottling: true,
    canViewAllModules: true,
    canAccessBackoffice: true,
  },
  manager: {
    canViewDashboard: true,
    canAddRecords: true,
    canEditRecords: true,
    canDeleteRecords: true,
    canViewHistory: true,
    canExportData: true,
    canManageUsers: true,
    canViewInventory: true,
    canApproveBottling: false,
    canViewAllModules: true,
    canAccessBackoffice: true,
  },
  worker: {
    canViewDashboard: true,
    canAddRecords: true,
    canEditRecords: false,
    canDeleteRecords: false,
    canViewHistory: true,
    canExportData: false,
    canManageUsers: false,
    canViewInventory: true,
    canApproveBottling: false,
    canViewAllModules: true,
    canAccessBackoffice: false,
  }
};

function getUsers() {
  let users;
  try {
    users = JSON.parse(localStorage.getItem('factory_users') || 'null');
  } catch (e) {
    users = null;
  }
  if (!users || !Array.isArray(users)) {
    users = DEFAULT_USERS;
    localStorage.setItem('factory_users', JSON.stringify(users));
  } else {
    // Migration: ensure the two owner accounts always exist
    let changed = false;
    for (const required of DEFAULT_USERS) {
      if (!users.find(u => u.username === required.username)) {
        users.push(required);
        changed = true;
      }
    }
    if (changed) localStorage.setItem('factory_users', JSON.stringify(users));
  }
  return users;
}

// Authenticate by email (primary) or username, with password
function authenticate(emailOrUsername, password) {
  const users = getUsers();
  const user = users.find(u =>
    u.status !== 'inactive' &&
    u.password === password &&
    (
      (u.email && u.email.toLowerCase() === emailOrUsername.toLowerCase()) ||
      u.username.toLowerCase() === emailOrUsername.toLowerCase()
    )
  );
  if (user) {
    const session = { ...user, loginTime: Date.now() };
    delete session.password;
    localStorage.setItem('factory_session', JSON.stringify(session));
    return session;
  }
  return null;
}

// ============================================================
// Access Request System
// ============================================================
const ACCESS_REQUESTS_KEY = 'factory_access_requests';

function getPendingRequests() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]');
  } catch (e) { return []; }
}

function submitAccessRequest(name, email) {
  if (!name || !email) return { success: false, error: 'requestError_fillAll' };

  const requests = getPendingRequests();
  if (requests.find(r => r.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'requestError_alreadyPending' };
  }

  const users = getUsers();
  if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'requestError_emailExists' };
  }

  const request = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    requestedAt: new Date().toISOString(),
  };

  requests.push(request);
  localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(requests));
  return { success: true, request };
}

function approveRequest(requestId, password, role) {
  const requests = getPendingRequests();
  const req = requests.find(r => r.id === requestId);
  if (!req) return { success: false, error: 'Request not found' };

  const baseUsername = req.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  const result = createUser({
    username: baseUsername,
    password: password || 'Welcome1',
    role: role || 'worker',
    name: req.name,
    email: req.email,
    status: 'active',
  });

  if (!result.success) return result;

  const updated = requests.filter(r => r.id !== requestId);
  localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(updated));
  return { success: true };
}

function denyRequest(requestId) {
  const requests = getPendingRequests();
  const updated = requests.filter(r => r.id !== requestId);
  localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(updated));
  return { success: true };
}

// Session expires after 12 hours of inactivity
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

function getSession() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem('factory_session') || 'null');
  } catch (e) {
    localStorage.removeItem('factory_session');
    return null;
  }
  if (!session) return null;

  const now = Date.now();
  if (session.loginTime && (now - session.loginTime) > SESSION_TIMEOUT_MS) {
    localStorage.removeItem('factory_session');
    return null;
  }

  if (!session.username || !session.role) {
    localStorage.removeItem('factory_session');
    return null;
  }

  return session;
}

function logout() {
  localStorage.removeItem('factory_session');
  if (typeof renderApp === 'function') {
    currentScreen = 'dashboard';
    currentModule = null;
    renderApp();
  }
}

function secureRecordAction(action) {
  const session = getSession();
  if (!session) {
    alert(typeof t === 'function' ? t('sessionExpired') : 'Session expired. Please log in.');
    logout();
    return false;
  }
  return action();
}

function hasPermission(perm) {
  const session = getSession();
  if (!session) return false;
  return PERMISSIONS[session.role] && PERMISSIONS[session.role][perm];
}

function getUserDisplayName() {
  const session = getSession();
  if (!session) return '';
  if (currentLang === 'he') return session.nameHe || session.name;
  if (currentLang === 'th') return session.nameTh || session.name;
  return session.name;
}

function getUserRole() {
  const session = getSession();
  if (!session) return '';
  return session.role;
}

function updateUser(username, updates) {
  const users = getUsers();
  const idx = users.findIndex(u => u.username === username);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('factory_users', JSON.stringify(users));
    return { success: true };
  }
  return { success: false, error: 'User not found' };
}

function deleteUserByUsername(username) {
  const users = getUsers();
  const filtered = users.filter(u => u.username !== username);
  if (filtered.length < users.length) {
    localStorage.setItem('factory_users', JSON.stringify(filtered));
    return { success: true };
  }
  return { success: false, error: 'User not found' };
}

function createUser(userData) {
  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
    return { success: false, error: 'signUpError_userExists' };
  }

  const newUser = {
    ...userData,
    createdAt: new Date().toISOString(),
    status: userData.status || 'active',
  };

  users.push(newUser);
  localStorage.setItem('factory_users', JSON.stringify(users));
  return { success: true };
}
