export const BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

let token = localStorage.getItem('kape_token');

export const auth = {
  get token() {
    return token;
  },
  set(value) {
    token = value;
    if (value) localStorage.setItem('kape_token', value);
    else localStorage.removeItem('kape_token');
  }
};

export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  if (!navigator.onLine && (method !== 'GET' || !/^\/products(?:\/\d+)?(?:\?|$)/.test(path))) {
    throw new Error('This action is unavailable offline.');
  }
  const publicCatalog = method === 'GET' && /^\/products(?:\/\d+)?(?:\?|$)/.test(path);
  const response = await fetch(BASE + path, {
    method,
    signal,
    cache: publicCatalog ? 'default' : 'no-store',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token && !publicCatalog ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 204) return { success: true, data: null };
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    const error = new Error(json?.error?.message || 'Request failed');
    error.code = json?.error?.code;
    error.status = response.status;
    error.details = json?.error?.details;
    if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/me'].includes(path)) {
      window.dispatchEvent(new Event('session:expired'));
    }
    if (response.status === 403) error.message = 'This account does not have access to that action.';
    if (json?.error?.code === 'VALIDATION_ERROR' && error.details?.length) {
      error.message = error.details.map(({ field, message }) => `${field}: ${message}`).join(' · ');
    }
    throw error;
  }
  return json;
}

export const notifyCart = () => window.dispatchEvent(new Event('cart:changed'));
