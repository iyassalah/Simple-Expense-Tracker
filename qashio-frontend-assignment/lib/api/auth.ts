import { apiFetch, getApiBaseUrl } from '@/lib/api-client';
import { getStoredAccessToken, setStoredAccessToken } from '@/lib/auth/token';

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<AuthTokensResponse> {
  return apiFetch<AuthTokensResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(
  payload: LoginPayload,
): Promise<AuthTokensResponse> {
  return apiFetch<AuthTokensResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<void> {
  const base = getApiBaseUrl();
  const token = getStoredAccessToken();
  try {
    await fetch(`${base}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally {
    setStoredAccessToken(null);
  }
}
