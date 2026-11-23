import { verify } from 'node:crypto';

const toleranceMs = 5 * 60 * 1000;

function flatten(object, prefix = '', pairs = []) {
  for (const [key, value] of Object.entries(object)) {
    if (value === null || value === '') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object') flatten(value, path, pairs);
    else pairs.push(`${path}=${value}`);
  }
  return pairs;
}

export function verifyMayaWebhook(body, headers, keys) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const timestamp = Number(headers['x-maya-webhook-timestamp']);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > toleranceMs) return false;
  const signatureHeader = String(headers['x-maya-webhook-signature'] || '');
  const { nonce, v1 } = Object.fromEntries(signatureHeader.split(',').map((part) => part.trim().split('=', 2)));
  if (!/^[a-f0-9]{32}$/i.test(nonce || '') || !/^(?:[a-f0-9]{2})+$/i.test(v1 || '')) return false;
  const input = Buffer.from(`${flatten(body).sort().join('&')}&nonce=${nonce}`);
  const signature = Buffer.from(v1, 'hex');
  return keys.some((key) => {
    try {
      return verify('RSA-SHA256', input, key, signature);
    } catch {
      return false;
    }
  });
}
