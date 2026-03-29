import {
  getStoredAccessToken,
  setStoredAccessToken,
} from '@/lib/auth/token';

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface NestErrorBody {
  statusCode?: number;
  message?: unknown;
  path?: string;
}

/**
 * Public API base URL (browser). No trailing slash.
 * In development, falls back to http://localhost:3000 with a console warning if unset.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[qashio] NEXT_PUBLIC_API_BASE_URL is not set; using http://localhost:3000',
      );
      return 'http://localhost:3000';
    }
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local (see .env.example).',
    );
  }
  return raw.replace(/\/$/, '');
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/** Paths that must not send Bearer and must not trigger refresh retry on 401. */
function isPublicAuthPath(path: string): boolean {
  const p = normalizePath(path).split('?')[0];
  return (
    p === '/auth/login' ||
    p === '/auth/register' ||
    p === '/auth/refresh'
  );
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        return false;
      }
      const data = (await res.json()) as { accessToken?: string };
      if (data.accessToken) {
        setStoredAccessToken(data.accessToken);
        return true;
      }
      return false;
    })().catch(() => false).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!res.ok) {
    let message = res.statusText;
    let pathOut: string | undefined;
    if (isJson) {
      try {
        const errBody = (await res.json()) as NestErrorBody;
        if (typeof errBody.message === 'string') {
          message = errBody.message;
        } else if (Array.isArray(errBody.message)) {
          message = errBody.message.join(', ');
        } else if (errBody.message != null) {
          message = String(errBody.message);
        }
        pathOut = errBody.path;
      } catch {
        /* ignore parse errors */
      }
    }
    throw new ApiError(res.status, message, pathOut);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    return (await res.text()) as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const base = getApiBaseUrl();
  const normalized = normalizePath(path);
  const url = `${base}${normalized}`;

  const headers = new Headers(init?.headers);
  const body = init?.body;
  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!isPublicAuthPath(normalized)) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && !retried && !isPublicAuthPath(normalized)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiFetch<T>(path, init, true);
    }
    setStoredAccessToken(null);
    redirectToLogin();
    throw new ApiError(401, 'Session expired');
  }

  return parseResponse<T>(res);
}
