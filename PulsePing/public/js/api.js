// Thin fetch wrapper shared across all pages.
// Token lives in localStorage under 'pulseping_token'.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('pulseping_token');
}

function setSession(token, user) {
  localStorage.setItem('pulseping_token', token);
  localStorage.setItem('pulseping_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('pulseping_token');
  localStorage.removeItem('pulseping_user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('pulseping_user'));
  } catch {
    return null;
  }
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

// Guard for pages that require auth — redirect to login if no token
function requireAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}
