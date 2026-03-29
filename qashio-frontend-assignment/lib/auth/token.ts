/** sessionStorage key for JWT access token (design: Phase 12). */
export const ACCESS_TOKEN_STORAGE_KEY = 'qashio_access_token';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}
