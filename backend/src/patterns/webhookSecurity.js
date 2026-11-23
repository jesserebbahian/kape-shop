import crypto from 'node:crypto';

export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
};

export const hmacHex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');
