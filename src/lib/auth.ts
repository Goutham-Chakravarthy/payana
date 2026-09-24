const ADMIN_STORAGE_KEY = 'payana_admin_session_v1';
export const DEFAULT_ADMIN_PASSCODE = 'safari';

export function isUrlViewerMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'view' || params.get('role') === 'viewer';
}

export function isUrlAdminMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get('admin');
  return (
    adminParam === 'true' ||
    adminParam === DEFAULT_ADMIN_PASSCODE ||
    adminParam === 'payana'
  );
}

export function getStoredAdminStatus(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // If URL explicitly sets view mode, force viewer
    if (isUrlViewerMode()) {
      return false;
    }
    // If URL explicitly sets admin mode, activate & persist admin
    if (isUrlAdminMode()) {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      return true;
    }
    return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setStoredAdminStatus(isAdmin: boolean): void {
  try {
    if (isAdmin) {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to set admin status:', err);
  }
}

export function verifyAdminPasscode(input: string): boolean {
  const clean = input.trim().toLowerCase();
  return clean === DEFAULT_ADMIN_PASSCODE || clean === 'safari';
}

export function getViewerShareUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '?mode=view';
  return url.toString();
}

export function getAdminShareUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '?admin=safari';
  return url.toString();
}
