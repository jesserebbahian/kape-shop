import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const isAllowedOrigin = (origin) => {
  if (env.allowedOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (!env.prod && (hostname.endsWith('.webcontainer.io') || hostname.endsWith('.stackblitz.io'))) return true;
  } catch {
    return false;
  }
  return false;
};

export const corsMiddleware = cors({
  origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin))
});

export const helmetMiddleware = env.prod
  ? helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'https:']
        }
      }
    })
  : helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false
    });

const limiter = (max, windowMs, code) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        success: false,
        error: { code, message: 'Too many requests, please slow down' },
        requestId: req.id
      })
  });

export const generalLimiter = limiter(env.rate.general, 15 * 60 * 1000, 'RATE_LIMITED');
export const authLimiter = limiter(env.rate.auth, 15 * 60 * 1000, 'RATE_LIMITED');
export const aiLimiter = limiter(env.rate.ai, 60 * 1000, 'AI_RATE_LIMITED');
