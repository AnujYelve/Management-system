/**
 * lib/offlineCache.js
 *
 * Lightweight localStorage-based offline cache for the user dashboard.
 * All functions are SSR-safe (no-ops on the server).
 */

export const CACHE_KEYS = {
  MY_ISSUES:     'lms_my_issues',
  NOTIFICATIONS: 'lms_notifications',
};

function isClient() {
  return typeof window !== 'undefined';
}

/**
 * Save data to localStorage under the given key.
 * Wraps the value with a timestamp for freshness checks.
 */
export function cacheSet(key, data) {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Storage quota exceeded or private browsing — silently ignore
  }
}

/**
 * Load data from localStorage.
 * Returns null if key doesn't exist or data is corrupt.
 */
export function cacheGet(key) {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns how many milliseconds ago the key was cached.
 * Returns null if key doesn't exist.
 */
export function cacheAge(key) {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts;
  } catch {
    return null;
  }
}

/**
 * Clear all LMS cache keys.
 */
export function cacheClear() {
  if (!isClient()) return;
  Object.values(CACHE_KEYS).forEach((k) => {
    try { localStorage.removeItem(k); } catch {}
  });
}
