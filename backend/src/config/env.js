import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const prod = nodeEnv === 'production';

const secret = (key, devFallback) => {
  const value = process.env[key];
  if (value) return value;
  if (prod) throw new Error(`Missing required environment variable ${key}`);
  return devFallback;
};

export const env = {
  nodeEnv,
  prod,
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 3000),
  jwtSecret: secret('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtExpires: process.env.JWT_EXPIRES || '2h',
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL || '',
  dbPoolMax: Number(process.env.DB_POOL_MAX || 5),
  appUrl: process.env.APP_URL?.trim() || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  paymentProvider: process.env.PAYMENT_PROVIDER || 'maya',
  maya: {
    publicKey: process.env.MAYA_PUBLIC_KEY?.trim() || '',
    secretKey: process.env.MAYA_SECRET_KEY?.trim() || '',
    webhookPublicKeys: [process.env.MAYA_WEBHOOK_PUBLIC_KEY_1, process.env.MAYA_WEBHOOK_PUBLIC_KEY_2]
      .filter(Boolean).map((key) => key.replace(/\\n/g, '\n')),
    baseUrl: (process.env.MAYA_BASE_URL?.trim() || 'https://pg-sandbox.paymaya.com').replace(/\/+$/, '')
  },
  payMongo: {
    secretKey: process.env.PAYMONGO_SECRET_KEY || '',
    webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || ''
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  },
  reservationMinutes: Number(process.env.RESERVATION_MINUTES || 15),
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 8000),
  aiMaxOutputTokens: 400,
  aiGlobalPerMinute: Number(process.env.AI_GLOBAL_PER_MINUTE || 30),
  rate: {
    general: Number(process.env.RATE_GENERAL || 300),
    auth: Number(process.env.RATE_AUTH || 20),
    ai: Number(process.env.RATE_AI || 10)
  }
};
