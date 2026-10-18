// Thin fetch wrapper: cookies for the session, CSRF header on writes, uniform error type.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}) { super(message); }
}

let csrfToken: string | null = null;
export const setCsrfToken = (t: string | null) => { csrfToken = t; };
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; form?: FormData; query?: Record<string, unknown> } = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const qs = opts.query
    ? '?' + new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString()
    : '';
  const headers: Record<string, string> = {};
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }

  let res: Response;
  try { res = await fetch(`${BASE}/api/v1${path}${qs}`, { method, headers, body, credentials: 'include' }); }
  catch { throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.'); }

  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get('content-type')?.includes('json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = (data as any)?.error;
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') onUnauthorized?.();
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? 'Something went wrong', err?.details && typeof err.details === 'object' ? err.details : {});
  }
  return data as T;
}

/** Downloads a text/CSV response as a file (used for CSV export). */
export async function downloadFile(path: string, query: Record<string, unknown>, filename: string) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${BASE}/api/v1${path}?${qs}`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'EXPORT', 'Export failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
