import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { env } from './config/env.js';
import { corsMiddleware, helmetMiddleware, generalLimiter } from './middleware/security.js';
import { requestId, notFound, errorHandler } from './middleware/errors.js';
import { apiRouter, webhookRouter } from './routes/index.js';
import { registerOrderListeners } from './patterns/orderListeners.js';

export const createApp = ({ frontend } = {}) => {
  registerOrderListeners();
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  app.use('/api/v1/webhooks', express.raw({ type: '*/*', limit: '256kb' }), webhookRouter);

  app.use(express.json({ limit: '50kb' }));

  const spec = YAML.parse(fs.readFileSync(path.resolve('backend/openapi.yaml'), 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

  app.use('/api/v1', (req, res, next) => {
    if (req.method !== 'GET' || !/^\/products(?:\/\d+)?$/.test(req.path)) res.set('Cache-Control', 'no-store');
    next();
  }, generalLimiter, apiRouter);
  app.use('/api', notFound);

  if (frontend) app.use(frontend);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

export { env };
