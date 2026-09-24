export const DEFAULT_ADMIN_PASSCODE = 'safari';

export function isUrlViewerMode(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get('admin');
  // If ?admin=safari is present, it is not viewer mode
  if (adminParam === DEFAULT_ADMIN_PASSCODE || adminParam === 'safari' || adminParam === 'true') {
    return false;
  }
  return true;
}

export function isUrlAdminMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get('admin');
  return (
    adminParam === DEFAULT_ADMIN_PASSCODE ||
    adminParam === 'safari' ||
    adminParam === 'true'
  );
}

export function getStoredAdminStatus(): boolean {
  return isUrlAdminMode();
}

export function setStoredAdminStatus(_isAdmin: boolean): void {
  // URL-driven access control
}

export function verifyAdminPasscode(input: string): boolean {
  const clean = input.trim().toLowerCase();
  return clean === DEFAULT_ADMIN_PASSCODE || clean === 'safari';
}

export function getViewerShareUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function getAdminShareUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin);
  url.search = '?admin=safari';
  return url.toString();
}
