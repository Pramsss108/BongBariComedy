// Simple device id helper: persistent cookie + localStorage fallback
// Format: bbcdev_<timestamp>_<rand>

const COOKIE_NAME = 'bbc_device_id';
const ONE_YEAR = 365 * 24 * 60 * 60; // seconds

function randomId(): string {
  return 'bbcdev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`; // avoid Secure for local dev
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = readCookie(COOKIE_NAME);
  if (!id) {
    try { id = localStorage.getItem(COOKIE_NAME) || ''; } catch { id = ''; }
  }
  if (!id) {
    id = randomId();
    writeCookie(COOKIE_NAME, id, ONE_YEAR);
    try { localStorage.setItem(COOKIE_NAME, id); } catch {/* ignore */}
  } else {
    // Refresh cookie age on access (sliding expiration) once per session
    writeCookie(COOKIE_NAME, id, ONE_YEAR);
  }
  return id;
}

// Alias for clarity with new requirements
export const getOrSetDeviceId = getDeviceId;

// Lightweight non-cryptographic hash (FNV-1a like) for device ID to avoid exposing raw id server-side keys if desired
export function getDeviceHash(): string {
  const id = getDeviceId();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Eager initialize on import (non-blocking)
try { getDeviceId(); } catch {/* ignore */}
