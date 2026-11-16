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
  timeoutMs = 10_000
): Promise<Response> {
  const url = apiUrl(pathOrUrl);
  const apiKey = getApiKey();

  const headers = new Headers(options.headers || {});
  if (apiKey && !headers.has('X-API-Key')) {
    headers.set('X-API-Key', apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
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
  return apiText;
}
