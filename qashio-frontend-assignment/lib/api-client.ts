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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalized}`;

  const headers = new Headers(init?.headers);
  const body = init?.body;
  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

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
