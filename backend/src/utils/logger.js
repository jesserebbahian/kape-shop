const redact = (value) => JSON.stringify(value, (key, v) => (/secret|token|password|authorization|key/i.test(key) ? '[redacted]' : v));

export const logger = {
  info: (message, meta) => console.log(`[info] ${message}${meta ? ` ${redact(meta)}` : ''}`),
  warn: (message, meta) => console.warn(`[warn] ${message}${meta ? ` ${redact(meta)}` : ''}`),
  error: (message, meta) => console.error(`[error] ${message}${meta ? ` ${redact(meta)}` : ''}`)
};
