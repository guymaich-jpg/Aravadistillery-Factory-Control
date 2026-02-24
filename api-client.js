// ============================================================
// api-client.js — Backend API Client
// ============================================================
// Calls the shared Vercel backend for privileged operations
// (user CRUD, invitations, role management).
//
// Set API_BASE to the deployed Vercel URL to enable.
// When API_BASE is empty, all operations fall back to local logic.
// ============================================================

// Backend URL — set after deploying to Vercel.
// Leave empty to disable backend calls (all operations use local fallback).
const API_BASE = 'https://aravadistillery-backend.vercel.app';

// Request timeout in milliseconds
const API_TIMEOUT = 8000;

// Track backend availability (null = unknown, true/false after first check)
let _backendAvailable = null;

/**
 * Check if the backend is reachable (non-blocking health check).
 * Updates _backendAvailable flag. Returns the availability status.
 */
async function apiHealthCheck() {
  if (!API_BASE) {
    _backendAvailable = false;
    return false;
  }
  try {
    const resp = await fetch(API_BASE + '/api/health', {
      signal: AbortSignal.timeout(5000),
    });
    _backendAvailable = resp.ok;
  } catch (e) {
    _backendAvailable = false;
  }
  return _backendAvailable;
}

/**
 * Make an authenticated API call to the backend.
 *
 * Returns:
 *   - Object with data on success (e.g. { success: true, user: {...} })
 *   - Object with { error: string } on server error
 *   - null if backend is unavailable or disabled (caller should fall back to local logic)
 */
async function apiCall(method, path, body) {
  // Backend disabled — fall back to local
  if (!API_BASE) return null;

  const token = typeof fbGetIdToken === 'function' ? await fbGetIdToken() : null;
  if (!token) return null; // no token = can't authenticate with backend

  const controller = new AbortController();
  const timeout = setTimeout(function() { controller.abort(); }, API_TIMEOUT);

  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(API_BASE + path, options);
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(function() { return {}; });
      return { error: err.error || 'API error (HTTP ' + res.status + ')', status: res.status };
    }

    _backendAvailable = true;
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      console.warn('[API] Backend request timed out:', path);
    } else {
      console.warn('[API] Backend call failed, using local fallback:', e.message);
    }
    _backendAvailable = false;
    return null; // null signals backend unavailable — caller should fall back
  }
}

/**
 * Create an invitation via the backend API (fire-and-forget alongside GAS).
 * Returns the result or null if unavailable.
 */
async function apiCreateInvitation(data) {
  return apiCall('POST', '/api/invitations', data);
}

/**
 * List invitations from the backend API.
 * Returns { invitations: [...] } or null if unavailable.
 */
async function apiListInvitations(app) {
  var qs = app ? '?app=' + encodeURIComponent(app) : '';
  return apiCall('GET', '/api/invitations' + qs);
}

/**
 * Delete an invitation via the backend API.
 */
async function apiDeleteInvitation(id) {
  return apiCall('DELETE', '/api/invitations/' + encodeURIComponent(id));
}
