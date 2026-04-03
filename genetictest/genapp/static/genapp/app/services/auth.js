const KEYS = {
  basicToken: "auth_basic_token",
  username: "auth_username",
  role: "auth_role",
};

export function getAuth() {
  const basicToken = localStorage.getItem(KEYS.basicToken);
  const username = localStorage.getItem(KEYS.username);
  const role = localStorage.getItem(KEYS.role);
  return { basicToken, username, role };
}

export function isAuthed() {
  const { basicToken } = getAuth();
  return Boolean(basicToken);
}

/**
 * Сохраняем "token" как Basic base64. Это работает с текущей backend-реализацией
 * (SessionAuthentication + BasicAuthentication), не требуя CSRF.
 *
 * Безопасность: это хранит пароль в base64 в localStorage (демо-режим).
 * В боевом варианте лучше JWT/DRF Token.
 */
export function setBasicAuth({ username, password, role }) {
  const basicToken = btoa(`${username}:${password}`);
  localStorage.setItem(KEYS.basicToken, basicToken);
  localStorage.setItem(KEYS.username, username);
  if (role) localStorage.setItem(KEYS.role, role);
}

export function clearAuth() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getBasicAuthHeaderValue() {
  const { basicToken } = getAuth();
  if (!basicToken) return null;
  return `Basic ${basicToken}`;
}

