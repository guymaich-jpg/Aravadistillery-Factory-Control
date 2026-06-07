// ============================================================
// auth.js — Authentication & Role Management
// ============================================================

// --- Password hashing (AUTH-01, AUTH-02, AUTH-03) ---
function hashPassword(password) {
  // Simple hash for client-side storage — not a substitute for server-side bcrypt
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < password.length; i++) {
    hash ^= password.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  // Add salt-like mixing with password length
  hash = hash ^ (password.length * 0x5bd1e995);
  return 'hashed:' + (hash >>> 0).toString(36);
}

// --- Password complexity validation (AUTH-08) ---
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 digit' };
  }
  return { valid: true };
}

// --- Email validation (AUTH-11) ---
function validateEmail(email) {
  if (!email) return { valid: false, error: 'Email is required' };
  // Basic email regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

// --- Rate limiting (AUTH-06) ---
const _loginAttempts = {};

// Owner accounts — Firebase Auth is the sole password source.
// Passwords are NEVER stored in source code (password: null always).
// Login emails are stored here so the authenticate() function can look up
// the local user record after Firebase Auth succeeds. Emails are not secret.
const DEFAULT_USERS = [
  {
    username: 'guymaich',
    password: null,   // no client-side password — Firebase Auth is required
    role: 'admin',
    name: 'Guy Maich',
    nameHe: 'גיא מייך',
    email: 'guymaich@gmail.com',
    status: 'active',
  },
  {
    username: 'yonatangarini',
    password: null,   // no client-side password — Firebase Auth is required
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
    canImportInventory: true,
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
    canImportInventory: true,
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
    canImportInventory: false,
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
        // Use the hashed password from DEFAULT_USERS (already hashed)
        users.push({ ...required });
        changed = true;
      }
    }
    if (changed) localStorage.setItem('factory_users', JSON.stringify(users));
  }
  return users;
}

/**
 * Fetch users from the backend API and merge into localStorage.
 * Call this when the Settings/user-management screen opens.
 * Returns the merged user list.
 */
async function syncUsersFromBackend() {
  if (typeof apiListUsers !== 'function') return getUsers();
  try {
    const result = await apiListUsers('factory');
    if (!result || result.error || !result.users) return getUsers();

    const localUsers = getUsers();
    const merged = [...localUsers];

    // Merge backend users into local list (backend is source of truth for non-owner accounts)
    for (const remote of result.users) {
      const idx = merged.findIndex(u => u.username === remote.username);
      if (idx !== -1) {
        // Update local with backend data (keep local password hash for offline auth)
        const localPw = merged[idx].password;
        merged[idx] = { ...merged[idx], ...remote, password: localPw };
      } else {
        // New user from backend — add to local (no password stored locally)
        merged.push({ ...remote, password: null });
      }
    }

    localStorage.setItem('factory_users', JSON.stringify(merged));
    return merged;
  } catch (e) {
    return getUsers();
  }
}

// Authenticate by email (primary) or username, with password.
// Strategy: Firebase Auth is source of truth for passwords.
//   1. Try Firebase Auth first (signInWithEmailAndPassword)
//   2. If user doesn't exist in Firebase → auto-create (createUserWithEmailAndPassword)
//   3. If Firebase unavailable → fall back to local hash check
// Local user DB provides role/permissions for the session.
async function authenticate(emailOrUsername, password) {
  // --- Rate limiting check (AUTH-06) ---
  const key = emailOrUsername.toLowerCase();
  const now = Date.now();
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;

  if (_loginAttempts[key]) {
    _loginAttempts[key] = _loginAttempts[key].filter(t => (now - t) < RATE_LIMIT_WINDOW);
    if (_loginAttempts[key].length >= MAX_ATTEMPTS) {
      return { locked: true };
    }
  }

  const users = getUsers();

  // Find local user by email or username (for role/permissions lookup)
  const localUser = users.find(u => {
    if (u.status === 'inactive') return false;
    return (u.email && u.email.toLowerCase() === key) ||
      u.username.toLowerCase() === key;
  });

  // Reject immediately if user doesn't exist locally (no role/permissions available)
  if (!localUser) {
    if (!_loginAttempts[key]) _loginAttempts[key] = [];
    _loginAttempts[key].push(now);
    return null;
  }

  // Resolve the email to use for Firebase Auth
  const emailForAuth = localUser.email || (key.includes('@') ? key : null);

  // --- Strategy 1: Try Firebase Auth first ---
  if (emailForAuth && typeof fbAuthSignIn === 'function' && _firebaseReady && _auth) {
    try {
      const fbUser = await fbAuthSignIn(emailForAuth, password);
      if (fbUser) {
        delete _loginAttempts[key];
        const session = { ...localUser, loginTime: Date.now(), lastActivity: Date.now() };
        delete session.password;
        localStorage.setItem('factory_session', JSON.stringify(session));
        return session;
      }
    } catch (e) {
      // Firebase Auth unavailable — fall through to local check
    }
  }

  // Reject login if no password hash available (owner accounts, Firebase-managed accounts)
  if (!localUser.password) {
    if (!_loginAttempts[key]) _loginAttempts[key] = [];
    _loginAttempts[key].push(now);
    return null;
  }

  // Legacy: worker accounts created before Firebase Auth migration may still have local hashes
  const hashedInput = hashPassword(password);
  let passwordMatch = false;

  if (localUser.password.startsWith('hashed:')) {
    passwordMatch = localUser.password === hashedInput;
  } else if (localUser.password === password) {
    // Upgrade legacy plaintext password to hashed (AUTH-01)
    const idx = users.findIndex(u => u.username === localUser.username);
    if (idx !== -1) {
      users[idx].password = hashedInput;
      localStorage.setItem('factory_users', JSON.stringify(users));
    }
    passwordMatch = true;
  }

  if (!passwordMatch) {
    if (!_loginAttempts[key]) _loginAttempts[key] = [];
    _loginAttempts[key].push(now);
    return null;
  }

  delete _loginAttempts[key];
  const session = { ...localUser, loginTime: Date.now(), lastActivity: Date.now() };
  delete session.password;
  localStorage.setItem('factory_session', JSON.stringify(session));
  return session;
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

  // Validate email (AUTH-11)
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    return { success: false, error: emailCheck.error };
  }

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

async function approveRequest(requestId, password, role) {
  const requests = getPendingRequests();
  const req = requests.find(r => r.id === requestId);
  if (!req) return { success: false, error: 'Request not found' };

  // Require password — no weak default (AUTH-07)
  if (!password) return { success: false, error: 'Password is required' };

  // Validate password complexity (AUTH-08)
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return { success: false, error: pwCheck.error };

  const baseUsername = req.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  const result = await createUser({
    username: baseUsername,
    password: password,
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

  // Check session timeout against lastActivity (preferred) or loginTime (AUTH-09)
  const now = Date.now();
  const lastActive = session.lastActivity || session.loginTime;
  if (lastActive && (now - lastActive) > SESSION_TIMEOUT_MS) {
    localStorage.removeItem('factory_session');
    return null;
  }

  if (!session.username || !session.role) {
    localStorage.removeItem('factory_session');
    return null;
  }

  return session;
}

// Refresh session activity timestamp (AUTH-09)
function refreshSession() {
  let session;
  try {
    session = JSON.parse(localStorage.getItem('factory_session') || 'null');
  } catch (e) {
    return;
  }
  if (session) {
    session.lastActivity = Date.now();
    localStorage.setItem('factory_session', JSON.stringify(session));
  }
}

function logout() {
  localStorage.removeItem('factory_session');
  // Sign out of Firebase Auth
  if (typeof fbAuthSignOut === 'function') {
    fbAuthSignOut().catch(() => {});
  }
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
  // Refresh session on activity (AUTH-09)
  refreshSession();
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
  const fallback = session.name || session.displayName || session.username || '';
  if (currentLang === 'he') return session.nameHe || fallback;
  if (currentLang === 'th') return session.nameTh || fallback;
  return fallback;
}

function getUserRole() {
  const session = getSession();
  if (!session) return '';
  return session.role;
}

async function updateUser(username, updates) {
  // --- Try backend API first (handles Firebase Auth + Firestore + owner protection) ---
  if (typeof apiCall === 'function') {
    const apiResult = await apiCall('PUT', '/api/users/' + encodeURIComponent(username), {
      name: updates.name,
      nameHe: updates.nameHe,
      nameTh: updates.nameTh,
      role: updates.role,
      status: updates.status,
      password: updates.password,
      app: 'factory',
    });
    if (apiResult && !apiResult.error) {
      // Backend succeeded — also update localStorage for offline access
      const users = getUsers();
      const idx = users.findIndex(u => u.username === username);
      if (idx !== -1) {
        if (updates.password && !updates.password.startsWith('hashed:')) {
          updates.password = hashPassword(updates.password);
        }
        users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('factory_users', JSON.stringify(users));
      }
      return { success: true };
    }
    if (apiResult && apiResult.error) {
      return { success: false, error: apiResult.error };
    }
    // apiResult is null — backend unavailable, fall through to local logic
  }

  // --- Fallback: local logic (used when backend is disabled or unavailable) ---
  const users = getUsers();
  const idx = users.findIndex(u => u.username === username);
  if (idx !== -1) {
    const rawPassword = updates.password; // keep plaintext for Firebase sync

    // Hash password if it's being updated (AUTH-03)
    if (updates.password && !updates.password.startsWith('hashed:')) {
      updates.password = hashPassword(updates.password);
    }
    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('factory_users', JSON.stringify(users));

    // Sync password change to Firebase Auth (fire-and-forget)
    if (rawPassword && users[idx].email && typeof fbAuthCreateUser === 'function') {
      fbAuthCreateUser(users[idx].email, rawPassword).catch(() => {});
    }

    // Sync user profile to Firestore
    if (typeof fbSaveUser === 'function') {
      fbSaveUser(users[idx]).catch(() => {});
    }

    return { success: true };
  }
  return { success: false, error: 'User not found' };
}

async function deleteUserByUsername(username) {
  // --- Try backend API first (handles Firebase Auth deletion + owner protection) ---
  if (typeof apiCall === 'function') {
    const apiResult = await apiCall('DELETE', '/api/users/' + encodeURIComponent(username) + '?app=factory');
    if (apiResult && !apiResult.error) {
      // Backend succeeded — also remove from localStorage
      const users = getUsers();
      const filtered = users.filter(u => u.username !== username);
      localStorage.setItem('factory_users', JSON.stringify(filtered));
      return { success: true };
    }
    if (apiResult && apiResult.error) {
      return { success: false, error: apiResult.error };
    }
    // apiResult is null — backend unavailable, fall through to local logic
  }

  // --- Fallback: local logic (used when backend is disabled or unavailable) ---
  // Block deletion of owner accounts (AUTH-10, AUTH-11)
  const ownerUsernames = DEFAULT_USERS.map(u => u.username);
  if (ownerUsernames.includes(username)) {
    return { success: false, error: 'Cannot delete owner accounts' };
  }

  const users = getUsers();
  const filtered = users.filter(u => u.username !== username);
  if (filtered.length < users.length) {
    localStorage.setItem('factory_users', JSON.stringify(filtered));
    return { success: true };
  }
  return { success: false, error: 'User not found' };
}

async function createUser(userData) {
  // --- Try backend API first (creates Firebase Auth + Firestore + custom claims) ---
  if (typeof apiCall === 'function') {
    const apiResult = await apiCall('POST', '/api/users', {
      username: userData.username,
      password: userData.password,
      name: userData.name,
      nameHe: userData.nameHe,
      nameTh: userData.nameTh,
      email: userData.email,
      role: userData.role || 'worker',
      status: userData.status || 'active',
      app: 'factory',
    });
    if (apiResult && !apiResult.error) {
      // Backend succeeded — also save to localStorage for offline access
      const hashedPw = (userData.password && !userData.password.startsWith('hashed:'))
        ? hashPassword(userData.password) : userData.password;
      const newUser = {
        ...userData,
        password: hashedPw,
        createdAt: new Date().toISOString(),
        status: userData.status || 'active',
      };
      const users = getUsers();
      users.push(newUser);
      localStorage.setItem('factory_users', JSON.stringify(users));
      return { success: true };
    }
    if (apiResult && apiResult.error) {
      return { success: false, error: apiResult.error };
    }
    // apiResult is null — backend unavailable, fall through to local logic
  }

  // --- Fallback: local logic (used when backend is disabled or unavailable) ---
  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
    return { success: false, error: 'signUpError_userExists' };
  }

  // Validate email if provided (AUTH-11)
  if (userData.email) {
    const emailCheck = validateEmail(userData.email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.error };
    }
  }

  // Validate password complexity (AUTH-08)
  const pwCheck = validatePassword(userData.password);
  if (!pwCheck.valid) {
    return { success: false, error: pwCheck.error };
  }

  // Auto-create Firebase Auth account for the new user
  if (userData.email && typeof fbAuthCreateUser === 'function') {
    const fbResult = await fbAuthCreateUser(userData.email, userData.password);
    // fbResult is user object, 'exists', or null — proceed regardless
    // fbResult is user object, 'exists', or null — proceed regardless
  }

  // Hash password before storing locally (AUTH-01)
  const hashedPw = (userData.password && !userData.password.startsWith('hashed:'))
    ? hashPassword(userData.password)
    : userData.password;

  const newUser = {
    ...userData,
    password: hashedPw,
    createdAt: new Date().toISOString(),
    status: userData.status || 'active',
  };

  users.push(newUser);
  localStorage.setItem('factory_users', JSON.stringify(users));

  // Sync user profile to Firestore (without password)
  if (typeof fbSaveUser === 'function') {
    fbSaveUser(newUser).catch(() => {});
  }

  return { success: true };
}

// ============================================================
// Invitation System
// ============================================================
const INVITATIONS_KEY = 'factory_invitations';

function getInvitations() {
  try {
    return JSON.parse(localStorage.getItem(INVITATIONS_KEY) || '[]');
  } catch (e) { return []; }
}

function saveInvitations(list) {
  localStorage.setItem(INVITATIONS_KEY, JSON.stringify(list));
}

function addInvitation(invite) {
  const invites = getInvitations();
  invites.push(invite);
  saveInvitations(invites);
}

function updateInvitationStatus(token, status, username) {
  const invites = getInvitations();
  const idx = invites.findIndex(i => i.token === token);
  if (idx !== -1) {
    invites[idx].status = status;
    if (username) invites[idx].username = username;
    saveInvitations(invites);
  }
}

function generateInviteToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
    + Math.random().toString(36).slice(2, 9);
}

