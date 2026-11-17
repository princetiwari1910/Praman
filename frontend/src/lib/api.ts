import type { ApiErrorResponse } from '@/types/api';

/**
 * Returns the configured API base URL, stripped of trailing slashes.
 * Defaults to "" so that in production, requests use same-origin relative URLs (/v1/...)
 * which works with the Render rewrite rule (/v1/* -> backend).
 * In local dev, Vite's dev proxy forwards /v1 to http://localhost:8000.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
}

/**
 * Returns the API key from environment variable VITE_API_KEY.
 */
export function getApiKey(): string {
  return (import.meta.env.VITE_API_KEY as string | undefined)?.trim() ?? '';
}

export const API_BASE_URL = getApiBaseUrl();
export const API_KEY = getApiKey();

/**
 * Resolves an API endpoint path against the base URL.
 * If endpoint starts with http:// or https://, it is returned as is.
 * Otherwise, combines base URL with the relative path.
 */
export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const base = getApiBaseUrl();
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${normalized}` : normalized;
}

/**
 * Centralized fetch helper for API requests.
 * Ensures relative endpoints are resolved via apiUrl(),
 * attaches the X-API-Key header on every request if configured,
 * and handles request timeouts.
 */
export async function apiFetch(
  pathOrUrl: string,
  options: RequestInit = {},
  timeoutMs = 45_000
): Promise<Response> {
  const url = apiUrl(pathOrUrl);
  const apiKey = getApiKey();

  const headers = new Headers(options.headers || {});
  if (apiKey && !headers.has('X-API-Key')) {
    headers.set('X-API-Key', apiKey);
  }

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('tathya_auth_token') || localStorage.getItem('praman_auth_token')
    : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Server took too long to respond (Render free-tier cold start). Please try again in a moment.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse an API error response and return a user-friendly error string.
 */
export async function parseErrorMessage(
  res: Response,
  checksUsed: number,
  quota: number | null
): Promise<string> {
  let apiText = `Request failed with status ${res.status}`;
  try {
    const body = (await res.json()) as Partial<ApiErrorResponse>;
    if (body && typeof body === 'object') {
      apiText = body.error ? `${body.error}: ${body.message}` : body.message || apiText;
    }
  } catch {
    // Non-JSON response
  }

  if (res.status === 400) return `Invalid address or request — ${apiText}`;
  if (res.status === 401) return `API key missing or wrong — ${apiText}`;
  if (res.status === 422) return `Validation error — ${apiText}`;
  if (res.status === 429) return `Quota reached (${checksUsed}${quota !== null ? ` / ${quota}` : ''}) — ${apiText}`;
  if (res.status === 500) return `Server processing error (500) — ${apiText}. Ensure backend is running latest deployment.`;
  if (res.status === 502 || res.status === 503 || res.status === 504) return `Service unavailable (${res.status}) — Backend service is spinning up. Please retry in a few moments.`;
  return apiText;
}

/**
 * Authentication API helpers
 */
export async function apiRegister(email: string, password: string, fullName?: string) {
  const res = await apiFetch('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail?.message || data?.message || 'Registration failed');
  }
  return res.json();
}

export async function apiLogin(email: string, password: string) {
  const res = await apiFetch('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail?.message || data?.message || 'Login failed');
  }
  return res.json();
}

export async function apiGoogleAuth(credential: string) {
  const res = await apiFetch('/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail?.message || data?.message || 'Google authentication failed');
  }
  return res.json();
}

export async function apiGetMe() {
  const res = await apiFetch('/v1/auth/me', {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  return res.json();
}
